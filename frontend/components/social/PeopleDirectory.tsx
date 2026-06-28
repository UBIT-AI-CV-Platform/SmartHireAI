'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import PersonCard from './PersonCard'
import { initials, type PublicProfile } from '@/lib/social'

const SAFE_COLS = 'id, username, full_name, headline, desired_role, role, location, photo_url, company_name, company_industry, followers_count, following_count'

export default function PeopleDirectory() {
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [me, setMe] = useState<{ username: string | null; full_name: string | null; photo_url: string | null; followers: number; following: number } | null>(null)
  const [following, setFollowing] = useState<Set<string>>(new Set())

  const [query, setQuery] = useState('')
  const [suggested, setSuggested] = useState<PublicProfile[]>([])
  const [results, setResults] = useState<PublicProfile[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // initial load: viewer, who they follow, and suggestions
  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setViewerId(user.id)

        const [{ data: mine }, { data: follows }, { data: people }] = await Promise.all([
          supabase.from('public_profiles').select('username, full_name, photo_url, followers_count, following_count').eq('id', user.id).maybeSingle(),
          supabase.from('follows').select('following_id').eq('follower_id', user.id),
          supabase.from('public_profiles').select(SAFE_COLS).neq('id', user.id).order('followers_count', { ascending: false }).limit(18),
        ])

        setMe({
          username: mine?.username ?? null,
          full_name: mine?.full_name ?? null,
          photo_url: mine?.photo_url ?? null,
          followers: mine?.followers_count ?? 0,
          following: mine?.following_count ?? 0,
        })
        const fset = new Set((follows ?? []).map((f) => f.following_id))
        setFollowing(fset)
        // don't suggest people you already follow
        setSuggested(((people ?? []) as PublicProfile[]).filter((p) => !fset.has(p.id ?? '')))
      } catch (e) {
        setError('Could not load people. Please retry.')
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const runSearch = useCallback(async (q: string) => {
    const supabase = createClient()
    const term = q.trim()
    if (!term) { setResults(null); setSearching(false); return }
    setSearching(true)
    const like = `%${term.replace(/[%,]/g, '')}%`
    const { data } = await supabase
      .from('public_profiles')
      .select(SAFE_COLS)
      .or(`full_name.ilike.${like},username.ilike.${like},company_name.ilike.${like},headline.ilike.${like}`)
      .neq('id', viewerId ?? '00000000-0000-0000-0000-000000000000')
      .limit(24)
    setResults((data ?? []) as PublicProfile[])
    setSearching(false)
  }, [viewerId])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, runSearch])

  const onFollowChange = (id: string, isNow: boolean) => {
    setFollowing((prev) => {
      const next = new Set(prev)
      if (isNow) next.add(id); else next.delete(id)
      return next
    })
  }

  const list = results ?? suggested

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">Network</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Discover candidates and recruiters, follow them, and grow your network.</p>
      </div>

      {/* Your profile card */}
      {me && (
        <Link
          href={me.username ? `/u/${me.username}` : '#'}
          className="flex items-center gap-3 p-4 mb-6 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10 hover:shadow-md transition-all"
        >
          <div className="h-12 w-12 rounded-full bg-white dark:bg-white/10 flex items-center justify-center overflow-hidden border border-white dark:border-white/10 shadow-sm">
            {me.photo_url ? <img src={me.photo_url} alt="You" className="h-full w-full object-cover" /> : <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{initials(me.full_name)}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{me.full_name || 'Your profile'}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{me.followers}</span> followers · <span className="font-semibold text-slate-700 dark:text-slate-300">{me.following}</span> following
            </p>
          </div>
          <span className="text-xs font-semibold text-primary flex items-center gap-1">View profile <span className="material-symbols-outlined text-[16px]">arrow_forward</span></span>
        </Link>
      )}

      {/* Search */}
      <div className="relative mb-5">
        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people by name, @handle, or company…"
          className="w-full pl-11 pr-10 py-3 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-slate-200/70 dark:border-white/10 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/40 focus:border-primary/40 outline-none transition-all"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        )}
      </div>

      <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3">
        {results !== null ? (searching ? 'Searching…' : `${list.length} result${list.length === 1 ? '' : 's'}`) : 'Suggested for you'}
      </p>

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
          <button onClick={() => location.reload()} className="px-4 py-2 rounded-full text-sm font-semibold text-white premium-gradient">Retry</button>
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-16">
          <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">person_search</span>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{results !== null ? 'No people match your search.' : 'No one to suggest yet.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {list.map((p) => (
            <PersonCard
              key={p.id}
              person={p}
              viewerId={viewerId}
              isFollowing={following.has(p.id ?? '')}
              onFollowChange={(isNow) => onFollowChange(p.id ?? '', isNow)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
