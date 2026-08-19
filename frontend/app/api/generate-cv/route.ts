import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { geminiGenerate, hasGeminiKeys } from '@/lib/gemini'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 60

// Free Google Gemini model. Change here if you want a different one.

// The structured CV shape we ask Gemini to return (OpenAPI subset).
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    full_name: { type: 'STRING' },
    title: { type: 'STRING' },
    summary: { type: 'STRING' },
    // Every field here is described and required on purpose. With a bare
    // { type: 'STRING' } schema and no `required`, the model treats the split
    // as optional and narrates the whole entry into `role` - measured 3x on a
    // projects-only profile, it produced 80+ char roles like "Full Stack
    // Developer (Project Lead) - ShopEase E-commerce Platform Personal
    // Project" with organization empty and bullets missing entirely, plus
    // duplicate entries for the same project. The CV template renders `role`
    // bold, so that lands in the UI as one unreadable bold paragraph.
    // Descriptions + required took it to 3/3 clean runs.
    experience: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          role: {
            type: 'STRING',
            description: 'Job title ONLY, at most 8 words, e.g. "Frontend Developer" or "Project Lead". Never include the company, the dates, bullet text, or any explanation of your own reasoning.',
          },
          organization: {
            type: 'STRING',
            description: 'Company name, or the project name for a project-based entry. At most 8 words. No commentary.',
          },
          period: {
            type: 'STRING',
            description: 'Dates only, e.g. "2023 - Present". Empty string when the profile gives no dates.',
          },
          bullets: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description: '3 to 5 achievement bullets, each one sentence. ALL descriptive content belongs here, never in role or organization.',
          },
        },
        required: ['role', 'organization', 'period', 'bullets'],
        propertyOrdering: ['role', 'organization', 'period', 'bullets'],
      },
    },
    education: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          degree: { type: 'STRING' },
          institute: { type: 'STRING' },
          period: { type: 'STRING' },
        },
      },
    },
    skills: { type: 'ARRAY', items: { type: 'STRING' } },
    certifications: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          issuer: { type: 'STRING' },
          date: { type: 'STRING' },
          link: { type: 'STRING' },
        },
        required: ['name'],
      },
    },
    projects: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          description: { type: 'STRING' },
          link: { type: 'STRING' },
        },
        required: ['name'],
      },
    },
    courses: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { name: { type: 'STRING' }, provider: { type: 'STRING' }, date: { type: 'STRING' }, link: { type: 'STRING' } },
        required: ['name'],
      },
    },
    awards: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { name: { type: 'STRING' }, issuer: { type: 'STRING' }, date: { type: 'STRING' }, link: { type: 'STRING' } },
        required: ['name'],
      },
    },
    custom_sections: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          heading: { type: 'STRING' },
          items: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: { title: { type: 'STRING' }, description: { type: 'STRING' }, link: { type: 'STRING' } },
              required: ['title'],
            },
          },
        },
        required: ['heading', 'items'],
      },
    },
    ats_score: { type: 'INTEGER' },
    ats_summary: { type: 'STRING' },
    missing_keywords: { type: 'ARRAY', items: { type: 'STRING' } },
    ats_breakdown: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          label: { type: 'STRING' },
          score: { type: 'INTEGER' },
          note: { type: 'STRING' },
        },
        required: ['label', 'score', 'note'],
      },
    },
    suggestions: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['full_name', 'title', 'summary', 'experience', 'education', 'skills', 'ats_score', 'ats_summary', 'ats_breakdown', 'suggestions'],
}

