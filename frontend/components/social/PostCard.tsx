'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { createClient } from '@/lib/supabase/client'
import { useProfileLink } from '@/lib/useProfileLink'
import { initials, relativeTime, roleLabel, type Post, type PostComment } from '@/lib/social'
import type { MeSnapshot } from './CreatePost'
import SharePostModal from './SharePostModal'
import RepostModal from './RepostModal'
import ReportModal from './ReportModal'

type Snapshot = { post_id: string; author_name: string | null; author_username: string | null; author_photo: string | null; content: string | null; image_url: string | null; created_at: string | null }

interface PostCardProps {
  post: Post
  me: MeSnapshot | null
  initialLiked: boolean
  defaultExpanded?: boolean
  onDeleted?: (id: string) => void
  onReposted?: (p: Post) => void
}

export default function PostCard({ post, me, initialLiked, defaultExpanded = false, onDeleted, onReposted }: PostCardProps) {
  const [liked, setLiked] = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(post.like_count)
  const [commentCount, setCommentCount] = useState(post.comment_count)
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [comments, setComments] = useState<PostComment[] | null>(null)
  const [loadingComments, setLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showRepost, setShowRepost] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [report, setReport] = useState<{ type: 'post' | 'comment'; id: string; label?: string } | null>(null)
  const [content, setContent] = useState(post.content)
  const [showEdit, setShowEdit] = useState(false)

  const profileLink = useProfileLink()
  const authorHref = profileLink(post.author_username)
  const isOwn = me?.id === post.author_id
  const repost: Snapshot | null = post.repost_of && post.repost_snapshot ? (post.repost_snapshot as Snapshot) : null

  const toggleLike = async () => {
    if (!me) return
    const next = !liked
    setLiked(next)
    setLikeCount((c) => c + (next ? 1 : -1))
    const supabase = createClient()
    const { error } = next
      ? await supabase.from('post_likes').insert({ post_id: post.id, user_id: me.id })
      : await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', me.id)
    if (error) { setLiked(!next); setLikeCount((c) => c + (next ? -1 : 1)) }
  }

  const loadComments = async () => {
    setLoadingComments(true)
    const supabase = createClient()
    const { data } = await supabase.from('post_comments').select('*').eq('post_id', post.id).order('created_at', { ascending: true })
    setComments((data ?? []) as PostComment[])
    setLoadingComments(false)
  }

  const toggleComments = () => {
    const next = !expanded
    setExpanded(next)
    if (next && comments === null) loadComments()
  }

  const addComment = async () => {
    if (!me || !newComment.trim() || sending) return
    setSending(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: post.id,
        author_id: me.id,
        author_name: me.name,
        author_username: me.username,
        author_photo: me.photo,
        content: newComment.trim(),
      })
      .select('*')
      .single()
    if (!error && data) {
      setComments((c) => [...(c ?? []), data as PostComment])
      setCommentCount((n) => n + 1)
      setNewComment('')
    }
    setSending(false)
  }

  const deleteComment = async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('post_comments').delete().eq('id', id)
    if (!error) {
      setComments((c) => (c ?? []).filter((x) => x.id !== id))
      setCommentCount((n) => Math.max(n - 1, 0))
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* ignore */ }
  }

  const deletePost = async () => {
    setMenuOpen(false)
    const supabase = createClient()
    const { error } = await supabase.from('posts').delete().eq('id', post.id)
    if (!error) { setDeleted(true); onDeleted?.(post.id) }
  }

  if (deleted || hidden) return null

  return (
    <article className="bg-white dark:bg-[#1c1c1e] rounded-3xl border border-slate-200/70 dark:border-white/10 shadow-sm overflow-hidden">
      {repost && (
        <div className="flex items-center gap-1.5 px-4 md:px-5 pt-3 text-xs font-semibold text-slate-400 dark:text-slate-500">
          <span className="material-symbols-outlined text-[15px]">repeat</span>
          {post.author_name || 'Someone'} reposted
        </div>
      )}
      {/* Header */}
      <div className="flex items-start gap-3 p-4 md:p-5 pb-3">
        <Link href={authorHref} className="flex-shrink-0">
          <div className="h-11 w-11 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center overflow-hidden border border-white dark:border-white/10">
            {post.author_photo ? <img src={post.author_photo} alt={post.author_name ?? ''} className="h-full w-full object-cover" /> : <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{initials(post.author_name)}</span>}
          </div>
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={authorHref} className="flex items-center gap-1.5">
            <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate hover:underline">{post.author_name || 'SmartHire user'}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${post.author_role === 'recruiter' ? 'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300' : 'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'}`}>{roleLabel(post.author_role)}</span>
          </Link>
          <p className="text-xs text-slate-400 dark:text-slate-500">@{post.author_username} · {relativeTime(post.created_at)}</p>
        </div>
        {me && (
          <div className="relative flex-shrink-0">
            <button onClick={() => setMenuOpen((o) => !o)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10">
              <span className="material-symbols-outlined text-[20px]">more_horiz</span>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-9 z-20 w-44 bg-white dark:bg-[#26262a] rounded-xl shadow-xl border border-slate-200/70 dark:border-white/10 py-1">
                  {isOwn ? (
                    <>
                      <button onClick={() => { setMenuOpen(false); setShowEdit(true) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10">
                        <span className="material-symbols-outlined text-[18px]">edit</span> Edit post
                      </button>
                      <button onClick={deletePost} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10">
                        <span className="material-symbols-outlined text-[18px]">delete</span> Delete post
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setMenuOpen(false); setReport({ type: 'post', id: post.id, label: post.author_name || 'this post' }) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10">
                        <span className="material-symbols-outlined text-[18px]">flag</span> Report post
                      </button>
                      <button onClick={() => { setMenuOpen(false); setHidden(true) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10">
                        <span className="material-symbols-outlined text-[18px]">visibility_off</span> Hide post
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content (markdown: bold/italic/links) */}
      {content && (
        <div className="px-4 md:px-5 pb-3 text-sm text-slate-700 dark:text-slate-200 leading-relaxed break-words [&_strong]:font-bold [&_em]:italic [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ ...p }) => <a {...p} target="_blank" rel="noopener noreferrer" /> }}>{content}</ReactMarkdown>
        </div>
      )}
      {repost ? (
        /* Embedded reposted original */
        <Link href={`/post/${repost.post_id}`} className="block mx-4 md:mx-5 mb-3 rounded-2xl border border-slate-200/70 dark:border-white/10 overflow-hidden hover:border-slate-300 dark:hover:border-white/20 transition-colors">
          <div className="flex items-center gap-2 p-3 pb-1.5">
            <div className="h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center overflow-hidden flex-shrink-0">
              {repost.author_photo ? <img src={repost.author_photo} alt="" className="h-full w-full object-cover" /> : <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300">{initials(repost.author_name)}</span>}
            </div>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{repost.author_name || 'User'}</p>
            <p className="text-[10px] text-slate-400">· {relativeTime(repost.created_at)}</p>
          </div>
          {repost.content && <p className="px-3 pb-2 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line line-clamp-5">{repost.content}</p>}
          {repost.image_url && <img src={repost.image_url} alt="" className="w-full max-h-72 object-cover" />}
        </Link>
      ) : post.image_url && (
        <div className="bg-slate-50 dark:bg-black/20 border-y border-slate-100 dark:border-white/5">
          <img src={post.image_url} alt="post" className="w-full max-h-[28rem] object-contain mx-auto" />
        </div>
      )}

      {/* Document attachment */}
      {post.file_url && (
        <a href={post.file_url} target="_blank" rel="noopener noreferrer" className="mx-4 md:mx-5 mb-3 flex items-center gap-3 p-3 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-primary/40 transition-colors">
          <span className="material-symbols-outlined text-primary text-[28px]">description</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{post.file_name || 'Attachment'}</p>
            <p className="text-[11px] text-slate-400">Tap to open</p>
          </div>
          <span className="material-symbols-outlined text-slate-400 text-[20px]">download</span>
        </a>
      )}

      {/* Counts */}
      {(likeCount > 0 || commentCount > 0) && (
        <div className="flex items-center justify-between px-4 md:px-5 pt-3 text-xs text-slate-400 dark:text-slate-500">
          <span>{likeCount > 0 && <><span className="material-symbols-outlined text-[14px] text-[#b91c1c] dark:text-rose-400 align-middle" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span> {likeCount}</>}</span>
          <button onClick={toggleComments} className="hover:underline">{commentCount > 0 && `${commentCount} comment${commentCount === 1 ? '' : 's'}`}</button>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-1 px-2 md:px-3 py-1.5 mt-1 border-t border-slate-100 dark:border-white/5">
        <ActionBtn active={liked} onClick={toggleLike} icon="favorite" label="Like" activeCls="bg-gradient-to-r from-[#7f1d1d] via-[#b91c1c] to-[#e11d48] bg-clip-text text-transparent" />
        <ActionBtn onClick={toggleComments} icon="chat_bubble" label="Comment" />
        <ActionBtn onClick={() => me && setShowRepost(true)} icon="repeat" label="Repost" />
        <div className="flex-1 relative">
          <button onClick={() => setShareOpen((o) => !o)} className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-[19px]">share</span>Share
          </button>
          {shareOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShareOpen(false)} />
              <div className="absolute right-0 bottom-11 z-20 w-48 bg-white dark:bg-[#26262a] rounded-xl shadow-xl border border-slate-200/70 dark:border-white/10 py-1">
                <button onClick={() => { setShareOpen(false); copyLink() }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10">
                  <span className="material-symbols-outlined text-[18px]">{copied ? 'check' : 'link'}</span>{copied ? 'Copied!' : 'Copy link'}
                </button>
                <button onClick={() => { setShareOpen(false); setShowShareModal(true) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10">
                  <span className="material-symbols-outlined text-[18px]">forward_to_inbox</span>Send in a message
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showShareModal && <SharePostModal post={post} onClose={() => setShowShareModal(false)} />}
      {showRepost && me && <RepostModal post={post} me={me} onClose={() => setShowRepost(false)} onReposted={onReposted} />}
      {report && <ReportModal targetType={report.type} targetId={report.id} targetLabel={report.label} onClose={() => setReport(null)} />}
      {showEdit && <EditPostModal postId={post.id} initial={content || ''} onClose={() => setShowEdit(false)} onSaved={(v) => setContent(v)} />}

      {/* Comments */}
      {expanded && (
        <div className="px-4 md:px-5 py-4 border-t border-slate-100 dark:border-white/5 space-y-4">
          {me && (
            <div className="flex gap-2.5">
              <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center overflow-hidden flex-shrink-0">
                {me.photo ? <img src={me.photo} alt="You" className="h-full w-full object-cover" /> : <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">{initials(me.name)}</span>}
              </div>
              <div className="flex-1 flex items-end gap-2">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment() } }}
                  placeholder="Add a comment…"
                  className="flex-1 bg-slate-100 dark:bg-white/5 rounded-full px-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button onClick={addComment} disabled={!newComment.trim() || sending} className="h-9 w-9 rounded-full premium-gradient text-white flex items-center justify-center disabled:opacity-50 flex-shrink-0">
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              </div>
            </div>
          )}

          {loadingComments ? (
            <p className="text-xs text-slate-400 text-center py-2">Loading comments…</p>
          ) : (
            (comments ?? []).map((c) => {
              const canDelete = me?.id === c.author_id || isOwn
              return (
                <div key={c.id} className="flex gap-2.5 group">
                  <Link href={profileLink(c.author_username)} className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center overflow-hidden">
                      {c.author_photo ? <img src={c.author_photo} alt={c.author_name ?? ''} className="h-full w-full object-cover" /> : <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">{initials(c.author_name)}</span>}
                    </div>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="bg-slate-100 dark:bg-white/5 rounded-2xl px-3.5 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <Link href={profileLink(c.author_username)} className="font-bold text-xs text-slate-900 dark:text-slate-100 hover:underline truncate">{c.author_name || 'User'}</Link>
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {me && me.id !== c.author_id && (
                            <button onClick={() => setReport({ type: 'comment', id: c.id, label: c.author_name || 'this comment' })} title="Report comment" className="text-slate-400 hover:text-amber-500">
                              <span className="material-symbols-outlined text-[15px]">flag</span>
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => deleteComment(c.id)} title="Delete comment" className="text-slate-400 hover:text-red-500">
                              <span className="material-symbols-outlined text-[15px]">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line">{c.content}</p>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 ml-1">{relativeTime(c.created_at)}</p>
                  </div>
                </div>
              )
            })
          )}
          {!loadingComments && (comments ?? []).length === 0 && (
            <p className="text-xs text-slate-400 text-center py-2">No comments yet. Be the first.</p>
          )}
        </div>
      )}
    </article>
  )
}

function EditPostModal({ postId, initial, onClose, onSaved }: { postId: string; initial: string; onClose: () => void; onSaved: (v: string | null) => void }) {
  const [text, setText] = useState(initial)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  const wrap = (mark: string) => {
    const ta = ref.current; if (!ta) return
    const s = ta.selectionStart, e = ta.selectionEnd, sel = text.slice(s, e) || 'text'
    const next = text.slice(0, s) + mark + sel + mark + text.slice(e)
    setText(next)
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(s + mark.length, s + mark.length + sel.length) })
  }
  const save = async () => {
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('posts').update({ content: text.trim() || null }).eq('id', postId)
    setBusy(false)
    if (!error) { onSaved(text.trim() || null); onClose() }
  }
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-[#1c1c1e] rounded-3xl shadow-2xl border border-slate-200/70 dark:border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/70 dark:border-white/10">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">Edit post</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400"><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-1 mb-2">
            <button onClick={() => wrap('**')} title="Bold" className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 font-bold">B</button>
            <button onClick={() => wrap('*')} title="Italic" className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 italic">i</button>
          </div>
          <textarea ref={ref} value={text} onChange={(e) => setText(e.target.value)} rows={6} className="w-full resize-none bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none" placeholder="Edit your post…" />
          <button onClick={save} disabled={busy} className="w-full mt-3 py-2.5 rounded-full text-sm font-semibold text-white premium-gradient disabled:opacity-60">{busy ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>
    </div>
  )
}

function ActionBtn({ icon, label, onClick, active = false, activeCls = 'text-primary' }: { icon: string; label: string; onClick: () => void; active?: boolean; activeCls?: string }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 inline-flex items-center justify-center py-2 rounded-xl text-sm font-semibold transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
    >
      <span className={`inline-flex items-center gap-1.5 ${active ? activeCls : 'text-slate-500 dark:text-slate-400'}`}>
        <span className="material-symbols-outlined text-[19px]" style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}>{icon}</span>
        {label}
      </span>
    </button>
  )
}
