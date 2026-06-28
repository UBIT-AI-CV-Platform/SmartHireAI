'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import CreatePost, { type MeSnapshot } from './CreatePost'
import PostCard from './PostCard'
import WhoToFollow from './WhoToFollow'
import type { Post } from '@/lib/social'

const PAGE = 20

export default function Feed({ networkHref, embedded = false }: { networkHref: string; embedded?: boolean }) {
  const [me, setMe] = useState<MeSnapshot | null>(null)
  const [followingIds, setFollowingIds] = useState<string[]>([])
  const [tab, setTab] = useState<'following' | 'discover' | 'trending'>('following')

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

  // load posts whenever the tab (or bootstrap) changes
  useEffect(() => {
    if (!ready || !me) return
    loadPosts(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, ready])

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
    const { data } = await supabase.from('post_likes').select('post_id').eq('user_id', me.id).in('post_id', ids)
    setLiked((prev) => {
      const next = new Set(prev)
      ;(data ?? []).forEach((l) => next.add(l.post_id))
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
        {(['following', 'discover', 'trending'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-1.5 rounded-full text-sm font-semibold capitalize transition-all ${tab === t ? 'bg-white dark:bg-[#2a2a2e] text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* States */}
      {loading ? (
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
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">{tab === 'following' ? 'group' : tab === 'trending' ? 'trending_up' : 'dynamic_feed'}</span>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-3">{tab === 'following' ? 'Your following feed is quiet' : tab === 'trending' ? 'Nothing trending yet' : 'No posts yet'}</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            {tab === 'following' ? 'Follow people to see their updates here, or check the Discover tab.' : tab === 'trending' ? 'Posts with the most likes and comments will show up here.' : 'Be the first to share something with the community.'}
          </p>
          {tab === 'following' && (
            <Link href={networkHref} className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-full text-sm font-semibold text-white premium-gradient">
              <span className="material-symbols-outlined text-[18px]">person_add</span> Find people to follow
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} me={me} initialLiked={liked.has(p.id)} onDeleted={onDeleted} onReposted={onCreated} />
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
