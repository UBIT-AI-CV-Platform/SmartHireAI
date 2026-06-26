import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@/lib/supabase/server'
import { applicationConfirmationEmail } from '@/lib/emails'

export const runtime = 'nodejs'
export const maxDuration = 30

const norm = (s: string) => s.toLowerCase().trim()
const matchScore = (jobSkills: string[], mySkills: string[]): number | null => {
  if (!jobSkills?.length) return null
  const mine = new Set(mySkills.map(norm))
  return Math.round((jobSkills.filter((s) => mine.has(norm(s))).length / jobSkills.length) * 100)
}

async function sendConfirmation(to: string, opts: { name: string; jobTitle: string; company: string; location: string | null; matchScore: number | null }) {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = Number(process.env.SMTP_PORT || 465)
  const user = process.env.SMTP_USER || process.env.GMAIL_USER
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD
  if (!user || !pass || !to) return false
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
  })
  const { subject, html } = applicationConfirmationEmail(opts)
  const info = await transporter.sendMail({ from: `"SmartHire AI" <${user}>`, to, subject, html })
  console.log('[apply] confirmation email sent:', info.messageId)
  return true
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const jobId: string | undefined = body.jobId
  const cvId: string | undefined = body.cvId
  if (!jobId || !cvId) return NextResponse.json({ error: 'Missing job or CV.' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  const [cvRes, jobRes, profRes, skillsRes] = await Promise.all([
    supabase.from('cvs').select('id, content').eq('id', cvId).eq('profile_id', user.id).single(),
    supabase.from('jobs').select('id, title, company, location, skills, is_open').eq('id', jobId).single(),
    supabase.from('profiles').select('full_name, email').eq('id', user.id).single(),
    supabase.from('skills').select('name').eq('profile_id', user.id),
  ])

  if (!cvRes.data) return NextResponse.json({ error: 'That CV could not be found. Please pick another.' }, { status: 400 })
  if (!jobRes.data) return NextResponse.json({ error: 'This job is no longer available.' }, { status: 400 })
  if (!jobRes.data.is_open) return NextResponse.json({ error: 'This job has been closed by the recruiter.' }, { status: 400 })

  const job = jobRes.data
  const mySkills = ((skillsRes.data ?? []) as { name: string }[]).map((s) => s.name)
  const score = matchScore(job.skills ?? [], mySkills)
  const candidateName = profRes.data?.full_name || null
  const candidateEmail = profRes.data?.email || user.email || null

  const { data: app, error } = await supabase
    .from('applications')
    .insert({
      job_id: job.id,
      candidate_id: user.id,
      cv_id: cvRes.data.id,
      cv_snapshot: cvRes.data.content,
      candidate_name: candidateName,
      candidate_email: candidateEmail,
      match_score: score,
    })
    .select('*, job:jobs(*)')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'You have already applied to this job.' }, { status: 409 })
    return NextResponse.json({ error: 'Could not submit your application. Please try again.' }, { status: 500 })
  }

  let emailed = false
  try {
    emailed = await sendConfirmation(candidateEmail || '', {
      name: candidateName || '',
      jobTitle: job.title,
      company: job.company,
      location: job.location,
      matchScore: score,
    })
    if (!emailed) console.warn('[apply] confirmation email skipped — SMTP env vars not set, or no candidate email')
  } catch (e) {
    // email is best-effort — never fail the application because of it
    console.error('[apply] confirmation email failed:', e instanceof Error ? e.message : e)
    emailed = false
  }

  return NextResponse.json({ application: app, emailed })
}
