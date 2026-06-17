import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const GEMINI_MODEL = 'gemini-2.5-flash'

const SYSTEM_PROMPT = `You are an expert career writer. Write a professional, compelling cover letter for the candidate.

Rules:
- Be truthful — use ONLY facts from the candidate's profile. Never invent experience, employers, or metrics.
- 3 to 4 short paragraphs: (1) a strong opening stating the role and a hook, (2-3) why the candidate is a great fit, drawing on real skills/projects, (3) a confident closing with a call to action.
- Tailor it to the target role and (if given) the company and job description.
- Warm, confident, professional tone (adjust to the requested tone). No clichés like "I am writing to apply".
- Output ONLY the cover letter body text (no markdown, no placeholders like [Your Name] — use the candidate's real name where relevant). Separate paragraphs with a blank line.`

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const targetRole: string = (body.targetRole || '').trim()
  const company: string = (body.company || '').trim().slice(0, 200)
  const tone: string = body.tone || 'Professional'
  const jobDescription: string = (body.jobDescription || '').trim().slice(0, 4000)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'AI is not configured. Add GEMINI_API_KEY to .env.local.' }, { status: 500 })

  const [p, sk, ed, pr, ce] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('skills').select('name').eq('profile_id', user.id),
    supabase.from('education').select('*').eq('profile_id', user.id),
    supabase.from('projects').select('*').eq('profile_id', user.id),
    supabase.from('certifications').select('*').eq('profile_id', user.id),
  ])
  if (!p.data) return NextResponse.json({ error: 'Please build your profile first.' }, { status: 400 })

  const profileText = [
    `Name: ${p.data.full_name || ''}`,
    `Current/desired role: ${p.data.desired_role || ''}`,
    `Location: ${p.data.location || ''}`,
    `Summary: ${p.data.summary || ''}`,
    `Skills: ${(sk.data ?? []).map((s) => s.name).join(', ')}`,
    `Education: ${(ed.data ?? []).map((e) => `${e.degree}, ${e.institute}`).join('; ')}`,
    `Projects: ${(pr.data ?? []).map((x) => `${x.name}: ${x.description || ''}`).join('; ')}`,
    `Certifications: ${(ce.data ?? []).map((c) => c.name).join(', ')}`,
  ].join('\n')

  const userPrompt = `Target role: ${targetRole || p.data.desired_role || 'the role'}
${company ? `Company: ${company}` : ''}
Tone: ${tone}
${jobDescription ? `\nJob description:\n${jobDescription}\n` : ''}
Candidate profile:
${profileText}`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.8 },
        }),
      }
    )
    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: `AI request failed: ${errText.slice(0, 300)}` }, { status: 502 })
    }
    const data = await res.json()
    const letter = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!letter) return NextResponse.json({ error: 'AI returned an empty response. Please try again.' }, { status: 502 })

    const trimmed = letter.trim()
    const { data: saved } = await supabase
      .from('cover_letters')
      .insert({
        profile_id: user.id,
        target_role: targetRole || p.data.desired_role || null,
        company: company || null,
        tone,
        content: trimmed,
      })
      .select('id')
      .single()

    return NextResponse.json({ letter: trimmed, id: saved?.id ?? null })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: `Could not generate cover letter: ${message}` }, { status: 500 })
  }
}
