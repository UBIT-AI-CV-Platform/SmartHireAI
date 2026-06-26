'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Notif = { id: string; type: string; title: string; body: string | null; link: string | null; is_read: boolean; created_at: string }

const ICON: Record<string, { icon: string; cls: string }> = {
  applied: { icon: 'send', cls: 'text-indigo-600 bg-indigo-100' },
  applicant: { icon: 'person_add', cls: 'text-purple-600 bg-purple-100' },
  status: { icon: 'campaign', cls: 'text-amber-600 bg-amber-100' },
  interview: { icon: 'videocam', cls: 'text-sky-600 bg-sky-100' },
  offer: { icon: 'workspace_premium', cls: 'text-green-600 bg-green-100' },
  message: { icon: 'forum', cls: 'text-primary bg-primary/10' },
  info: { icon: 'notifications', cls: 'text-sky-600 bg-sky-100' },
}
const meta = (t: string) => ICON[t] || ICON.info

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d > 0) return `${d}d ago`
  const h = Math.floor(diff / 3600000)
  if (h > 0) return `${h}h ago`
  const m = Math.floor(diff / 60000)
  return m > 1 ? `${m}m ago` : 'just now'
}

export default function NotificationsPage() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')

  const load = async () => {
    setLoading(true); setLoadError(false)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoadError(true); setLoading(false); return }
      setUid(user.id)
      const { data, error } = await supabase.from('notifications').select('id, type, title, body, link, is_read, created_at').eq('profile_id', user.id).order('created_at', { ascending: false }).limit(100)
      if (error) { setLoadError(true); setLoading(false); return }
      setNotifs((data as Notif[]) ?? [])
    } catch {
      setLoadError(true)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const unreadCount = notifs.filter((n) => !n.is_read).length
  const shown = useMemo(() => notifs.filter((n) => filter === 'all' || (filter === 'unread' ? !n.is_read : n.is_read)), [notifs, filter])

  const markAllRead = async () => {
    if (!uid || unreadCount === 0) return
    setNotifs((ns) => ns.map((n) => ({ ...n, is_read: true })))
    const supabase = createClient()
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('profile_id', uid).eq('is_read', false)
    if (error) console.error('markAllRead failed:', error.message)
  }

  const toggleRead = async (n: Notif) => {
    const next = !n.is_read
    setNotifs((ns) => ns.map((x) => (x.id === n.id ? { ...x, is_read: next } : x)))
    const supabase = createClient()
    const { error } = await supabase.from('notifications').update({ is_read: next }).eq('id', n.id)
    if (error) console.error('toggleRead failed:', error.message)
  }

  const remove = async (n: Notif) => {
    setNotifs((ns) => ns.filter((x) => x.id !== n.id))
    const supabase = createClient()
    const { error } = await supabase.from('notifications').delete().eq('id', n.id)
    if (error) console.error('deleteNotif failed:', error.message)
  }

  const openNotif = async (n: Notif) => {
    if (!n.is_read) await toggleRead(n)
    if (n.link) router.push(n.link)
  }

  const TABS: { v: typeof filter; label: string }[] = [
    { v: 'all', label: `All (${notifs.length})` },
    { v: 'unread', label: `Unread (${unreadCount})` },
    { v: 'read', label: 'Read' },
  ]

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-3xl mx-auto">
      <header className="mb-5 md:mb-7 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-[2.25rem] font-bold tracking-tight text-on-surface leading-tight">Notifications</h1>
          <p className="text-on-surface-variant text-xs sm:text-sm md:text-base mt-1 sm:mt-2">Your application updates and alerts in one place.</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="px-4 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-bold text-xs hover:bg-surface-container transition-colors flex items-center gap-1.5 flex-shrink-0">
            <span className="material-symbols-outlined text-base">done_all</span><span className="hidden sm:inline">Mark all read</span>
          </button>
        )}
      </header>

      <div className="flex items-center gap-2 mb-5">
        <div className="flex bg-surface-container-low rounded-2xl p-1">
          {TABS.map((t) => (
            <button key={t.v} onClick={() => setFilter(t.v)} className={`px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${filter === t.v ? 'bg-white shadow text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>{t.label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce"></div>
            <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
            <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
          </div>
          <p className="text-xs font-black text-primary tracking-widest uppercase">Loading notifications...</p>
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container p-10 md:p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 mb-5"><span className="material-symbols-outlined text-3xl">cloud_off</span></div>
          <h2 className="text-lg md:text-xl font-bold text-on-surface mb-2">Couldn’t load notifications</h2>
          <p className="text-sm text-on-surface-variant max-w-md mb-4">Something went wrong. Please try again.</p>
          <button onClick={load} className="px-5 py-2.5 rounded-xl premium-gradient text-white font-bold text-sm flex items-center gap-2"><span className="material-symbols-outlined text-base">refresh</span>Retry</button>
        </div>
      ) : shown.length === 0 ? (
        <div className="bg-white rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container p-10 md:p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-5"><span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>notifications</span></div>
          <h2 className="text-lg md:text-xl font-bold text-on-surface mb-2">{filter === 'unread' ? 'No unread notifications' : filter === 'read' ? 'No read notifications' : 'No notifications yet'}</h2>
          <p className="text-sm text-on-surface-variant max-w-md">You&apos;ll get alerts here when you apply to jobs and when recruiters update your applications.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((n) => {
            const m = meta(n.type)
            return (
              <div key={n.id} className={`group flex items-start gap-3 p-4 rounded-2xl border transition-colors ${n.is_read ? 'bg-white border-surface-container' : 'bg-primary/5 border-primary/20'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${m.cls}`}><span className="material-symbols-outlined">{m.icon}</span></div>
                <button onClick={() => openNotif(n)} className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-bold text-on-surface">{n.title}</p>
                  {n.body && <p className="text-sm text-on-surface-variant mt-0.5">{n.body}</p>}
                  <p className="text-[11px] text-outline mt-1">{timeAgo(n.created_at)}</p>
                </button>
                {!n.is_read && <span className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-1" />}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => toggleRead(n)} title={n.is_read ? 'Mark unread' : 'Mark read'} className="text-on-surface-variant hover:text-primary p-1.5 rounded-lg hover:bg-primary/5 opacity-0 group-hover:opacity-100 transition">
                    <span className="material-symbols-outlined text-base">{n.is_read ? 'mark_email_unread' : 'mark_email_read'}</span>
                  </button>
                  <button onClick={() => remove(n)} title="Delete" className="text-on-surface-variant hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition">
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
