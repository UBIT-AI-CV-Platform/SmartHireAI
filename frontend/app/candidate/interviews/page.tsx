'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Stage = 'proposed' | 'accepted' | 'declined' | 'completed' | 'offer' | 'offer_accepted' | 'offer_declined' | 'rejected' | 'cancelled'
type Interview = {
  id: string; job_title: string | null; scheduled_at: string | null; duration_min: number
  meeting_link: string | null; location: string | null; stage: Stage; notes: string | null
}

const STAGE_META: Record<Stage, { label: string; cls: string; icon: string }> = {
  proposed: { label: 'Awaiting your response', cls: 'bg-amber-100 text-amber-700', icon: 'schedule' },
  accepted: { label: 'Confirmed', cls: 'bg-sky-100 text-sky-700', icon: 'event_available' },
  declined: { label: 'You declined', cls: 'bg-slate-100 text-slate-500', icon: 'event_busy' },
  completed: { label: 'Awaiting result', cls: 'bg-purple-100 text-purple-700', icon: 'hourglass_top' },
  offer: { label: 'Offer received 🎉', cls: 'bg-green-100 text-green-700', icon: 'workspace_premium' },
  offer_accepted: { label: 'Offer accepted 🎉', cls: 'bg-green-100 text-green-700', icon: 'verified' },
  offer_declined: { label: 'Offer declined', cls: 'bg-slate-100 text-slate-500', icon: 'cancel' },
  rejected: { label: 'Not selected', cls: 'bg-red-100 text-red-600', icon: 'do_not_disturb_on' },
  cancelled: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-500', icon: 'event_busy' },
}
const fmtWhen = (iso: string | null) => iso ? new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Time TBD'

