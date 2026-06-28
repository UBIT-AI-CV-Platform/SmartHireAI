'use client'

import { usePathname } from 'next/navigation'

/**
 * Returns a function that builds a profile URL scoped to the current portal, so
 * the profile page renders INSIDE the portal shell (sidebar + topbar).
 * In portal context → `/candidate/u/<handle>` or `/recruiter/u/<handle>`.
 * Outside a portal (e.g. the standalone /post or /u page) → `/u/<handle>`.
 */
export function useProfileLink() {
  const p = usePathname() || ''
  const base = p.startsWith('/recruiter') ? '/recruiter' : p.startsWith('/candidate') ? '/candidate' : ''
  return (username?: string | null) => (username ? `${base}/u/${username}` : '#')
}
