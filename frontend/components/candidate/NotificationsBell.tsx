'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Notif = { id: string; type: string; title: string; body: string | null; link: string | null; is_read: boolean; created_at: string }

const ICON: Record<string, { icon: string; cls: string }> = {
  applied: { icon: 'send', cls: 'text-indigo-600 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-500/15' },
  applicant: { icon: 'person_add', cls: 'text-purple-600 dark:text-purple-300 bg-purple-100 dark:bg-purple-500/15' },
  status: { icon: 'campaign', cls: 'text-amber-600 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/15' },
  interview: { icon: 'videocam', cls: 'text-sky-600 dark:text-sky-300 bg-sky-100 dark:bg-sky-500/15' },
  offer: { icon: 'workspace_premium', cls: 'text-green-600 dark:text-green-300 bg-green-100 dark:bg-green-500/15' },
  message: { icon: 'forum', cls: 'text-primary bg-primary/10' },
  follow: { icon: 'group_add', cls: 'text-pink-600 dark:text-pink-300 bg-pink-100 dark:bg-pink-500/15' },
  like: { icon: 'favorite', cls: 'text-rose-600 dark:text-rose-300 bg-rose-100 dark:bg-rose-500/15' },
  comment: { icon: 'chat_bubble', cls: 'text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-500/15' },
  repost: { icon: 'repeat', cls: 'text-emerald-600 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/15' },
  info: { icon: 'notifications', cls: 'text-sky-600 dark:text-sky-300 bg-sky-100 dark:bg-sky-500/15' },
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

export default function NotificationsBell({ basePath = '/candidate' }: { basePath?: string }) {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const fetchNotifs = async (id: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, link, is_read, created_at')
      .eq('profile_id', id)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifs((data as Notif[]) ?? [])
  }

  useEffect(() => {
    const supabase = createClient()
    let id = ''
    let channel: ReturnType<typeof supabase.channel> | null = null

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      id = user.id
      setUid(user.id)
      fetchNotifs(user.id)
      // Realtime: refresh instantly when a notification is inserted/updated for me
      channel = supabase
        .channel(`notifications:${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `profile_id=eq.${user.id}` }, () => fetchNotifs(user.id))
        .subscribe()
    })

    const onFocus = () => { if (id) fetchNotifs(id) }
    const onRefresh = () => { if (id) fetchNotifs(id) }
    const interval = setInterval(() => { if (id) fetchNotifs(id) }, 30000)
    window.addEventListener('focus', onFocus)
    window.addEventListener('shai:refresh-notifs', onRefresh)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('shai:refresh-notifs', onRefresh)
      clearInterval(interval)
      if (channel) channel.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const unread = notifs.filter((n) => !n.is_read).length

  const markAllRead = async () => {
    if (!uid || unread === 0) return
    setNotifs((ns) => ns.map((n) => ({ ...n, is_read: true })))
    const supabase = createClient()
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('profile_id', uid).eq('is_read', false)
    if (error) console.error('markAllRead failed:', error.message)
  }

  const openNotif = async (n: Notif) => {
    setOpen(false)
    if (!n.is_read) {
      setNotifs((ns) => ns.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
      const supabase = createClient()
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
      if (error) console.error('markRead failed:', error.message)
    }
    if (n.link) router.push(n.link)
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative h-9 w-9 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors" aria-label="Notifications">
        <span className="material-symbols-outlined" style={unread > 0 ? { fontVariationSettings: "'FILL' 1" } : undefined}>notifications</span>
        {unread > 0 && <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-[#2c2c2e] rounded-2xl shadow-2xl border border-surface-container overflow-hidden z-[70] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 border-b border-surface-container flex items-center justify-between">
            <h3 className="text-sm font-bold text-on-surface">Notifications</h3>
            {unread > 0 && <button onClick={markAllRead} className="text-xs font-bold text-primary hover:underline">Mark all read</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <span className="material-symbols-outlined text-3xl text-outline-variant">notifications_off</span>
                <p className="text-sm text-on-surface-variant mt-2">No notifications yet. We&apos;ll alert you when you apply and when recruiters respond.</p>
              </div>
            ) : (
              notifs.map((n) => {
                const m = meta(n.type)
                return (
                  <button key={n.id} onClick={() => openNotif(n)} className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${m.cls}`}><span className="material-symbols-outlined text-base">{m.icon}</span></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface leading-snug">{n.title}</p>
                      {n.body && <p className="text-xs text-on-surface-variant leading-snug mt-0.5">{n.body}</p>}
                      <p className="text-[11px] text-outline mt-0.5">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                  </button>
                )
              })
            )}
          </div>
          <Link href={`${basePath}/notifications`} onClick={() => setOpen(false)} className="block text-center px-4 py-3 border-t border-surface-container text-sm font-bold text-primary hover:bg-surface-container-low transition-colors">View all notifications</Link>
        </div>
      )}
    </div>
  )
}