export default function CandidateInterviewsPage() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [items, setItems] = useState<Interview[]>([])

  const load = async () => {
    setLoading(true); setLoadError(false)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoadError(true); setLoading(false); return }
      const { data, error } = await supabase.from('interviews').select('id, job_title, scheduled_at, duration_min, meeting_link, location, stage, notes').eq('candidate_id', user.id).order('scheduled_at', { ascending: true })
      if (error) { setLoadError(true); setLoading(false); return }
      setItems((data as Interview[]) ?? [])
    } catch { setLoadError(true) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const setStage = async (iv: Interview, stage: Stage) => {
    setItems((list) => list.map((x) => (x.id === iv.id ? { ...x, stage } : x)))
    await createClient().from('interviews').update({ stage }).eq('id', iv.id)
  }

  if (loading) return <Loader />
  if (loadError) return <ErrorBox onRetry={load} />

  const active = items.filter((i) => !['declined', 'offer_accepted', 'offer_declined', 'rejected', 'cancelled'].includes(i.stage))
  const past = items.filter((i) => ['declined', 'offer_accepted', 'offer_declined', 'rejected', 'cancelled'].includes(i.stage))

  const card = (iv: Interview) => {
    const m = STAGE_META[iv.stage]
    return (
      <div key={iv.id} className="bg-white p-4 md:p-5 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm md:text-base font-bold text-on-surface truncate">{iv.job_title || 'Interview'}</h4>
            <p className="text-xs text-on-surface-variant mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-sm text-primary">calendar_month</span>{fmtWhen(iv.scheduled_at)} · {iv.duration_min} min · {iv.location || 'Online'}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 flex-shrink-0 ${m.cls}`}><span className="material-symbols-outlined text-sm">{m.icon}</span>{m.label}</span>
        </div>
        {iv.notes && <p className="text-sm text-on-surface-variant mt-2 bg-surface-container-low rounded-xl px-3 py-2">{iv.notes}</p>}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-surface-container">
          {iv.stage === 'proposed' && <>
            <button onClick={() => setStage(iv, 'accepted')} className="px-4 py-2 rounded-xl premium-gradient text-white font-bold text-xs flex items-center gap-1.5 hover:scale-[1.03] transition-all"><span className="material-symbols-outlined text-base">check</span>Accept</button>
            <button onClick={() => setStage(iv, 'declined')} className="px-4 py-2 rounded-xl bg-surface-container-low text-on-surface font-bold text-xs flex items-center gap-1.5 hover:bg-surface-container transition-colors"><span className="material-symbols-outlined text-base">close</span>Decline</button>
          </>}
          {iv.stage === 'accepted' && <>
            {iv.meeting_link
              ? <a href={iv.meeting_link} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-xl premium-gradient text-white font-bold text-xs flex items-center gap-1.5 hover:scale-[1.03] transition-all"><span className="material-symbols-outlined text-base">open_in_new</span>Join (external)</a>
              : <Link href={`/interview/${iv.id}`} className="px-4 py-2 rounded-xl premium-gradient text-white font-bold text-xs flex items-center gap-1.5 hover:scale-[1.03] transition-all"><span className="material-symbols-outlined text-base">videocam</span>Join room</Link>}
            <span className="text-xs text-on-surface-variant">You&apos;re confirmed — see you there!</span>
          </>}
          {iv.stage === 'completed' && <span className="text-sm text-on-surface-variant flex items-center gap-1.5"><span className="material-symbols-outlined text-base text-purple-500">hourglass_top</span>Thanks! The recruiter is reviewing — you&apos;ll hear back soon.</span>}
          {iv.stage === 'offer' && <>
            <button onClick={() => setStage(iv, 'offer_accepted')} className="px-4 py-2 rounded-xl bg-green-100 text-green-700 font-bold text-xs flex items-center gap-1.5 hover:bg-green-200 transition-colors"><span className="material-symbols-outlined text-base">celebration</span>Accept offer</button>
            <button onClick={() => setStage(iv, 'offer_declined')} className="px-4 py-2 rounded-xl bg-surface-container-low text-on-surface font-bold text-xs flex items-center gap-1.5 hover:bg-surface-container transition-colors"><span className="material-symbols-outlined text-base">close</span>Decline</button>
          </>}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-3xl mx-auto">
      <header className="mb-5 md:mb-7">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-[2.25rem] font-bold tracking-tight text-on-surface leading-tight flex items-center gap-2"><span className="material-symbols-outlined text-primary text-3xl">videocam</span>Interviews</h1>
        <p className="text-on-surface-variant text-xs sm:text-sm md:text-base mt-1 sm:mt-2">Confirm interviews, join the room, and respond to offers.</p>
      </header>

      {items.length === 0 ? (
        <div className="bg-white rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container p-10 md:p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-5"><span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>videocam</span></div>
          <h2 className="text-lg md:text-xl font-bold text-on-surface mb-2">No interviews yet</h2>
          <p className="text-sm text-on-surface-variant max-w-md">When a recruiter schedules an interview with you, it’ll appear here for you to confirm.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && <div><h3 className="text-sm font-black text-on-surface-variant uppercase tracking-widest mb-3 px-1">Active</h3><div className="space-y-3">{active.map(card)}</div></div>}
          {past.length > 0 && <div><h3 className="text-sm font-black text-on-surface-variant uppercase tracking-widest mb-3 px-1">Past</h3><div className="space-y-3">{past.map(card)}</div></div>}
        </div>
      )}
    </div>
  )
}

function Loader() {
  return <div className="flex flex-col items-center justify-center gap-3 py-32"><div className="flex gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce"></div><div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div><div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div></div><p className="text-xs font-black text-primary tracking-widest uppercase">Loading interviews...</p></div>
}
function ErrorBox({ onRetry }: { onRetry: () => void }) {
  return <div className="p-8 max-w-3xl mx-auto"><div className="bg-white rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container p-12 flex flex-col items-center text-center"><div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 mb-5"><span className="material-symbols-outlined text-3xl">cloud_off</span></div><h2 className="text-lg font-bold text-on-surface mb-2">Couldn’t load interviews</h2><button onClick={onRetry} className="px-5 py-2.5 rounded-xl premium-gradient text-white font-bold text-sm flex items-center gap-2"><span className="material-symbols-outlined text-base">refresh</span>Retry</button></div></div>
}
