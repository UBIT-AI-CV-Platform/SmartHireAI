import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { geminiGenerate } from '@/lib/gemini'

export const runtime = 'nodejs'
export const maxDuration = 60

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    overall_summary: { type: 'string' },
    ranked: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          application_id: { type: 'string' },
          name: { type: 'string' },
          score: { type: 'integer' },
          verdict: { type: 'string' },
          strengths: { type: 'array', items: { type: 'string' } },
          concerns: { type: 'array', items: { type: 'string' } },
          recommendation: { type: 'string', enum: ['Shortlist', 'Maybe', 'Pass'] },
        },
        required: ['application_id', 'name', 'score', 'verdict', 'strengths', 'concerns', 'recommendation'],
      },
    },
  },
  required: ['overall_summary', 'ranked'],
}

const SYSTEM_PROMPT = `You are an expert technical recruiter and hiring assistant. Given a job and a list of applicants (with their CV details), evaluate each candidate's fit for THIS role.

For each applicant:
- Give a fit "score" from 0-100 based on how well their skills/experience match the job requirements.
- "verdict": one concise sentence summarizing their fit.
- "strengths": 1-3 specific strengths relevant to this job (use real details from their CV).
- "concerns": 0-3 honest gaps or risks for this role (empty if none).
- "recommendation": "Shortlist" (strong fit), "Maybe" (partial fit), or "Pass" (weak fit).
- ALWAYS echo back the exact application_id you were given for that applicant.

Rank from best to worst. Be fair, specific, and grounded ONLY in the provided CV data — never invent experience. Also give an "overall_summary" (2-3 sentences) about the candidate pool and who stands out.`

type Snapshot = {
  full_name?: string; title?: string; summary?: string; skills?: string[]
  experience?: { role?: string; organization?: string }[]
  education?: { degree?: string; institute?: string }[]
  certifications?: { name?: string }[]
}

const cvToText = (cv: Snapshot | null): string => {
  if (!cv) return 'No CV provided.'
  const exp = (cv.experience ?? []).slice(0, 4).map((e) => `${e.role || ''}${e.organization ? ` @ ${e.organization}` : ''}`).filter(Boolean).join('; ')
  const edu = (cv.education ?? []).slice(0, 2).map((e) => `${e.degree || ''}${e.institute ? `, ${e.institute}` : ''}`).filter(Boolean).join('; ')
  return [
    cv.title ? `Title: ${cv.title}` : '',
    cv.summary ? `Summary: ${cv.summary}` : '',
    `Skills: ${(cv.skills ?? []).join(', ') || '—'}`,
    exp ? `Experience: ${exp}` : '',
    edu ? `Education: ${edu}` : '',
    cv.certifications?.length ? `Certifications: ${cv.certifications.map((c) => c.name).join(', ')}` : '',
  ].filter(Boolean).join('\n')
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const jobId: string | undefined = body.jobId
  if (!jobId) return NextResponse.json({ error: 'No job selected.' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  const { data: job } = await supabase.from('jobs').select('title, company, location, skills, description, recruiter_id').eq('id', jobId).single()
  if (!job) return NextResponse.json({ error: 'Job not found.' }, { status: 404 })
  if (job.recruiter_id !== user.id) return NextResponse.json({ error: 'Not your job.' }, { status: 403 })

  const { data: apps } = await supabase
    .from('applications')
    .select('id, candidate_name, cv_snapshot')
    .eq('job_id', jobId)
    .limit(30)

  if (!apps || apps.length === 0) return NextResponse.json({ error: 'No applicants to screen yet.' }, { status: 400 })

  const applicantBlocks = apps.map((a, i) => {
    const name = a.candidate_name || `Candidate ${i + 1}`
    return `--- APPLICANT (application_id: ${a.id}) ---\nName: ${name}\n${cvToText(a.cv_snapshot as Snapshot | null)}`
  }).join('\n\n')

  const userPrompt = `JOB
Title: ${job.title}
Company: ${job.company}
Location: ${job.location || '—'}
Required skills: ${(job.skills ?? []).join(', ') || '—'}
Description: ${job.description || '—'}

APPLICANTS (${apps.length})
${applicantBlocks}`

  try {
    const text = await geminiGenerate({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.4, responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA },
    })
    const parsed = JSON.parse(text)
    parsed.ranked = (parsed.ranked ?? []).sort((a: { score: number }, b: { score: number }) => b.score - a.score)
    return NextResponse.json(parsed)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not screen applicants. Please try again.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
