'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const REASONS = ['Spam', 'Harassment or bullying', 'Inappropriate content', 'Misinformation', 'Scam or fraud', 'Other']

type TargetType = 'post' | 'comment' | 'profile'

/** Report a post / comment / profile. One report per target — re-reporting is treated as already-reported. */
export default function ReportModal({ targetType, targetId, targetLabel, onClose }: { targetType: TargetType; targetId: string; targetLabel?: string; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<null | 'sent' | 'already'>(null)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!reason || busy) return
    setBusy(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('You must be signed in.'); setBusy(false); return }
    const { error: err } = await supabase.from('reports').insert({
      reporter_id: user.id, target_type: targetType, target_id: targetId, reason, details: details.trim() || null,
    })
    setBusy(false)
    if (err) {
      if (err.code === '23505') { setDone('already'); return }
      setError('Could not submit your report. Please try again.')
      return
    }
    setDone('sent')
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-[#1c1c1e] rounded-3xl shadow-2xl border border-slate-200/70 dark:border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/70 dark:border-white/10">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"><span className="material-symbols-outlined text-[20px] text-amber-500">flag</span>Report {targetType}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400"><span className="material-symbols-outlined">close</span></button>
        </div>

        {done ? (
          <div className="p-10 text-center">
            <span className="material-symbols-outlined text-5xl text-green-500">{done === 'already' ? 'task_alt' : 'check_circle'}</span>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-2">{done === 'already' ? 'You’ve already reported this.' : 'Thanks — our team will review this.'}</p>
            <button onClick={onClose} className="mt-4 px-5 py-2 rounded-full text-sm font-semibold text-white premium-gradient">Done</button>
          </div>
        ) : (
          <div className="p-5">
            {targetLabel && <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Reporting: <span className="font-semibold text-slate-700 dark:text-slate-200">{targetLabel}</span></p>}
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Why are you reporting this?</p>
            <div className="space-y-1.5">
              {REASONS.map((r) => (
                <button key={r} onClick={() => setReason(r)} className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium border transition-colors ${reason === r ? 'border-primary bg-primary/5 text-slate-900 dark:text-slate-100' : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                  <span className="inline-flex items-center gap-2">
                    <span className={`material-symbols-outlined text-[18px] ${reason === r ? 'text-primary' : 'text-slate-300 dark:text-slate-600'}`}>{reason === r ? 'radio_button_checked' : 'radio_button_unchecked'}</span>
                    {r}
                  </span>
                </button>
              ))}
            </div>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Add any details (optional)…"
              rows={3}
              className="w-full mt-3 resize-none px-4 py-2.5 bg-slate-100 dark:bg-white/5 rounded-2xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/30"
            />
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            <button onClick={submit} disabled={!reason || busy} className="w-full mt-4 py-2.5 rounded-full text-sm font-semibold text-white premium-gradient shadow-sm shadow-primary/25 disabled:opacity-50">
              {busy ? 'Submitting…' : 'Submit report'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
