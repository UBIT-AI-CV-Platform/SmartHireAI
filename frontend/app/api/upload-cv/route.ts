import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { geminiGenerate, hasGeminiKeys } from '@/lib/gemini'
import { rateLimit } from '@/lib/rate-limit'
import { extractCvText } from '@/lib/extractCvText'
import { extractPdfLinksDetailed } from '@/lib/pdfLinks'
import type { LabeledPdfLink } from '@/lib/pdfLinks'
import { cleanCvProjects } from '@/lib/cleanCv'

export const runtime = 'nodejs'
export const maxDuration = 60

// Keep uploads sensible: base64 of a ~6 MB file is ~8 MB of text.
const MAX_FILE_B64 = 9 * 1024 * 1024

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/rtf',
  'text/plain',
])

// PDF hyperlinks are read properly via unpdf (see lib/pdfLinks.ts) because most
// reporters (Chrome, Word, Canva, LaTeX) store annotations in compressed object
// streams that a raw byte scan can never see. The helpers below are only for
// the plain-text paths (Word / RTF / txt), which keep raw URLs in the text.
function normaliseUrl(value: string) {
  const url = value.trim().replace(/[),.;\]}]+$/g, '')
  return /^(?:https?:\/\/|www\.)/i.test(url) ? (url.startsWith('www.') ? `https://${url}` : url) : ''
}

