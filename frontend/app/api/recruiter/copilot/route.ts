import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { pickGeminiKey } from '@/lib/gemini'

export const runtime = 'nodejs'
export const maxDuration = 60

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

type ChatMsg = { role: 'user' | 'assistant'; content: string }

const buildSystemPrompt = (company: string, jobsText: string) => `You are "SmartHire Copilot", an expert recruiting assistant helping a recruiter${company ? ` at ${company}` : ''}.

You help with: writing & improving job descriptions, drafting candidate emails (invites, rejections, offers), suggesting interview questions, screening criteria, sourcing strategy, evaluating candidate fit, and general hiring best practices.

${jobsText ? `The recruiter's current open roles:\n${jobsText}\n` : ''}
Guidelines:
- Be practical, specific, and concise. Use markdown (short paragraphs, **bold**, bullet/numbered lists).
- When asked to write something (email, JD, questions), produce a clean ready-to-use draft.
- Be encouraging and professional. Never invent candidate data.
- If asked something outside recruiting, gently steer back to hiring help.`

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const messages: ChatMsg[] = Array.isArray(body.messages) ? body.messages : []
  if (messages.length === 0) return NextResponse.json({ error: 'No messages provided.' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  const apiKey = pickGeminiKey()
  if (!apiKey) return NextResponse.json({ error: 'AI is not configured. Add GEMINI_API_KEY or GEMINI_API_KEYS to .env.local.' }, { status: 500 })

  const [prof, jobsRes] = await Promise.all([
    supabase.from('profiles').select('company_name').eq('id', user.id).single(),
    supabase.from('jobs').select('title, is_open').eq('recruiter_id', user.id).order('created_at', { ascending: false }).limit(15),
  ])
  const company = prof.data?.company_name || ''
  const jobsText = ((jobsRes.data ?? []) as { title: string; is_open: boolean }[]).map((j) => `- ${j.title}${j.is_open ? '' : ' (closed)'}`).join('\n')

  const contents = messages.slice(-24).map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))

  let geminiRes: Response
  try {
    geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: buildSystemPrompt(company, jobsText) }] },
        contents,
        generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
      }),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: `Could not reach the AI service: ${msg}` }, { status: 500 })
  }

  if (!geminiRes.ok || !geminiRes.body) {
    const errText = await geminiRes.text().catch(() => '')
    console.error('Gemini API error (copilot):', errText.slice(0, 500))
    return NextResponse.json({ error: 'Something went wrong with the AI copilot. Please try again.' }, { status: 502 })
  }

  const reader = geminiRes.body.getReader()
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = ''
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            const t = line.trim()
            if (!t.startsWith('data:')) continue
            const json = t.slice(5).trim()
            if (!json || json === '[DONE]') continue
            try {
              const parsed = JSON.parse(json)
              const parts = parsed?.candidates?.[0]?.content?.parts
              if (Array.isArray(parts)) for (const p of parts) if (p?.text) controller.enqueue(encoder.encode(p.text))
            } catch { /* ignore */ }
          }
        }
      } catch { /* interrupted */ } finally { controller.close() }
    },
  })

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' } })
}
