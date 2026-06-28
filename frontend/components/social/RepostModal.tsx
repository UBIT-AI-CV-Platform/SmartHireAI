'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { initials, relativeTime, type Post } from '@/lib/social'
import type { MeSnapshot } from './CreatePost'

type Snapshot = { post_id: string; author_name: string | null; author_username: string | null; author_photo: string | null; content: string | null; image_url: string | null; created_at: string | null }

/** Repost a post with an optional quote. Reposting a repost targets the original. */
export default function RepostModal({ post, me, onClose, onReposted }: { post: Post; me: MeSnapshot; onClose: () => void; onReposted?: (p: Post) => void }) {
  const [quote, setQuote] = useState('')
  const [busy, setBusy] = useState(false)

  // collapse nested reposts: always reference the ORIGINAL
  const snap: Snapshot = post.repost_of && post.repost_snapshot
    ? (post.repost_snapshot as Snapshot)
    : { post_id: post.id, author_name: post.author_name, author_username: post.author_username, author_photo: post.author_photo, content: post.content, image_url: post.image_url, created_at: post.created_at }

  const submit = async () => {
    if (busy) return
    setBusy(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: me.id,
        author_name: me.name,
        author_username: me.username,
        author_photo: me.photo,
        author_role: me.role,
        content: quote.trim() || null,
        repost_of: snap.post_id,
        repost_snapshot: snap as never,
      })
      .select('*')
      .single()
    setBusy(false)
    if (!error && data) { onReposted?.(data as Post); onClose() }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-[#1c1c1e] rounded-3xl shadow-2xl border border-slate-200/70 dark:border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/70 dark:border-white/10">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">Repost</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400"><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="p-4">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center overflow-hidden flex-shrink-0">
              {me.photo ? <img src={me.photo} alt="You" className="h-full w-full object-cover" /> : <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{initials(me.name)}</span>}
            </div>
            <textarea
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="Add your thoughts (optional)…"
              rows={2}
              className="flex-1 resize-none bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none pt-2"
            />
          </div>

          {/* Embedded original */}
          <div className="mt-2 ml-[3.25rem] rounded-2xl border border-slate-200/70 dark:border-white/10 overflow-hidden">
            <div className="flex items-center gap-2 p-3 pb-1.5">
              <div className="h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center overflow-hidden flex-shrink-0">
                {snap.author_photo ? <img src={snap.author_photo} alt="" className="h-full w-full object-cover" /> : <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300">{initials(snap.author_name)}</span>}
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{snap.author_name || 'User'}</p>
              <p className="text-[10px] text-slate-400">· {relativeTime(snap.created_at)}</p>
            </div>
            {snap.content && <p className="px-3 pb-2 text-xs text-slate-600 dark:text-slate-300 line-clamp-4">{snap.content}</p>}
            {snap.image_url && <img src={snap.image_url} alt="" className="w-full max-h-44 object-cover" />}
          </div>

          <button onClick={submit} disabled={busy} className="w-full mt-4 py-2.5 rounded-full text-sm font-semibold text-white premium-gradient shadow-sm shadow-primary/25 disabled:opacity-60">
            {busy ? 'Reposting…' : 'Repost'}
          </button>
        </div>
      </div>
    </div>
  )
}