function urlsIn(value: string) {
  return [...value.matchAll(/(?:https?:\/\/|www\.)[^\s<>{}"']+/gi)]
    .map((match) => normaliseUrl(match[0]))
    .filter(Boolean)
}

type NamedLink = { label?: string; url?: string }
type LinkableEntry = { name?: string; title?: string; description?: string; link?: string; links?: NamedLink[] }
type ExperienceEntry = { role: string; organization: string; period: string; bullets: string[] }

// The model normally maps the supplied URLs itself. These small fallbacks cover
// PDFs whose annotation labels cannot be read by the model: first promote a URL
// that made it into an entry's text, then assign unmistakable project/credential
// URLs to the matching missing entries.
export function recoverEntryLinks(cv: Record<string, unknown>, documentUrls: string[], labeledLinks: LabeledPdfLink[] = []) {
  const entries = (key: string) => Array.isArray(cv[key]) ? cv[key] as LinkableEntry[] : []
  const expEntries = (key: string) => Array.isArray(cv[key]) ? cv[key] as (LinkableEntry & { role?: string; organization?: string })[] : []
  const groups = [entries('projects'), entries('certifications'), entries('courses'), entries('awards')]
  const used = new Set<string>()

  // Helper: generate a human-readable label for a URL based on domain patterns,
  // preferring the label unpdf read straight off the PDF (e.g. "Live Demo").
  const labelFor = (url: string): string => {
    const labeled = labeledLinks.find((l) => l.url.toLowerCase() === url.toLowerCase())
    if (labeled?.label) return labeled.label
    const lower = url.toLowerCase()
    if (/github\.com/i.test(lower)) return 'GitHub'
    if (/gitlab\.com/i.test(lower)) return 'GitLab'
    if (/bitbucket\.org/i.test(lower)) return 'Bitbucket'
    if (/vercel\.app|vercel\.dev/i.test(lower)) return 'Live Demo'
    if (/netlify\.app|netlify\.com/i.test(lower)) return 'Live Demo'
    if (/replit\.com/i.test(lower)) return 'Replit'
    if (/devpost\.com/i.test(lower)) return 'Devpost'
    if (/behance\.net/i.test(lower)) return 'Behance'
    if (/dribbble\.com/i.test(lower)) return 'Dribbble'
    if (/heroku\.com/i.test(lower)) return 'Live Demo'
    if (/onrender\.com|render\.com/i.test(lower)) return 'Live Demo'
    if (/pages\.dev|workers\.dev|azurewebsites\.net|appspot\.com|railway\.app|fly\.dev/i.test(lower)) return 'Live Demo'
    if (/demo|live|app|site|web/i.test(lower)) return 'Demo'
    return 'Open link'
  }

  // Helper: detect if a URL is a project-type link (repo, demo, portfolio)
  const isProjectUrl = (url: string) =>
    /github|gitlab|bitbucket|vercel|netlify|devpost|replit|behance|dribbble|portfolio|demo|live|heroku|onrender|render\.com|pages\.dev|workers\.dev|azurewebsites|appspot|railway|fly\.dev/i.test(url)

  // Helper: detect if a URL is a credential/certificate link
  const isCredentialUrl = (url: string) =>
    /credly|coursera|udemy|edx|credential|certificate|certification|linkedin\.com\/learning|aws\.amazon|learn\.microsoft|skillsoft|google|meta|microsoft\.com\/cert|comptia|cisco|oracle|pmi|itil|terraform|hashicorp|docker|kubernetes|azure|acloudguru|pluralsight|cloudacademy|kodekloud|linuxfoundation|opengroup|isaca|offensive|sans\.org|cybrary|hackthebox|tryhackme|pwnedlabs/i.test(url)

  // Pass 1: normalise all existing links the model already extracted and mark them used
  for (const group of groups) {
    for (const entry of group) {
      const ownUrl = normaliseUrl(String(entry.link || '')) || urlsIn(`${entry.name || ''} ${entry.title || ''} ${entry.description || ''}`)[0]
      if (ownUrl) { entry.link = ownUrl; used.add(ownUrl.toLowerCase()) }
      entry.links = Array.isArray(entry.links)
        ? entry.links.map((item) => ({ label: String(item?.label || '').trim(), url: normaliseUrl(String(item?.url || '')) })).filter((item) => item.url)
        : []
      for (const item of entry.links) used.add(item.url!.toLowerCase())
    }
  }

  // Also scan experience entries for URLs in text
  const experience = expEntries('experience')
  for (const exp of experience) {
    const ownUrl = normaliseUrl(String(exp.link || ''))
    if (ownUrl) { exp.link = ownUrl; used.add(ownUrl.toLowerCase()) }
    const textUrls = urlsIn(`${exp.role || ''} ${exp.organization || ''}`)
    if (textUrls.length && !exp.link) {
      exp.link = textUrls[0]
      used.add(textUrls[0].toLowerCase())
    }
  }

  const remaining = documentUrls.filter((url) => !used.has(url.toLowerCase()))
  const projects = entries('projects')

  // ── PROJECT URL ASSIGNMENT ──────────────────────────────────────────────
  // For every project that has no links at all, find matching project URLs.
  // Projects with multiple right-side labels (GitHub + Demo) need ALL of them.
  const projectUrls = remaining.filter(isProjectUrl)
  const usedProjectUrls = new Set<string>()

  for (const project of projects) {
    if (project.link && (project.links?.length ?? 0) > 0) continue // already fully linked

    // Find project URLs not yet claimed
    const available = projectUrls.filter((u) => !usedProjectUrls.has(u.toLowerCase()))
    if (!available.length) break

    // Try to match by project name appearing in the URL path
    const projectName = (project.name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const matchedByName = available.filter((u) => {
      try {
        const path = new URL(u).pathname.toLowerCase().replace(/[^a-z0-9]/g, '')
        return projectName.length > 2 && path.includes(projectName)
      } catch { return false }
    })

    // Use name-matched URLs first, then fall back to positional assignment
    const assigned = matchedByName.length > 0 ? matchedByName : available.slice(0, 2) // at most 2 per project (GitHub + Demo)

    const existing = new Set((project.links ?? []).map((item) => item.url!.toLowerCase()))
    if (project.link) existing.add(project.link.toLowerCase())

    for (const url of assigned) {
      if (!existing.has(url.toLowerCase())) {
        const label = labelFor(url)
        project.links = project.links ?? []
        project.links.push({ label, url })
        existing.add(url.toLowerCase())
        usedProjectUrls.add(url.toLowerCase())
      }
    }
    if (!project.link && project.links?.length) {
      project.link = project.links[0].url
    }
  }

  // For any remaining unassigned project URLs, try to distribute to projects that only have 1 link
  const leftoverProjectUrls = projectUrls.filter((u) => !usedProjectUrls.has(u.toLowerCase()))
  if (leftoverProjectUrls.length) {
    for (const project of projects) {
      if (!leftoverProjectUrls.length) break
      const linkCount = project.links?.length ?? 0
      if (linkCount < 2) {
        const url = leftoverProjectUrls.shift()!
        const existing = new Set((project.links ?? []).map((item) => item.url!.toLowerCase()))
        if (project.link) existing.add(project.link.toLowerCase())
        if (!existing.has(url.toLowerCase())) {
          project.links = project.links ?? []
          project.links.push({ label: labelFor(url), url })
          if (!project.link) project.link = url
        }
      }
    }
  }

  // Mark all assigned project URLs as used
  for (const url of usedProjectUrls) used.add(url.toLowerCase())

  // ── CREDENTIAL / CERTIFICATION URL ASSIGNMENT ───────────────────────────
  const credentialUrls = remaining.filter((u) => !used.has(u.toLowerCase()) && isCredentialUrl(u))
  const fill = (items: LinkableEntry[], urls: string[]) => {
    for (const entry of items) {
      if (!entry.link && urls.length) entry.link = urls.shift()
    }
  }
  fill(entries('certifications'), credentialUrls)

  // Label-based credential matching: when unpdf captured the certificate name
  // as the link label (credentials are usually themselves the clickable text),
  // pair that URL with the certification whose name is written on the CV.
  const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '')
  const certificationEntries = entries('certifications')
  if (certificationEntries.length && labeledLinks.length) {
    const labelPool = [...labeledLinks].sort((a, b) => b.label.length - a.label.length)
    for (const cert of certificationEntries) {
      if (cert.link) continue
      const name = norm(cert.name || '')
      if (name.length < 3) continue
      const hit = labelPool.find((l) => {
        if (used.has(l.url.toLowerCase())) return false
        const ln = norm(l.label)
        if (ln.length < 3) return false
        return ln.includes(name) || name.includes(ln)
      })
      if (hit) {
        cert.link = hit.url
        used.add(hit.url.toLowerCase())
      }
    }
  }

  // ── REMAINING URL DISTRIBUTION ──────────────────────────────────────────
  // After project and credential URLs are claimed, any remaining embedded CV
  // hyperlink goes to certifications → courses → awards → experience.
  const unclaimed = remaining.filter((u) => !used.has(u.toLowerCase()) && !isProjectUrl(u) && !isCredentialUrl(u))
  fill(entries('certifications'), unclaimed)
  fill(entries('courses'), unclaimed)
  fill(entries('awards'), unclaimed)
  fill(experience, unclaimed)
}

// Preserve the CV's title / employer / dates / bullets split even if the model
// sends a malformed experience field. This prevents a full job description
// from being rendered as one large, bold job title.
function normalizeExperience(raw: unknown): ExperienceEntry[] {
  if (!Array.isArray(raw)) return []
  return raw.map((entry) => {
    const value = (entry ?? {}) as Partial<ExperienceEntry>
    let role = typeof value.role === 'string' ? value.role.trim() : ''
    const bullets = Array.isArray(value.bullets)
      ? value.bullets.filter((bullet): bullet is string => typeof bullet === 'string' && bullet.trim() !== '').map((bullet) => bullet.trim())
      : []
    const split = role.split(/\s*\b(?:bullets?|responsibilities)\s*:/i)
    if (split.length > 1) {
      role = split.shift()?.trim() || ''
      const overflow = split.join(' ').trim()
      if (overflow) bullets.unshift(overflow)
    }
    if (role.length > 100) {
      bullets.unshift(role)
      const title = role.split(/\s*[-–—|:]\s*|\s*\(/)[0].trim()
      role = title && title.length <= 100 ? title : role.slice(0, 100).replace(/\s+\S*$/, '')
    }
    return {
      role,
      organization: typeof value.organization === 'string' ? value.organization.trim() : '',
      period: typeof value.period === 'string' ? value.period.trim() : '',
      bullets,
    }
  }).filter((entry) => entry.role || entry.organization || entry.period || entry.bullets.length)
}

// Same structured CV shape the generator returns, plus a `contact` object, so a
// parsed upload drops straight into the existing preview / edit / apply flows.
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    full_name: { type: 'STRING' },
    title: { type: 'STRING' },
    contact: {
      type: 'OBJECT',
      properties: {
        email: { type: 'STRING' },
        phone: { type: 'STRING' },
        location: { type: 'STRING' },
        linkedin: { type: 'STRING' },
        github: { type: 'STRING' },
      },
    },
    summary: { type: 'STRING' },
    experience: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          role: { type: 'STRING', description: 'Job title only. Do not include company name, dates, bullets, or a project description.' },
          organization: { type: 'STRING', description: 'Employer or organization only. Empty string if absent in the uploaded CV.' },
          period: { type: 'STRING', description: 'Exact date range from the uploaded CV, for example "Jan 2024 - Present". Empty string if absent.' },
          bullets: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Original responsibility or achievement bullet points only. Do not combine them into the role field.' },
          link: { type: 'STRING', description: 'If the role title, organization name, or entry has an associated hyperlink, put the FULL URL here. Empty string if there is no link.' },
        },
        required: ['role', 'organization', 'period', 'bullets'],
        propertyOrdering: ['role', 'organization', 'period', 'bullets', 'link'],
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
          date: { type: 'STRING', description: 'Exact project date or date range as written in the uploaded CV. Empty string if absent.' },
          link: { type: 'STRING' },
          links: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: { label: { type: 'STRING' }, url: { type: 'STRING' } },
              required: ['label', 'url'],
            },
            description: 'Every separate labeled project hyperlink, e.g. { label: "GitHub", url: "https://github.com/..." } and { label: "Demo", url: "https://..." }. Keep all of them.',
          },
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

const SYSTEM_PROMPT = `You are a resume/CV extraction engine. You will be given a candidate's resume document (PDF, Word, or plain text). Extract ALL of its information faithfully into the provided JSON structure.

CONTENT RULES:
- Extract information as written. Never invent employers, dates, degrees, skills, projects, or achievements that are not in the document.
- Preserve the document's real structure: experience entries with the actual role / organization / period and original bullet points. Never merge an experience title, employer, date, or bullet into another field. Keep the entry order exactly as in the uploaded CV.
- "full_name": the candidate's name as it appears in the document.
- "title": the most recent or prominent job title (or headline) from the document.
- "summary": the professional summary/objective from the document if present; otherwise write a 2-3 sentence summary using ONLY facts present in the document.
- experience "period" / education "period": copy the dates exactly as written. If a date is absent, use an EMPTY STRING "" - never write "Date not specified", "N/A", or "Present" unless the document says so.
- certifications, courses, awards: include EVERY item listed in the document, with issuer/provider/date exactly as written (empty string if absent). Never drop or invent any. When multiple certificates appear on one line, make a separate item for each certificate. If a certificate name is blue/clickable in the PDF, its item MUST contain the matching full URL in link.
- LINKS: extract and preserve EVERY hyperlink / URL in the document. If an experience, certification, course, award, or custom-section entry has an associated link (company website, credential URL, portfolio link, project link, repository URL, etc.), put the FULL URL in that entry's "link" field (empty string if there is none). For experience entries, if the job title or company name is clickable/linked, capture that URL. Keep "link" in custom_sections entries as well. Do not drop, truncate, or rewrite URLs.
- A separate list of hyperlink targets may be supplied with the document. Treat every target as a real clickable PDF link. Match each target to its nearby visible label. IMPORTANT: For projects with right-aligned labels (GitHub, Demo, Live Demo), the URLs appear in top-to-bottom order matching the project order. Match the FIRST project URL to the FIRST project, the SECOND project URL to the SECOND project, etc. When a project has two labels (GitHub + Demo), both URLs belong to the SAME project. For experience entries, if a job title or company name is clickable, match the URL to that entry. For certifications, match credential URLs to the certification they appear near. Never discard a target.
- projects: extract every item from a Projects / Personal Projects section as { name, description, date, link, links }. Copy a project's exact displayed date or date range into date. CRITICAL: When the document lists multiple projects, each with right-aligned clickable labels (e.g. "GitHub" and "Live Demo" or "Repository" and "Demo"), you MUST match each URL to its CORRECT project by vertical position - the top URL belongs to the top project, the second URL to the second project, and so on. Preserve EVERY clickable label in links as { label, url }; retain the visible label text exactly (e.g. "GitHub", "Live Demo", "Repository", "Case Study") and keep links in their displayed order. If a project has two right-side labels, both URLs go in that single project's links array. link may be the primary URL. Do not put Projects under custom_sections.
- custom_sections: any other titled section (Languages, Volunteering, Interests, Publications, etc.) goes under its original heading with each entry as { title, description, link }.
- contact: extract email, phone, location, and any LinkedIn / GitHub / portfolio URLs from the document if clearly present; leave fields empty otherwise. Never guess an email or phone.

SCORING RULES (be authentic and realistic - most real CVs score 55-85):
- ats_score: integer 0-100 for how well this CV would pass an ATS filter for the target role if one is provided, otherwise for the role stated in the CV.
- ats_summary: 1-2 sentences explaining the score in plain English.
- ats_breakdown: exactly these 5 categories, each with an integer score 0-100 and a one-sentence plain-English note:
  1. "Keyword Match"  2. "Impact & Metrics"  3. "Completeness"  4. "Clarity & Formatting"  5. "Role Relevance"
- missing_keywords: if a target role is provided, list important skills/keywords for that role that are NOT clearly present in the CV. If no target role is given, return an empty array.
- suggestions: exactly 3 clear, complete, actionable sentences specific to THIS CV.

WRITING STYLE: Never use em-dash or en-dash characters anywhere in your output (summary, bullet points, suggestions, or any text field). Use a comma, a period, or a spaced hyphen ( - ) instead.`

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const fileName: string = (body.fileName || 'resume').slice(0, 200)
  const fileData: string = typeof body.fileData === 'string' ? body.fileData : ''
  const rawMime: string = typeof body.mimeType === 'string' ? body.mimeType.split(';')[0].trim() : ''
  const targetRole: string = (body.targetRole || '').trim().slice(0, 200)

  // If the browser couldn't detect a MIME type (rare), infer it from the file
  // extension so a .docx is never treated as plain text (binary garbage).
  const ext = fileName.toLowerCase().split('.').pop() || ''
  const EXT_MIME: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    rtf: 'application/rtf',
    txt: 'text/plain',
    text: 'text/plain',
    md: 'text/plain',
  }
  const mime = rawMime || EXT_MIME[ext] || 'text/plain'
  if (!fileData) return NextResponse.json({ error: 'No file data provided.' }, { status: 400 })
  if (!ALLOWED_MIME.has(mime)) {
    return NextResponse.json({ error: 'Please upload a PDF, Word (.doc/.docx), RTF, or text file.' }, { status: 415 })
  }
  if (fileData.length > MAX_FILE_B64) {
    return NextResponse.json({ error: 'That file is too large. Please upload a CV under ~6 MB.' }, { status: 413 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  const limited = await rateLimit(supabase, 'upload-cv')
  if (!limited.ok) return limited.response

  if (!hasGeminiKeys()) {
    return NextResponse.json(
      { error: 'AI is not configured yet. Add GEMINI_API_KEY or GEMINI_API_KEYS to .env.local.' },
      { status: 500 }
    )
  }

  const userPrompt = targetRole
    ? `Target role to score the CV against: ${targetRole}\n\nAnalyze the uploaded resume document and return the structured CV JSON.`
    : `Analyze the uploaded resume document and return the structured CV JSON.`

  // Gemini inlineData supports PDF but NOT Word/RTF. PDFs go as binary
  // inlineData; every other format is reduced to plain text server-side and
  // sent as a text part, which Gemini always accepts.
  const bytes = Buffer.from(fileData, 'base64')
  let documentUrls: string[] = []
  let labeledLinks: LabeledPdfLink[] = []
  let parts: Record<string, unknown>[]
  if (mime === 'application/pdf') {
    const pdfLinks = await extractPdfLinksDetailed(new Uint8Array(bytes))
    documentUrls = pdfLinks.urls
    labeledLinks = pdfLinks.labeled
    const linkText = pdfLinks.labeled.length
      ? `Clickable hyperlink targets embedded in this CV, in reading order (visible label, then URL): ${pdfLinks.labeled.map((l) => `${l.label} -> ${l.url}`).join(' | ')}`
      : `Clickable hyperlink targets embedded in this CV: ${documentUrls.join(' | ')}`
    parts = [
      { inlineData: { mimeType: mime, data: fileData } },
      ...(documentUrls.length ? [{ text: linkText }] : []),
      { text: userPrompt },
    ]
  } else {
    let text: string
    try {
      text = await extractCvText(bytes, mime)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not read that file.'
      return NextResponse.json({ error: message }, { status: 422 })
    }
    documentUrls = urlsIn(text)
    parts = [{ text }, { text: userPrompt }]
  }

  // geminiGenerate rotates keys (a dead key must not take the feature down)
  // and walks the model chain if the primary is slow or overloaded.
  let aiText: string
  try {
    aiText = await geminiGenerate({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Something went wrong analyzing your CV. Please try again.'
    console.error('Gemini API error (upload-cv):', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }

  try {
    const cv = JSON.parse(aiText)
    cv.experience = normalizeExperience(cv.experience)
    recoverEntryLinks(cv, documentUrls, labeledLinks)
    cleanCvProjects(cv)

    // Photo + any contact gaps fall back to the verified profile.
    const { data: prof } = await supabase.from('profiles').select('photo_url, email, phone, location, linkedin, linkedin_url, github, github_url').eq('id', user.id).maybeSingle()
    cv.photo_url = prof?.photo_url || ''
    cv.contact = {
      email: cv.contact?.email || prof?.email || '',
      phone: cv.contact?.phone || prof?.phone || '',
      location: cv.contact?.location || prof?.location || '',
      linkedin: cv.contact?.linkedin || prof?.linkedin || prof?.linkedin_url || '',
      linkedin_url: prof?.linkedin_url || '',
      github: cv.contact?.github || prof?.github || prof?.github_url || '',
      github_url: prof?.github_url || '',
    }

    // Sync the extracted skills into the profile's skills table (merged, not
    // overwritten) so the existing keyword-based job matching picks them up.
    try {
      const { data: existing } = await supabase.from('skills').select('name').eq('profile_id', user.id)
      const have = new Set((existing ?? []).map((s) => s.name.trim().toLowerCase()))
      const fresh = (cv.skills ?? [])
        .map((s: unknown) => String(s).trim())
        .filter(Boolean)
        .filter((s: string) => !have.has(s.toLowerCase()))
      if (fresh.length > 0) {
        await supabase.from('skills').insert(fresh.map((name: string) => ({ profile_id: user.id, name })))
      }
    } catch (e) {
      console.error('skills sync failed (upload-cv):', e)
    }

    // Save the parsed CV (best-effort; ignore failures so the user still gets the result)
    const { data: inserted } = await supabase.from('cvs').insert({
      profile_id: user.id,
      target_role: targetRole || cv.title || null,
      tone: 'Uploaded',
      content: cv,
      ats_score: cv.ats_score ?? null,
      suggestions: cv.suggestions ?? null,
    }).select('id').single()

    return NextResponse.json({ cv, id: inserted?.id ?? null, syncedSkills: cv.skills ?? [] })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: `Could not analyze your CV: ${message}` }, { status: 500 })
  }
}
