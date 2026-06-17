'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type AppStatus = 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'withdrawn'
type Job = { id: string; title: string; company: string; location: string | null; skills: string[]; created_at: string }
type Application = { id: string; status: AppStatus; match_score: number | null; applied_at: string; updated_at: string; job: Job | null }

const norm = (s: string) => s.toLowerCase().trim()
const matchScore = (jobSkills: string[], mySkills: string[]): number | null => {
  if (!jobSkills?.length) return null
  const mine = new Set(mySkills.map(norm))
  return Math.round((jobSkills.filter((s) => mine.has(norm(s))).length / jobSkills.length) * 100)
}
const scoreColor = (s: number) => (s >= 75 ? 'text-green-600' : s >= 40 ? 'text-amber-600' : 'text-slate-500')
const AVATAR = ['bg-indigo-100 text-indigo-700', 'bg-purple-100 text-purple-700', 'bg-sky-100 text-sky-700', 'bg-pink-100 text-pink-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700']
const avatarColor = (s: string) => AVATAR[Array.from(s).reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR.length]

const STATUS_META: Record<AppStatus, { label: string; dot: string; bar: string; icon: string }> = {
  applied: { label: 'Applied', dot: 'bg-indigo-500', bar: 'bg-indigo-500', icon: 'send' },
  screening: { label: 'Screening', dot: 'bg-amber-500', bar: 'bg-amber-500', icon: 'fact_check' },
  interview: { label: 'Interview', dot: 'bg-sky-500', bar: 'bg-sky-500', icon: 'event' },
  offer: { label: 'Offer', dot: 'bg-green-500', bar: 'bg-green-500', icon: 'verified' },
  rejected: { label: 'Rejected', dot: 'bg-red-400', bar: 'bg-red-400', icon: 'cancel' },
  withdrawn: { label: 'Withdrawn', dot: 'bg-slate-400', bar: 'bg-slate-400', icon: 'undo' },
}

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d > 0) return `${d}d ago`
  const h = Math.floor(diff / 3600000)
  if (h > 0) return `${h}h ago`
  const m = Math.floor(diff / 60000)
  return m > 1 ? `${m}m ago` : 'just now'
}

