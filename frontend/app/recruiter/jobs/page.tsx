'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Job = { id: string; title: string; company: string; location: string | null; description: string | null; salary: string | null; skills: string[]; is_open: boolean; expires_at: string | null; created_at: string }
type Form = { title: string; company: string; location: string; salary: string; skills: string; description: string; expires_at: string }
const EMPTY: Form = { title: '', company: '', location: '', salary: '', skills: '', description: '', expires_at: '' }

const AVATAR = ['bg-indigo-100 text-indigo-700', 'bg-purple-100 text-purple-700', 'bg-sky-100 text-sky-700', 'bg-pink-100 text-pink-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700']
const avatarColor = (s: string) => AVATAR[Array.from(s || '?').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR.length]

const isExpired = (j: Job) => !!j.expires_at && new Date(j.expires_at).getTime() < Date.now()
const deadlineLabel = (j: Job) => {
  if (!j.expires_at) return null
  const d = new Date(j.expires_at)
  const diff = d.getTime() - Date.now()
  if (diff < 0) return { text: `Expired ${d.toLocaleDateString()}`, cls: 'bg-red-50 text-red-600' }
  const days = Math.ceil(diff / 86400000)
  return { text: days <= 7 ? `Closes in ${days}d` : `Closes ${d.toLocaleDateString()}`, cls: 'bg-amber-50 text-amber-700' }
}

