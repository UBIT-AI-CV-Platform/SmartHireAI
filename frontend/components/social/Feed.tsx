'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import CreatePost, { type MeSnapshot } from './CreatePost'
import PostCard from './PostCard'
import WhoToFollow from './WhoToFollow'
import { AvatarImage } from '@/components/ui/optimized-image'
import { hiddenPostIds, initials, plainText, relativeTime, setPostHidden, type Post } from '@/lib/social'
import { Icon } from '@/components/ui/icon'

const PAGE = 20

export default function Feed({ networkHref, embedded = false }: { networkHref: string; embedded?: boolean }) {
  const [me, setMe] = useState<MeSnapshot | null>(null)
  const [followingIds, setFollowingIds] = useState<string[]>([])
  const [tab, setTab] = useState<'following' | 'discover' | 'trending' | 'hidden'>('following')

  const [posts, setPosts] = useState<Post[]>([])
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  // bootstrap: me + who I follow
  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: prof }, { data: follows }] = await Promise.all([
        supabase.from('profiles').select('full_name, username, photo_url, role').eq('id', user.id).maybeSingle(),
        supabase.from('follows').select('following_id').eq('follower_id', user.id),
      ])
      setMe({
        id: user.id,
        name: prof?.full_name ?? null,
        username: prof?.username ?? null,
        photo: prof?.photo_url ?? null,
        role: (prof?.role as 'candidate' | 'recruiter') ?? 'candidate',
      })
      setFollowingIds((follows ?? []).map((f) => f.following_id))
      setReady(true)
    })()
  }, [])

  // load posts whenever the tab (or bootstrap) changes; the Hidden tab is a
  // local list built from localStorage, so no feed query is needed for it.
  useEffect(() => {
    if (!ready || !me || tab === 'hidden') return
    loadPosts(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, ready])

  // Hidden posts are a reactive, persisted (localStorage) set so they leave the
  // feed immediately when hidden, survive a refresh, and come straight back when
  // unhidden - no reload required.
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const [hiddenPosts, setHiddenPosts] = useState<Post[]>([])
  useEffect(() => {
    if (!me) return
    setHiddenIds(new Set(hiddenPostIds(me.id)))
  }, [me])

  // Materialise rows for every hidden id: posts already loaded from the feed are
  // reused, and any ids not yet in `posts` (e.g. hidden in an earlier session and
  // still beyond the loaded pages) are fetched so the Hidden tab is complete.
  useEffect(() => {
    if (!me) return
    const ids = Array.from(hiddenIds)
    if (ids.length === 0) { setHiddenPosts([]); return }
    const known = posts.filter((p) => ids.includes(p.id))
    const knownIds = new Set(known.map((p) => p.id))
    const missing = ids.filter((id) => !knownIds.has(id))
    let cancelled = false
    ;(async () => {
      let fetched: Post[] = []
      if (missing.length > 0) {
        const { data } = await createClient().from('posts').select('*').in('id', missing)
        fetched = (data ?? []) as Post[]
      }
      if (cancelled) return
      const map = new Map<string, Post>()
      ;[...fetched, ...known].forEach((p) => map.set(p.id, p))
      setHiddenPosts(Array.from(map.values()).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')))
    })()
    return () => { cancelled = true }
  }, [hiddenIds, posts, me])

  // keep the following graph live when the user follows/unfollows anywhere
  useEffect(() => {
    const handler = (e: Event) => {
      const { targetId, following: isNow } = (e as CustomEvent).detail as { targetId: string; following: boolean }
      setFollowingIds((ids) => {
        const set = new Set(ids)
        if (isNow) set.add(targetId); else set.delete(targetId)
        return Array.from(set)
      })
    }
    window.addEventListener('shai:follow-changed', handler)
    return () => window.removeEventListener('shai:follow-changed', handler)
  }, [])

  // reload the Following feed whenever the follow graph changes (after bootstrap)
  const followSynced = useRef(false)
  useEffect(() => {
    if (!ready || !me) return
    if (!followSynced.current) { followSynced.current = true; return }
    if (tab === 'following') loadPosts(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followingIds])

  const fetchLiked = async (ids: string[]) => {
    if (!me || ids.length === 0) return
    const supabase = createClient()
    const { data, error } = await supabase.from('post_likes').select('post_id').eq('user_id', me.id).in('post_id', ids)
    if (error) return
    // Authoritative for the ids we asked about: an id that came back unliked is
    // dropped, so an unlike can't leave a stale `true` behind for a remount.
    const likedNow = new Set((data ?? []).map((l) => l.post_id))
    setLiked((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => { if (likedNow.has(id)) next.add(id); else next.delete(id) })
      return next
    })
  }

  const loadPosts = async (reset: boolean) => {
    if (!me) return
    reset ? setLoading(true) : setLoadingMore(true)
    setError('')
    const supabase = createClient()
    try {
      let q = supabase.from('posts').select('*')
      if (tab === 'trending') {
        // most-engaged posts from the last 30 days
        const since = new Date(Date.now() - 30 * 86400000).toISOString()
        q = q.gte('created_at', since).order('like_count', { ascending: false }).order('comment_count', { ascending: false }).limit(PAGE)
      } else {
        q = q.order('created_at', { ascending: false }).limit(PAGE)
        if (tab === 'following') q = q.in('author_id', [...followingIds, me.id])
        if (!reset && posts.length > 0) q = q.lt('created_at', posts[posts.length - 1].created_at)
      }

      const { data, error: err } = await q
      if (err) throw err
      const rows = (data ?? []) as Post[]
      setHasMore(tab !== 'trending' && rows.length === PAGE)
      setPosts((prev) => (reset ? rows : [...prev, ...rows]))
      fetchLiked(rows.map((p) => p.id))
    } catch (e) {
      setError('Could not load the feed. Please retry.')
      console.error(e)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const onCreated = (post: Post) => setPosts((prev) => [post, ...prev])
  const onDeleted = (id: string) => setPosts((prev) => prev.filter((p) => p.id !== id))

  // PostCard already persisted the hide; here we just mirror it into live state
  // so the card unmounts from the feed and lands in the Hidden tab instantly.
  const onHidden = (id: string) => setHiddenIds((prev) => { const n = new Set(prev); n.add(id); return n })
  const unhide = (id: string) => {
    if (!me) return
    setPostHidden(me.id, id, false)
    setHiddenIds((prev) => { const n = new Set(prev); n.delete(id); return n })
  }

  // Pagination still walks the raw `posts` list, so the cursor stays correct.
  const visiblePosts = posts.filter((p) => !hiddenIds.has(p.id))

  return (
    <div className={embedded ? '' : 'max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8'}>
      {!embedded && (
        <div className="mb-5">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">Feed</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Updates from your network and the SmartHire community.</p>
        </div>
      )}

      {me && <CreatePost me={me} onCreated={onCreated} />}

      {!embedded && (
        <div className="mt-4">
          <WhoToFollow />
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mt-6 mb-4 p-1 bg-slate-100 dark:bg-white/5 rounded-full w-fit">
        {(['following', 'discover', 'trending', 'hidden'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-1.5 rounded-full text-sm font-semibold capitalize transition-all ${tab === t ? 'bg-white dark:bg-[#2a2a2e] text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Hidden posts manager */}
      {tab === 'hidden' ? (
        hiddenPosts.length === 0 ? (
          <div className="text-center py-16">
            <Icon name="visibility_off" className="text-5xl text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-3">No hidden posts</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Posts you hide from your feed will show up here, so you can bring them back anytime.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {hiddenPosts.map((p) => (
              <HiddenPostRow key={p.id} post={p} onUnhide={() => unhide(p.id)} />
            ))}
          </div>
        )
      ) : loading ? (
        <div className="flex items-center justify-center py-20 gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce" />
          <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
          <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{error}</p>
          <button onClick={() => loadPosts(true)} className="px-4 py-2 rounded-full text-sm font-semibold text-white premium-gradient">Retry</button>
        </div>
      ) : visiblePosts.length === 0 ? (
        <div className="text-center py-16">
          <Icon name={tab === 'following' ? 'group' : tab === 'trending' ? 'trending_up' : 'dynamic_feed'} className="text-5xl text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-3">{tab === 'following' ? 'Your following feed is quiet' : tab === 'trending' ? 'Nothing trending yet' : 'No posts yet'}</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            {tab === 'following' ? 'Follow people to see their updates here, or check the Discover tab.' : tab === 'trending' ? 'Posts with the most likes and comments will show up here.' : 'Be the first to share something with the community.'}
          </p>
          {tab === 'following' && (
            <Link href={networkHref} className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-full text-sm font-semibold text-white premium-gradient">
              <Icon name="person_add" className="text-[18px]" /> Find people to follow
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {visiblePosts.map((p) => (
            <PostCard key={p.id} post={p} me={me} initialLiked={liked.has(p.id)} onDeleted={onDeleted} onReposted={onCreated} onHidden={onHidden} />
          ))}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button onClick={() => loadPosts(false)} disabled={loadingMore} className="px-5 py-2.5 rounded-full text-sm font-semibold border border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-60">
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function HiddenPostRow({ post, onUnhide }: { post: Post; onUnhide: () => void }) {
  return (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl border border-slate-200/70 dark:border-white/10 shadow-sm px-4 md:px-5 py-3.5 flex items-start gap-3">
      <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center overflow-hidden flex-shrink-0 border border-white dark:border-white/10">
        {post.author_photo ? <AvatarImage src={post.author_photo} alt={post.author_name ?? ''} /> : <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{initials(post.author_name)}</span>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{post.author_name || 'SmartHire user'}</span>
          <span className="text-[11px] text-slate-400 flex-shrink-0">{relativeTime(post.created_at)}</span>
        </div>
        {post.content && <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">{plainText(post.content)}</p>}
      </div>
      <button
        onClick={onUnhide}
        className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
      >
        <Icon name="visibility" className="text-sm" /> Unhide
      </button>
    </div>
  )
}
