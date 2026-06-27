'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type AppStatus = 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'withdrawn'
type App = { status: AppStatus; match_score: number | null; applied_at: string; job_id: string }
type Job = { id: string; title: string; is_open: boolean }

const FUNNEL: { key: AppStatus; label: string; color: string }[] = [
  { key: 'applied', label: 'Applied', color: 'bg-indigo-500' },
  { key: 'screening', label: 'Screening', color: 'bg-amber-500' },
  { key: 'interview', label: 'Interview', color: 'bg-sky-500' },
  { key: 'offer', label: 'Offer', color: 'bg-green-500' },
]

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [apps, setApps] = useState<App[]>([])
  const [jobs, setJobs] = useState<Job[]>([])

  const load = async () => {
    setLoading(true); setLoadError(false)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoadError(true); setLoading(false); return }
      const [jobsRes, appsRes] = await Promise.all([
        supabase.from('jobs').select('id, title, is_open').eq('recruiter_id', user.id),
        supabase.from('applications').select('status, match_score, applied_at, job_id'),
      ])
      if (jobsRes.error || appsRes.error) { setLoadError(true); setLoading(false); return }
      setJobs((jobsRes.data as Job[]) ?? [])
      setApps((appsRes.data as App[]) ?? [])
    } catch { setLoadError(true) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const counts = useMemo(() => { const c: Record<string, number> = {}; apps.forEach((a) => { c[a.status] = (c[a.status] || 0) + 1 }); return c }, [apps])
  const total = apps.length
  const offers = counts.offer || 0
  const hireRate = total ? Math.round((offers / total) * 100) : 0
  const avgMatch = useMemo(() => { const s = apps.map((a) => a.match_score).filter((x): x is number => x !== null); return s.length ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : 0 }, [apps])

  // last 14 days
  const daily = useMemo(() => {
    const days: { label: string; count: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i)
      const next = new Date(d); next.setDate(d.getDate() + 1)
      const count = apps.filter((a) => { const t = new Date(a.applied_at).getTime(); return t >= d.getTime() && t < next.getTime() }).length
      days.push({ label: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), count })
    }
    return days
  }, [apps])
  const dailyMax = Math.max(1, ...daily.map((d) => d.count))

  const buckets = useMemo(() => {
    const b = [{ label: '0–40%', n: 0, cls: 'bg-slate-400' }, { label: '40–60%', n: 0, cls: 'bg-amber-500' }, { label: '60–75%', n: 0, cls: 'bg-sky-500' }, { label: '75–100%', n: 0, cls: 'bg-green-500' }]
    apps.forEach((a) => { const s = a.match_score; if (s === null) return; b[s >= 75 ? 3 : s >= 60 ? 2 : s >= 40 ? 1 : 0].n++ })
    return b
  }, [apps])
  const bucketMax = Math.max(1, ...buckets.map((b) => b.n))

  const topJobs = useMemo(() => {
    const m = new Map<string, number>()
    apps.forEach((a) => m.set(a.job_id, (m.get(a.job_id) || 0) + 1))
    return jobs.map((j) => ({ title: j.title, n: m.get(j.id) || 0 })).sort((a, b) => b.n - a.n).slice(0, 6)
  }, [apps, jobs])
  const topMax = Math.max(1, ...topJobs.map((j) => j.n))

  const funnelMax = Math.max(1, counts.applied || 0)

  const stats = [
    { label: 'Active Jobs', value: jobs.filter((j) => j.is_open).length, icon: 'work', bg: 'bg-indigo-200/60', text: 'text-indigo-950' },
    { label: 'Applicants', value: total, icon: 'group', bg: 'bg-purple-200/60', text: 'text-purple-950' },
    { label: 'Avg Match', value: `${avgMatch}%`, icon: 'target', bg: 'bg-sky-200/60', text: 'text-sky-950' },
    { label: 'Offer Rate', value: `${hireRate}%`, icon: 'trending_up', bg: 'bg-green-200/60', text: 'text-green-950' },
  ]

  if (loading) return <Loader />
  if (loadError) return <ErrorBox onRetry={load} />

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-5 md:mb-7">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-[2.25rem] font-bold tracking-tight text-on-surface leading-tight flex items-center gap-2"><span className="material-symbols-outlined text-primary text-3xl">monitoring</span>Analytics</h1>
        <p className="text-on-surface-variant text-xs sm:text-sm md:text-base mt-1 sm:mt-2">Insights into your hiring funnel and applicant quality.</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-6">
        {stats.map((s) => (
          <div key={s.label} className={`p-4 md:p-6 rounded-[1.5rem] ${s.bg} shadow-sm`}>
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white/70 dark:bg-white/10 flex items-center justify-center mb-3"><span className={`material-symbols-outlined ${s.text}`} style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span></div>
            <h3 className={`text-2xl md:text-3xl font-black ${s.text}`}>{s.value}</h3>
            <p className="font-bold uppercase tracking-wider text-[0.6rem] md:text-[0.7rem] mt-1 text-on-surface-variant">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Applications over time */}
        <Card title="Applications — last 14 days" icon="bar_chart">
          <div className="flex items-end gap-1.5 h-40">
            {daily.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="w-full bg-surface-container-low rounded-t-md relative flex items-end" style={{ height: '100%' }}>
                  <div className="w-full premium-gradient rounded-t-md transition-all" style={{ height: `${(d.count / dailyMax) * 100}%` }} />
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-on-surface opacity-0 group-hover:opacity-100">{d.count}</span>
                </div>
                {i % 2 === 0 && <span className="text-[8px] text-outline whitespace-nowrap">{d.label}</span>}
              </div>
            ))}
          </div>
        </Card>

        {/* Funnel */}
        <Card title="Hiring Funnel" icon="filter_alt">
          <div className="space-y-3">
            {FUNNEL.map((f) => {
              const n = counts[f.key] || 0
              return (
                <div key={f.key}>
                  <div className="flex items-center justify-between text-sm mb-1"><span className="font-semibold text-on-surface">{f.label}</span><span className="font-black text-on-surface">{n}</span></div>
                  <div className="h-3 bg-surface-container-low rounded-full overflow-hidden"><div className={`h-full rounded-full ${f.color} transition-all duration-700`} style={{ width: `${(n / funnelMax) * 100}%` }} /></div>
                </div>
              )
            })}
            <p className="text-xs text-on-surface-variant pt-1">Conversion to offer: <b>{hireRate}%</b></p>
          </div>
        </Card>

        {/* Match distribution */}
        <Card title="Applicant Match Quality" icon="insights">
          <div className="space-y-3">
            {buckets.map((b) => (
              <div key={b.label}>
                <div className="flex items-center justify-between text-sm mb-1"><span className="font-semibold text-on-surface">{b.label}</span><span className="font-black text-on-surface">{b.n}</span></div>
                <div className="h-3 bg-surface-container-low rounded-full overflow-hidden"><div className={`h-full rounded-full ${b.cls} transition-all duration-700`} style={{ width: `${(b.n / bucketMax) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top jobs */}
        <Card title="Top Jobs by Applicants" icon="leaderboard">
          {topJobs.length === 0 ? <p className="text-sm text-on-surface-variant">No jobs yet.</p> : (
            <div className="space-y-3">
              {topJobs.map((j, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-sm mb-1"><span className="font-semibold text-on-surface truncate pr-2">{j.title}</span><span className="font-black text-on-surface flex-shrink-0">{j.n}</span></div>
                  <div className="h-3 bg-surface-container-low rounded-full overflow-hidden"><div className="h-full rounded-full premium-gradient transition-all duration-700" style={{ width: `${(j.n / topMax) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#2c2c2e] p-5 md:p-6 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container">
      <h3 className="text-sm font-black text-on-surface mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-primary text-lg">{icon}</span>{title}</h3>
      {children}
    </div>
  )
}

function Loader() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-32">
      <div className="flex gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce"></div>
        <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
        <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
      </div>
      <p className="text-xs font-black text-primary tracking-widest uppercase">Loading analytics...</p>
    </div>
  )
}

function ErrorBox({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="bg-white dark:bg-[#2c2c2e] rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container p-12 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/15 flex items-center justify-center text-red-500 dark:text-red-300 mb-5"><span className="material-symbols-outlined text-3xl">cloud_off</span></div>
        <h2 className="text-lg font-bold text-on-surface mb-2">Couldn’t load analytics</h2>
        <button onClick={onRetry} className="px-5 py-2.5 rounded-xl premium-gradient text-white font-bold text-sm flex items-center gap-2"><span className="material-symbols-outlined text-base">refresh</span>Retry</button>
      </div>
    </div>
  )
}
