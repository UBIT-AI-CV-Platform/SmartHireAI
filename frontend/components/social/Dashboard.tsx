'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Feed from './Feed'
import WhoToFollow from './WhoToFollow'
import PeopleSearchBar from './PeopleSearchBar'
import { initials } from '@/lib/social'

type Role = 'candidate' | 'recruiter'

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

/** Merged Overview + Feed = Dashboard. Left (≈60%) feed, right (≈40%) details. */
export default function Dashboard({ role }: { role: Role }) {
  const base = role === 'recruiter' ? '/recruiter' : '/candidate'
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-5 md:py-7">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* LEFT ~60% — search + feed */}
        <div className="lg:col-span-3 space-y-4">
          <PeopleSearchBar />
          <Feed networkHref={base} embedded />
        </div>

        {/* RIGHT ~40% — profile + details (top-aligned with the search) */}
        <div className="lg:col-span-2 space-y-4">
          <ProfileMiniCard base={base} />
          {role === 'candidate' ? <CandidateRail /> : <RecruiterRail />}
          <WhoToFollow />
        </div>
      </div>
    </div>
  )
}

function ProfileMiniCard({ base }: { base: string }) {
  const [p, setP] = useState<{ username: string | null; full_name: string | null; photo: string | null; headline: string | null; role: string | null; company: string | null; followers: number; following: number } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('public_profiles').select('username, full_name, photo_url, headline, desired_role, role, company_name, followers_count, following_count').eq('id', user.id).maybeSingle()
      if (data) setP({
        username: data.username, full_name: data.full_name, photo: data.photo_url,
        headline: data.headline || data.desired_role || (data.role === 'recruiter' ? 'Recruiter' : 'Candidate'),
        role: data.role, company: data.company_name, followers: data.followers_count ?? 0, following: data.following_count ?? 0,
      })
    })()
  }, [])

  return (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl border border-slate-200/70 dark:border-white/10 shadow-sm overflow-hidden">
      <div className="h-16 premium-gradient" />
      <div className="px-5 pb-5 -mt-8">
        <div className="h-16 w-16 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center overflow-hidden border-4 border-white dark:border-[#1c1c1e] shadow">
          {p?.photo ? <img src={p.photo} alt="" className="h-full w-full object-cover" /> : <span className="text-xl font-black text-indigo-700 dark:text-indigo-300">{initials(p?.full_name)}</span>}
        </div>
        <p className="font-bold text-slate-900 dark:text-slate-100 mt-2 truncate">{greeting()}, {(p?.full_name || 'there').split(' ')[0]} 👋</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{p?.headline}{p?.role === 'recruiter' && p?.company ? ` · ${p.company}` : ''}</p>
        <div className="flex items-center gap-4 mt-2 text-xs">
          <span><span className="font-bold text-slate-900 dark:text-slate-100">{p?.followers ?? 0}</span> <span className="text-slate-500">followers</span></span>
          <span><span className="font-bold text-slate-900 dark:text-slate-100">{p?.following ?? 0}</span> <span className="text-slate-500">following</span></span>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <Link href={p?.username ? `${base}/u/${p.username}` : '#'} className="flex-1 text-center px-3 py-2 rounded-full text-sm font-semibold text-white premium-gradient">View profile</Link>
          <Link href={base === '/recruiter' ? '/recruiter/company-profile' : '/candidate/build-profile'} className="px-3 py-2 rounded-full text-sm font-semibold border border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10">Edit</Link>
        </div>
      </div>
    </div>
  )
}

function RailCard({ title, icon, href, hrefLabel, children }: { title: string; icon: string; href?: string; hrefLabel?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl border border-slate-200/70 dark:border-white/10 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5"><span className="material-symbols-outlined text-[18px] text-primary">{icon}</span>{title}</h3>
        {href && <Link href={href} className="text-xs font-semibold text-primary hover:underline">{hrefLabel || 'View all'}</Link>}
      </div>
      {children}
    </div>
  )
}

const norm = (s: string) => s.toLowerCase().trim()
const matchScore = (jobSkills: string[], mine: Set<string>): number => {
  if (!jobSkills?.length) return 0
  return Math.round((jobSkills.filter((s) => mine.has(norm(s))).length / jobSkills.length) * 100)
}

