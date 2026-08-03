'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import CreatePost, { type MeSnapshot } from './CreatePost'
import PostCard from './PostCard'
import WhoToFollow from './WhoToFollow'
import PersonCard from './PersonCard'
import FollowButton from './FollowButton'
import { AvatarImage } from '@/components/ui/optimized-image'
import { useProfileLink } from '@/lib/useProfileLink'
import { displayName, hiddenPostIds, initials, plainText, relativeTime, setPostHidden, tagline, type Post, type PublicProfile } from '@/lib/social'
import { Icon } from '@/components/ui/icon'

const PAGE = 20

// How many people to show in the Following / suggestions lists before a
// "Show more" expander kicks in.
const PREVIEW_COUNT = 5

// `networkHref` is kept in the props for backward compat with callers, but the
// following empty state now loads suggestions in-place instead of linking away.
export default function Feed({ embedded = false }: { networkHref: string; embedded?: boolean }) {
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

  // Suggested people shown in the "following" empty state (Find people to follow).
  const [suggestions, setSuggestions] = useState<PublicProfile[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestError, setSuggestError] = useState('')
  const suggestionsLoaded = useRef(false)

  // People the current user already follows - shown as cards at the top of the
  // Following tab (no posts there; those live on Discover/Trending / profiles).
  const [followingProfiles, setFollowingProfiles] = useState<PublicProfile[]>([])

  // Expand/collapse for the "latest 5" previews in the Following tab.
  const [showAllFollows, setShowAllFollows] = useState(false)
  const [showAllSuggestions, setShowAllSuggestions] = useState(false)

  // bootstrap: me + who I follow
  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: prof }, { data: follows }] = await Promise.all([
        supabase.from('profiles').select('full_name, username, photo_url, role').eq('id', user.id).maybeSingle(),
        supabase.from('follows').select('following_id').eq('follower_id', user.id).order('created_at', { ascending: false }),
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

  // load posts whenever the tab (or bootstrap) changes; the Following tab is a
  // people/network view and the Hidden tab is a local list built from
  // localStorage, so no feed query is needed for either of them.
  useEffect(() => {
    if (!ready || !me || tab === 'hidden' || tab === 'following') return
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
        if (isNow) return [targetId, ...ids.filter((id) => id !== targetId)] // newest first
        return ids.filter((id) => id !== targetId)
      })
    }
    window.addEventListener('shai:follow-changed', handler)
    return () => window.removeEventListener('shai:follow-changed', handler)
  }, [])

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

  // Load people you don't follow yet, most-followed first, for the following
  // empty state. The same handler powers the "Find people to follow" button.
  const loadSuggestions = async () => {
    if (!me) return
    setSuggestLoading(true)
    setSuggestError('')
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('public_profiles')
        .select('id, username, full_name, headline, desired_role, role, photo_url, company_name, followers_count')
        .neq('id', me.id)
        .order('followers_count', { ascending: false })
        .limit(18)
      const fset = new Set(followingIds)
      setSuggestions(((data ?? []) as PublicProfile[]).filter((p) => p.id && !fset.has(p.id)))
    } catch {
      setSuggestError('Could not load suggestions. Please retry.')
    } finally {
      setSuggestLoading(false)
    }
  }

  // Load suggestions once the user is known, so the following empty state is
  // already populated when the dashboard opens (no dead-end navigation).
  useEffect(() => {
    if (!ready || !me || suggestionsLoaded.current) return
    suggestionsLoaded.current = true
    loadSuggestions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, me])

  // Drop people from the suggestions the moment you follow them.
  useEffect(() => {
    setSuggestions((prev) => prev.filter((p) => p.id && !followingIds.includes(p.id)))
  }, [followingIds])

  // Materialise profile rows for every person the user follows, so the top
  // Following strip stays in sync (live) with follow/unfollow actions.
  useEffect(() => {
    if (!me || followingIds.length === 0) { setFollowingProfiles([]); return }
    let cancelled = false
    const supabase = createClient()
    ;(async () => {
      try {
        const { data } = await supabase
          .from('public_profiles')
          .select('id, username, full_name, headline, desired_role, role, photo_url, company_name, followers_count')
          .in('id', followingIds)
        // `.in()` does not preserve order - sort back to `followingIds` order so
        // the list always shows the most recently followed people first.
        const ordered = ((data ?? []) as PublicProfile[]).slice().sort(
          (a, b) => followingIds.indexOf(a.id ?? '') - followingIds.indexOf(b.id ?? '')
        )
        if (!cancelled) setFollowingProfiles(ordered)
      } catch { /* ignore */ }
    })()
    return () => { cancelled = true }
  }, [followingIds, me])

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
      ) : tab === 'following' && me ? (
        <div className="space-y-8">
          {/* People I follow - each card has a Following / Unfollow toggle */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Icon name="group" className="text-[18px] text-primary" /> Following
              </h3>
              <span className="text-xs font-semibold text-slate-400">{followingProfiles.length}</span>
            </div>
            {followingProfiles.length === 0 ? (
              <div className="text-center py-10 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                <Icon name="group" className="text-4xl text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-3">You're not following anyone yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">People you follow will show up here. Open a profile to see their posts.</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {followingProfiles.slice(0, showAllFollows ? followingProfiles.length : PREVIEW_COUNT).map((p) => (
                    <FollowingRow key={p.id} person={p} viewerId={me.id} />
                  ))}
                </div>
                {followingProfiles.length > PREVIEW_COUNT && (
                  <button
                    onClick={() => setShowAllFollows((v) => !v)}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <Icon name="expand_more" className={`text-base transition-transform ${showAllFollows ? 'rotate-180' : ''}`} />
                    {showAllFollows ? 'Show less' : `Show more (${followingProfiles.length - PREVIEW_COUNT})`}
                  </button>
                )}
              </>
            )}
          </section>

          {/* People you might want to follow */}
          <section>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Icon name="person_add" className="text-[18px] text-primary" /> Find people to follow
              </h3>
              <button onClick={loadSuggestions} disabled={suggestLoading} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-60">
                <Icon name="refresh" className="text-[14px]" /> Refresh
              </button>
            </div>

            {suggestLoading && suggestions.length === 0 ? (
              <div className="flex items-center justify-center py-10 gap-1.5">
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              </div>
            ) : suggestError ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-500 dark:text-slate-400">{suggestError}</p>
                <button onClick={loadSuggestions} className="mt-3 px-4 py-2 rounded-full text-xs font-semibold text-white premium-gradient">Retry</button>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-center py-8 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                <p className="text-xs text-slate-400">No one to suggest right now. Check back later.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {suggestions.slice(0, showAllSuggestions ? suggestions.length : PREVIEW_COUNT).map((p) => (
                    <PersonCard key={p.id} person={p} viewerId={me.id} isFollowing={false} />
                  ))}
                </div>
                {suggestions.length > PREVIEW_COUNT && (
                  <button
                    onClick={() => setShowAllSuggestions((v) => !v)}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <Icon name="expand_more" className={`text-base transition-transform ${showAllSuggestions ? 'rotate-180' : ''}`} />
                    {showAllSuggestions ? 'Show less' : `Show more (${suggestions.length - PREVIEW_COUNT})`}
                  </button>
                )}
              </>
            )}
          </section>
        </div>
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
          <Icon name={tab === 'trending' ? 'trending_up' : 'dynamic_feed'} className="text-5xl text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-3">{tab === 'trending' ? 'Nothing trending yet' : 'No posts yet'}</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">{tab === 'trending' ? 'Posts with the most likes and comments will show up here.' : 'Be the first to share something with the community.'}</p>
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

function FollowingRow({ person, viewerId }: { person: PublicProfile; viewerId: string }) {
  const href = useProfileLink()(person.username)
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white dark:bg-[#1c1c1e] hover:shadow-md hover:border-slate-300 dark:hover:border-white/20 transition-all">
      <Link href={href} className="flex-shrink-0">
        <div className="h-14 w-14 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center overflow-hidden border border-white dark:border-white/10 shadow-sm">
          {person.photo_url ? <AvatarImage src={person.photo_url} alt={displayName(person)} /> : <span className="text-base font-bold text-indigo-700 dark:text-indigo-300">{initials(person.full_name)}</span>}
        </div>
      </Link>
      <Link href={href} className="min-w-0 flex-1">
        <p className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-snug">{displayName(person)}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{tagline(person)}</p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
          @{person.username}
          {(person.followers_count ?? 0) > 0 && <span> · {person.followers_count} followers</span>}
        </p>
      </Link>
      {person.id && person.id !== viewerId && (
        <FollowButton targetId={person.id} initialFollowing={true} size="sm" className="flex-shrink-0" />
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
