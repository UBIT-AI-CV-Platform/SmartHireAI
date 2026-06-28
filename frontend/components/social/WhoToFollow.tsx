'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import FollowButton from './FollowButton'
import { useProfileLink } from '@/lib/useProfileLink'
import { displayName, initials, tagline, type PublicProfile } from '@/lib/social'

const COLS = 'id, username, full_name, headline, desired_role, role, photo_url, company_name, followers_count'

/** Compact "Who to follow" card — suggests people you don't follow yet. */
export default function WhoToFollow({ seeAllHref, limit = 4 }: { seeAllHref?: string; limit?: number }) {
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [people, setPeople] = useState<PublicProfile[]>([])
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const profileLink = useProfileLink()

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setViewerId(user.id)
      const [{ data: follows }, { data: rows }] = await Promise.all([
        supabase.from('follows').select('following_id').eq('follower_id', user.id),
        supabase.from('public_profiles').select(COLS).neq('id', user.id).order('followers_count', { ascending: false }).limit(limit + 12),
      ])
      const fset = new Set((follows ?? []).map((f) => f.following_id))
      setFollowing(fset)
      setPeople(((rows ?? []) as PublicProfile[]).filter((p) => !fset.has(p.id ?? '')).slice(0, limit))
      setLoading(false)
    })()
  }, [limit])

  if (loading || people.length === 0) return null

  return (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl border border-slate-200/70 dark:border-white/10 p-4 md:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Who to follow</h3>
        {seeAllHref && <Link href={seeAllHref} className="text-xs font-semibold text-primary hover:underline">See all</Link>}
      </div>
      <div className="space-y-3">
        {people.map((p) => (
          <div key={p.id} className="flex items-center gap-3">
            <Link href={profileLink(p.username)} className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center overflow-hidden border border-white dark:border-white/10">
                {p.photo_url ? <img src={p.photo_url} alt={displayName(p)} className="h-full w-full object-cover" /> : <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">{initials(p.full_name)}</span>}
              </div>
            </Link>
            <Link href={profileLink(p.username)} className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{displayName(p)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{tagline(p)}</p>
            </Link>
            {p.id && (
              <FollowButton
                targetId={p.id}
                initialFollowing={following.has(p.id)}
                size="sm"
                className="flex-shrink-0"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
