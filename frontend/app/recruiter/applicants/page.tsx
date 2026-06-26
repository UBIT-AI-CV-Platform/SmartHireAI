'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import CVPreview, { type CVContent } from '@/components/candidate/CVPreview'
import FancySelect from '@/components/shared/FancySelect'

type AppStatus = 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'withdrawn'
type Applicant = {
  id: string
  status: AppStatus
  match_score: number | null
  applied_at: string
  candidate_name: string | null
  candidate_email: string | null
  cv_snapshot: CVContent | null
  recruiter_rating: number | null
  recruiter_notes: string | null
  job: { id: string; title: string; company: string } | null
}

const PIPELINE: AppStatus[] = ['applied', 'screening', 'interview', 'offer', 'rejected']
const STATUS_CLS: Record<AppStatus, string> = {
  applied: 'bg-indigo-100 text-indigo-700', screening: 'bg-amber-100 text-amber-700', interview: 'bg-sky-100 text-sky-700',
  offer: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-600', withdrawn: 'bg-slate-100 text-slate-500',
}
const STATUS_DOT: Record<AppStatus, string> = {
  applied: 'bg-indigo-500', screening: 'bg-amber-500', interview: 'bg-sky-500', offer: 'bg-green-500', rejected: 'bg-red-400', withdrawn: 'bg-slate-400',
}

const AVATAR = ['bg-indigo-100 text-indigo-700', 'bg-purple-100 text-purple-700', 'bg-sky-100 text-sky-700', 'bg-pink-100 text-pink-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700']
const avatarColor = (s: string) => AVATAR[Array.from(s || '?').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR.length]
const scoreColor = (s: number) => (s >= 75 ? 'text-green-600' : s >= 40 ? 'text-amber-600' : 'text-slate-500')

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000); if (d > 0) return `${d}d ago`
  const h = Math.floor(diff / 3600000); if (h > 0) return `${h}h ago`
  const m = Math.floor(diff / 60000); return m > 1 ? `${m}m ago` : 'just now'
}

