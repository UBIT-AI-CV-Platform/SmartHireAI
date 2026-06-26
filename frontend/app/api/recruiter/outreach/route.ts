import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@/lib/supabase/server'
import { geminiGenerate } from '@/lib/gemini'

export const runtime = 'nodejs'
export const maxDuration = 60

// Simple per-user rate limit: max 10 send actions per minute per serverless instance
const sendLog = new Map<string, number[]>()
function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const window = 60_000
  const recent = (sendLog.get(userId) ?? []).filter((t) => now - t < window)
  if (recent.length >= 10) return false
  sendLog.set(userId, [...recent, now])
  return true
}


const KIND_PROMPT: Record<string, string> = {
  interview: 'Invite the candidate to an interview. Warm, enthusiastic, and clear. Mention the role and that you were impressed. Ask for their availability. Do NOT invent a specific date/time.',
  rejection: 'Politely and kindly let the candidate know they were not selected for this role. Be respectful, encouraging, and brief. Wish them well.',
  offer: 'Congratulate the candidate and extend a job offer for the role. Be warm and excited. Mention next steps will follow. Do NOT invent salary numbers.',
}

const SYSTEM_PROMPT = `You are a professional, warm recruiter writing a short outreach email to a job candidate.
Rules:
- 3 short paragraphs max. Professional but human and friendly.
- Use the candidate's first name and the job title/company naturally.
- Output ONLY the email body (no subject line, no markdown, no placeholders like [Your Name] — sign off with the recruiter/company name provided).`

async function sendMail(to: string, subject: string, body: string, fromName: string) {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = Number(process.env.SMTP_PORT || 465)
  const user = process.env.SMTP_USER || process.env.GMAIL_USER
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD
  if (!user || !pass || !to) return false
  const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass }, tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' } })
  const html = `<div style="font-family:'Inter',Arial,sans-serif;font-size:14px;line-height:22px;color:#191c1e;white-space:pre-line">${body.replace(/</g, '&lt;')}</div>`
  await transporter.sendMail({ from: `"${fromName}" <${user}>`, to, subject, html })
  return true
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const applicationId: string | undefined = body.applicationId
  const kind: string = ['interview', 'rejection', 'offer'].includes(body.kind) ? body.kind : 'interview'
  const action: string = body.action === 'send' ? 'send' : 'draft'
  const draftText: string | undefined = typeof body.text === 'string' ? body.text.trim().slice(0, 10000) : undefined

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  if (!applicationId) return NextResponse.json({ error: 'No applicant selected.' }, { status: 400 })

  // verify the recruiter owns the job behind this application
  const { data: app } = await supabase
    .from('applications')
    .select('candidate_name, candidate_email, job:jobs(title, company, recruiter_id)')
    .eq('id', applicationId)
    .single()
  const job = app?.job as unknown as { title: string; company: string; recruiter_id: string } | null
  if (!app || !job) return NextResponse.json({ error: 'Applicant not found.' }, { status: 404 })
  if (job.recruiter_id !== user.id) return NextResponse.json({ error: 'Not your applicant.' }, { status: 403 })

  const { data: prof } = await supabase.from('profiles').select('full_name, company_name').eq('id', user.id).single()
  const fromName = prof?.company_name || prof?.full_name || 'SmartHire AI'
  const safeTitle = job.title.replace(/[\r\n]/g, ' ')
  const safeCompany = job.company.replace(/[\r\n]/g, ' ')
  const subjects: Record<string, string> = {
    interview: `Interview invitation — ${safeTitle} at ${safeCompany}`,
    rejection: `Update on your application — ${safeTitle}`,
    offer: `Great news about your application — ${safeTitle}`,
  }

  // ── SEND an already-written draft ──────────────────────────────────────────
  if (action === 'send') {
    if (!checkRateLimit(user.id)) return NextResponse.json({ error: 'Too many emails sent. Please wait a moment.' }, { status: 429 })
    if (!draftText || !app.candidate_email) return NextResponse.json({ error: 'Nothing to send, or the candidate has no email.' }, { status: 400 })
    try {
      const ok = await sendMail(app.candidate_email, subjects[kind], draftText, fromName)
      if (!ok) return NextResponse.json({ error: 'Email is not configured (SMTP). Add SMTP creds to .env.local.' }, { status: 500 })
      return NextResponse.json({ sent: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      return NextResponse.json({ error: `Could not send: ${msg}` }, { status: 500 })
    }
  }

  // ── DRAFT with AI ──────────────────────────────────────────────────────────
  const userPrompt = `Email type: ${KIND_PROMPT[kind]}
Candidate name: ${app.candidate_name || 'the candidate'}
Role: ${job.title}
Company: ${job.company}
Sign off as: ${fromName}`

  try {
    const text = await geminiGenerate({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.8 },
    })
    return NextResponse.json({ text, subject: subjects[kind], candidateEmail: app.candidate_email })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not draft the email. Please try again.'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