function CandidateRail() {
  const [recs, setRecs] = useState<{ id: string; title: string; company: string; score: number }[]>([])
  const [interviews, setInterviews] = useState<{ id: string; title: string; company: string }[]>([])
  const [done, setDone] = useState({ photo: false, summary: false, role: false, skills: false, edu: false, cv: false })
  const [stats, setStats] = useState({ apps: 0, interviews: 0, offers: 0, saved: 0 })

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [p, sk, edu, appsRes, cvs, jobsRes, saved] = await Promise.all([
        supabase.from('profiles').select('photo_url, summary, desired_role').eq('id', user.id).maybeSingle(),
        supabase.from('skills').select('name').eq('profile_id', user.id),
        supabase.from('education').select('id', { count: 'exact', head: true }).eq('profile_id', user.id),
        supabase.from('applications').select('status, job:jobs(id, title, company, skills)').eq('candidate_id', user.id),
        supabase.from('cvs').select('id', { count: 'exact', head: true }).eq('profile_id', user.id),
        supabase.from('jobs').select('id, title, company, skills').eq('is_open', true).order('created_at', { ascending: false }).limit(40),
        supabase.from('saved_jobs').select('job_id', { count: 'exact', head: true }).eq('profile_id', user.id),
      ])
      const mySkills = new Set(((sk.data ?? []) as { name: string }[]).map((s) => norm(s.name)))
      const apps = (appsRes.data as unknown as { status: string; job: { id: string; title: string; company: string; skills: string[] } | null }[]) ?? []
      const active = apps.filter((a) => a.status !== 'withdrawn')
      const appliedIds = new Set(apps.map((a) => a.job?.id).filter(Boolean))
      setInterviews(apps.filter((a) => a.status === 'interview' && a.job).map((a) => ({ id: a.job!.id, title: a.job!.title, company: a.job!.company })))
      setStats({ apps: active.length, interviews: active.filter((a) => a.status === 'interview').length, offers: active.filter((a) => a.status === 'offer').length, saved: saved.count ?? 0 })
      const jobs = (jobsRes.data as { id: string; title: string; company: string; skills: string[] }[]) ?? []
      setRecs(jobs.filter((j) => !appliedIds.has(j.id)).map((j) => ({ id: j.id, title: j.title, company: j.company, score: matchScore(j.skills, mySkills) })).sort((a, b) => b.score - a.score).slice(0, 3))
      setDone({
        photo: !!p.data?.photo_url, summary: !!p.data?.summary, role: !!p.data?.desired_role,
        skills: mySkills.size > 0, edu: (edu.count ?? 0) > 0, cv: (cvs.count ?? 0) > 0,
      })
    })()
  }, [])

  const items = [
    { label: 'Add a profile photo', done: done.photo }, { label: 'Write a summary', done: done.summary },
    { label: 'Set your target role', done: done.role }, { label: 'Add your skills', done: done.skills },
    { label: 'Add your education', done: done.edu }, { label: 'Generate your first CV', done: done.cv },
  ]
  const pct = Math.round((items.filter((i) => i.done).length / items.length) * 100)

  const statItems = [
    { label: 'Applications', value: stats.apps, icon: 'description', href: '/candidate/my-applications' },
    { label: 'Interviews', value: stats.interviews, icon: 'event_available', href: '/candidate/inbox?tab=interviews' },
    { label: 'Offers', value: stats.offers, icon: 'emoji_events', href: '/candidate/my-applications' },
    { label: 'Saved', value: stats.saved, icon: 'bookmark', href: '/candidate/my-applications' },
  ]
  const quickActions = [
    { label: 'Generate CV', icon: 'auto_awesome', href: '/candidate/cv-generator' },
    { label: 'Find jobs', icon: 'work', href: '/candidate/my-applications' },
    { label: 'AI Coach', icon: 'psychology', href: '/candidate/ai-coach' },
    { label: 'Build profile', icon: 'person_edit', href: '/candidate/build-profile' },
  ]

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {statItems.map((s) => (
          <Link key={s.label} href={s.href} className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-slate-200/70 dark:border-white/10 p-3.5 shadow-sm hover:-translate-y-0.5 transition-transform">
            <span className="material-symbols-outlined text-primary text-[20px]">{s.icon}</span>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{s.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{s.label}</p>
          </Link>
        ))}
      </div>

      {interviews.length > 0 && (
        <RailCard title="Upcoming interviews" icon="event" href="/candidate/inbox?tab=interviews" hrefLabel="Open">
          <div className="space-y-2">
            {interviews.map((i) => (
              <div key={i.id} className="text-sm"><p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{i.title}</p><p className="text-xs text-slate-500 truncate">{i.company}</p></div>
            ))}
          </div>
        </RailCard>
      )}

      {pct < 100 && (
        <RailCard title="Complete your profile" icon="trending_up" href="/candidate/build-profile" hrefLabel="Edit">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden"><div className="h-full premium-gradient rounded-full" style={{ width: `${pct}%` }} /></div>
            <span className="text-xs font-black text-primary">{pct}%</span>
          </div>
          <div className="space-y-1.5">
            {items.filter((i) => !i.done).slice(0, 4).map((i) => (
              <div key={i.label} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="material-symbols-outlined text-[18px] text-slate-300 dark:text-slate-600">radio_button_unchecked</span>{i.label}
              </div>
            ))}
          </div>
        </RailCard>
      )}

      <RailCard title="Recommended jobs" icon="recommend" href="/candidate/my-applications" hrefLabel="Browse">
        {recs.length === 0 ? (
          <p className="text-sm text-slate-400">Add skills to get matched to jobs.</p>
        ) : (
          <div className="space-y-3">
            {recs.map((r) => (
              <Link key={r.id} href="/candidate/my-applications" className="flex items-center gap-3 group">
                <div className="h-9 w-9 rounded-lg bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center text-sm font-black text-indigo-700 dark:text-indigo-300 flex-shrink-0">{r.company.charAt(0).toUpperCase()}</div>
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-primary">{r.title}</p><p className="text-xs text-slate-500 truncate">{r.company}</p></div>
                {r.score > 0 && <span className={`text-xs font-bold ${r.score >= 60 ? 'text-green-600' : 'text-amber-600'}`}>{r.score}%</span>}
              </Link>
            ))}
          </div>
        )}
      </RailCard>

      <RailCard title="Quick actions" icon="bolt">
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((a) => (
            <Link key={a.label} href={a.href} className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200/70 dark:border-white/10 hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              <span className="material-symbols-outlined text-primary text-[18px]">{a.icon}</span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{a.label}</span>
            </Link>
          ))}
        </div>
      </RailCard>
    </>
  )
}

