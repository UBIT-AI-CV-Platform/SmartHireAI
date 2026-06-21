import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { geminiGenerate } from '@/lib/gemini'

export const runtime = 'nodejs'
export const maxDuration = 60

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    intro: { type: 'string' },
    categories: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                question: { type: 'string' },
                look_for: { type: 'string' },
              },
              required: ['question', 'look_for'],
            },
          },
        },
        required: ['name', 'questions'],
      },
    },
    red_flags: { type: 'array', items: { type: 'string' } },
    closing_tip: { type: 'string' },
  },
  required: ['intro', 'categories', 'red_flags', 'closing_tip'],
}

const SYSTEM_PROMPT = `You are an expert interviewer and hiring manager. Build a focused, practical interview kit for the given role${''}.

Produce:
- "intro": one short sentence framing the interview.
- "categories": 3-5 categories appropriate to the role (e.g. Technical, Problem Solving, Behavioral, Role-Specific, Culture Fit). Each has 3-4 strong questions. For EACH question include "look_for": what a great answer demonstrates.
- "red_flags": 3-5 warning signs to watch for in this role.
- "closing_tip": one practical tip for the interviewer.

Tailor everything to the specific role, seniority, and required skills. Be concrete and useful — not generic.`

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

  const userPrompt = `ROLE: ${job.title} at ${job.company}
Location: ${job.location || '—'}
Required skills: ${(job.skills ?? []).join(', ') || '—'}
Description: ${job.description || '—'}`

  try {
    const text = await geminiGenerate({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.7, responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA },
    })
    return NextResponse.json(JSON.parse(text))
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not build the interview kit. Please try again.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
