import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { pickGeminiKey } from '@/lib/gemini'
import { rateLimit } from '@/lib/rate-limit'
import { extractCvText } from '@/lib/extractCvText'

export const runtime = 'nodejs'
export const maxDuration = 60

// Free Google Gemini model. Change here if you want a different one.
// Options (all have a free tier): gemini-2.5-flash, gemini-2.0-flash, gemini-flash-latest
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

// Keep uploads sensible: base64 of a ~6 MB file is ~8 MB of text.
const MAX_FILE_B64 = 9 * 1024 * 1024

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/rtf',
  'text/plain',
])

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
          role: { type: 'STRING' },
          organization: { type: 'STRING' },
          period: { type: 'STRING' },
          bullets: { type: 'ARRAY', items: { type: 'STRING' } },
        },
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
        },
        required: ['name'],
      },
    },
    courses: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { name: { type: 'STRING' }, provider: { type: 'STRING' }, date: { type: 'STRING' } },
        required: ['name'],
      },
    },
    awards: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { name: { type: 'STRING' }, issuer: { type: 'STRING' }, date: { type: 'STRING' } },
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
              properties: { title: { type: 'STRING' }, description: { type: 'STRING' } },
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
- Preserve the document's real structure: experience entries with the actual role / organization / period and the original bullet points; education with real degrees / institutes / periods; skills exactly as written.
- "full_name": the candidate's name as it appears in the document.
- "title": the most recent or prominent job title (or headline) from the document.
- "summary": the professional summary/objective from the document if present; otherwise write a 2-3 sentence summary using ONLY facts present in the document.
- experience "period" / education "period": copy the dates exactly as written. If a date is absent, use an EMPTY STRING "" - never write "Date not specified", "N/A", or "Present" unless the document says so.
- certifications, courses, awards: include EVERY item listed in the document, with issuer/provider/date exactly as written (empty string if absent). Never drop or invent any.
- custom_sections: any other titled section (Languages, Volunteering, Interests, Publications, Projects, etc.) goes under its original heading with each entry as { title, description }.
- contact: extract email, phone, location, and any LinkedIn / GitHub / portfolio URLs from the document if clearly present; leave fields empty otherwise. Never guess an email or phone.

SCORING RULES (be authentic and realistic - most real CVs score 55-85):
- ats_score: integer 0-100 for how well this CV would pass an ATS filter for the target role if one is provided, otherwise for the role stated in the CV.
- ats_summary: 1-2 sentences explaining the score in plain English.
- ats_breakdown: exactly these 5 categories, each with an integer score 0-100 and a one-sentence plain-English note:
  1. "Keyword Match"  2. "Impact & Metrics"  3. "Completeness"  4. "Clarity & Formatting"  5. "Role Relevance"
- missing_keywords: if a target role is provided, list important skills/keywords for that role that are NOT clearly present in the CV. If no target role is given, return an empty array.
- suggestions: exactly 3 clear, complete, actionable sentences specific to THIS CV.

WRITING STYLE: Never use em-dash or en-dash characters anywhere in your output (summary, bullet points, suggestions, or any text field). Use a comma, a period, or a spaced hyphen ( - ) instead.`

/**
 * Try `fn` with each configured Gemini key in turn until one succeeds.
 * A single dead/denied key in the pool must not take the feature down, and
 * `pickGeminiKey()` starts at index 0 on every cold start.
 */
async function firstOkKey(fn: (key: string) => Promise<Response>): Promise<{ res: Response | null; status: number; err: string }> {
  let status = 0
  let err = ''
  for (let attempt = 0; attempt < 4; attempt++) {
    const key = pickGeminiKey()
    if (!key) break
    try {
      const res = await fn(key)
      if (res.ok) return { res, status: 0, err: '' }
      status = res.status
      err = (await res.text()).slice(0, 300)
    } catch (e) {
      status = 0
      err = e instanceof Error ? e.message : 'network error'
    }
  }
  return { res: null, status, err }
}

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

  if (!pickGeminiKey()) {
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
  let parts: Record<string, unknown>[]
  if (mime === 'application/pdf') {
    parts = [{ inlineData: { mimeType: mime, data: fileData } }, { text: userPrompt }]
  } else {
    let text: string
    try {
      text = await extractCvText(bytes, mime)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not read that file.'
      return NextResponse.json({ error: message }, { status: 422 })
    }
    parts = [{ text }, { text: userPrompt }]
  }

  // Call Gemini, rotating keys until one works (handles a dead key in the pool).
  const { res, status, err } = await firstOkKey((key) =>
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      }
    )
  )
  if (!res) {
    console.error('Gemini API error (upload-cv):', err)
    if (status === 403) {
      return NextResponse.json(
        { error: 'AI access was denied for your configured Gemini key. Check GEMINI_API_KEYS in .env.local and remove any invalid keys.' },
        { status: 502 }
      )
    }
    return NextResponse.json({ error: 'Something went wrong analyzing your CV. Please try again.' }, { status: 502 })
  }

  try {
    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return NextResponse.json({ error: 'AI returned an empty response. Please try again.' }, { status: 502 })

    const cv = JSON.parse(text)

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