function RecruiterRail() {
  const [stats, setStats] = useState({ openJobs: 0, applicants: 0, interviews: 0 })
  const [recent, setRecent] = useState<{ id: string; name: string; title: string }[]>([])

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: jobs } = await supabase.from('jobs').select('id, is_open').eq('recruiter_id', user.id)
      const jobIds = (jobs ?? []).map((j) => j.id)
      const openJobs = (jobs ?? []).filter((j) => j.is_open).length
      let applicants = 0, interviews = 0
      let recentRows: { id: string; name: string; title: string }[] = []
      if (jobIds.length) {
        const { data: apps } = await supabase
          .from('applications')
          .select('id, status, candidate_name, applied_at, job:jobs(title)')
          .in('job_id', jobIds)
          .order('applied_at', { ascending: false })
        const rows = (apps as unknown as { id: string; status: string; candidate_name: string | null; job: { title: string } | null }[]) ?? []
        applicants = rows.length
        interviews = rows.filter((r) => r.status === 'interview').length
        recentRows = rows.slice(0, 4).map((r) => ({ id: r.id, name: r.candidate_name || 'Candidate', title: r.job?.title || 'a role' }))
      }
      setStats({ openJobs, applicants, interviews })
      setRecent(recentRows)
    })()
  }, [])

  return (
    <>
      <RailCard title="Hiring at a glance" icon="insights" href="/recruiter/analytics" hrefLabel="Analytics">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><p className="text-2xl font-black text-primary">{stats.openJobs}</p><p className="text-[10px] font-bold text-slate-400 uppercase">Open jobs</p></div>
          <div><p className="text-2xl font-black text-primary">{stats.applicants}</p><p className="text-[10px] font-bold text-slate-400 uppercase">Applicants</p></div>
          <div><p className="text-2xl font-black text-primary">{stats.interviews}</p><p className="text-[10px] font-bold text-slate-400 uppercase">Interviews</p></div>
        </div>
      </RailCard>

      <RailCard title="Recent applicants" icon="group" href="/recruiter/applicants" hrefLabel="View all">
        {recent.length === 0 ? (
          <p className="text-sm text-slate-400">No applicants yet. <Link href="/recruiter/jobs" className="text-primary font-semibold">Post a job</Link>.</p>
        ) : (
          <div className="space-y-3">
            {recent.map((r) => (
              <Link key={r.id} href="/recruiter/applicants" className="flex items-center gap-3 group">
                <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center text-sm font-black text-indigo-700 dark:text-indigo-300 flex-shrink-0">{r.name.charAt(0).toUpperCase()}</div>
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-primary">{r.name}</p><p className="text-xs text-slate-500 truncate">applied to {r.title}</p></div>
              </Link>
            ))}
          </div>
        )}
      </RailCard>

      <RailCard title="Quick actions" icon="bolt">
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Post a job', icon: 'add_circle', href: '/recruiter/jobs' },
            { label: 'Applicants', icon: 'group', href: '/recruiter/applicants' },
            { label: 'AI tools', icon: 'auto_awesome', href: '/recruiter/ai-screening' },
            { label: 'Analytics', icon: 'monitoring', href: '/recruiter/analytics' },
          ].map((a) => (
            <Link key={a.label} href={a.href} className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200/70 dark:border-white/10 hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              <span className="material-symbols-outlined text-primary text-[18px]">{a.icon}</span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{a.label}</span>
            </Link>
          ))}
        </div>
      </RailCard>
    </>
  )
}