export default function OverviewPage() {
  const [loading, setLoading] = useState(true)
  const [prof, setProf] = useState<{ fullName: string; first: string; photo: string | null; summary: boolean; desiredRole: string | null; location: string | null }>({ fullName: '', first: '', photo: null, summary: false, desiredRole: null, location: null })
  const [skills, setSkills] = useState<string[]>([])
  const [eduCount, setEduCount] = useState(0)
  const [apps, setApps] = useState<Application[]>([])
  const [cvCount, setCvCount] = useState(0)
  const [resumeScore, setResumeScore] = useState<number | null>(null)
  const [savedCount, setSavedCount] = useState(0)
  const [coverCount, setCoverCount] = useState(0)
  const [sessionCount, setSessionCount] = useState(0)
  const [jobs, setJobs] = useState<Job[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      const [p, sk, edu, appsRes, cvs, saved, covers, sess, jobsRes] = await Promise.all([
        supabase.from('profiles').select('full_name, photo_url, summary, desired_role, location').eq('id', user.id).single(),
        supabase.from('skills').select('name').eq('profile_id', user.id),
        supabase.from('education').select('id', { count: 'exact', head: true }).eq('profile_id', user.id),
        supabase.from('applications').select('id, status, match_score, applied_at, updated_at, job:jobs(id, title, company, location, skills, created_at)').eq('candidate_id', user.id),
        supabase.from('cvs').select('id, ats_score').eq('profile_id', user.id).order('created_at', { ascending: false }),
        supabase.from('saved_jobs').select('job_id', { count: 'exact', head: true }).eq('profile_id', user.id),
        supabase.from('cover_letters').select('id', { count: 'exact', head: true }).eq('profile_id', user.id),
        supabase.from('interview_sessions').select('id', { count: 'exact', head: true }).eq('profile_id', user.id),
        supabase.from('jobs').select('id, title, company, location, skills, created_at').eq('is_open', true).order('created_at', { ascending: false }),
      ])
      const fullName = p.data?.full_name || user.email?.split('@')[0] || 'there'
      setProf({ fullName, first: fullName.split(' ')[0], photo: p.data?.photo_url ?? null, summary: !!p.data?.summary, desiredRole: p.data?.desired_role ?? null, location: p.data?.location ?? null })
      setSkills(((sk.data ?? []) as { name: string }[]).map((s) => s.name))
      setEduCount(edu.count ?? 0)
      setApps((appsRes.data as unknown as Application[]) ?? [])
      const cvRows = (cvs.data as { id: string; ats_score: number | null }[]) ?? []
      setCvCount(cvRows.length)
      setResumeScore(cvRows[0]?.ats_score ?? null)
      setSavedCount(saved.count ?? 0)
      setCoverCount(covers.count ?? 0)
      setSessionCount(sess.count ?? 0)
      setJobs((jobsRes.data as Job[]) ?? [])
      setLoading(false)
    })
  }, [])

  const activeApps = useMemo(() => apps.filter((a) => a.status !== 'withdrawn'), [apps])
  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {}
    activeApps.forEach((a) => { c[a.status] = (c[a.status] || 0) + 1 })
    return c
  }, [activeApps])
  const appliedJobIds = useMemo(() => new Set(apps.map((a) => a.job?.id).filter(Boolean)), [apps])
  const upcomingInterviews = useMemo(() => activeApps.filter((a) => a.status === 'interview'), [activeApps])
  const activity = useMemo(() => [...activeApps].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at)).slice(0, 5), [activeApps])

  const recommended = useMemo(() => jobs.filter((j) => !appliedJobIds.has(j.id)).map((j) => ({ j, s: matchScore(j.skills, skills) ?? 0 })).sort((a, b) => b.s - a.s).slice(0, 4), [jobs, skills, appliedJobIds])

  const completeness = useMemo(() => {
    const items = [
      { label: 'Add a profile photo', done: !!prof.photo, href: '/candidate/build-profile' },
      { label: 'Write a professional summary', done: prof.summary, href: '/candidate/build-profile' },
      { label: 'Set your target role', done: !!prof.desiredRole, href: '/candidate/build-profile' },
      { label: 'Add your skills', done: skills.length > 0, href: '/candidate/build-profile' },
      { label: 'Add your education', done: eduCount > 0, href: '/candidate/build-profile' },
      { label: 'Generate your first CV', done: cvCount > 0, href: '/candidate/cv-generator' },
    ]
    const done = items.filter((i) => i.done).length
    return { items, percent: Math.round((done / items.length) * 100), done, total: items.length }
  }, [prof, skills, eduCount, cvCount])

  const stats = [
    { label: 'Applications', value: activeApps.length, icon: 'description', bg: 'bg-purple-200/60', text: 'text-purple-950', sub: 'text-purple-800/80', href: '/candidate/my-applications' },
    { label: 'Interviews', value: statusCounts.interview || 0, icon: 'event_available', bg: 'bg-sky-200/60', text: 'text-sky-950', sub: 'text-sky-800/80', href: '/candidate/my-applications' },
    { label: 'Offers', value: statusCounts.offer || 0, icon: 'emoji_events', bg: 'bg-pink-200/60', text: 'text-pink-950', sub: 'text-pink-800/80', href: '/candidate/my-applications' },
    { label: 'Saved Jobs', value: savedCount, icon: 'bookmark', bg: 'bg-indigo-200/60', text: 'text-indigo-950', sub: 'text-indigo-800/80', href: '/candidate/my-applications' },
  ]

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce"></div>
          <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
          <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
        </div>
        <p className="text-xs font-black text-primary tracking-widest uppercase">Loading your dashboard...</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Profile hero */}
      <div className="mb-6 rounded-[1.5rem] bg-gradient-to-br from-white to-indigo-50/60 border border-surface-container shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] p-5 md:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-white shadow-md flex items-center justify-center bg-indigo-100">
          {prof.photo ? (
            <img src={prof.photo} alt={prof.fullName} className="h-full w-full object-cover" />
          ) : (
            <span className={`flex items-center justify-center h-full w-full text-2xl font-black ${avatarColor(prof.fullName)}`}>{prof.fullName.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-on-surface">{greeting()}, {prof.first} 👋</h2>
          <p className="text-on-surface-variant text-sm mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-primary">{prof.desiredRole || 'Candidate'}</span>
            {prof.location && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">location_on</span>{prof.location}</span>}
            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">trending_up</span>{completeness.percent}% profile complete</span>
          </p>
        </div>
        <Link href="/candidate/build-profile" className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-surface-container text-on-surface font-bold text-sm hover:shadow-md hover:border-primary/40 transition-all flex-shrink-0">
          <span className="material-symbols-outlined text-base">edit</span>Edit Profile
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-6">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className={`group p-4 md:p-6 rounded-[1.5rem] ${s.bg} shadow-sm flex flex-col hover:-translate-y-0.5 transition-all`}>
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white/70 flex items-center justify-center mb-3">
              <span className={`material-symbols-outlined ${s.text} transition-transform duration-300 group-hover:scale-110`} style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
            </div>
            <h3 className={`text-2xl md:text-3xl font-black ${s.text}`}>{s.value}</h3>
            <p className={`font-bold uppercase tracking-wider text-[0.6rem] md:text-[0.7rem] mt-1 ${s.sub}`}>{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* LEFT */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Upcoming interviews */}
          {upcomingInterviews.length > 0 && (
            <div className="bg-sky-50 border border-sky-100 rounded-[1.5rem] p-5 md:p-6">
              <h3 className="text-base font-bold text-on-surface mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-sky-600">event</span>Upcoming Interviews</h3>
              <div className="space-y-2">
                {upcomingInterviews.map((a) => (
                  <Link key={a.id} href="/candidate/my-applications" className="flex items-center gap-3 p-3 rounded-xl bg-white hover:shadow-sm transition-all">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-black ${avatarColor(a.job?.company || '?')}`}>{(a.job?.company || '?').charAt(0).toUpperCase()}</div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-bold text-on-surface truncate">{a.job?.title}</p><p className="text-xs text-on-surface-variant truncate">{a.job?.company}{a.job?.location ? ` • ${a.job.location}` : ''}</p></div>
                    <span className="px-2.5 py-1 bg-sky-100 text-sky-700 text-xs font-bold rounded-full flex-shrink-0">Interview</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recommended jobs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base md:text-lg font-bold text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-primary">recommend</span>Recommended for You</h3>
              <Link href="/candidate/my-applications" className="text-primary font-medium hover:underline flex items-center gap-1 text-sm">View all <span className="material-symbols-outlined text-sm">arrow_forward</span></Link>
            </div>
            {recommended.length === 0 ? (
              <div className="bg-white rounded-[1.5rem] border border-surface-container p-8 text-center shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)]">
                <p className="text-sm text-on-surface-variant">No job recommendations yet. {skills.length === 0 ? <>Add skills to your profile to get matched.</> : <>Check back soon for new roles.</>}</p>
                <Link href="/candidate/my-applications" className="inline-block mt-3 text-sm font-bold text-primary hover:underline">Browse all jobs →</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recommended.map(({ j, s }) => (
                  <Link key={j.id} href="/candidate/my-applications" className="bg-white p-4 md:p-5 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container flex items-center gap-4 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-8px_rgba(25,28,30,0.14)] transition-all">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-black ${avatarColor(j.company)}`}>{j.company.charAt(0).toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm md:text-base font-bold text-on-surface truncate">{j.title}</h4>
                      <p className="text-on-surface-variant text-xs md:text-sm truncate">{j.company}{j.location ? ` • ${j.location}` : ''}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">{j.skills.slice(0, 3).map((sk) => <span key={sk} className="px-2 py-0.5 bg-surface-container text-on-surface-variant text-[11px] rounded-md">{sk}</span>)}</div>
                    </div>
                    {s > 0 && <div className="text-right flex-shrink-0"><p className={`text-lg font-black ${scoreColor(s)}`}>{s}%</p><p className="text-[10px] text-on-surface-variant">match</p></div>}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Application pipeline */}
          <div className="bg-white p-5 md:p-6 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container">
            <h3 className="text-base font-bold text-on-surface mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-primary">insights</span>Application Pipeline</h3>
            {activeApps.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-on-surface-variant mb-3">You haven&apos;t applied to any jobs yet.</p>
                <Link href="/candidate/my-applications" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl premium-gradient text-white font-bold text-sm">Find jobs to apply <span className="material-symbols-outlined text-base">arrow_forward</span></Link>
              </div>
            ) : (
              <>
                <div className="flex h-3 w-full rounded-full overflow-hidden bg-surface-container-low mb-4">
                  {(Object.keys(STATUS_META) as AppStatus[]).filter((k) => k !== 'withdrawn' && statusCounts[k]).map((k) => (
                    <div key={k} className={STATUS_META[k].bar} style={{ width: `${(statusCounts[k] / activeApps.length) * 100}%` }} title={`${STATUS_META[k].label}: ${statusCounts[k]}`} />
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(Object.keys(STATUS_META) as AppStatus[]).filter((k) => k !== 'withdrawn').map((k) => (
                    <div key={k} className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${STATUS_META[k].dot}`} />
                      <span className="text-sm text-on-surface-variant">{STATUS_META[k].label}</span>
                      <span className="text-sm font-black text-on-surface ml-auto">{statusCounts[k] || 0}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Build Profile', icon: 'person_edit', href: '/candidate/build-profile' },
              { label: 'Generate CV', icon: 'auto_awesome', href: '/candidate/cv-generator' },
              { label: 'Find Jobs', icon: 'work', href: '/candidate/my-applications' },
              { label: 'Practice', icon: 'psychology', href: '/candidate/ai-coach' },
            ].map((a) => (
              <Link key={a.label} href={a.href} className="bg-white p-4 rounded-2xl border border-surface-container shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] flex flex-col items-center justify-center gap-2 text-center hover:border-primary/40 hover:-translate-y-0.5 transition-all">
                <span className="material-symbols-outlined text-primary text-2xl">{a.icon}</span>
                <span className="text-xs font-bold text-on-surface">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-1 space-y-4 md:space-y-6">
          {/* Resume strength */}
          <div className="p-5 md:p-6 rounded-[1.5rem] bg-gradient-to-br from-[#1a0f2e] to-[#0d0618] text-white relative overflow-hidden shadow-xl">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base md:text-lg font-bold">AI Resume Strength</h3>
                {resumeScore !== null && <div className="flex items-baseline gap-1"><span className="text-2xl font-black">{resumeScore}</span><span className="text-white/70 text-sm font-bold">/ 100</span></div>}
              </div>
              {resumeScore !== null ? (
                <>
                  <div className="w-full h-2.5 bg-white/25 rounded-full mb-4 overflow-hidden"><div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${resumeScore}%` }} /></div>
                  <p className="text-white/85 text-xs md:text-sm mb-5 leading-relaxed">{resumeScore >= 80 ? 'Strong CV! Keep it tailored to each role you apply for.' : resumeScore >= 60 ? 'Good start — add quantified achievements to push it higher.' : 'Boost your score by enriching your profile and regenerating.'}</p>
                  <Link href="/candidate/cv-generator" className="inline-flex items-center gap-1.5 text-sm font-bold bg-white/15 hover:bg-white/25 px-4 py-2 rounded-xl transition-colors">Open CV Generator <span className="material-symbols-outlined text-base">arrow_forward</span></Link>
                </>
              ) : (
                <>
                  <p className="text-white/85 text-xs md:text-sm mb-5 leading-relaxed">You haven&apos;t generated a CV yet. Create an ATS-optimized CV with AI in one click.</p>
                  <Link href="/candidate/cv-generator" className="inline-flex items-center gap-1.5 text-sm font-bold bg-white/15 hover:bg-white/25 px-4 py-2 rounded-xl transition-colors">Generate my CV <span className="material-symbols-outlined text-base">arrow_forward</span></Link>
                </>
              )}
            </div>
            <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -left-10 -top-10 w-40 h-40 bg-purple-400/20 rounded-full blur-2xl"></div>
          </div>

          {/* Recent activity */}
          {activity.length > 0 && (
            <div className="bg-white p-5 md:p-6 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container">
              <h3 className="text-base font-bold text-on-surface mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-primary">history</span>Recent Activity</h3>
              <div className="space-y-3">
                {activity.map((a) => {
                  const meta = STATUS_META[a.status]
                  const when = a.status === 'applied' ? a.applied_at : a.updated_at
                  return (
                    <div key={a.id} className="flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.dot}/15`}>
                        <span className={`material-symbols-outlined text-base ${meta.dot.replace('bg-', 'text-')}`}>{meta.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-on-surface leading-snug">
                          {a.status === 'applied' ? 'Applied to ' : `${meta.label} · `}<span className="font-bold">{a.job?.title || 'a job'}</span>
                          {a.job?.company ? <span className="text-on-surface-variant"> at {a.job.company}</span> : null}
                        </p>
                        <p className="text-[11px] text-outline mt-0.5">{timeAgo(when)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Profile completeness */}
          {completeness.percent < 100 && (
            <div className="bg-white p-5 md:p-6 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-bold text-on-surface">Complete your profile</h3>
                <span className="text-sm font-black text-primary">{completeness.percent}%</span>
              </div>
              <div className="w-full h-2 bg-surface-container-low rounded-full overflow-hidden mb-4"><div className="h-full premium-gradient rounded-full transition-all duration-700" style={{ width: `${completeness.percent}%` }} /></div>
              <div className="space-y-2">
                {completeness.items.map((it) => (
                  <Link key={it.label} href={it.href} className={`flex items-center gap-2.5 text-sm ${it.done ? 'text-on-surface-variant' : 'text-on-surface font-semibold hover:text-primary'}`}>
                    <span className={`material-symbols-outlined text-lg ${it.done ? 'text-green-500' : 'text-outline-variant'}`} style={it.done ? { fontVariationSettings: "'FILL' 1" } : undefined}>{it.done ? 'check_circle' : 'radio_button_unchecked'}</span>
                    <span className={it.done ? 'line-through' : ''}>{it.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Your documents */}
          <div className="bg-indigo-50/60 p-5 md:p-6 rounded-[1.5rem] border border-indigo-100">
            <h3 className="text-base font-bold text-on-surface mb-4">Your Documents</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><p className="text-2xl font-black text-primary">{cvCount}</p><p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide mt-0.5">CVs</p></div>
              <div><p className="text-2xl font-black text-primary">{coverCount}</p><p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide mt-0.5">Cover Letters</p></div>
              <div><p className="text-2xl font-black text-primary">{sessionCount}</p><p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide mt-0.5">Coach Chats</p></div>
            </div>
          </div>

          {/* Practice CTA */}
          <Link href="/candidate/ai-coach" className="block p-5 md:p-6 rounded-[1.5rem] bg-[#2c1f4a] text-white relative overflow-hidden shadow-xl group hover:-translate-y-0.5 transition-all">
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center mb-3"><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span></div>
              <h3 className="text-base font-bold leading-tight mb-1">Practice with your AI Coach</h3>
              <p className="text-indigo-200/80 text-xs">Run a mock interview tailored to your role.</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold bg-white/10 group-hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">Start session <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">arrow_forward</span></span>
            </div>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
          </Link>
        </div>
      </div>
    </div>
  )
}