const SYSTEM_PROMPT = `You are an expert technical resume writer and ATS (Applicant Tracking System) optimization specialist.
You will be given a candidate's profile data, a target role, a tone, and optional custom instructions. Produce a polished, ATS-optimized CV as JSON.

CONTENT RULES:
- Be truthful. Use ONLY the information in the profile. Never invent employers, dates, degrees, or achievements.
- If the candidate has no formal work experience, build the "experience" section from their PROJECTS: exactly ONE entry per project, never the same project twice. Set "role" to a plain job title that fits the work (e.g. "Full Stack Developer"), "organization" to the project name, and put all the detail in "bullets" as strong, quantified, action-verb points.
- NEVER explain your own reasoning inside a field value. Do not write meta text such as "as no formal company provided" or "projects are elevated to experience entries". Fields hold CV content only; "role" is a job title and nothing else.
- Rewrite the professional summary to be confident and tailored to the target role using relevant keywords.
- Use strong action verbs and measurable impact where the profile supports it (do NOT fabricate numbers).
- "skills" should be the most relevant skills for the target role, ordered by relevance.
- experience "period": use the candidate's real dates if present. If a date/year is NOT in the profile, leave "period" as an EMPTY STRING "" - never write "Date not specified", "N/A", or "Present" unless the profile actually says so.
- certifications, courses, awards: you MUST include EVERY item the candidate listed in the profile - never drop or skip any of them. Each is an object { name, issuer/provider, date }; copy the name accurately and use issuer/provider/date only if present (else empty string). Do NOT invent issuers or dates.
- projects: you MUST include EVERY project from the profile as { name, description, link }. Preserve its full URL in link, even if it is also used to inform an experience entry.
- LINKS: preserve EVERY URL provided in the profile. If a project, certification, course, award, or custom-section entry has an associated link (repo, portfolio, credential, etc.), include the FULL URL in that entry's "link" field (empty string if none). Never drop, truncate, or rewrite URLs.
- Do NOT output a contact section - it is filled in separately from the verified profile.
- custom_sections: if the candidate provided custom sections, include them in "custom_sections" - keep each heading, and turn each entry into { title, description, link } with polished wording (never invent entries).
- If a TARGET JOB DESCRIPTION is provided: tailor the summary, skills ordering, and bullet wording to match it, naturally weaving in the job's important keywords that the candidate genuinely has.

JOB-MATCH RULES (only when a job description is provided):
- Score ats_score primarily on how well the candidate matches THIS job.
- missing_keywords: list important skills/keywords from the job description that are NOT clearly present in the candidate's profile (so they know what to add/learn). If no job description is given, return an empty array.
- Follow the TONE: Professional = balanced & polished; Concise = short, punchy bullets; Detailed = thorough with context; Creative = lively, distinctive wording; Technical = emphasize tools/stack/metrics; Academic = formal, research/education-focused.
- If custom instructions are provided, follow them as long as they don't require fabricating information.

SCORING RULES (be authentic and realistic - most student CVs score 55-80):
- ats_score: overall integer 0-100.
- ats_summary: 1-2 sentences explaining the overall score in plain English (what's strong, what's holding it back).
- ats_breakdown: exactly these 5 categories, each with an integer score 0-100 and a short plain-English note (one sentence):
  1. "Keyword Match" - how well skills/wording align with the target role.
  2. "Impact & Metrics" - presence of quantified, results-driven bullets.
  3. "Completeness" - are all key sections (summary, experience/projects, education, skills) filled and substantial.
  4. "Clarity & Formatting" - readability, action verbs, ATS-friendly structure.
  5. "Role Relevance" - how closely the overall profile fits the target role.

SUGGESTIONS RULES:
- Provide exactly 3 suggestions.
- Each suggestion must be a clear, complete sentence a student can act on immediately. Be specific to THIS candidate's CV.
- Do NOT use cryptic placeholders. If you give an example, make it concrete and self-explanatory.

WRITING STYLE: Never use em-dash or en-dash characters anywhere in your output (summary, bullet points, suggestions, or any text field). Use a comma, a period, or a spaced hyphen ( - ) instead.`

