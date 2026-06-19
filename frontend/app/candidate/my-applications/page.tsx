'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import CVPreview, { type CVContent } from '@/components/candidate/CVPreview'
import ExternalJobs from '@/components/candidate/ExternalJobs'
import Pagination from '@/components/candidate/Pagination'

const PAGE_SIZE = 15

type Job = {
  id: string
  recruiter_id: string
  title: string
  company: string
  location: string | null
  description: string | null
  salary: string | null
  skills: string[]
  is_open: boolean
  created_at: string
}

type AppStatus = 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'withdrawn'
type Application = { id: string; job_id: string; status: AppStatus; match_score: number | null; applied_at: string; job: Job | null }
type CvRow = { id: string; target_role: string | null; ats_score: number | null; created_at: string; content: CVContent }

type SortKey = 'match' | 'newest' | 'oldest' | 'az' | 'za' | 'salary_high' | 'salary_low'
const SORT_OPTIONS: { v: SortKey; label: string }[] = [
  { v: 'match', label: 'Best match' },
  { v: 'newest', label: 'Newest first' },
  { v: 'oldest', label: 'Oldest first' },
  { v: 'salary_high', label: 'Salary: high to low' },
  { v: 'salary_low', label: 'Salary: low to high' },
  { v: 'az', label: 'Title A → Z' },
  { v: 'za', label: 'Title Z → A' },
]

const STATUS_STYLE: Record<AppStatus, { label: string; cls: string; icon: string }> = {
  applied: { label: 'Applied', cls: 'bg-indigo-100 text-indigo-700', icon: 'send' },
  screening: { label: 'Screening', cls: 'bg-amber-100 text-amber-700', icon: 'fact_check' },
  interview: { label: 'Interview', cls: 'bg-sky-100 text-sky-700', icon: 'event' },
  offer: { label: 'Offer', cls: 'bg-green-100 text-green-700', icon: 'verified' },
  rejected: { label: 'Not selected', cls: 'bg-red-100 text-red-600', icon: 'cancel' },
  withdrawn: { label: 'Withdrawn', cls: 'bg-slate-100 text-slate-500', icon: 'undo' },
}

const AVATAR_COLORS = ['bg-indigo-100 text-indigo-700', 'bg-purple-100 text-purple-700', 'bg-sky-100 text-sky-700', 'bg-pink-100 text-pink-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700']
const LOGO_BG = ['4f46e5', '7c3aed', '0284c7', 'db2777', '059669', 'd97706']
const hashIdx = (s: string, n: number) => Array.from(s).reduce((a, c) => a + c.charCodeAt(0), 0) % n
const avatarColor = (s: string) => AVATAR_COLORS[hashIdx(s, AVATAR_COLORS.length)]

const norm = (s: string) => s.toLowerCase().trim()
const matchedSkills = (jobSkills: string[], mySkills: string[]) => {
  const mine = new Set(mySkills.map(norm))
  return jobSkills.filter((s) => mine.has(norm(s)))
}
const matchScore = (jobSkills: string[], mySkills: string[]): number | null => {
  if (!jobSkills?.length) return null
  return Math.round((matchedSkills(jobSkills, mySkills).length / jobSkills.length) * 100)
}
const scoreColor = (s: number) => (s >= 75 ? 'text-green-600' : s >= 40 ? 'text-amber-600' : 'text-slate-500')
const scoreBg = (s: number) => (s >= 75 ? 'bg-green-500' : s >= 40 ? 'bg-amber-500' : 'bg-slate-400')
const isRemote = (loc: string | null) => !!loc && /remote|anywhere|wfh/i.test(loc)
const isNew = (iso: string) => Date.now() - new Date(iso).getTime() < 7 * 86400000

