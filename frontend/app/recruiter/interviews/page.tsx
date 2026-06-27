'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import FancySelect from '@/components/shared/FancySelect'

type Stage = 'proposed' | 'accepted' | 'declined' | 'completed' | 'offer' | 'offer_accepted' | 'offer_declined' | 'rejected' | 'cancelled'
type Interview = {
  id: string; application_id: string | null; job_id: string | null; candidate_id: string
  candidate_name: string | null; job_title: string | null; scheduled_at: string | null
  duration_min: number; meeting_link: string | null; location: string | null; stage: Stage; notes: string | null
}
type AppRow = { id: string; candidate_id: string; candidate_name: string | null; status: string; job: { id: string; title: string } | null }

const STAGE_META: Record<Stage, { label: string; cls: string; icon: string }> = {
  proposed: { label: 'Awaiting candidate', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', icon: 'schedule' },
  accepted: { label: 'Confirmed', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', icon: 'event_available' },
  declined: { label: 'Declined by candidate', cls: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300', icon: 'event_busy' },
  completed: { label: 'Awaiting result', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300', icon: 'how_to_reg' },
  offer: { label: 'Offer sent', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300', icon: 'workspace_premium' },
  offer_accepted: { label: 'Hired 🎉', cls: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300', icon: 'verified' },
  offer_declined: { label: 'Offer declined', cls: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300', icon: 'cancel' },
  rejected: { label: 'Not selected', cls: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400', icon: 'do_not_disturb_on' },
  cancelled: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400', icon: 'event_busy' },
}
const AVATAR = ['bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300', 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300', 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300']
const avatarColor = (s: string) => AVATAR[Array.from(s || '?').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR.length]
const fmtWhen = (iso: string | null) => iso ? new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Time TBD'

const EMPTY = { appId: '', date: '', time: '', duration: '30', link: '', notes: '' }

export default function RecruiterInterviewsPage() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [uid, setUid] = useState<string | null>(null)
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [appRows, setAppRows] = useState<AppRow[]>([])

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setLoadError(false)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoadError(true); setLoading(false); return }
      setUid(user.id)
      const [ivRes, appsRes] = await Promise.all([
        supabase.from('interviews').select('*').eq('recruiter_id', user.id).order('scheduled_at', { ascending: true }),
        supabase.from('applications').select('id, candidate_id, candidate_name, status, job:jobs(id, title)').order('applied_at', { ascending: false }),
      ])
      if (ivRes.error) { setLoadError(true); setLoading(false); return }
      setInterviews((ivRes.data as Interview[]) ?? [])
      setAppRows((appsRes.data as unknown as AppRow[]) ?? [])
    } catch { setLoadError(true) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const setStage = async (iv: Interview, stage: Stage) => {
    setInterviews((list) => list.map((x) => (x.id === iv.id ? { ...x, stage } : x)))
    const supabase = createClient()
    const { error } = await supabase.from('interviews').update({ stage }).eq('id', iv.id)
    if (error) { console.error('setStage failed:', error.message); setInterviews((list) => list.map((x) => (x.id === iv.id ? { ...x, stage: iv.stage } : x))); return }
    // keep the application pipeline in sync
    if (iv.application_id) {
      const appStatus = stage === 'offer' || stage === 'offer_accepted' || stage === 'offer_declined' ? 'offer' : stage === 'rejected' ? 'rejected' : null
      if (appStatus) await supabase.from('applications').update({ status: appStatus }).eq('id', iv.application_id)
    }
  }

  const removeIv = async (iv: Interview) => {
    if (!window.confirm('Delete this interview record?')) return
    const { error } = await createClient().from('interviews').delete().eq('id', iv.id)
    if (error) { console.error('removeIv failed:', error.message); return }
    setInterviews((list) => list.filter((x) => x.id !== iv.id))
  }

  const openSchedule = () => { setEditId(null); setForm(EMPTY); setFormError(null); setShowForm(true) }
  const openReschedule = (iv: Interview) => {
    setEditId(iv.id)
    const d = iv.scheduled_at ? new Date(iv.scheduled_at) : null
    setForm({ appId: iv.application_id || '', date: d ? d.toISOString().slice(0, 10) : '', time: d ? d.toTimeString().slice(0, 5) : '', duration: String(iv.duration_min || 30), link: iv.meeting_link || '', notes: iv.notes || '' })
    setFormError(null); setShowForm(true)
  }

  const submit = async () => {
    setFormError(null)
    if (!editId && !form.appId) { setFormError('Pick a candidate to interview.'); return }
    if (!form.date || !form.time) { setFormError('Pick a date and time.'); return }
    setSaving(true)
    const supabase = createClient()
    if (!uid) { setSaving(false); return }
    const scheduled_at = new Date(`${form.date}T${form.time}`).toISOString()
    if (editId) {
      const { data, error } = await supabase.from('interviews').update({ scheduled_at, duration_min: Number(form.duration), meeting_link: form.link.trim() || null, notes: form.notes.trim() || null }).eq('id', editId).select('*').single()
      setSaving(false)
      if (error) { setFormError(error.message); return }
      if (data) setInterviews((list) => list.map((x) => (x.id === editId ? (data as Interview) : x)))
    } else {
      const app = appRows.find((a) => a.id === form.appId)
      if (!app) { setSaving(false); setFormError('Candidate not found.'); return }
      const { data, error } = await supabase.from('interviews').insert({
        application_id: app.id, job_id: app.job?.id ?? null, recruiter_id: uid, candidate_id: app.candidate_id,
        candidate_name: app.candidate_name, job_title: app.job?.title ?? null, scheduled_at,
        duration_min: Number(form.duration), meeting_link: form.link.trim() || null, notes: form.notes.trim() || null, stage: 'proposed',
      }).select('*').single()
      setSaving(false)
      if (error) { setFormError(error.message); return }
      if (data) setInterviews((list) => [...list, data as Interview])
      const { error: appErr } = await supabase.from('applications').update({ status: 'interview' }).eq('id', app.id)
      if (appErr) console.error('application status sync failed:', appErr.message)
    }
    setShowForm(false)
  }

  const appOptions = useMemo(() => [{ value: '', label: 'Select a candidate…' }, ...appRows.filter((a) => a.status !== 'withdrawn').map((a) => ({ value: a.id, label: `${a.candidate_name || 'Candidate'} — ${a.job?.title || 'a job'}` }))], [appRows])
  const durationOptions = ['15', '30', '45', '60'].map((d) => ({ value: d, label: `${d} min` }))

  const upcoming = interviews.filter((i) => ['proposed', 'accepted'].includes(i.stage))
  const inReview = interviews.filter((i) => ['completed', 'offer'].includes(i.stage))
  const closed = interviews.filter((i) => ['declined', 'offer_accepted', 'offer_declined', 'rejected', 'cancelled'].includes(i.stage))

  if (loading) return <Loader />
  if (loadError) return <ErrorBox onRetry={load} />

  const card = (iv: Interview) => {
    const m = STAGE_META[iv.stage]
    return (
      <div key={iv.id} className="bg-white dark:bg-[#2c2c2e] p-4 md:p-5 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container">
        <div className="flex items-start gap-3">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black ${avatarColor(iv.candidate_name || '?')}`}>{(iv.candidate_name || '?').charAt(0).toUpperCase()}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm md:text-base font-bold text-on-surface truncate">{iv.candidate_name || 'Candidate'}</p>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 flex-shrink-0 ${m.cls}`}><span className="material-symbols-outlined text-sm">{m.icon}</span>{m.label}</span>
            </div>
            <p className="text-xs text-on-surface-variant truncate">{iv.job_title || 'a role'}</p>
            <p className="text-xs text-on-surface-variant mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-sm text-primary">calendar_month</span>{fmtWhen(iv.scheduled_at)} · {iv.duration_min} min</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-surface-container">
          {(iv.stage === 'accepted' || iv.stage === 'proposed') && <Link href={`/interview/${iv.id}`} className="px-3 py-2 rounded-xl premium-gradient text-white font-bold text-xs flex items-center gap-1.5 hover:scale-[1.03] transition-all"><span className="material-symbols-outlined text-base">videocam</span>Join room</Link>}
          {iv.stage === 'accepted' && <button onClick={() => setStage(iv, 'completed')} className="px-3 py-2 rounded-xl bg-surface-container-low text-on-surface font-bold text-xs flex items-center gap-1.5 hover:bg-surface-container transition-colors"><span className="material-symbols-outlined text-base">task_alt</span>Mark completed</button>}
          {iv.stage === 'completed' && <>
            <button onClick={() => setStage(iv, 'offer')} className="px-3 py-2 rounded-xl bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300 font-bold text-xs flex items-center gap-1.5 hover:bg-green-200 dark:hover:bg-green-500/25 transition-colors"><span className="material-symbols-outlined text-base">workspace_premium</span>Make offer</button>
            <button onClick={() => setStage(iv, 'rejected')} className="px-3 py-2 rounded-xl bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300 font-bold text-xs flex items-center gap-1.5 hover:bg-red-100 dark:hover:bg-red-500/25 transition-colors"><span className="material-symbols-outlined text-base">do_not_disturb_on</span>Reject</button>
          </>}
          {(iv.stage === 'proposed' || iv.stage === 'accepted') && <>
            <button onClick={() => openReschedule(iv)} className="px-3 py-2 rounded-xl text-on-surface-variant font-bold text-xs flex items-center gap-1.5 hover:bg-surface-container-low transition-colors"><span className="material-symbols-outlined text-base">edit_calendar</span>Reschedule</button>
            <button onClick={() => setStage(iv, 'cancelled')} className="px-3 py-2 rounded-xl text-on-surface-variant font-bold text-xs flex items-center gap-1.5 hover:bg-red-50 dark:hover:bg-red-500/15 hover:text-red-500 dark:hover:text-red-300 transition-colors"><span className="material-symbols-outlined text-base">event_busy</span>Cancel</button>
          </>}
          {['declined', 'offer_accepted', 'offer_declined', 'rejected', 'cancelled'].includes(iv.stage) && <button onClick={() => removeIv(iv)} className="ml-auto p-2 rounded-xl text-on-surface-variant hover:text-red-500 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/15 transition-colors"><span className="material-symbols-outlined text-base">delete</span></button>}
        </div>
      </div>
    )
  }

  const empty = interviews.length === 0

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-5xl mx-auto">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-[2.25rem] font-bold tracking-tight text-on-surface leading-tight flex items-center gap-2"><span className="material-symbols-outlined text-primary text-3xl">videocam</span>Interviews</h1>
          <p className="text-on-surface-variant text-xs sm:text-sm md:text-base mt-1 sm:mt-2">Schedule interviews, run them, and manage offers — end to end.</p>
        </div>
        <button onClick={openSchedule} className="px-5 py-3 rounded-2xl premium-gradient text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"><span className="material-symbols-outlined">add</span>Schedule interview</button>
      </header>

      {empty ? (
        <div className="bg-white dark:bg-[#2c2c2e] rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container p-10 md:p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl premium-gradient flex items-center justify-center text-white shadow-lg mb-4"><span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>videocam</span></div>
          <h3 className="text-lg md:text-xl font-bold text-on-surface mb-2">No interviews scheduled</h3>
          <p className="text-sm text-on-surface-variant max-w-md mb-5">Schedule an interview with a candidate who applied. They’ll be notified to confirm.</p>
          <button onClick={openSchedule} className="px-5 py-3 rounded-2xl premium-gradient text-white font-bold text-sm">Schedule interview</button>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && <Section title="Upcoming" count={upcoming.length}>{upcoming.map(card)}</Section>}
          {inReview.length > 0 && <Section title="In review & offers" count={inReview.length}>{inReview.map(card)}</Section>}
          {closed.length > 0 && <Section title="Closed" count={closed.length}>{closed.map(card)}</Section>}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative z-10 w-full max-w-lg bg-white dark:bg-[#2c2c2e] rounded-3xl shadow-2xl overflow-hidden auth-pop max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-surface-container flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-primary">{editId ? 'edit_calendar' : 'videocam'}</span>{editId ? 'Reschedule interview' : 'Schedule interview'}</h3>
              <button onClick={() => setShowForm(false)} className="text-on-surface-variant hover:text-on-surface p-1"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              {!editId && (
                <div>
                  <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Candidate</label>
                  <FancySelect value={form.appId} options={appOptions} onChange={(v) => setForm((f) => ({ ...f, appId: v }))} icon="person" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Date" type="date" value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} />
                <Field label="Time" type="time" value={form.time} onChange={(v) => setForm((f) => ({ ...f, time: v }))} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Duration</label>
                <FancySelect value={form.duration} options={durationOptions} onChange={(v) => setForm((f) => ({ ...f, duration: v }))} icon="timer" />
              </div>
              <Field label="Meeting link (optional)" value={form.link} onChange={(v) => setForm((f) => ({ ...f, link: v }))} placeholder="Leave empty to use the built-in room" />
              <div>
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Notes (optional)</label>
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} className="w-full px-4 py-3 bg-surface-container-low border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white dark:focus:bg-white/10 transition-all text-on-surface text-sm outline-none resize-none" placeholder="Anything the candidate should know…" />
              </div>
              {formError && <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/30 px-4 py-3"><span className="material-symbols-outlined text-red-500">error</span><p className="text-sm text-red-700 dark:text-red-300 font-medium">{formError}</p></div>}
            </div>
            <div className="p-4 border-t border-surface-container flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-2xl bg-surface-container-low text-on-surface font-bold text-sm hover:bg-surface-container transition-colors">Cancel</button>
              <button onClick={submit} disabled={saving} className="flex-1 py-3 rounded-2xl premium-gradient text-white font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-60"><span className="material-symbols-outlined text-lg">{saving ? 'hourglass_top' : 'check'}</span>{saving ? 'Saving…' : editId ? 'Save' : 'Schedule'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-black text-on-surface-variant uppercase tracking-widest mb-3 px-1">{title} ({count})</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}
function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 ml-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-4 py-3 bg-surface-container-low border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white dark:focus:bg-white/10 transition-all text-on-surface text-sm font-medium placeholder:text-outline-variant outline-none" />
    </div>
  )
}
function Loader() {
  return <div className="flex flex-col items-center justify-center gap-3 py-32"><div className="flex gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce"></div><div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div><div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div></div><p className="text-xs font-black text-primary tracking-widest uppercase">Loading interviews...</p></div>
}
function ErrorBox({ onRetry }: { onRetry: () => void }) {
  return <div className="p-8 max-w-3xl mx-auto"><div className="bg-white dark:bg-[#2c2c2e] rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container p-12 flex flex-col items-center text-center"><div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/15 flex items-center justify-center text-red-500 mb-5"><span className="material-symbols-outlined text-3xl">cloud_off</span></div><h2 className="text-lg font-bold text-on-surface mb-2">Couldn’t load interviews</h2><button onClick={onRetry} className="px-5 py-2.5 rounded-xl premium-gradient text-white font-bold text-sm flex items-center gap-2"><span className="material-symbols-outlined text-base">refresh</span>Retry</button></div></div>
}