function buildProfileText(p: Record<string, unknown>, sections: Record<string, unknown[]>) {
  const lines: string[] = []
  lines.push(`Full name: ${p.full_name || ''}`)
  lines.push(`Desired/target role on profile: ${p.desired_role || ''}`)
  lines.push(`Location: ${p.location || ''}`)
  lines.push(`Email: ${p.email || ''}`)
  lines.push(`Phone: ${p.phone || ''}`)
  lines.push(`LinkedIn: ${p.linkedin_url || p.linkedin || ''}`)
  lines.push(`GitHub: ${p.github_url || p.github || ''}`)
  lines.push(`Professional summary (draft): ${p.summary || ''}`)

  const skills = sections.skills as { name: string }[]
  lines.push(`\nSkills: ${skills.map((s) => s.name).join(', ') || 'none'}`)

  const languages = sections.languages as { name: string; level: string }[]
  lines.push(`Languages: ${languages.map((l) => `${l.name} (${l.level})`).join(', ') || 'none'}`)

  const education = sections.education as { degree: string; institute: string; start_year: string; end_year: string }[]
  lines.push('\nEducation:')
  education.forEach((e) => lines.push(`- ${e.degree}, ${e.institute} (${e.start_year || ''}-${e.end_year || ''})`))

  const projects = sections.projects as { name: string; description: string; link: string }[]
  lines.push('\nProjects:')
  projects.forEach((pr) => lines.push(`- ${pr.name}: ${pr.description || ''} ${pr.link ? `(${pr.link})` : ''}`))

  const certifications = sections.certifications as { name: string; issuer: string; issue_date: string; link: string }[]
  lines.push('\nCertifications:')
  certifications.forEach((c) => lines.push(`- ${c.name}${c.issuer ? `, ${c.issuer}` : ''}${c.issue_date ? ` (${c.issue_date})` : ''}${c.link ? ` (${c.link})` : ''}`))

  const courses = sections.courses as { name: string; provider: string }[]
  lines.push('\nCourses:')
  courses.forEach((c) => lines.push(`- ${c.name}${c.provider ? `, ${c.provider}` : ''}`))

  const awards = sections.awards as { name: string; issuer: string }[]
  lines.push('\nAwards:')
  awards.forEach((a) => lines.push(`- ${a.name}${a.issuer ? `, ${a.issuer}` : ''}`))

  return lines.join('\n')
}

type ExperienceEntry = { role: string; organization: string; period: string; bullets: string[] }

/**
 * Last line of defence for the experience section. The schema now forces the
 * role/organization/period/bullets split, but a model that ignores it used to
 * put the entire entry - company, dates, even "Bullets: ..." - into `role`,
 * and the CV template renders `role` bold, so the whole section came out as
 * one bold paragraph. Rather than hand that to the UI, salvage what we can:
 * keep the leading job title and push the remainder into bullets.
 */
