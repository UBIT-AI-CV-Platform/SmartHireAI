import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { geminiGenerate } from '@/lib/gemini'

export const runtime = 'nodejs'
export const maxDuration = 60

const SYSTEM_PROMPT = `You are an expert recruiter and copywriter. Write a compelling, professional job description from the details given.

Rules:
- Structure: a short engaging intro about the role, then "What you'll do" (4-6 bullet points), then "What we're looking for" (4-6 bullet points covering the required skills), and a brief closing line.
- Use the company name and required skills naturally.
- Warm, modern, inclusive tone. No buzzword salad, no discriminatory language.
- Output ONLY the job description text (plain text with simple dashes for bullets). No markdown headers, no preamble like "Here is...".`

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const title: string = (body.title || '').toString().trim().slice(0, 200)
  const company: string = (body.company || '').toString().trim().slice(0, 200)
  const skills: string = (body.skills || '').toString().trim().slice(0, 400)
  const notes: string = (body.notes || '').toString().trim().slice(0, 1000)
  if (!title) return NextResponse.json({ error: 'Enter a job title first.' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  const userPrompt = `Job title: ${title}
${company ? `Company: ${company}` : ''}
${skills ? `Required skills: ${skills}` : ''}
${notes ? `Extra notes: ${notes}` : ''}`

  try {
    const text = await geminiGenerate({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.8 },
    })
    return NextResponse.json({ description: text })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not write the description. Please try again.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