export default function RecruiterJobsPage() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [uid, setUid] = useState<string | null>(null)
  const [defaultCompany, setDefaultCompany] = useState('')
  const [jobs, setJobs] = useState<Job[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [tab, setTab] = useState<'active' | 'expired'>('active')

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [reposting, setReposting] = useState(false)
  const [form, setForm] = useState<Form>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [jdLoading, setJdLoading] = useState(false)
  const [viewJob, setViewJob] = useState<Job | null>(null)

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const writeJD = async () => {
    if (!form.title.trim()) { setFormError('Enter a job title first, then let AI write the description.'); return }
    setJdLoading(true); setFormError(null)
    try {
      const res = await fetch('/api/recruiter/job-description', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, company: form.company, skills: form.skills, notes: form.description }),
      })
      const data = await res.json()
      if (!res.ok) setFormError(data.error || 'Could not write the description.')
      else set('description', data.description || '')
    } catch { setFormError('Network error. Please try again.') }
    setJdLoading(false)
  }

  const load = async () => {
    setLoading(true); setLoadError(false)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoadError(true); setLoading(false); return }
      setUid(user.id)
      const [prof, jobsRes] = await Promise.all([
        supabase.from('profiles').select('company_name').eq('id', user.id).single(),
        supabase.from('jobs').select('*').eq('recruiter_id', user.id).order('created_at', { ascending: false }),
      ])
      if (jobsRes.error) { setLoadError(true); setLoading(false); return }
      setDefaultCompany(prof.data?.company_name || '')
      const list = (jobsRes.data as Job[]) ?? []
      setJobs(list)
      if (list.length) {
        const { data: appRows } = await supabase.from('applications').select('job_id').in('job_id', list.map((j) => j.id))
        const c: Record<string, number> = {}
        for (const r of (appRows ?? []) as { job_id: string }[]) c[r.job_id] = (c[r.job_id] || 0) + 1
        setCounts(c)
      } else setCounts({})
    } catch { setLoadError(true) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openNew = () => { setEditId(null); setReposting(false); setForm({ ...EMPTY, company: defaultCompany }); setFormError(null); setShowForm(true) }
  const openEdit = (j: Job, repost = false) => {
    setEditId(j.id); setReposting(repost)
    setForm({ title: j.title, company: j.company, location: j.location || '', salary: j.salary || '', skills: j.skills.join(', '), description: j.description || '', expires_at: repost ? '' : (j.expires_at ? j.expires_at.slice(0, 10) : '') })
    setFormError(null); setShowForm(true)
  }

  const submit = async () => {
    setFormError(null)
    if (!form.title.trim() || !form.company.trim()) { setFormError('Title and company are required.'); return }
    if (reposting && !form.expires_at) { setFormError('Pick a new deadline to repost this job.'); return }
    setSaving(true)
    const supabase = createClient()
    if (!uid) { setSaving(false); return }
    const expiresIso = form.expires_at ? new Date(form.expires_at + 'T23:59:59').toISOString() : null
    const payload: Record<string, unknown> = {
      title: form.title.trim(), company: form.company.trim(),
      location: form.location.trim() || null, salary: form.salary.trim() || null,
      description: form.description.trim() || null,
      skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
      expires_at: expiresIso,
    }
    // reposting reactivates the job
    if (reposting) payload.is_open = true
    if (editId) {
      const { data, error } = await supabase.from('jobs').update(payload as never).eq('id', editId).select('*').single()
      setSaving(false)
      if (error) { setFormError(error.message); return }
      if (data) setJobs((j) => j.map((x) => (x.id === editId ? (data as Job) : x)))
      if (reposting) setTab('active')
    } else {
      const { data, error } = await supabase.from('jobs').insert({ recruiter_id: uid, ...payload } as never).select('*').single()
      setSaving(false)
      if (error) { setFormError(error.message); return }
      if (data) setJobs((j) => [data as Job, ...j])
    }
    setShowForm(false)
  }

  const toggleOpen = async (job: Job) => {
    const next = !job.is_open
    setJobs((j) => j.map((x) => (x.id === job.id ? { ...x, is_open: next } : x)))
    await createClient().from('jobs').update({ is_open: next }).eq('id', job.id)
  }

  const deleteJob = async (job: Job) => {
    if (!window.confirm(`Delete "${job.title}"? All its applications will be removed.`)) return
    setJobs((j) => j.filter((x) => x.id !== job.id))
    await createClient().from('jobs').delete().eq('id', job.id)
  }

  const totalApplicants = useMemo(() => Object.values(counts).reduce((a, b) => a + b, 0), [counts])
  const activeJobs = useMemo(() => jobs.filter((j) => !isExpired(j)), [jobs])
  const expiredJobs = useMemo(() => jobs.filter(isExpired), [jobs])
  const shown = tab === 'active' ? activeJobs : expiredJobs

  if (loading) return <Loader />
  if (loadError) return <ErrorBox onRetry={load} />

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-[2.25rem] font-bold tracking-tight text-on-surface leading-tight">Jobs</h1>
          <p className="text-on-surface-variant text-xs sm:text-sm md:text-base mt-1 sm:mt-2">{jobs.length} post{jobs.length === 1 ? '' : 's'} · {totalApplicants} applicant{totalApplicants === 1 ? '' : 's'}</p>
        </div>
        <button onClick={openNew} className="px-5 py-3 rounded-2xl premium-gradient text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
          <span className="material-symbols-outlined">add</span>Post a Job
        </button>
      </header>

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 lg:col-span-8">
      {/* Tabs */}
      <div className="flex bg-surface-container-low rounded-2xl p-1 mb-5 w-fit">
        <button onClick={() => setTab('active')} className={`px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'active' ? 'bg-white shadow text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>Active {activeJobs.length > 0 && <span className="ml-1 text-xs">({activeJobs.length})</span>}</button>
        <button onClick={() => setTab('expired')} className={`px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'expired' ? 'bg-white shadow text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>Old / Expired {expiredJobs.length > 0 && <span className="ml-1 text-xs">({expiredJobs.length})</span>}</button>
      </div>

      {shown.length === 0 ? (
        <div className="bg-white rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container p-10 md:p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl premium-gradient flex items-center justify-center text-white shadow-lg mb-4"><span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>{tab === 'active' ? 'post_add' : 'history'}</span></div>
          <h3 className="text-lg md:text-xl font-bold text-on-surface mb-2">{tab === 'active' ? 'No active jobs' : 'No expired jobs'}</h3>
          <p className="text-sm text-on-surface-variant max-w-md mb-5">{tab === 'active' ? 'Post a role — it appears instantly for candidates to apply to.' : 'Jobs past their deadline land here. You can repost them anytime.'}</p>
          {tab === 'active' && <button onClick={openNew} className="px-5 py-3 rounded-2xl premium-gradient text-white font-bold text-sm">Post a Job</button>}
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((job) => {
            const dl = deadlineLabel(job)
            const expired = isExpired(job)
            return (
              <div key={job.id} className="bg-white p-4 md:p-5 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-black ${avatarColor(job.company)}`}>{job.company.charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => setViewJob(job)} className="text-base font-bold text-on-surface truncate hover:text-primary transition-colors text-left">{job.title}</button>
                      {expired ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">Expired</span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${job.is_open ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{job.is_open ? 'Open' : 'Closed'}</span>
                      )}
                      {dl && <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${dl.cls}`}>{dl.text}</span>}
                    </div>
                    <p className="text-on-surface-variant text-sm truncate">{job.company}{job.location ? ` • ${job.location}` : ''}{job.salary ? ` • ${job.salary}` : ''}</p>
                    {job.skills.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{job.skills.slice(0, 6).map((s) => <span key={s} className="px-2.5 py-0.5 bg-surface-container text-on-surface-variant text-xs rounded-lg">{s}</span>)}</div>}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-surface-container">
                  <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary font-bold text-sm"><span className="material-symbols-outlined text-base">group</span>{counts[job.id] || 0} Applicant{(counts[job.id] || 0) === 1 ? '' : 's'}</span>
                  <div className="flex items-center gap-1">
                    {expired ? (
                      <button onClick={() => openEdit(job, true)} className="px-3 py-2 rounded-xl premium-gradient text-white font-bold text-sm flex items-center gap-1.5 hover:scale-[1.03] transition-all"><span className="material-symbols-outlined text-base">restart_alt</span>Repost</button>
                    ) : (
                      <button onClick={() => toggleOpen(job)} title={job.is_open ? 'Close' : 'Reopen'} className="px-3 py-2 rounded-xl text-on-surface-variant font-bold text-sm hover:bg-surface-container-low transition-colors flex items-center gap-1.5"><span className="material-symbols-outlined text-base">{job.is_open ? 'lock' : 'lock_open'}</span><span className="hidden sm:inline">{job.is_open ? 'Close' : 'Reopen'}</span></button>
                    )}
                    <button onClick={() => openEdit(job)} title="Edit" className="px-3 py-2 rounded-xl text-on-surface-variant font-bold text-sm hover:bg-surface-container-low transition-colors flex items-center gap-1.5"><span className="material-symbols-outlined text-base">edit</span><span className="hidden sm:inline">Edit</span></button>
                    <button onClick={() => deleteJob(job)} title="Delete" className="p-2 rounded-xl text-on-surface-variant hover:text-red-500 hover:bg-red-50 transition-colors"><span className="material-symbols-outlined text-base">delete</span></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
        </div>

        {/* Right sidebar */}
        <aside className="col-span-12 lg:col-span-4 space-y-4 lg:sticky lg:top-20 self-start">
          <div className="p-5 rounded-[1.5rem] bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-xl">
            <h3 className="text-base font-bold mb-4">At a glance</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="text-2xl font-black">{activeJobs.length}</p><p className="text-[10px] text-indigo-100 uppercase tracking-wide font-bold mt-0.5">Active</p></div>
              <div><p className="text-2xl font-black">{expiredJobs.length}</p><p className="text-[10px] text-indigo-100 uppercase tracking-wide font-bold mt-0.5">Expired</p></div>
              <div><p className="text-2xl font-black">{totalApplicants}</p><p className="text-[10px] text-indigo-100 uppercase tracking-wide font-bold mt-0.5">Applicants</p></div>
            </div>
          </div>
          <a href="/recruiter/ai-screening" className="block p-5 rounded-[1.5rem] bg-[#2c1f4a] text-white shadow-xl hover:-translate-y-0.5 transition-all">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center mb-3"><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span></div>
            <h3 className="text-base font-bold mb-1">AI Screening</h3>
            <p className="text-indigo-200/80 text-xs">Rank applicants & build interview kits with AI.</p>
          </a>
          <div className="p-5 rounded-[1.5rem] bg-pink-200/50 border border-pink-300/30">
            <div className="flex items-center gap-2 mb-2"><span className="material-symbols-outlined text-pink-700" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span><h3 className="text-sm font-black text-pink-950">Posting tips</h3></div>
            <ul className="text-xs text-pink-900/80 leading-relaxed space-y-1.5 list-disc list-inside">
              <li>Set a clear deadline so the post auto-archives.</li>
              <li>List exact skills — it powers candidate match scores.</li>
              <li>Use <b>Write with AI</b> for a polished description.</li>
            </ul>
          </div>
        </aside>
      </div>

      {/* View job modal */}
      {viewJob && (() => {
        const dl = deadlineLabel(viewJob)
        const expired = isExpired(viewJob)
        return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setViewJob(null)} />
            <div className="relative z-10 w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden auth-pop max-h-[90vh] flex flex-col">
              <div className="p-5 border-b border-surface-container flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl font-black ${avatarColor(viewJob.company)}`}>{viewJob.company.charAt(0).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-on-surface">{viewJob.title}</h3>
                    {expired ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">Expired</span> : <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${viewJob.is_open ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{viewJob.is_open ? 'Open' : 'Closed'}</span>}
                  </div>
                  <p className="text-on-surface-variant text-sm">{viewJob.company}{viewJob.location ? ` • ${viewJob.location}` : ''}</p>
                  {dl && <p className={`text-xs font-bold mt-1 inline-block px-2 py-0.5 rounded ${dl.cls}`}>{dl.text}</p>}
                </div>
                <button onClick={() => setViewJob(null)} className="text-on-surface-variant hover:text-on-surface p-1 flex-shrink-0"><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {viewJob.salary && <span className="px-3 py-1.5 bg-green-50 text-green-700 text-xs font-bold rounded-lg flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">payments</span>{viewJob.salary}</span>}
                  <span className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-lg flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">group</span>{counts[viewJob.id] || 0} applicant{(counts[viewJob.id] || 0) === 1 ? '' : 's'}</span>
                </div>
                {viewJob.skills.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Required skills</p>
                    <div className="flex flex-wrap gap-2">{viewJob.skills.map((s) => <span key={s} className="px-3 py-1.5 bg-surface-container text-on-surface-variant text-xs font-semibold rounded-lg">{s}</span>)}</div>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Description</p>
                  <p className="text-sm text-on-surface leading-relaxed whitespace-pre-line">{viewJob.description || 'No description provided.'}</p>
                </div>
              </div>
              <div className="p-4 border-t border-surface-container flex gap-3">
                <button onClick={() => setViewJob(null)} className="px-5 py-3 rounded-2xl bg-surface-container-low text-on-surface font-bold text-sm hover:bg-surface-container transition-colors">Close</button>
                <button onClick={() => { const j = viewJob; setViewJob(null); openEdit(j) }} className="flex-1 py-3 rounded-2xl premium-gradient text-white font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition-all"><span className="material-symbols-outlined text-lg">edit</span>Edit job</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Post / edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative z-10 w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden auth-pop max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-surface-container flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-primary">{reposting ? 'restart_alt' : editId ? 'edit' : 'post_add'}</span>{reposting ? 'Repost Job' : editId ? 'Edit Job' : 'Post a Job'}</h3>
              <button onClick={() => setShowForm(false)} className="text-on-surface-variant hover:text-on-surface p-1"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Job Title *" value={form.title} onChange={(v) => set('title', v)} placeholder="Frontend Developer" />
                <Field label="Company *" value={form.company} onChange={(v) => set('company', v)} placeholder="Acme Inc." />
                <Field label="Location" value={form.location} onChange={(v) => set('location', v)} placeholder="Remote / Lahore" />
                <Field label="Salary" value={form.salary} onChange={(v) => set('salary', v)} placeholder="$60k – $90k" />
              </div>
              <Field label="Required Skills" value={form.skills} onChange={(v) => set('skills', v)} placeholder="React, TypeScript, Node.js (comma separated)" />
              <div className="sm:w-1/2">
                <Field label="Application Deadline" value={form.expires_at} onChange={(v) => set('expires_at', v)} type="date" />
                <p className="text-[11px] text-on-surface-variant mt-1 ml-1">After this date the job auto-moves to Old / Expired. Leave empty for no deadline.</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2 ml-1">
                  <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Description</label>
                  <button type="button" onClick={writeJD} disabled={jdLoading} className="flex items-center gap-1 text-xs font-bold text-primary hover:underline disabled:opacity-60">
                    <span className="material-symbols-outlined text-sm">{jdLoading ? 'hourglass_top' : 'auto_awesome'}</span>{jdLoading ? 'Writing…' : 'Write with AI'}
                  </button>
                </div>
                <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={5} className="w-full px-4 py-3 bg-surface-container-low border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all text-on-surface text-sm font-medium placeholder:text-outline-variant outline-none resize-none" placeholder="Describe the role, responsibilities, and requirements — or let AI write it." />
              </div>
              {formError && <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3"><span className="material-symbols-outlined text-red-500">error</span><p className="text-sm text-red-700 font-medium">{formError}</p></div>}
            </div>
            <div className="p-4 border-t border-surface-container flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-2xl bg-surface-container-low text-on-surface font-bold text-sm hover:bg-surface-container transition-colors">Cancel</button>
              <button onClick={submit} disabled={saving} className="flex-1 py-3 rounded-2xl premium-gradient text-white font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-60">
                <span className="material-symbols-outlined text-lg">{saving ? 'hourglass_top' : 'check'}</span>{saving ? 'Saving...' : reposting ? 'Repost Job' : editId ? 'Save changes' : 'Post Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 ml-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-4 py-3 bg-surface-container-low border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all text-on-surface text-sm font-medium placeholder:text-outline-variant outline-none" />
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
      <p className="text-xs font-black text-primary tracking-widest uppercase">Loading jobs...</p>
    </div>
  )
}

function ErrorBox({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-5xl mx-auto">
      <div className="bg-white rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container p-10 md:p-16 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 mb-5"><span className="material-symbols-outlined text-3xl">cloud_off</span></div>
        <h2 className="text-lg md:text-xl font-bold text-on-surface mb-2">Couldn’t load jobs</h2>
        <p className="text-sm text-on-surface-variant max-w-md mb-4">Something went wrong. Please try again.</p>
        <button onClick={onRetry} className="px-5 py-2.5 rounded-xl premium-gradient text-white font-bold text-sm flex items-center gap-2"><span className="material-symbols-outlined text-base">refresh</span>Retry</button>
      </div>
    </div>
  )
}
