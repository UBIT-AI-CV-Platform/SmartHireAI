import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@/lib/supabase/server'
import { newMessageEmail, interviewScheduledEmail, offerEmail, rejectionEmail } from '@/lib/emails'

export const runtime = 'nodejs'
export const maxDuration = 30

// Send a branded email best-effort. Returns false (never throws to the caller)
// when SMTP isn't configured — inbox actions must keep working without email.
async function sendMail(to: string, subject: string, html: string, fromName: string) {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = Number(process.env.SMTP_PORT || 465)
  const user = process.env.SMTP_USER || process.env.GMAIL_USER
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD
  if (!user || !pass || !to) return false
  const transporter = nodemailer.createTransport({
    host, port, secure: port === 465, auth: { user, pass },
    tls: { rejectUnauthorized: false },
  })
  const info = await transporter.sendMail({ from: `"${fromName}" <${user}>`, to, subject, html })
  console.log('[inbox] email sent:', info.messageId, '→', to)
  return true
}

type Conv = {
  recruiter_id: string; candidate_id: string
  recruiter_name: string | null; recruiter_email: string | null
  candidate_name: string | null; candidate_email: string | null
  company: string | null; job_title: string | null
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const event: string = body.event
  const conversationId: string | undefined = body.conversationId
  if (!conversationId || !event) return NextResponse.json({ error: 'Missing event or conversation.' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  // RLS guarantees the caller is a member of this conversation.
  const { data: conv } = await supabase
    .from('conversations')
    .select('recruiter_id, candidate_id, recruiter_name, recruiter_email, candidate_name, candidate_email, company, job_title')
    .eq('id', conversationId)
    .single()
  if (!conv) return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 })
  const c = conv as Conv
  const isRecruiter = user.id === c.recruiter_id
  if (!isRecruiter && user.id !== c.candidate_id) return NextResponse.json({ error: 'Not a participant.' }, { status: 403 })

  const jobTitle = body.jobTitle || c.job_title || 'the role'
  const company = c.company || c.recruiter_name || 'the company'

  try {
    let emailed = false
    if (event === 'message') {
      // Notify whoever is NOT the sender.
      const toCandidate = isRecruiter
      const to = toCandidate ? c.candidate_email : c.recruiter_email
      const name = toCandidate ? c.candidate_name : c.recruiter_name
      const fromName = isRecruiter ? (c.recruiter_name || 'SmartHire AI') : (c.candidate_name || 'A candidate')
      const { subject, html } = newMessageEmail({
        name: name || '', fromName, preview: String(body.preview || 'New message'),
        basePath: toCandidate ? '/candidate' : '/recruiter',
        role: toCandidate ? 'candidate' : 'recruiter',
      })
      emailed = await sendMail(to || '', subject, html, isRecruiter ? (c.recruiter_name || 'SmartHire AI') : 'SmartHire AI')
    } else if (event === 'interview') {
      const { subject, html } = interviewScheduledEmail({
        name: c.candidate_name || '', jobTitle, company,
        whenText: String(body.whenText || 'Time to be confirmed'),
        durationMin: body.durationMin, notes: body.notes || null,
      })
      emailed = await sendMail(c.candidate_email || '', subject, html, c.recruiter_name || 'SmartHire AI')
    } else if (event === 'offer') {
      const { subject, html } = offerEmail({ name: c.candidate_name || '', jobTitle, company })
      emailed = await sendMail(c.candidate_email || '', subject, html, c.recruiter_name || 'SmartHire AI')
    } else if (event === 'rejection') {
      const { subject, html } = rejectionEmail({ name: c.candidate_name || '', jobTitle, company })
      emailed = await sendMail(c.candidate_email || '', subject, html, c.recruiter_name || 'SmartHire AI')
    } else {
      return NextResponse.json({ error: 'Unknown event.' }, { status: 400 })
    }
    if (!emailed) console.warn(`[inbox] ${event} email skipped — SMTP not configured or no recipient email`)
    return NextResponse.json({ emailed })
  } catch (e) {
    console.error('[inbox] email failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ emailed: false })
  }
}
