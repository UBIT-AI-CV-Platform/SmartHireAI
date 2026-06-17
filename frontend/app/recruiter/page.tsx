'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Job = {
  id: string
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

type Applicant = {
  id: string
  status: AppStatus
  match_score: number | null
  applied_at: string
  candidate_name: string | null
  candidate_email: string | null
  cv_snapshot: CVSnapshot | null
}

type CVSnapshot = {
  full_name?: string
  title?: string
  contact?: { email?: string; phone?: string; location?: string }
  summary?: string
  experience?: { role: string; organization: string; period: string; bullets: string[] }[]
  education?: { degree: string; institute: string; period: string }[]
  skills?: string[]
  certifications?: { name: string; issuer?: string; date?: string }[]
}

const STATUS_FLOW: AppStatus[] = ['applied', 'screening', 'interview', 'offer', 'rejected']
const STATUS_STYLE: Record<AppStatus, string> = {
  applied: 'bg-indigo-100 text-indigo-700',
  screening: 'bg-amber-100 text-amber-700',
  interview: 'bg-sky-100 text-sky-700',
  offer: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
  withdrawn: 'bg-slate-100 text-slate-500',
}

const avatarColor = (s: string) => {
  const colors = ['bg-indigo-100 text-indigo-700', 'bg-purple-100 text-purple-700', 'bg-sky-100 text-sky-700', 'bg-pink-100 text-pink-700', 'bg-emerald-100 text-emerald-700']
  return colors[Array.from(s).reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length]
}

const EMPTY_FORM = { title: '', company: '', location: '', salary: '', skills: '', description: '' }

