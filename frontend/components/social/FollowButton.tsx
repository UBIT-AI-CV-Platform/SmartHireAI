'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface FollowButtonProps {
  targetId: string
  initialFollowing: boolean
  /** Fired after a successful toggle with the new state (e.g. to update a count). */
  onChange?: (following: boolean) => void
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Follow / Following toggle. Optimistically flips, rolls back on error.
 * The current user is resolved from the Supabase session at click time.
 */
export default function FollowButton({ targetId, initialFollowing, onChange, size = 'md', className = '' }: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)
  const [hover, setHover] = useState(false)

  const toggle = async () => {
    if (loading) return
    setLoading(true)
    const next = !following
    setFollowing(next) // optimistic
    onChange?.(next)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setFollowing(!next)
      onChange?.(!next)
      setLoading(false)
      return
    }

    const { error } = next
      ? await supabase.from('follows').insert({ follower_id: user.id, following_id: targetId })
      : await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetId)

    if (error) {
      // roll back
      setFollowing(!next)
      onChange?.(!next)
      console.error('follow toggle failed:', error.message)
    } else {
      // let the feed (and any other listeners) refresh the following graph live
      window.dispatchEvent(new CustomEvent('shai:follow-changed', { detail: { targetId, following: next } }))
    }
    setLoading(false)
  }

  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'

  if (following) {
    return (
      <button
        onClick={toggle}
        disabled={loading}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={`inline-flex items-center justify-center gap-1.5 rounded-full font-semibold border transition-all disabled:opacity-60 ${pad} ${
          hover
            ? 'border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-500/10'
            : 'border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5'
        } ${className}`}
      >
        <span className="material-symbols-outlined text-[16px]">{hover ? 'person_remove' : 'check'}</span>
        {hover ? 'Unfollow' : 'Following'}
      </button>
    )
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-semibold text-white premium-gradient shadow-sm shadow-primary/25 hover:opacity-95 transition-all disabled:opacity-60 ${pad} ${className}`}
    >
      <span className="material-symbols-outlined text-[16px]">person_add</span>
      Follow
    </button>
  )
}
