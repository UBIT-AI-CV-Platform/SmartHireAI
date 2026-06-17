'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Notif = { id: string; status: string; updated_at: string; title: string; company: string }

const STATUS: Record<string, { label: string; icon: string; cls: string }> = {
  screening: { label: 'Moved to Screening', icon: 'fact_check', cls: 'text-amber-600 bg-amber-100' },
  interview: { label: 'Interview stage', icon: 'event', cls: 'text-sky-600 bg-sky-100' },
  offer: { label: 'You got an Offer!', icon: 'verified', cls: 'text-green-600 bg-green-100' },
  rejected: { label: 'Application update', icon: 'info', cls: 'text-red-500 bg-red-100' },
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

export default function NotificationsBell() {
  const [uid, setUid] = useState<string | null>(null)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [lastSeen, setLastSeen] = useState<number>(0)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const seenKey = (id: string) => `shai_notif_seen_${id}`

  const fetchNotifs = async (id: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('applications')
      .select('id, status, updated_at, job:jobs(title, company)')
      .eq('candidate_id', id)
      .in('status', ['screening', 'interview', 'offer', 'rejected'])
      .order('updated_at', { ascending: false })
      .limit(15)
    const list: Notif[] = ((data ?? []) as unknown as { id: string; status: string; updated_at: string; job: { title: string; company: string } | null }[])
      .map((r) => ({ id: r.id, status: r.status, updated_at: r.updated_at, title: r.job?.title || 'A job', company: r.job?.company || '' }))
    setNotifs(list)
  }

  useEffect(() => {
    const supabase = createClient()
    let id = ''
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      id = user.id
      setUid(user.id)
      setLastSeen(Number(localStorage.getItem(seenKey(user.id)) || 0))
      fetchNotifs(user.id)
    })
    const onFocus = () => { if (id) fetchNotifs(id) }
    const interval = setInterval(() => { if (id) fetchNotifs(id) }, 45000)
    window.addEventListener('focus', onFocus)
    return () => { window.removeEventListener('focus', onFocus); clearInterval(interval) }
  }, [])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const unread = notifs.filter((n) => new Date(n.updated_at).getTime() > lastSeen).length

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && uid) {
      const now = Date.now()
      localStorage.setItem(seenKey(uid), String(now))
      setLastSeen(now)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} className="relative h-9 w-9 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors" aria-label="Notifications">
        <span className="material-symbols-outlined" style={unread > 0 ? { fontVariationSettings: "'FILL' 1" } : undefined}>notifications</span>
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-surface-container overflow-hidden z-[70] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 border-b border-surface-container flex items-center justify-between">
            <h3 className="text-sm font-bold text-on-surface">Notifications</h3>
            <Link href="/candidate/my-applications" onClick={() => setOpen(false)} className="text-xs font-bold text-primary hover:underline">View all</Link>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <span className="material-symbols-outlined text-3xl text-outline-variant">notifications_off</span>
                <p className="text-sm text-on-surface-variant mt-2">No updates yet. We&apos;ll notify you when a recruiter moves your application forward.</p>
              </div>
            ) : (
              notifs.map((n) => {
                const meta = STATUS[n.status] || STATUS.rejected
                const isNew = new Date(n.updated_at).getTime() > lastSeen
                return (
                  <Link key={n.id} href="/candidate/my-applications" onClick={() => setOpen(false)} className={`flex items-start gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors ${isNew ? 'bg-primary/5' : ''}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.cls}`}>
                      <span className="material-symbols-outlined text-base">{meta.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-on-surface leading-snug"><span className="font-bold">{meta.label}</span></p>
                      <p className="text-xs text-on-surface-variant truncate">{n.title}{n.company ? ` · ${n.company}` : ''}</p>
                      <p className="text-[11px] text-outline mt-0.5">{timeAgo(n.updated_at)}</p>
                    </div>
                    {isNew && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                  </Link>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
