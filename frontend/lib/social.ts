import { formatDistanceToNowStrict } from 'date-fns'
import type { Database } from './supabase/database.types'

export type PublicProfile = Database['public']['Views']['public_profiles']['Row']
export type Post = Database['public']['Tables']['posts']['Row']
export type PostComment = Database['public']['Tables']['post_comments']['Row']

/** Compact relative time, e.g. "3h", "2d", "just now". */
export function relativeTime(iso?: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const secs = (Date.now() - d.getTime()) / 1000
    if (secs < 45) return 'just now'
    return formatDistanceToNowStrict(d, { addSuffix: true })
      .replace(' seconds', 's').replace(' second', 's')
      .replace(' minutes', 'm').replace(' minute', 'm')
      .replace(' hours', 'h').replace(' hour', 'h')
      .replace(' days', 'd').replace(' day', 'd')
      .replace(' months', 'mo').replace(' month', 'mo')
      .replace(' years', 'y').replace(' year', 'y')
  } catch { return '' }
}

/** Initials for the avatar fallback (max 2 letters). */
export function initials(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** The line shown under a person's name: their headline, else desired role / company. */
export function tagline(p: Partial<PublicProfile>): string {
  if (p.headline?.trim()) return p.headline.trim()
  if (p.role === 'recruiter') {
    return [p.desired_role?.trim() || 'Recruiter', p.company_name?.trim()].filter(Boolean).join(' · ')
  }
  return p.desired_role?.trim() || 'Candidate'
}

export function roleLabel(role?: string | null): string {
  return role === 'recruiter' ? 'Recruiter' : 'Candidate'
}

export function displayName(p: Partial<PublicProfile>): string {
  return p.full_name?.trim() || (p.username ? '@' + p.username : 'SmartHire user')
}
