'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import PersonCard from './PersonCard'
import type { PublicProfile } from '@/lib/social'

const SAFE_COLS = 'id, username, full_name, headline, desired_role, role, location, photo_url, company_name, company_industry, followers_count, following_count'

interface FollowListModalProps {
  open: boolean
  onClose: () => void
  profileId: string
  mode: 'followers' | 'following'
  viewerId: string | null
}

/** Lists a profile's followers or the people they follow. */
export default function FollowListModal({ open, onClose, profileId, mode, viewerId }: FollowListModalProps) {
  const [people, setPeople] = useState<PublicProfile[]>([])
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    setLoading(true)
    ;(async () => {
      const col = mode === 'followers' ? 'following_id' : 'follower_id'
      const pick = mode === 'followers' ? 'follower_id' : 'following_id'
      const { data: edges } = await supabase.from('follows').select(pick).eq(col, profileId)
      const ids = (edges ?? []).map((e) => (e as Record<string, string>)[pick]).filter(Boolean)
      if (ids.length === 0) { setPeople([]); setFollowing(new Set()); setLoading(false); return }

      const [{ data: profs }, viewerFollows] = await Promise.all([
        supabase.from('public_profiles').select(SAFE_COLS).in('id', ids),
        viewerId ? supabase.from('follows').select('following_id').eq('follower_id', viewerId).in('following_id', ids) : Promise.resolve({ data: [] as { following_id: string }[] }),
      ])
      setPeople((profs ?? []) as PublicProfile[])
      setFollowing(new Set((viewerFollows.data ?? []).map((f) => f.following_id)))
      setLoading(false)
    })()
  }, [open, profileId, mode, viewerId])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[80vh] flex flex-col bg-white dark:bg-[#1c1c1e] rounded-3xl shadow-2xl border border-slate-200/70 dark:border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/70 dark:border-white/10">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 capitalize">{mode}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-4 overflow-y-auto space-y-2.5">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce" />
              <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
            </div>
          ) : people.length === 0 ? (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-12">
              {mode === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
            </p>
          ) : (
            people.map((p) => (
              <PersonCard
                key={p.id}
                person={p}
                viewerId={viewerId}
                isFollowing={following.has(p.id ?? '')}
                onNavigate={onClose}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