export default function RecruiterHomePage() {
  const router = useRouter()
  const [name, setName] = useState('Recruiter')
  const [ready, setReady] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})

  // Post-a-job form
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Applicants drawer
  const [openJob, setOpenJob] = useState<Job | null>(null)
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [applicantsLoading, setApplicantsLoading] = useState(false)
  const [viewCv, setViewCv] = useState<CVSnapshot | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/auth'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, role_selected')
        .eq('id', user.id)
        .single()
      if (profile && !profile.role_selected) { router.replace('/auth/select-role'); return }
      if (profile && profile.role === 'candidate') { router.replace('/candidate'); return }
      setName(profile?.full_name || user.email || 'Recruiter')
      await loadJobs(user.id)
      setReady(true)
    })
  }, [])

  const loadJobs = async (uid: string) => {
    const supabase = createClient()
    const { data } = await supabase.from('jobs').select('*').eq('recruiter_id', uid).order('created_at', { ascending: false })
    const list = (data as Job[]) ?? []
    setJobs(list)
    // applicant counts per job
    if (list.length) {
      const { data: appRows } = await supabase
        .from('applications')
        .select('job_id')
        .in('job_id', list.map((j) => j.id))
      const c: Record<string, number> = {}
      for (const r of (appRows ?? []) as { job_id: string }[]) c[r.job_id] = (c[r.job_id] || 0) + 1
      setCounts(c)
    } else {
      setCounts({})
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const submitJob = async () => {
    setFormError(null)
    if (!form.title.trim() || !form.company.trim()) { setFormError('Title and company are required.'); return }
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const skills = form.skills.split(',').map((s) => s.trim()).filter(Boolean)
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        recruiter_id: user.id,
        title: form.title.trim(),
        company: form.company.trim(),
        location: form.location.trim() || null,
        salary: form.salary.trim() || null,
        description: form.description.trim() || null,
        skills,
      })
      .select('*')
      .single()
    setSaving(false)
    if (error) { setFormError(error.message); return }
    if (data) setJobs((j) => [data as Job, ...j])
    setForm(EMPTY_FORM)
    setShowForm(false)
  }

  const toggleOpen = async (job: Job) => {
    const next = !job.is_open
    setJobs((j) => j.map((x) => (x.id === job.id ? { ...x, is_open: next } : x)))
    const supabase = createClient()
    await supabase.from('jobs').update({ is_open: next }).eq('id', job.id)
  }

  const deleteJob = async (job: Job) => {
    if (!window.confirm(`Delete "${job.title}"? All its applications will be removed.`)) return
    setJobs((j) => j.filter((x) => x.id !== job.id))
    const supabase = createClient()
    await supabase.from('jobs').delete().eq('id', job.id)
  }

  const openApplicants = async (job: Job) => {
    setOpenJob(job)
    setApplicantsLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('applications')
      .select('id, status, match_score, applied_at, candidate_name, candidate_email, cv_snapshot')
      .eq('job_id', job.id)
      .order('applied_at', { ascending: false })
    setApplicants((data as unknown as Applicant[]) ?? [])
    setApplicantsLoading(false)
  }

  const setApplicantStatus = async (appId: string, status: AppStatus) => {
    setApplicants((a) => a.map((x) => (x.id === appId ? { ...x, status } : x)))
    const supabase = createClient()
    await supabase.from('applications').update({ status }).eq('id', appId)
  }

  const stats = useMemo(() => {
    const totalApplicants = Object.values(counts).reduce((a, b) => a + b, 0)
    return [
      { label: 'Active Jobs', value: String(jobs.filter((j) => j.is_open).length), icon: 'work', bg: 'bg-indigo-100', fg: 'text-indigo-700' },
      { label: 'Total Jobs', value: String(jobs.length), icon: 'list_alt', bg: 'bg-purple-100', fg: 'text-purple-700' },
      { label: 'Applicants', value: String(totalApplicants), icon: 'group', bg: 'bg-sky-100', fg: 'text-sky-700' },
      { label: 'Closed', value: String(jobs.filter((j) => !j.is_open).length), icon: 'lock', bg: 'bg-pink-100', fg: 'text-pink-700' },
    ]
  }, [jobs, counts])

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 md:px-8 h-16 bg-indigo-50/50 backdrop-blur-md shadow-sm shadow-indigo-500/5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 premium-gradient rounded-lg flex items-center justify-center text-white shadow-lg">
            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>work</span>
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 leading-tight">SmartHire AI</h1>
            <p className="text-[10px] font-medium text-on-surface-variant">Recruiter Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs md:text-sm font-bold text-on-surface hidden sm:inline">{name}</span>
          <div className="h-8 w-8 rounded-full bg-indigo-200 flex items-center justify-center border-2 border-white shadow-sm">
            <span className="material-symbols-outlined text-indigo-700 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
          </div>
          <button onClick={handleSignOut} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-indigo-100 transition-colors text-xs font-bold">
            <span className="material-symbols-outlined text-base">logout</span>
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl md:text-3xl font-bold tracking-tight text-on-surface">Welcome, {name}</h2>
            <p className="text-on-surface-variant text-sm mt-1">Post roles and review candidates who applied with their CV.</p>
          </div>
          <button onClick={() => { setForm(EMPTY_FORM); setFormError(null); setShowForm(true) }} className="px-5 py-3 rounded-2xl premium-gradient text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
            <span className="material-symbols-outlined">add</span>Post a Job
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="bg-white p-4 md:p-6 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)]">
              <div className={`w-10 h-10 rounded-xl ${s.bg} ${s.fg} flex items-center justify-center mb-3`}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-on-surface">{s.value}</h3>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Jobs list */}
        <h3 className="text-base md:text-lg font-bold text-on-surface mb-3">Your Job Posts</h3>
        {!ready ? (
          <div className="flex items-center justify-center gap-1.5 py-16">
            <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce"></div>
            <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
            <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] p-10 md:p-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl premium-gradient flex items-center justify-center text-white shadow-lg mb-4">
              <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>post_add</span>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-on-surface mb-2">No job posts yet</h3>
            <p className="text-sm text-on-surface-variant max-w-md mb-5">Post your first role — it will instantly appear for candidates to apply to.</p>
            <button onClick={() => setShowForm(true)} className="px-5 py-3 rounded-2xl premium-gradient text-white font-bold text-sm">Post a Job</button>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div key={job.id} className="bg-white p-4 md:p-5 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-black ${avatarColor(job.company)}`}>
                    {job.company.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-on-surface truncate">{job.title}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${job.is_open ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{job.is_open ? 'Open' : 'Closed'}</span>
                    </div>
                    <p className="text-on-surface-variant text-sm truncate">{job.company}{job.location ? ` • ${job.location}` : ''}{job.salary ? ` • ${job.salary}` : ''}</p>
                    {job.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {job.skills.slice(0, 5).map((s) => <span key={s} className="px-2.5 py-0.5 bg-surface-container text-on-surface-variant text-xs rounded-lg">{s}</span>)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-surface-container">
                  <button onClick={() => openApplicants(job)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary/15 transition-colors">
                    <span className="material-symbols-outlined text-base">group</span>
                    {counts[job.id] || 0} Applicant{(counts[job.id] || 0) === 1 ? '' : 's'}
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => toggleOpen(job)} title={job.is_open ? 'Close job' : 'Reopen job'} className="px-3 py-2 rounded-xl text-on-surface-variant font-bold text-sm hover:bg-surface-container-low transition-colors flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">{job.is_open ? 'lock' : 'lock_open'}</span>
                      <span className="hidden sm:inline">{job.is_open ? 'Close' : 'Reopen'}</span>
                    </button>
                    <button onClick={() => deleteJob(job)} title="Delete job" className="p-2 rounded-xl text-on-surface-variant hover:text-red-500 hover:bg-red-50 transition-colors">
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Post-a-job modal */}
      {showForm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative z-10 w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden auth-pop max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-surface-container flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-primary">post_add</span>Post a Job</h3>
              <button onClick={() => setShowForm(false)} className="text-on-surface-variant hover:text-on-surface p-1"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Job Title *" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="Frontend Developer" />
                <Field label="Company *" value={form.company} onChange={(v) => setForm((f) => ({ ...f, company: v }))} placeholder="Acme Inc." />
                <Field label="Location" value={form.location} onChange={(v) => setForm((f) => ({ ...f, location: v }))} placeholder="Remote / Lahore" />
                <Field label="Salary" value={form.salary} onChange={(v) => setForm((f) => ({ ...f, salary: v }))} placeholder="$60k – $90k" />
              </div>
              <Field label="Required Skills" value={form.skills} onChange={(v) => setForm((f) => ({ ...f, skills: v }))} placeholder="React, TypeScript, Node.js (comma separated)" />
              <div>
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={5} className="w-full px-4 py-3 bg-surface-container-low border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all text-on-surface text-sm font-medium placeholder:text-outline-variant outline-none resize-none" placeholder="Describe the role, responsibilities, and requirements." />
              </div>
              {formError && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                  <span className="material-symbols-outlined text-red-500">error</span>
                  <p className="text-sm text-red-700 font-medium">{formError}</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-surface-container flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-2xl bg-surface-container-low text-on-surface font-bold text-sm hover:bg-surface-container transition-colors">Cancel</button>
              <button onClick={submitJob} disabled={saving} className="flex-1 py-3 rounded-2xl premium-gradient text-white font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-60">
                <span className="material-symbols-outlined text-lg">{saving ? 'hourglass_top' : 'check'}</span>
                {saving ? 'Posting...' : 'Post Job'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Applicants modal */}
      {openJob && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setOpenJob(null)} />
          <div className="relative z-10 w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden auth-pop max-h-[88vh] flex flex-col">
            <div className="p-5 border-b border-surface-container flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-on-surface truncate">Applicants · {openJob.title}</h3>
                <p className="text-xs text-on-surface-variant">{openJob.company}</p>
              </div>
              <button onClick={() => setOpenJob(null)} className="text-on-surface-variant hover:text-on-surface p-1"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="overflow-y-auto p-3 flex-1">
              {applicantsLoading ? (
                <div className="flex items-center justify-center gap-1.5 py-12">
                  <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce"></div>
                  <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
                </div>
              ) : applicants.length === 0 ? (
                <p className="text-sm text-on-surface-variant text-center py-12">No applicants yet for this role.</p>
              ) : (
                <div className="space-y-2">
                  {applicants.map((ap) => (
                    <div key={ap.id} className="p-4 rounded-2xl border border-surface-container hover:bg-surface-container-low/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black ${avatarColor(ap.candidate_name || '?')}`}>
                          {(ap.candidate_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-on-surface truncate">{ap.candidate_name || 'Candidate'}</p>
                          <p className="text-xs text-on-surface-variant truncate">{ap.candidate_email || '—'}</p>
                        </div>
                        {ap.match_score !== null && (
                          <span className="hidden sm:flex items-baseline gap-0.5 text-sm font-black text-primary flex-shrink-0">{ap.match_score}<span className="text-[10px] text-on-surface-variant font-medium">%</span></span>
                        )}
                        <button onClick={() => ap.cv_snapshot && setViewCv(ap.cv_snapshot)} disabled={!ap.cv_snapshot} className="px-3 py-2 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center gap-1.5 hover:bg-primary/15 transition-colors disabled:opacity-40">
                          <span className="material-symbols-outlined text-base">description</span>CV
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                        {STATUS_FLOW.map((st) => (
                          <button key={st} onClick={() => setApplicantStatus(ap.id, st)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all ${ap.status === st ? STATUS_STYLE[st] : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}>
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CV snapshot viewer */}
      {viewCv && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md" onClick={() => setViewCv(null)} />
          <div className="relative z-10 w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden auth-pop max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-surface-container flex items-center justify-between">
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-primary">description</span>Candidate CV</h3>
              <button onClick={() => setViewCv(null)} className="text-on-surface-variant hover:text-on-surface p-1"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="overflow-y-auto p-6 flex-1 bg-surface-container-low/40">
              <CVSnapshotView cv={viewCv} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 ml-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-4 py-3 bg-surface-container-low border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all text-on-surface text-sm font-medium placeholder:text-outline-variant outline-none" />
    </div>
  )
}

function CVSnapshotView({ cv }: { cv: CVSnapshot }) {
  const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-5">
      <h4 className="text-[11px] font-black uppercase tracking-[0.18em] text-primary mb-2">{title}</h4>
      {children}
    </div>
  )
  return (
    <div className="bg-white rounded-2xl border border-surface-container p-6 shadow-sm">
      <h2 className="text-2xl font-black text-on-surface tracking-tight">{cv.full_name}</h2>
      {cv.title && <p className="text-base font-semibold text-primary mb-2">{cv.title}</p>}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant mb-5">
        {cv.contact?.email && <span>{cv.contact.email}</span>}
        {cv.contact?.phone && <span>{cv.contact.phone}</span>}
        {cv.contact?.location && <span>{cv.contact.location}</span>}
      </div>
      {cv.summary && <Block title="Summary"><p className="text-sm text-on-surface leading-relaxed">{cv.summary}</p></Block>}
      {cv.experience && cv.experience.length > 0 && (
        <Block title="Experience">
          <div className="space-y-3">
            {cv.experience.map((e, i) => (
              <div key={i}>
                <div className="flex justify-between items-baseline gap-2">
                  <p className="text-sm font-bold text-on-surface">{e.role}</p>
                  {e.period && <span className="text-xs text-outline font-semibold">{e.period}</span>}
                </div>
                {e.organization && <p className="text-xs font-semibold text-primary">{e.organization}</p>}
                <ul className="list-disc list-inside text-sm text-on-surface-variant mt-1 space-y-0.5">
                  {e.bullets?.map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Block>
      )}
      {cv.education && cv.education.length > 0 && (
        <Block title="Education">
          <div className="space-y-2">
            {cv.education.map((e, i) => (
              <div key={i} className="flex justify-between items-baseline gap-2">
                <div>
                  <p className="text-sm font-bold text-on-surface">{e.degree}</p>
                  <p className="text-xs text-on-surface-variant">{e.institute}</p>
                </div>
                {e.period && <span className="text-xs text-outline font-semibold">{e.period}</span>}
              </div>
            ))}
          </div>
        </Block>
      )}
      {cv.skills && cv.skills.length > 0 && (
        <Block title="Skills">
          <div className="flex flex-wrap gap-1.5">
            {cv.skills.map((s, i) => <span key={i} className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">{s}</span>)}
          </div>
        </Block>
      )}
      {cv.certifications && cv.certifications.length > 0 && (
        <Block title="Certifications">
          <ul className="space-y-1">
            {cv.certifications.map((c, i) => (
              <li key={i} className="text-sm text-on-surface"><span className="font-bold">{c.name}</span>{(c.issuer || c.date) && <span className="text-on-surface-variant"> — {[c.issuer, c.date].filter(Boolean).join(' • ')}</span>}</li>
            ))}
          </ul>
        </Block>
      )}
    </div>
  )
}