const parseSalary = (s: string | null): number | null => {
  if (!s) return null
  const m = s.match(/(\d[\d,.]*)\s*([kK])?/)
  if (!m) return null
  let n = parseFloat(m[1].replace(/,/g, ''))
  if (m[2]) n *= 1000
  return isNaN(n) ? null : n
}
const formatK = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`)

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d > 0) return `${d}d ago`
  const h = Math.floor(diff / 3600000)
  if (h > 0) return `${h}h ago`
  const m = Math.floor(diff / 60000)
  return m > 1 ? `${m}m ago` : 'just now'
}

export default function MyApplicationsPage() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [tab, setTab] = useState<'browse' | 'applied' | 'saved' | 'external'>('browse')
  const [jobs, setJobs] = useState<Job[]>([])
  const [apps, setApps] = useState<Application[]>([])
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [uid, setUid] = useState<string | null>(null)

  // filters / sort
  const [search, setSearch] = useState('')
  const [locFilter, setLocFilter] = useState('')
  const [remoteOnly, setRemoteOnly] = useState(false)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [minSalary, setMinSalary] = useState(0)
  const [sort, setSort] = useState<SortKey>('match')
  const [page, setPage] = useState(1)

  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [needCv, setNeedCv] = useState(false)
  const [shared, setShared] = useState(false)

  // apply flow (CV picker)
  const [cvs, setCvs] = useState<CvRow[]>([])
  const [applyJob, setApplyJob] = useState<Job | null>(null)
  const [selectedCvId, setSelectedCvId] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [previewCv, setPreviewCv] = useState<CVContent | null>(null)

  const [candidateSkills, setCandidateSkills] = useState<string[]>([])

  const load = async () => {
    setLoading(true); setLoadError(false)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoadError(true); setLoading(false); return }
      setUid(user.id)
      const [jobsRes, appsRes, skillsRes, cvRes, savedRes] = await Promise.all([
        supabase.from('jobs').select('*').eq('is_open', true).order('created_at', { ascending: false }),
        supabase.from('applications').select('*, job:jobs(*)').eq('candidate_id', user.id).order('applied_at', { ascending: false }),
        supabase.from('skills').select('name').eq('profile_id', user.id),
        supabase.from('cvs').select('id, target_role, ats_score, created_at, content').eq('profile_id', user.id).order('created_at', { ascending: false }),
        supabase.from('saved_jobs').select('job_id').eq('profile_id', user.id),
      ])
      if (jobsRes.error || appsRes.error) { setLoadError(true); setLoading(false); return }
      // hide jobs past their application deadline
      const now = Date.now()
      const openJobs = ((jobsRes.data as (Job & { expires_at?: string | null })[]) ?? []).filter((j) => !j.expires_at || new Date(j.expires_at).getTime() > now)
      setJobs(openJobs)
      setApps((appsRes.data as unknown as Application[]) ?? [])
      setCandidateSkills(((skillsRes.data ?? []) as { name: string }[]).map((s) => s.name))
      setCvs((cvRes.data as unknown as CvRow[]) ?? [])
      setSavedIds(new Set(((savedRes.data ?? []) as { job_id: string }[]).map((r) => r.job_id)))
    } catch {
      setLoadError(true)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  useEffect(() => { setPage(1) }, [tab, search, locFilter, remoteOnly, selectedSkills, minSalary, sort])

  const appliedJobIds = useMemo(() => new Set(apps.filter((a) => a.status !== 'withdrawn').map((a) => a.job_id)), [apps])
  const activeApps = apps.filter((a) => a.status !== 'withdrawn')
  const savedJobs = useMemo(() => jobs.filter((j) => savedIds.has(j.id)), [jobs, savedIds])

  const skillDemand = useMemo(() => {
    const m = new Map<string, number>()
    jobs.forEach((j) => j.skills.forEach((s) => m.set(s, (m.get(s) || 0) + 1)))
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
  }, [jobs])
  const popularSkills = useMemo(() => skillDemand.slice(0, 10).map((e) => e[0]), [skillDemand])
  const maxSalary = useMemo(() => {
    const vals = jobs.map((j) => parseSalary(j.salary)).filter((v): v is number => v !== null)
    return vals.length ? Math.max(...vals) : 0
  }, [jobs])

  const filtered = useMemo(() => {
    const q = norm(search)
    const loc = norm(locFilter)
    const sel = selectedSkills.map(norm)
    return jobs.filter((j) => {
      if (appliedJobIds.has(j.id)) return false // applied jobs live in the My Applications tab
      const matchesQ = !q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.skills.some((s) => s.toLowerCase().includes(q))
      const matchesLoc = !loc || (j.location || '').toLowerCase().includes(loc)
      const matchesRemote = !remoteOnly || isRemote(j.location)
      const matchesSkills = sel.length === 0 || j.skills.some((s) => sel.includes(norm(s)))
      const sal = parseSalary(j.salary)
      const matchesSalary = minSalary === 0 || (sal !== null && sal >= minSalary)
      return matchesQ && matchesLoc && matchesRemote && matchesSkills && matchesSalary
    })
  }, [jobs, search, locFilter, remoteOnly, selectedSkills, minSalary, appliedJobIds])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      switch (sort) {
        case 'match': return (matchScore(b.skills, candidateSkills) ?? -1) - (matchScore(a.skills, candidateSkills) ?? -1)
        case 'newest': return +new Date(b.created_at) - +new Date(a.created_at)
        case 'oldest': return +new Date(a.created_at) - +new Date(b.created_at)
        case 'salary_high': return (parseSalary(b.salary) ?? -1) - (parseSalary(a.salary) ?? -1)
        case 'salary_low': return (parseSalary(a.salary) ?? Number.MAX_SAFE_INTEGER) - (parseSalary(b.salary) ?? Number.MAX_SAFE_INTEGER)
        case 'az': return a.title.localeCompare(b.title)
        case 'za': return b.title.localeCompare(a.title)
      }
    })
    return arr
  }, [filtered, sort, candidateSkills])

  const topMatches = useMemo(() => jobs.map((j) => ({ j, s: matchScore(j.skills, candidateSkills) ?? 0 })).sort((a, b) => b.s - a.s).slice(0, 3), [jobs, candidateSkills])
  const avgMatch = useMemo(() => {
    const scored = jobs.map((j) => matchScore(j.skills, candidateSkills)).filter((s): s is number => s !== null)
    return scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : 0
  }, [jobs, candidateSkills])

  const toggleSkill = (s: string) => setSelectedSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  const clearFilters = () => { setSearch(''); setLocFilter(''); setRemoteOnly(false); setSelectedSkills([]); setMinSalary(0) }
  const hasFilters = search || locFilter || remoteOnly || selectedSkills.length > 0 || minSalary > 0

  const toggleSave = async (jobId: string) => {
    if (!uid) return
    const supabase = createClient()
    const next = new Set(savedIds)
    if (next.has(jobId)) { next.delete(jobId); setSavedIds(next); await supabase.from('saved_jobs').delete().eq('profile_id', uid).eq('job_id', jobId) }
    else { next.add(jobId); setSavedIds(next); await supabase.from('saved_jobs').insert({ profile_id: uid, job_id: jobId }) }
  }

  // ── Apply flow ─────────────────────────────────────────────────────────
  const openApply = (job: Job) => {
    if (appliedJobIds.has(job.id)) return
    setSelectedJob(null)
    if (cvs.length === 0) { setNeedCv(true); return }
    setApplyError(null)
    setSelectedCvId(cvs[0].id)
    setApplyJob(job)
  }

  const sendApplication = async () => {
    if (!applyJob || !selectedCvId) return
    setApplying(true); setApplyError(null)
    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: applyJob.id, cvId: selectedCvId }),
      })
      const data = await res.json()
      if (!res.ok) { setApplyError(data.error || 'Could not submit your application.'); setApplying(false); return }
      if (data.application) setApps((a) => [data.application as Application, ...a])
      window.dispatchEvent(new Event('shai:refresh-notifs')) // ping the bell to update instantly
      setApplyJob(null)
    } catch {
      setApplyError('Network error. Please try again.')
    }
    setApplying(false)
  }

  const withdraw = async (appId: string) => {
    if (!window.confirm('Withdraw this application? The recruiter will no longer see it as active.')) return
    const supabase = createClient()
    await supabase.from('applications').delete().eq('id', appId)
    setApps((a) => a.filter((x) => x.id !== appId))
  }

  const renderJobCard = (job: Job) => {
    const applied = appliedJobIds.has(job.id)
    const saved = savedIds.has(job.id)
    const score = matchScore(job.skills, candidateSkills)
    const matched = matchedSkills(job.skills, candidateSkills).length
    return (
      <div key={job.id} className="bg-white p-4 md:p-5 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container hover:shadow-[0_12px_40px_-8px_rgba(25,28,30,0.14)] hover:-translate-y-0.5 transition-all">
        <div className="flex gap-4">
          <CompanyLogo name={job.company} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <button onClick={() => setSelectedJob(job)} className="text-left min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-base md:text-lg font-bold text-on-surface truncate hover:text-primary transition-colors">{job.title}</h4>
                  {isNew(job.created_at) && <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded uppercase tracking-wide">New</span>}
                </div>
                <p className="text-on-surface-variant text-sm truncate">{job.company}{job.location ? ` • ${job.location}` : ''}</p>
              </button>
              <div className="flex items-center gap-1 flex-shrink-0">
                {score !== null && (
                  <div className="text-right mr-1">
                    <p className={`text-lg font-black leading-none ${scoreColor(score)}`}>{score}%</p>
                    <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">match</p>
                  </div>
                )}
                <button onClick={() => toggleSave(job.id)} title={saved ? 'Saved' : 'Save job'} className={`p-2 rounded-xl transition ${saved ? 'text-primary bg-primary/10' : 'text-outline-variant hover:text-primary hover:bg-primary/5'}`}>
                  <span className="material-symbols-outlined text-xl" style={saved ? { fontVariationSettings: "'FILL' 1" } : undefined}>bookmark</span>
                </button>
              </div>
            </div>

            {job.description && <p className="text-sm text-on-surface-variant mt-2 line-clamp-2">{job.description}</p>}

            <div className="flex flex-wrap gap-2 mt-3">
              {isRemote(job.location) && <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold rounded-lg flex items-center gap-1"><span className="material-symbols-outlined text-sm">home_work</span>Remote</span>}
              {job.salary && <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-lg">{job.salary}</span>}
              {job.skills.slice(0, 4).map((s) => {
                const has = candidateSkills.some((m) => norm(m) === norm(s))
                return <span key={s} className={`px-3 py-1 text-xs rounded-lg ${has ? 'bg-green-100 text-green-700 font-semibold' : 'bg-surface-container text-on-surface-variant'}`}>{s}</span>
              })}
              {job.skills.length > 4 && <span className="px-2 py-1 text-on-surface-variant text-xs">+{job.skills.length - 4}</span>}
            </div>

            <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-surface-container">
              <span className="text-xs text-outline flex items-center gap-3">
                <span>{timeAgo(job.created_at)}</span>
                {score !== null && <span className="hidden sm:inline">· {matched}/{job.skills.length} skills</span>}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedJob(job)} className="px-4 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-bold text-sm hover:bg-surface-container transition-colors">Details</button>
                <button onClick={() => openApply(job)} disabled={applied} className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-1.5 transition-all ${applied ? 'bg-green-100 text-green-700 cursor-default' : 'premium-gradient text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95'}`}>
                  {applied ? (<><span className="material-symbols-outlined text-base">check</span>Applied</>) : (<><span className="material-symbols-outlined text-base">send</span>Apply</>)}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto">
      <header className="mb-5 md:mb-7">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-[2.25rem] font-bold tracking-tight text-on-surface leading-tight">Jobs &amp; Applications</h1>
        <p className="text-on-surface-variant text-xs sm:text-sm md:text-base mt-1 sm:mt-2">Browse roles posted by recruiters, save the ones you like, apply in one click, and track everything.</p>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex bg-surface-container-low rounded-2xl p-1 flex-wrap">
          <button onClick={() => setTab('browse')} className={`px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'browse' ? 'bg-white shadow text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>Browse Jobs</button>
          <button onClick={() => setTab('saved')} className={`px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'saved' ? 'bg-white shadow text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>Saved {savedIds.size > 0 && <span className="ml-1 text-xs">({savedIds.size})</span>}</button>
          <button onClick={() => setTab('applied')} className={`px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'applied' ? 'bg-white shadow text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>My Applications {activeApps.length > 0 && <span className="ml-1 text-xs">({activeApps.length})</span>}</button>
          <button onClick={() => setTab('external')} className={`px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${tab === 'external' ? 'bg-white shadow text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>
            <span className="material-symbols-outlined text-base">public</span>Web Jobs
          </button>
        </div>
      </div>

      {loading ? (
        <Loader label="Loading jobs..." />
      ) : loadError ? (
        <ErrorState onRetry={load} />
      ) : (
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          {/* LEFT — only this column changes per tab */}
          <div className="col-span-12 lg:col-span-8">
            {tab === 'browse' ? (
              <>
          {/* Filters */}
          <div className="bg-white p-3 md:p-4 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container mb-5 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, company, or skill" className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all text-on-surface font-medium placeholder:text-outline-variant outline-none" />
              </div>
              <div className="relative sm:w-48">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">location_on</span>
                <input value={locFilter} onChange={(e) => setLocFilter(e.target.value)} placeholder="Location" className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all text-on-surface font-medium placeholder:text-outline-variant outline-none" />
              </div>
              <div className="relative sm:w-52">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none">sort</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="w-full appearance-none pl-12 pr-10 py-3 bg-surface-container-low border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all text-on-surface font-medium outline-none cursor-pointer">
                  {SORT_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">expand_more</span>
              </div>
            </div>

            {maxSalary > 0 && (
              <div className="flex items-center gap-3 px-1">
                <span className="text-xs font-bold text-on-surface-variant whitespace-nowrap flex items-center gap-1"><span className="material-symbols-outlined text-sm">payments</span>Min salary</span>
                <input type="range" min={0} max={maxSalary} step={5000} value={minSalary} onChange={(e) => setMinSalary(Number(e.target.value))} className="flex-1 accent-[var(--color-primary)] cursor-pointer" />
                <span className="text-xs font-black text-primary w-16 text-right">{minSalary === 0 ? 'Any' : formatK(minSalary)}+</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setRemoteOnly((v) => !v)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${remoteOnly ? 'bg-primary/10 text-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}>
                <span className="material-symbols-outlined text-sm">{remoteOnly ? 'check_circle' : 'home_work'}</span>Remote only
              </button>
              <span className="w-px h-5 bg-surface-container mx-1 hidden sm:block" />
              {popularSkills.map((s) => {
                const on = selectedSkills.includes(s)
                return <button key={s} onClick={() => toggleSkill(s)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${on ? 'bg-primary text-white shadow' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}>{s}</button>
              })}
              {hasFilters && <button onClick={clearFilters} className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-colors"><span className="material-symbols-outlined text-sm">close</span>Clear</button>}
            </div>
          </div>

          <div className="flex items-center justify-between mb-3 px-1">
                  <p className="text-sm font-bold text-on-surface-variant">{sorted.length} {sorted.length === 1 ? 'job' : 'jobs'} found</p>
                </div>
                {sorted.length === 0 ? (
                  <EmptyState icon="work_off" title={jobs.length === 0 ? 'No open jobs yet' : 'No jobs match your filters'} text={jobs.length === 0 ? 'Recruiters haven’t posted any roles yet. Check back soon!' : 'Try a different search or clear the filters.'} action={jobs.length > 0 ? <button onClick={clearFilters} className="mt-4 px-5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-bold text-sm">Clear filters</button> : undefined} />
                ) : (
                  <>
                    <div className="space-y-3">{sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(renderJobCard)}</div>
                    <Pagination page={page} totalPages={Math.ceil(sorted.length / PAGE_SIZE)} onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
                  </>
                )}
              </>
            ) : tab === 'saved' ? (
              savedJobs.length === 0 ? (
                <EmptyState icon="bookmark" title="No saved jobs yet" text="Tap the bookmark icon on any job to save it here for later." action={<button onClick={() => setTab('browse')} className="mt-4 px-5 py-2.5 rounded-xl premium-gradient text-white font-bold text-sm">Browse Jobs</button>} />
              ) : (
                <>
                  <div className="space-y-3">{savedJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(renderJobCard)}</div>
                  <Pagination page={page} totalPages={Math.ceil(savedJobs.length / PAGE_SIZE)} onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
                </>
              )
            ) : tab === 'applied' ? (
              activeApps.length === 0 ? (
                <EmptyState icon="work_history" title="No applications yet" text="Browse open jobs and apply with one click — they’ll show up here with live status." action={<button onClick={() => setTab('browse')} className="mt-4 px-5 py-2.5 rounded-xl premium-gradient text-white font-bold text-sm">Browse Jobs</button>} />
              ) : (
                <>
                  <div className="space-y-3">
                    {activeApps.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((app) => {
                      const job = app.job
                      const st = STATUS_STYLE[app.status]
                      return (
                        <div key={app.id} className="bg-white p-4 md:p-5 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container flex items-center gap-4">
                          <CompanyLogo name={job?.company || '?'} size="w-12 h-12" rounded="rounded-xl" text="text-lg" />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm md:text-base font-bold text-on-surface truncate">{job?.title || 'Job no longer available'}</h4>
                            <p className="text-on-surface-variant text-xs md:text-sm truncate">{job?.company}{job?.location ? ` • ${job.location}` : ''} · Applied {timeAgo(app.applied_at)}</p>
                          </div>
                          {app.match_score !== null && <span className={`hidden sm:flex items-baseline gap-0.5 text-sm font-black flex-shrink-0 ${scoreColor(app.match_score)}`}>{app.match_score}<span className="text-[10px] text-on-surface-variant font-medium">% match</span></span>}
                          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 ${st.cls}`}><span className="material-symbols-outlined text-sm">{st.icon}</span><span className="hidden sm:inline">{st.label}</span></span>
                          {job && <button onClick={() => setSelectedJob(job)} title="View job" className="text-on-surface-variant hover:text-primary p-2 rounded-lg hover:bg-primary/5 transition flex-shrink-0"><span className="material-symbols-outlined text-base">visibility</span></button>}
                          <button onClick={() => withdraw(app.id)} title="Withdraw" className="text-on-surface-variant hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition flex-shrink-0"><span className="material-symbols-outlined text-base">delete</span></button>
                        </div>
                      )
                    })}
                  </div>
                  <Pagination page={page} totalPages={Math.ceil(activeApps.length / PAGE_SIZE)} onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
                </>
              )
            ) : (
              <ExternalJobs />
            )}
          </div>

          {/* RIGHT — always visible across every tab */}
          <aside className="col-span-12 lg:col-span-4 space-y-4 lg:sticky lg:top-20 self-start">
            <div className="p-5 rounded-[1.5rem] bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-base font-bold mb-4">Your Job Hunt</h3>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div><p className="text-xl font-black">{jobs.length}</p><p className="text-[9px] text-indigo-100 uppercase tracking-wide font-bold mt-0.5">Open</p></div>
                  <div><p className="text-xl font-black">{savedIds.size}</p><p className="text-[9px] text-indigo-100 uppercase tracking-wide font-bold mt-0.5">Saved</p></div>
                  <div><p className="text-xl font-black">{activeApps.length}</p><p className="text-[9px] text-indigo-100 uppercase tracking-wide font-bold mt-0.5">Applied</p></div>
                  <div><p className="text-xl font-black">{avgMatch}%</p><p className="text-[9px] text-indigo-100 uppercase tracking-wide font-bold mt-0.5">Avg</p></div>
                </div>
              </div>
              <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-2xl"></div>
            </div>

            {topMatches.length > 0 && topMatches[0].s > 0 && (
              <div className="p-5 rounded-[1.5rem] bg-white border border-surface-container shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)]">
                <h3 className="text-sm font-black text-on-surface mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-primary text-lg">trending_up</span>Top Matches for You</h3>
                <div className="space-y-2">
                  {topMatches.map(({ j, s }) => (
                    <button key={j.id} onClick={() => setSelectedJob(j)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-surface-container-low transition-colors text-left">
                      <CompanyLogo name={j.company} size="w-9 h-9" rounded="rounded-lg" text="text-sm" />
                      <div className="flex-1 min-w-0"><p className="text-sm font-bold text-on-surface truncate">{j.title}</p><p className="text-xs text-on-surface-variant truncate">{j.company}</p></div>
                      <span className={`text-sm font-black flex-shrink-0 ${scoreColor(s)}`}>{s}%</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {skillDemand.length > 0 && (
              <div className="p-5 rounded-[1.5rem] bg-white border border-surface-container shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)]">
                <h3 className="text-sm font-black text-on-surface mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-primary text-lg">local_fire_department</span>Skills in Demand</h3>
                <div className="flex flex-wrap gap-2">
                  {skillDemand.slice(0, 8).map(([s, n]) => {
                    const on = selectedSkills.includes(s)
                    return <button key={s} onClick={() => { setTab('browse'); toggleSkill(s) }} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${on ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}>{s}<span className={`text-[10px] ${on ? 'text-indigo-100' : 'text-outline'}`}>{n}</span></button>
                  })}
                </div>
              </div>
            )}

            <div className="p-5 rounded-[1.5rem] bg-pink-200/50 border border-pink-300/30">
              <div className="flex items-center gap-2 mb-2"><span className="material-symbols-outlined text-pink-700" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span><h3 className="text-sm font-black text-pink-950">Boost your match score</h3></div>
              <p className="text-xs text-pink-900/80 leading-relaxed mb-3">Add more skills to your profile so the AI can match you to more roles and recruiters can find you faster.</p>
              <Link href="/candidate/build-profile" className="inline-flex items-center gap-1 text-xs font-bold text-pink-800 hover:underline">Update profile <span className="material-symbols-outlined text-sm">arrow_forward</span></Link>
            </div>
          </aside>
        </div>
      )}

      {/* Job detail modal */}
      {selectedJob && (() => {
        const score = matchScore(selectedJob.skills, candidateSkills)
        const matched = matchedSkills(selectedJob.skills, candidateSkills)
        const missing = selectedJob.skills.filter((s) => !matched.some((m) => norm(m) === norm(s)))
        const applied = appliedJobIds.has(selectedJob.id)
        const shareJob = () => {
          navigator.clipboard.writeText(`${selectedJob.title} at ${selectedJob.company}${selectedJob.location ? ` (${selectedJob.location})` : ''} — apply on SmartHire AI`)
          setShared(true); setTimeout(() => setShared(false), 1800)
        }
        return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedJob(null)} />
            <div className="relative z-10 w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden auth-pop max-h-[90vh] flex flex-col">
              <div className="p-5 border-b border-surface-container flex items-start gap-4">
                <CompanyLogo name={selectedJob.company} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-on-surface">{selectedJob.title}</h3>
                    {isNew(selectedJob.created_at) && <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded uppercase">New</span>}
                  </div>
                  <p className="text-on-surface-variant text-sm">{selectedJob.company}{selectedJob.location ? ` • ${selectedJob.location}` : ''}</p>
                  <p className="text-xs text-outline mt-0.5">Posted {timeAgo(selectedJob.created_at)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => toggleSave(selectedJob.id)} title={savedIds.has(selectedJob.id) ? 'Saved' : 'Save job'} className={`p-2 rounded-xl transition ${savedIds.has(selectedJob.id) ? 'text-primary bg-primary/10' : 'text-on-surface-variant hover:text-primary hover:bg-primary/5'}`}><span className="material-symbols-outlined" style={savedIds.has(selectedJob.id) ? { fontVariationSettings: "'FILL' 1" } : undefined}>bookmark</span></button>
                  <button onClick={shareJob} title="Copy job details" className="p-2 rounded-xl text-on-surface-variant hover:text-primary hover:bg-primary/5 transition"><span className="material-symbols-outlined">{shared ? 'check' : 'share'}</span></button>
                  <button onClick={() => setSelectedJob(null)} className="p-1 text-on-surface-variant hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
                </div>
              </div>

              <div className="p-5 overflow-y-auto flex-1 space-y-5">
                <div className="flex flex-wrap gap-2">
                  {isRemote(selectedJob.location) && <Pill icon="home_work" text="Remote" />}
                  {selectedJob.location && <Pill icon="location_on" text={selectedJob.location} />}
                  {selectedJob.salary && <Pill icon="payments" text={selectedJob.salary} cls="bg-green-50 text-green-700" />}
                </div>
                {score !== null && (
                  <div className="p-4 rounded-2xl bg-surface-container-low/70 border border-surface-container">
                    <div className="flex items-center justify-between mb-2"><span className="text-sm font-bold text-on-surface flex items-center gap-1.5"><span className="material-symbols-outlined text-primary text-lg">insights</span>Skills match</span><span className={`text-lg font-black ${scoreColor(score)}`}>{score}%</span></div>
                    <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden mb-2"><div className={`h-full rounded-full transition-all duration-700 ${scoreBg(score)}`} style={{ width: `${score}%` }} /></div>
                    <p className="text-xs text-on-surface-variant">You have <b>{matched.length}</b> of <b>{selectedJob.skills.length}</b> required skills.</p>
                  </div>
                )}
                {selectedJob.skills.length > 0 && (
                  <div className="space-y-3">
                    {matched.length > 0 && <div><p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-2">Your matching skills</p><div className="flex flex-wrap gap-2">{matched.map((s) => <span key={s} className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-semibold rounded-lg flex items-center gap-1"><span className="material-symbols-outlined text-sm">check</span>{s}</span>)}</div></div>}
                    {missing.length > 0 && <div><p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Skills to highlight or learn</p><div className="flex flex-wrap gap-2">{missing.map((s) => <span key={s} className="px-3 py-1.5 bg-surface-container text-on-surface-variant text-xs font-semibold rounded-lg">{s}</span>)}</div></div>}
                  </div>
                )}
                <div><p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">About the role</p><p className="text-sm text-on-surface leading-relaxed whitespace-pre-line">{selectedJob.description || 'No description provided.'}</p></div>
              </div>

              <div className="p-4 border-t border-surface-container flex gap-3">
                <button onClick={() => setSelectedJob(null)} className="px-5 py-3.5 rounded-2xl bg-surface-container-low text-on-surface font-bold text-sm hover:bg-surface-container transition-colors">Close</button>
                {applied ? (
                  <div className="flex-1 py-3.5 rounded-2xl bg-green-100 text-green-700 font-bold text-sm flex items-center justify-center gap-2"><span className="material-symbols-outlined text-lg">check_circle</span>Already applied</div>
                ) : (
                  <button onClick={() => openApply(selectedJob)} className="flex-1 py-3.5 rounded-2xl premium-gradient text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-lg">send</span>Apply &amp; choose CV
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* CV picker (apply) modal */}
      {applyJob && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !applying && setApplyJob(null)} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden auth-pop max-h-[88vh] flex flex-col">
            <div className="p-5 border-b border-surface-container">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-on-surface">Choose a CV to send</h3>
                  <p className="text-xs text-on-surface-variant truncate">for {applyJob.title} · {applyJob.company}</p>
                </div>
                <button onClick={() => !applying && setApplyJob(null)} className="text-on-surface-variant hover:text-on-surface p-1 flex-shrink-0"><span className="material-symbols-outlined">close</span></button>
              </div>
            </div>

            <div className="overflow-y-auto p-3 flex-1 space-y-2">
              {cvs.map((cv) => {
                const sel = selectedCvId === cv.id
                return (
                  <div key={cv.id} className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer ${sel ? 'border-primary bg-primary/5' : 'border-surface-container hover:border-primary/30'}`} onClick={() => setSelectedCvId(cv.id)}>
                    <span className={`material-symbols-outlined ${sel ? 'text-primary' : 'text-outline-variant'}`} style={sel ? { fontVariationSettings: "'FILL' 1" } : undefined}>{sel ? 'radio_button_checked' : 'radio_button_unchecked'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{cv.target_role || 'Untitled CV'}</p>
                      <p className="text-xs text-on-surface-variant">{new Date(cv.created_at).toLocaleDateString()}{cv.ats_score != null ? ` · ATS ${cv.ats_score}/100` : ''}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setPreviewCv(cv.content) }} className="px-3 py-2 rounded-xl bg-surface-container-low text-on-surface font-bold text-xs flex items-center gap-1.5 hover:bg-surface-container transition-colors flex-shrink-0">
                      <span className="material-symbols-outlined text-base">visibility</span>View
                    </button>
                  </div>
                )
              })}
            </div>

            {applyError && (
              <div className="mx-4 mb-2 flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                <span className="material-symbols-outlined text-red-500">error</span>
                <p className="text-sm text-red-700 font-medium">{applyError}</p>
              </div>
            )}

            <div className="p-4 border-t border-surface-container">
              <p className="text-xs text-on-surface-variant mb-3 flex items-center gap-1.5"><span className="material-symbols-outlined text-sm text-primary">mail</span>We&apos;ll email you a confirmation, and the recruiter receives the CV you pick.</p>
              <div className="flex gap-3">
                <button onClick={() => setApplyJob(null)} disabled={applying} className="px-5 py-3.5 rounded-2xl bg-surface-container-low text-on-surface font-bold text-sm hover:bg-surface-container transition-colors disabled:opacity-60">Cancel</button>
                <button onClick={sendApplication} disabled={applying || !selectedCvId} className="flex-1 py-3.5 rounded-2xl premium-gradient text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:hover:scale-100">
                  <span className="material-symbols-outlined text-lg">{applying ? 'hourglass_top' : 'send'}</span>{applying ? 'Sending your CV...' : 'Send application'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CV preview overlay */}
      {previewCv && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md" onClick={() => setPreviewCv(null)} />
          <div className="relative z-10 w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden auth-pop max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-surface-container flex items-center justify-between">
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-primary">description</span>CV preview</h3>
              <button onClick={() => setPreviewCv(null)} className="text-on-surface-variant hover:text-on-surface p-1"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="overflow-y-auto p-6 flex-1 bg-surface-container-low/40"><CVPreview cv={previewCv} /></div>
          </div>
        </div>
      )}

      {/* Need-a-CV modal */}
      {needCv && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setNeedCv(false)} />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 text-center auth-pop">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4"><span className="material-symbols-outlined text-2xl">description</span></div>
            <h3 className="text-lg font-bold text-on-surface mb-1">Generate a CV first</h3>
            <p className="text-sm text-on-surface-variant mb-5">Applying sends your CV to the recruiter, so you need at least one saved CV. It only takes a click in the CV Generator.</p>
            <div className="flex gap-3">
              <button onClick={() => setNeedCv(false)} className="flex-1 py-3 rounded-2xl bg-surface-container-low text-on-surface font-bold text-sm hover:bg-surface-container transition-colors">Later</button>
              <Link href="/candidate/cv-generator" className="flex-1 py-3 rounded-2xl premium-gradient text-white font-bold text-sm flex items-center justify-center">Create CV</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CompanyLogo({ name, size = 'w-14 h-14', rounded = 'rounded-2xl', text = 'text-xl' }: { name: string; size?: string; rounded?: string; text?: string }) {
  const [err, setErr] = useState(false)
  if (err || !name) return <div className={`${size} ${rounded} flex items-center justify-center flex-shrink-0 ${text} font-black ${avatarColor(name || '?')}`}>{(name || '?').charAt(0).toUpperCase()}</div>
  const bg = LOGO_BG[hashIdx(name, LOGO_BG.length)]
  const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=fff&bold=true&format=svg`
  return <img src={url} onError={() => setErr(true)} alt={name} className={`${size} ${rounded} object-cover flex-shrink-0 border border-surface-container`} />
}

function Pill({ icon, text, cls }: { icon: string; text: string; cls?: string }) {
  return <span className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 ${cls || 'bg-surface-container-low text-on-surface-variant'}`}><span className="material-symbols-outlined text-sm">{icon}</span>{text}</span>
}

function Loader({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24">
      <div className="flex gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce"></div>
        <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
        <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
      </div>
      <p className="text-xs font-black text-primary tracking-widest uppercase">{label}</p>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="bg-white rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container p-10 md:p-16 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 mb-5"><span className="material-symbols-outlined text-3xl">cloud_off</span></div>
      <h2 className="text-lg md:text-xl font-bold text-on-surface mb-2">Couldn’t load jobs</h2>
      <p className="text-sm text-on-surface-variant max-w-md mb-4">Something went wrong reaching the server. Check your connection and try again.</p>
      <button onClick={onRetry} className="px-5 py-2.5 rounded-xl premium-gradient text-white font-bold text-sm flex items-center gap-2"><span className="material-symbols-outlined text-base">refresh</span>Retry</button>
    </div>
  )
}

function EmptyState({ icon, title, text, action }: { icon: string; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container p-10 md:p-16 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-5"><span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span></div>
      <h2 className="text-lg md:text-xl font-bold text-on-surface mb-2">{title}</h2>
      <p className="text-sm text-on-surface-variant max-w-md">{text}</p>
      {action}
    </div>
  )
}