function normalizeExperience(raw: unknown): ExperienceEntry[] {
  if (!Array.isArray(raw)) return []
  return raw.map((entry) => {
    const e = (entry ?? {}) as Partial<ExperienceEntry>
    let role = typeof e.role === 'string' ? e.role.trim() : ''
    const bullets = Array.isArray(e.bullets)
      ? e.bullets.filter((b): b is string => typeof b === 'string' && b.trim() !== '').map((b) => b.trim())
      : []

    // "Lead Engineer - Project: Foo. Bullets: Built ..." -> title + the rest.
    const spill = role.split(/\s*(?:\bBullets\s*:|\s-\s(?=Project\s*:|Role\s*:))/i)
    if (spill.length > 1) {
      role = spill[0].trim()
      const rest = spill.slice(1).join(' ').trim()
      if (rest) bullets.unshift(rest)
    }
    // A real job title is short. Anything longer is prose, so keep the whole of
    // it as a bullet (losing what the model wrote would be worse) and cut the
    // title back to the part before the first bracket, dash or comma - for
    // "Frontend Developer (Project Work Focus ...)" that leaves the real title.
    if (role.length > 80) {
      bullets.unshift(role)
      const head = role.split(/\s*[(,]|\s-\s/)[0].trim()
      role = head && head.length <= 80 ? head : `${role.slice(0, 80).replace(/\s+\S*$/, '')}...`
    }

    return {
      role,
      organization: typeof e.organization === 'string' ? e.organization.trim() : '',
      period: typeof e.period === 'string' ? e.period.trim() : '',
      bullets,
    }
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const targetRole: string = (body.targetRole || '').trim()
  const tone: string = body.tone || 'Professional'
  const customInstructions: string = (body.customInstructions || '').trim().slice(0, 1000)
  const jobDescription: string = (body.jobDescription || '').trim().slice(0, 4000)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  const limited = await rateLimit(supabase, 'generate-cv')
  if (!limited.ok) return limited.response

  if (!hasGeminiKeys()) {
    return NextResponse.json(
      { error: 'AI is not configured yet. Add GEMINI_API_KEY or GEMINI_API_KEYS to .env.local.' },
      { status: 500 }
    )
  }

  // Load the candidate's full profile
  const [p, sk, lg, ed, ce, co, aw, pr, cs] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('skills').select('*').eq('profile_id', user.id).order('id'),
    supabase.from('languages').select('*').eq('profile_id', user.id).order('id'),
    supabase.from('education').select('*').eq('profile_id', user.id).order('id'),
    supabase.from('certifications').select('*').eq('profile_id', user.id).order('id'),
    supabase.from('courses').select('*').eq('profile_id', user.id).order('id'),
    supabase.from('awards').select('*').eq('profile_id', user.id).order('id'),
    supabase.from('projects').select('*').eq('profile_id', user.id).order('id'),
    supabase.from('custom_sections').select('*').eq('profile_id', user.id).order('id'),
  ])

  if (!p.data) return NextResponse.json({ error: 'Please build your profile first.' }, { status: 400 })

  const profileText = buildProfileText(p.data, {
    skills: sk.data ?? [], languages: lg.data ?? [], education: ed.data ?? [],
    certifications: ce.data ?? [], courses: co.data ?? [], awards: aw.data ?? [], projects: pr.data ?? [],
  })

  // Custom sections text
  let customText = ''
  for (const s of (cs.data ?? []) as unknown as { heading: string; items: { title: string; description?: string }[] }[]) {
    customText += `\n${s.heading}:\n`
    for (const it of s.items ?? []) customText += `- ${it.title}${it.description ? `: ${it.description}` : ''}\n`
  }

  const userPrompt = `Target role: ${targetRole || p.data.desired_role || 'General'}
Tone: ${tone}
${customInstructions ? `\nCustom instructions from the candidate (follow these, but never fabricate facts):\n${customInstructions}\n` : ''}${jobDescription ? `\nTARGET JOB DESCRIPTION (tailor the CV to this and score the match against it):\n${jobDescription}\n` : ''}
Candidate profile:
${profileText}
${customText ? `\nAdditional custom sections provided by the candidate (include these in the CV under "custom_sections", keeping the headings):\n${customText}` : ''}`

  // Call Gemini (REST)
  try {
    const text = await geminiGenerate({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    })

    const cv = JSON.parse(text)
    cv.experience = normalizeExperience(cv.experience)

    // Fill contact from the VERIFIED profile (never from the AI) so usernames + links are accurate
    cv.contact = {
      email: p.data.email || '',
      phone: p.data.phone || '',
      location: p.data.location || '',
      linkedin: p.data.linkedin || '',
      linkedin_url: p.data.linkedin_url || '',
      github: p.data.github || '',
      github_url: p.data.github_url || '',
      discord: p.data.discord || '',
      discord_url: p.data.discord_url || '',
    }
    cv.photo_url = p.data.photo_url || ''

    // Save the generated CV (best-effort; ignore failures so the user still gets the result)
    const { data: inserted } = await supabase.from('cvs').insert({
      profile_id: user.id,
      target_role: targetRole || p.data.desired_role || null,
      tone,
      content: cv,
      ats_score: cv.ats_score ?? null,
      suggestions: cv.suggestions ?? null,
    }).select('id').single()

    return NextResponse.json({ cv, id: inserted?.id ?? null })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: `Could not generate CV: ${message}` }, { status: 500 })
  }
}
