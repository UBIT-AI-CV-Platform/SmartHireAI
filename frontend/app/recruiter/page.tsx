'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type AppStatus = 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'withdrawn'
type Job = { id: string; title: string; company: string; is_open: boolean; created_at: string; expires_at: string | null }
type Application = { id: string; status: AppStatus; match_score: number | null; applied_at: string; candidate_name: string | null; job: { id: string; title: string } | null }

const AVATAR = ['bg-indigo-100 text-indigo-700', 'bg-purple-100 text-purple-700', 'bg-sky-100 text-sky-700', 'bg-pink-100 text-pink-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700']
const avatarColor = (s: string) => AVATAR[Array.from(s || '?').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR.length]

const STATUS_META: Record<AppStatus, { label: string; dot: string; bar: string; cls: string }> = {
  applied: { label: 'Applied', dot: 'bg-indigo-500', bar: 'bg-indigo-500', cls: 'bg-indigo-100 text-indigo-700' },
  screening: { label: 'Screening', dot: 'bg-amber-500', bar: 'bg-amber-500', cls: 'bg-amber-100 text-amber-700' },
  interview: { label: 'Interview', dot: 'bg-sky-500', bar: 'bg-sky-500', cls: 'bg-sky-100 text-sky-700' },
  offer: { label: 'Offer', dot: 'bg-green-500', bar: 'bg-green-500', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', dot: 'bg-red-400', bar: 'bg-red-400', cls: 'bg-red-100 text-red-600' },
  withdrawn: { label: 'Withdrawn', dot: 'bg-slate-400', bar: 'bg-slate-400', cls: 'bg-slate-100 text-slate-500' },
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

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }

export default function RecruiterDashboard() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [name, setName] = useState('Recruiter')
  const [company, setCompany] = useState('')
  const [jobs, setJobs] = useState<Job[]>([])
  const [apps, setApps] = useState<Application[]>([])

  const load = async () => {
    setLoading(true); setLoadError(false)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoadError(true); setLoading(false); return }
      const [prof, jobsRes] = await Promise.all([
        supabase.from('profiles').select('full_name, company_name').eq('id', user.id).single(),
        supabase.from('jobs').select('id, title, company, is_open, created_at, expires_at').eq('recruiter_id', user.id).order('created_at', { ascending: false }),
      ])
      if (jobsRes.error) { setLoadError(true); setLoading(false); return }
      const jobIds = (jobsRes.data ?? []).map((j) => j.id)
      const appsRes = jobIds.length
        ? await supabase.from('applications').select('id, status, match_score, applied_at, candidate_name, job:jobs(id, title)').in('job_id', jobIds).order('applied_at', { ascending: false })
        : { data: [] }
      setName(prof.data?.full_name || user.email?.split('@')[0] || 'Recruiter')
      setCompany(prof.data?.company_name || '')
      setJobs((jobsRes.data as Job[]) ?? [])
      setApps((appsRes.data as unknown as Application[]) ?? [])
    } catch {
      setLoadError(true)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    apps.forEach((a) => { c[a.status] = (c[a.status] || 0) + 1 })
    return c
  }, [apps])

  const perJob = useMemo(() => {
    const m = new Map<string, number>()
    apps.forEach((a) => { if (a.job?.id) m.set(a.job.id, (m.get(a.job.id) || 0) + 1) })
    return m
  }, [apps])

  const topJobs = useMemo(() => [...jobs].sort((a, b) => (perJob.get(b.id) || 0) - (perJob.get(a.id) || 0)).slice(0, 4), [jobs, perJob])
  const expiringSoon = useMemo(() => {
    const now = Date.now(); const week = now + 7 * 86400000
    return jobs
      .filter((j) => j.expires_at && new Date(j.expires_at).getTime() > now && new Date(j.expires_at).getTime() <= week)
      .sort((a, b) => +new Date(a.expires_at!) - +new Date(b.expires_at!))
      .slice(0, 4)
  }, [jobs])
  const recent = apps.slice(0, 6)
  const activeStatuses = (Object.keys(STATUS_META) as AppStatus[]).filter((k) => k !== 'withdrawn')
  const totalActive = apps.filter((a) => a.status !== 'withdrawn').length

  const stats = [
    { label: 'Active Jobs', value: jobs.filter((j) => j.is_open).length, icon: 'work', bg: 'bg-indigo-200/60', text: 'text-indigo-950', sub: 'text-indigo-800/80', href: '/recruiter/jobs' },
    { label: 'Applicants', value: apps.length, icon: 'group', bg: 'bg-purple-200/60', text: 'text-purple-950', sub: 'text-purple-800/80', href: '/recruiter/applicants' },
    { label: 'Interviews', value: counts.interview || 0, icon: 'event', bg: 'bg-sky-200/60', text: 'text-sky-950', sub: 'text-sky-800/80', href: '/recruiter/applicants' },
    { label: 'Offers', value: counts.offer || 0, icon: 'verified', bg: 'bg-green-200/60', text: 'text-green-950', sub: 'text-green-800/80', href: '/recruiter/applicants' },
  ]

  if (loading) return <PageLoader label="Loading your dashboard..." />
  if (loadError) return <PageError onRetry={load} />

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Hero */}
      <div className="mb-6 rounded-[1.5rem] bg-gradient-to-br from-white to-indigo-50/60 border border-surface-container shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] p-5 md:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-on-surface">{greeting()}, {name} 👋</h2>
          <p className="text-on-surface-variant text-sm mt-0.5">{company ? <>Hiring for <span className="font-semibold text-primary">{company}</span></> : 'Post roles and review candidates who applied with their CV.'}</p>
        </div>
        <Link href="/recruiter/jobs" className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl premium-gradient text-white font-bold text-sm shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex-shrink-0">
          <span className="material-symbols-outlined">add</span>Post a Job
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
          {/* Recent applicants */}
          <div className="bg-white dark:bg-[#2c2c2e] p-5 md:p-6 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-lg font-bold text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-primary">person_search</span>Recent Applicants</h3>
              <Link href="/recruiter/applicants" className="text-primary font-medium hover:underline flex items-center gap-1 text-sm">View all <span className="material-symbols-outlined text-sm">arrow_forward</span></Link>
            </div>
            {recent.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-6">No applicants yet. Post a job to start receiving applications.</p>
            ) : (
              <div className="space-y-2">
                {recent.map((a) => (
                  <Link key={a.id} href="/recruiter/applicants" className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container-low transition-colors">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black ${avatarColor(a.candidate_name || '?')}`}>{(a.candidate_name || '?').charAt(0).toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{a.candidate_name || 'Candidate'}</p>
                      <p className="text-xs text-on-surface-variant truncate">applied to {a.job?.title || 'a job'} · {timeAgo(a.applied_at)}</p>
                    </div>
                    {a.match_score !== null && <span className="hidden sm:block text-sm font-black text-primary flex-shrink-0">{a.match_score}%</span>}
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex-shrink-0 ${STATUS_META[a.status].cls}`}>{STATUS_META[a.status].label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Hiring pipeline */}
          <div className="bg-white dark:bg-[#2c2c2e] p-5 md:p-6 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container">
            <h3 className="text-base font-bold text-on-surface mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-primary">insights</span>Hiring Pipeline</h3>
            {totalActive === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-4">No applications in your pipeline yet.</p>
            ) : (
              <>
                <div className="flex h-3 w-full rounded-full overflow-hidden bg-surface-container-low mb-4">
                  {activeStatuses.filter((k) => counts[k]).map((k) => (
                    <div key={k} className={STATUS_META[k].bar} style={{ width: `${(counts[k] / totalActive) * 100}%` }} title={`${STATUS_META[k].label}: ${counts[k]}`} />
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {activeStatuses.map((k) => (
                    <div key={k} className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${STATUS_META[k].dot}`} />
                      <span className="text-sm text-on-surface-variant">{STATUS_META[k].label}</span>
                      <span className="text-sm font-black text-on-surface ml-auto">{counts[k] || 0}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Post a Job', icon: 'post_add', href: '/recruiter/jobs' },
              { label: 'Applicants', icon: 'group', href: '/recruiter/applicants' },
              { label: 'Company', icon: 'apartment', href: '/recruiter/company-profile' },
              { label: 'Settings', icon: 'settings', href: '/recruiter/settings' },
            ].map((a) => (
              <Link key={a.label} href={a.href} className="bg-white dark:bg-[#2c2c2e] p-4 rounded-2xl border border-surface-container shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] flex flex-col items-center justify-center gap-2 text-center hover:border-primary/40 hover:-translate-y-0.5 transition-all">
                <span className="material-symbols-outlined text-primary text-2xl">{a.icon}</span>
                <span className="text-xs font-bold text-on-surface">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-1 space-y-4 md:space-y-6">
          {/* Top jobs */}
          <div className="bg-white dark:bg-[#2c2c2e] p-5 md:p-6 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container">
            <h3 className="text-base font-bold text-on-surface mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-primary">trending_up</span>Your Top Jobs</h3>
            {topJobs.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-on-surface-variant mb-3">You haven&apos;t posted any jobs yet.</p>
                <Link href="/recruiter/jobs" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl premium-gradient text-white font-bold text-sm">Post your first job <span className="material-symbols-outlined text-base">arrow_forward</span></Link>
              </div>
            ) : (
              <div className="space-y-2">
                {topJobs.map((j) => (
                  <Link key={j.id} href="/recruiter/applicants" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-container-low transition-colors">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-black ${avatarColor(j.title)}`}>{j.title.charAt(0).toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{j.title}</p>
                      <p className="text-xs text-on-surface-variant">{j.is_open ? 'Open' : 'Closed'}</p>
                    </div>
                    <span className="flex items-center gap-1 text-sm font-black text-primary flex-shrink-0"><span className="material-symbols-outlined text-base">group</span>{perJob.get(j.id) || 0}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Expiring soon */}
          {expiringSoon.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-white/10 p-5 md:p-6 rounded-[1.5rem]">
              <h3 className="text-base font-bold text-amber-900 dark:text-amber-300 mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-amber-600">schedule</span>Closing Soon</h3>
              <div className="space-y-2">
                {expiringSoon.map((j) => {
                  const days = Math.ceil((new Date(j.expires_at!).getTime() - Date.now()) / 86400000)
                  return (
                    <Link key={j.id} href="/recruiter/jobs" className="flex items-center gap-3 p-2 rounded-xl hover:bg-amber-100/60 transition-colors">
                      <span className="material-symbols-outlined text-amber-600 text-lg">work</span>
                      <p className="flex-1 min-w-0 text-sm font-bold text-amber-950 truncate">{j.title}</p>
                      <span className="text-xs font-black text-amber-700 flex-shrink-0">{days}d left</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* AI tools */}
          <div className="bg-white dark:bg-[#2c2c2e] p-5 md:p-6 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container">
            <h3 className="text-base font-bold text-on-surface mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>AI Tools</h3>
            <div className="space-y-2">
              <Link href="/recruiter/ai-screening" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-container-low transition-colors">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"><span className="material-symbols-outlined text-lg">leaderboard</span></div>
                <div className="flex-1 min-w-0"><p className="text-sm font-bold text-on-surface">AI Screening</p><p className="text-xs text-on-surface-variant">Rank applicants & interview kits</p></div>
                <span className="material-symbols-outlined text-outline text-base">chevron_right</span>
              </Link>
              <Link href="/recruiter/ai-screening" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-container-low transition-colors">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"><span className="material-symbols-outlined text-lg">smart_toy</span></div>
                <div className="flex-1 min-w-0"><p className="text-sm font-bold text-on-surface">AI Copilot</p><p className="text-xs text-on-surface-variant">Draft emails, JDs & more</p></div>
                <span className="material-symbols-outlined text-outline text-base">chevron_right</span>
              </Link>
              <Link href="/recruiter/analytics" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-container-low transition-colors">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"><span className="material-symbols-outlined text-lg">monitoring</span></div>
                <div className="flex-1 min-w-0"><p className="text-sm font-bold text-on-surface">Analytics</p><p className="text-xs text-on-surface-variant">Funnel & hiring insights</p></div>
                <span className="material-symbols-outlined text-outline text-base">chevron_right</span>
              </Link>
            </div>
          </div>

          {/* Company CTA */}
          <Link href="/recruiter/company-profile" className="block p-5 md:p-6 rounded-[1.5rem] bg-[#2c1f4a] text-white relative overflow-hidden shadow-xl group hover:-translate-y-0.5 transition-all">
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center mb-3"><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>apartment</span></div>
              <h3 className="text-base font-bold leading-tight mb-1">{company ? 'Update your company profile' : 'Set up your company profile'}</h3>
              <p className="text-indigo-200/80 text-xs">A complete profile attracts more & better candidates.</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold bg-white/10 group-hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">Open <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">arrow_forward</span></span>
            </div>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
          </Link>
        </div>
      </div>
    </div>
  )
}

function PageLoader({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-32">
      <div className="flex gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce"></div>
        <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
        <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
      </div>
      <p className="text-xs font-black text-primary tracking-widest uppercase">{label}</p>
    </div>
  )
}

function PageError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="bg-white dark:bg-[#2c2c2e] rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container p-10 md:p-16 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/15 flex items-center justify-center text-red-500 mb-5"><span className="material-symbols-outlined text-3xl">cloud_off</span></div>
        <h2 className="text-lg md:text-xl font-bold text-on-surface mb-2">Couldn’t load your dashboard</h2>
        <p className="text-sm text-on-surface-variant max-w-md mb-4">Something went wrong reaching the server. Please try again.</p>
        <button onClick={onRetry} className="px-5 py-2.5 rounded-xl premium-gradient text-white font-bold text-sm flex items-center gap-2"><span className="material-symbols-outlined text-base">refresh</span>Retry</button>
      </div>
    </div>
  )
}