export default function ApplicantsPage() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [apps, setApps] = useState<Applicant[]>([])
  const [jobFilter, setJobFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | AppStatus>('all')
  const [sort, setSort] = useState('newest')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'list' | 'board'>('list')

  const [viewCv, setViewCv] = useState<CVContent | null>(null)
  const [notesOpen, setNotesOpen] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState('')

  // outreach
  const [outApp, setOutApp] = useState<Applicant | null>(null)
  const [outKind, setOutKind] = useState<'interview' | 'rejection' | 'offer'>('interview')
  const [outText, setOutText] = useState('')
  const [outLoading, setOutLoading] = useState(false)
  const [outSending, setOutSending] = useState(false)
  const [outError, setOutError] = useState<string | null>(null)
  const [outSent, setOutSent] = useState(false)

  const load = async () => {
    setLoading(true); setLoadError(false)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoadError(true); setLoading(false); return }
      const { data: jobsData } = await supabase.from('jobs').select('id').eq('recruiter_id', user.id)
      const jobIds = (jobsData ?? []).map((j) => j.id)
      const { data, error } = jobIds.length
        ? await supabase
            .from('applications')
            .select('id, status, match_score, applied_at, candidate_name, candidate_email, cv_snapshot, recruiter_rating, recruiter_notes, job:jobs(id, title, company)')
            .in('job_id', jobIds)
            .order('applied_at', { ascending: false })
        : { data: [], error: null }
      if (error) { setLoadError(true); setLoading(false); return }
      setApps((data as unknown as Applicant[]) ?? [])
    } catch { setLoadError(true) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const jobOptions = useMemo(() => {
    const m = new Map<string, string>()
    apps.forEach((a) => { if (a.job?.id) m.set(a.job.id, a.job.title) })
    return [{ value: 'all', label: 'All jobs' }, ...[...m.entries()].map(([value, label]) => ({ value, label }))]
  }, [apps])
  const statusOptions = [{ value: 'all', label: 'All statuses' }, ...PIPELINE.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))]
  const sortOptions = [{ value: 'newest', label: 'Newest first' }, { value: 'oldest', label: 'Oldest first' }, { value: 'match', label: 'Best match' }, { value: 'rating', label: 'Top rated' }]

  const counts = useMemo(() => { const c: Record<string, number> = {}; apps.forEach((a) => { c[a.status] = (c[a.status] || 0) + 1 }); return c }, [apps])
  const avgMatch = useMemo(() => { const s = apps.map((a) => a.match_score).filter((x): x is number => x !== null); return s.length ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : 0 }, [apps])
  const shortlisted = useMemo(() => apps.filter((a) => (a.recruiter_rating || 0) >= 4).length, [apps])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const list = apps.filter((a) => {
      if (jobFilter !== 'all' && a.job?.id !== jobFilter) return false
      if (statusFilter !== 'all' && a.status !== statusFilter) return false
      if (q && !(a.candidate_name || '').toLowerCase().includes(q) && !(a.candidate_email || '').toLowerCase().includes(q) && !(a.job?.title || '').toLowerCase().includes(q)) return false
      return true
    })
    list.sort((a, b) => {
      if (sort === 'newest') return +new Date(b.applied_at) - +new Date(a.applied_at)
      if (sort === 'oldest') return +new Date(a.applied_at) - +new Date(b.applied_at)
      if (sort === 'match') return (b.match_score ?? -1) - (a.match_score ?? -1)
      return (b.recruiter_rating ?? -1) - (a.recruiter_rating ?? -1)
    })
    return list
  }, [apps, jobFilter, statusFilter, search, sort])

  const boardApps = useMemo(() => {
    const q = search.toLowerCase().trim()
    return apps.filter((a) => a.status !== 'withdrawn'
      && (jobFilter === 'all' || a.job?.id === jobFilter)
      && (!q || (a.candidate_name || '').toLowerCase().includes(q) || (a.job?.title || '').toLowerCase().includes(q)))
  }, [apps, jobFilter, search])

  const setStatus = async (id: string, status: AppStatus) => {
    setApps((a) => a.map((x) => (x.id === id ? { ...x, status } : x)))
    await createClient().from('applications').update({ status }).eq('id', id)
  }
  const setRating = async (id: string, rating: number) => {
    const val = rating === 0 ? null : rating
    setApps((a) => a.map((x) => (x.id === id ? { ...x, recruiter_rating: val } : x)))
    await createClient().from('applications').update({ recruiter_rating: val }).eq('id', id)
  }
  const openNotes = (ap: Applicant) => { setNotesOpen(notesOpen === ap.id ? null : ap.id); setNotesDraft(ap.recruiter_notes || '') }
  const saveNotes = async (id: string) => {
    const val = notesDraft.trim() || null
    setApps((a) => a.map((x) => (x.id === id ? { ...x, recruiter_notes: val } : x)))
    await createClient().from('applications').update({ recruiter_notes: val }).eq('id', id)
    setNotesOpen(null)
  }

  const openOutreach = (ap: Applicant) => { setOutApp(ap); setOutKind('interview'); setOutText(''); setOutError(null); setOutSent(false) }
  const draftOutreach = async () => {
    if (!outApp) return
    setOutLoading(true); setOutError(null); setOutSent(false)
    try {
      const res = await fetch('/api/recruiter/outreach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId: outApp.id, kind: outKind, action: 'draft' }) })
      const data = await res.json()
      if (!res.ok) setOutError(data.error || 'Could not draft the email.')
      else setOutText(data.text || '')
    } catch { setOutError('Network error. Please try again.') }
    setOutLoading(false)
  }
  const sendOutreach = async () => {
    if (!outApp || !outText.trim()) return
    setOutSending(true); setOutError(null)
    try {
      const res = await fetch('/api/recruiter/outreach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId: outApp.id, kind: outKind, action: 'send', text: outText }) })
      const data = await res.json()
      if (!res.ok) setOutError(data.error || 'Could not send the email.')
      else setOutSent(true)
    } catch { setOutError('Network error. Please try again.') }
    setOutSending(false)
  }

  if (loading) return <Loader />
  if (loadError) return <ErrorBox onRetry={load} />

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto">
      <header className="mb-5 md:mb-7 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-[2.25rem] font-bold tracking-tight text-on-surface leading-tight">Applicants</h1>
          <p className="text-on-surface-variant text-xs sm:text-sm md:text-base mt-1 sm:mt-2">Review applicants, rate them, take notes, move them through your pipeline, and reach out.</p>
        </div>
        <div className="flex bg-surface-container-low rounded-2xl p-1 self-start flex-shrink-0">
          <button onClick={() => setView('list')} className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${view === 'list' ? 'bg-white shadow text-primary' : 'text-on-surface-variant'}`}><span className="material-symbols-outlined text-base">view_list</span>List</button>
          <button onClick={() => setView('board')} className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${view === 'board' ? 'bg-white shadow text-primary' : 'text-on-surface-variant'}`}><span className="material-symbols-outlined text-base">view_kanban</span>Board</button>
        </div>
      </header>

      {view === 'board' ? (
        <Board apps={boardApps} onMove={setStatus} onView={setViewCv} />
      ) : (
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* LEFT */}
        <div className="col-span-12 lg:col-span-8">
          {/* Filters */}
          <div className="bg-white p-3 md:p-4 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container mb-5 space-y-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, or job" className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all text-on-surface font-medium placeholder:text-outline-variant outline-none" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FancySelect value={jobFilter} options={jobOptions} onChange={setJobFilter} icon="work" />
              <FancySelect value={statusFilter} options={statusOptions} onChange={(v) => setStatusFilter(v as 'all' | AppStatus)} icon="filter_list" />
              <FancySelect value={sort} options={sortOptions} onChange={setSort} icon="sort" />
            </div>
          </div>

          <p className="text-sm font-bold text-on-surface-variant mb-3 px-1">{filtered.length} applicant{filtered.length === 1 ? '' : 's'}</p>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container p-10 md:p-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-5"><span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>group</span></div>
              <h2 className="text-lg md:text-xl font-bold text-on-surface mb-2">{apps.length === 0 ? 'No applicants yet' : 'No applicants match your filters'}</h2>
              <p className="text-sm text-on-surface-variant max-w-md">{apps.length === 0 ? 'Once candidates apply to your jobs, they’ll show up here with their CVs.' : 'Try a different job, status, or search.'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((ap) => (
                <div key={ap.id} className="bg-white p-4 md:p-5 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black ${avatarColor(ap.candidate_name || '?')}`}>{(ap.candidate_name || '?').charAt(0).toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm md:text-base font-bold text-on-surface truncate">{ap.candidate_name || 'Candidate'}</p>
                      <p className="text-xs text-on-surface-variant truncate">{ap.candidate_email || '—'} · {ap.job?.title || 'a job'} · {timeAgo(ap.applied_at)}</p>
                    </div>
                    {ap.match_score !== null && <div className="text-right flex-shrink-0 hidden sm:block"><p className={`text-lg font-black leading-none ${scoreColor(ap.match_score)}`}>{ap.match_score}%</p><p className="text-[10px] text-on-surface-variant">match</p></div>}
                  </div>

                  {/* rating + status */}
                  <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
                    <Stars value={ap.recruiter_rating} onChange={(n) => setRating(ap.id, n)} />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {PIPELINE.map((st) => (
                        <button key={st} onClick={() => setStatus(ap.id, st)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all ${ap.status === st ? STATUS_CLS[st] : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}>{st}</button>
                      ))}
                    </div>
                  </div>

                  {/* actions */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-surface-container flex-wrap">
                    <button onClick={() => ap.cv_snapshot && setViewCv(ap.cv_snapshot)} disabled={!ap.cv_snapshot} className="px-3 py-2 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center gap-1.5 hover:bg-primary/15 transition-colors disabled:opacity-40"><span className="material-symbols-outlined text-base">description</span>View CV</button>
                    <button onClick={() => openOutreach(ap)} className="px-3 py-2 rounded-xl bg-surface-container-low text-on-surface font-bold text-xs flex items-center gap-1.5 hover:bg-surface-container transition-colors"><span className="material-symbols-outlined text-base">mail</span>Draft email</button>
                    <button onClick={() => openNotes(ap)} className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors ${ap.recruiter_notes ? 'bg-amber-50 text-amber-700' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'}`}><span className="material-symbols-outlined text-base">sticky_note_2</span>{ap.recruiter_notes ? 'Note added' : 'Add note'}</button>
                  </div>

                  {notesOpen === ap.id && (
                    <div className="mt-3">
                      <textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} rows={3} placeholder="Private notes about this candidate…" className="w-full px-4 py-3 bg-surface-container-low border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all text-on-surface text-sm outline-none resize-none" />
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => saveNotes(ap.id)} className="px-4 py-2 rounded-xl premium-gradient text-white font-bold text-xs">Save note</button>
                        <button onClick={() => setNotesOpen(null)} className="px-4 py-2 rounded-xl bg-surface-container-low text-on-surface font-bold text-xs">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT sidebar */}
        <aside className="col-span-12 lg:col-span-4 space-y-4 lg:sticky lg:top-20 self-start">
          <div className="p-5 rounded-[1.5rem] bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-xl">
            <h3 className="text-base font-bold mb-4">Applicant Overview</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="text-2xl font-black">{apps.length}</p><p className="text-[10px] text-indigo-100 uppercase tracking-wide font-bold mt-0.5">Total</p></div>
              <div><p className="text-2xl font-black">{shortlisted}</p><p className="text-[10px] text-indigo-100 uppercase tracking-wide font-bold mt-0.5">Top rated</p></div>
              <div><p className="text-2xl font-black">{avgMatch}%</p><p className="text-[10px] text-indigo-100 uppercase tracking-wide font-bold mt-0.5">Avg match</p></div>
            </div>
          </div>

          <div className="p-5 rounded-[1.5rem] bg-white border border-surface-container shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)]">
            <h3 className="text-sm font-black text-on-surface mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-primary text-lg">insights</span>Pipeline</h3>
            <div className="space-y-2">
              {PIPELINE.map((st) => (
                <button key={st} onClick={() => setStatusFilter(statusFilter === st ? 'all' : st)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${statusFilter === st ? 'bg-primary/5' : 'hover:bg-surface-container-low'}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[st]}`} />
                  <span className="text-sm text-on-surface-variant capitalize">{st}</span>
                  <span className="text-sm font-black text-on-surface ml-auto">{counts[st] || 0}</span>
                </button>
              ))}
            </div>
          </div>

          <Link href="/recruiter/ai-screening" className="block p-5 rounded-[1.5rem] bg-[#2c1f4a] text-white shadow-xl hover:-translate-y-0.5 transition-all">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center mb-3"><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span></div>
            <h3 className="text-base font-bold mb-1">AI Screening</h3>
            <p className="text-indigo-200/80 text-xs">Let AI rank these applicants by fit and build an interview kit.</p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold bg-white/10 px-3 py-1.5 rounded-lg">Open <span className="material-symbols-outlined text-base">arrow_forward</span></span>
          </Link>
        </aside>
      </div>
      )}

      {/* CV viewer */}
      {viewCv && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md" onClick={() => setViewCv(null)} />
          <div className="relative z-10 w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden auth-pop max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-surface-container flex items-center justify-between">
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-primary">description</span>Candidate CV</h3>
              <button onClick={() => setViewCv(null)} className="text-on-surface-variant hover:text-on-surface p-1"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="overflow-y-auto p-6 flex-1 bg-surface-container-low/40"><CVPreview cv={viewCv} /></div>
          </div>
        </div>
      )}

      {/* Outreach modal */}
      {outApp && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setOutApp(null)} />
          <div className="relative z-10 w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden auth-pop max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-surface-container flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-primary">mail</span>Email {outApp.candidate_name || 'candidate'}</h3>
                <p className="text-xs text-on-surface-variant truncate">{outApp.candidate_email || 'No email on file'}</p>
              </div>
              <button onClick={() => setOutApp(null)} className="text-on-surface-variant hover:text-on-surface p-1"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="flex gap-2">
                {(['interview', 'rejection', 'offer'] as const).map((k) => (
                  <button key={k} onClick={() => { setOutKind(k); setOutText(''); setOutSent(false) }} className={`flex-1 py-2.5 rounded-xl text-sm font-bold capitalize transition-all ${outKind === k ? 'premium-gradient text-white shadow' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}>{k === 'interview' ? 'Invite' : k}</button>
                ))}
              </div>
              <button onClick={draftOutreach} disabled={outLoading} className="w-full py-3 rounded-2xl bg-surface-container-low text-on-surface font-bold text-sm flex items-center justify-center gap-2 hover:bg-surface-container transition-colors disabled:opacity-60">
                <span className="material-symbols-outlined">{outLoading ? 'hourglass_top' : 'auto_awesome'}</span>{outLoading ? 'Drafting…' : outText ? 'Re-draft with AI' : 'Draft with AI'}
              </button>
              {outError && <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3"><span className="material-symbols-outlined text-red-500">error</span><p className="text-sm text-red-700 font-medium">{outError}</p></div>}
              {outSent && <div className="flex items-start gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3"><span className="material-symbols-outlined text-green-600">check_circle</span><p className="text-sm text-green-700 font-medium">Email sent to {outApp.candidate_email}.</p></div>}
              {outText && (
                <textarea value={outText} onChange={(e) => setOutText(e.target.value)} rows={9} className="w-full px-4 py-3 bg-surface-container-low border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all text-on-surface text-sm leading-relaxed outline-none resize-none" />
              )}
            </div>
            {outText && (
              <div className="p-4 border-t border-surface-container flex gap-3">
                <button onClick={() => navigator.clipboard.writeText(outText)} className="flex-1 py-3 rounded-2xl bg-surface-container-low text-on-surface font-bold text-sm flex items-center justify-center gap-2 hover:bg-surface-container transition-colors"><span className="material-symbols-outlined text-lg">content_copy</span>Copy</button>
                <button onClick={sendOutreach} disabled={outSending || !outApp.candidate_email} className="flex-1 py-3 rounded-2xl premium-gradient text-white font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-60"><span className="material-symbols-outlined text-lg">{outSending ? 'hourglass_top' : 'send'}</span>{outSending ? 'Sending…' : 'Send email'}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Board({ apps, onMove, onView }: { apps: Applicant[]; onMove: (id: string, s: AppStatus) => void; onView: (cv: CVContent | null) => void }) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<AppStatus | null>(null)
  const STAGES: { key: AppStatus; label: string; head: string }[] = [
    { key: 'applied', label: 'Applied', head: 'bg-indigo-100 text-indigo-700' },
    { key: 'screening', label: 'Screening', head: 'bg-amber-100 text-amber-700' },
    { key: 'interview', label: 'Interview', head: 'bg-sky-100 text-sky-700' },
    { key: 'offer', label: 'Offer', head: 'bg-green-100 text-green-700' },
    { key: 'rejected', label: 'Rejected', head: 'bg-red-100 text-red-600' },
  ]
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
      {STAGES.map((stage) => {
        const items = apps.filter((a) => a.status === stage.key)
        return (
          <div
            key={stage.key}
            onDragOver={(e) => { e.preventDefault(); setOver(stage.key) }}
            onDragLeave={() => setOver((s) => (s === stage.key ? null : s))}
            onDrop={() => { if (dragId) onMove(dragId, stage.key); setDragId(null); setOver(null) }}
            className={`rounded-[1.5rem] border-2 transition-colors p-3 min-h-[160px] ${over === stage.key ? 'border-primary/40 bg-surface-container-low' : 'border-transparent bg-surface-container-low/50'}`}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${stage.head}`}>{stage.label}</span>
              <span className="text-xs font-black text-on-surface-variant">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((c) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={() => setDragId(c.id)}
                  onDragEnd={() => { setDragId(null); setOver(null) }}
                  className={`bg-white p-3 rounded-2xl border border-surface-container shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${dragId === c.id ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black ${avatarColor(c.candidate_name || '?')}`}>{(c.candidate_name || '?').charAt(0).toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{c.candidate_name || 'Candidate'}</p>
                      <p className="text-[11px] text-on-surface-variant truncate">{c.job?.title || 'a job'}</p>
                    </div>
                    {c.match_score !== null && <span className={`text-xs font-black flex-shrink-0 ${scoreColor(c.match_score)}`}>{c.match_score}%</span>}
                  </div>
                  <button onClick={() => onView(c.cv_snapshot)} disabled={!c.cv_snapshot} className="mt-2 text-[11px] font-bold text-primary hover:underline disabled:opacity-40 flex items-center gap-1"><span className="material-symbols-outlined text-sm">description</span>View CV</button>
                </div>
              ))}
              {items.length === 0 && <p className="text-xs text-outline-variant text-center py-6">Drop here</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Stars({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-0.5" title="Rate this candidate">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onChange(n === value ? 0 : n)} className="text-amber-400 hover:scale-110 transition-transform">
          <span className="material-symbols-outlined text-xl" style={n <= (value || 0) ? { fontVariationSettings: "'FILL' 1" } : undefined}>star</span>
        </button>
      ))}
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
      <p className="text-xs font-black text-primary tracking-widest uppercase">Loading applicants...</p>
    </div>
  )
}

function ErrorBox({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto">
      <div className="bg-white rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container p-10 md:p-16 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 mb-5"><span className="material-symbols-outlined text-3xl">cloud_off</span></div>
        <h2 className="text-lg md:text-xl font-bold text-on-surface mb-2">Couldn’t load applicants</h2>
        <p className="text-sm text-on-surface-variant max-w-md mb-4">Something went wrong. Please try again.</p>
        <button onClick={onRetry} className="px-5 py-2.5 rounded-xl premium-gradient text-white font-bold text-sm flex items-center gap-2"><span className="material-symbols-outlined text-base">refresh</span>Retry</button>
      </div>
    </div>
  )
}
