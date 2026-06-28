'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { initials, type Post } from '@/lib/social'

/** Share a post into the inbox: search anyone → ensure_dm → send a kind='post' message. */
export default function SharePostModal({ post, onClose }: { post: Post; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<{ id: string; full_name: string | null; username: string | null; role: string | null; photo_url: string | null }[]>([])
  const [note, setNote] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = (val: string) => {
    setQ(val)
    if (debounce.current) clearTimeout(debounce.current)
    const term = val.trim()
    if (!term) { setResults([]); return }
    debounce.current = setTimeout(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const like = `%${term.replace(/[%,]/g, '')}%`
      const { data } = await supabase
        .from('public_profiles')
        .select('id, full_name, username, role, photo_url')
        .or(`full_name.ilike.${like},username.ilike.${like},company_name.ilike.${like}`)
        .neq('id', user?.id ?? '00000000-0000-0000-0000-000000000000')
        .limit(20)
      setResults((data as typeof results) ?? [])
    }, 250)
  }

  const shareTo = async (otherId: string, name: string) => {
    if (sending) return
    setSending(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSending(false); return }
    const { data: convId } = await supabase.rpc('ensure_dm', { p_other: otherId })
    if (convId) {
      await supabase.from('messages').insert({
        conversation_id: convId as string,
        sender_id: user.id,
        body: note.trim() || null,
        kind: 'post',
        meta: {
          post_id: post.id,
          author_name: post.author_name,
          content: (post.content || '').slice(0, 200),
          image_url: post.image_url,
        } as never,
      })
      setSentTo(name)
      setTimeout(onClose, 1100)
    }
    setSending(false)
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[80vh] flex flex-col bg-white dark:bg-[#1c1c1e] rounded-3xl shadow-2xl border border-slate-200/70 dark:border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/70 dark:border-white/10">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">Share to inbox</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400"><span className="material-symbols-outlined">close</span></button>
        </div>

        {sentTo ? (
          <div className="p-10 text-center">
            <span className="material-symbols-outlined text-5xl text-green-500">check_circle</span>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-2">Sent to {sentTo}</p>
          </div>
        ) : (
          <div className="p-4 overflow-y-auto">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a message (optional)…"
              className="w-full mb-3 px-4 py-2.5 bg-slate-100 dark:bg-white/5 rounded-2xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="relative mb-3">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
              <input
                value={q}
                onChange={(e) => search(e.target.value)}
                placeholder="Search people to send to…"
                className="w-full pl-10 pr-3 py-2.5 bg-slate-100 dark:bg-white/5 rounded-2xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-1">
              {q.trim() && results.length === 0 && <p className="text-sm text-slate-400 text-center py-6">No people found.</p>}
              {results.map((p) => {
                const name = p.full_name || (p.username ? '@' + p.username : 'User')
                return (
                  <button key={p.id} onClick={() => shareTo(p.id, name)} disabled={sending} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors disabled:opacity-60">
                    <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {p.photo_url ? <img src={p.photo_url} alt={name} className="h-full w-full object-cover" /> : <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">{initials(p.full_name)}</span>}
                    </div>
                    <div className="min-w-0 text-left flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{name}</p>
                      <p className="text-xs text-slate-400 truncate">{p.role === 'recruiter' ? 'Recruiter' : 'Candidate'}</p>
                    </div>
                    <span className="material-symbols-outlined text-primary text-[20px]">send</span>
                  </button>
                )
              })}
              {!q.trim() && <p className="text-xs text-slate-400 text-center py-6">Search for someone to share this post with.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
