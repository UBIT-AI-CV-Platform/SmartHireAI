'use client'

import Link from 'next/link'
import FollowButton from './FollowButton'
import { useProfileLink } from '@/lib/useProfileLink'
import { displayName, initials, roleLabel, tagline, type PublicProfile } from '@/lib/social'

interface PersonCardProps {
  person: PublicProfile
  viewerId: string | null
  isFollowing: boolean
  onFollowChange?: (following: boolean) => void
  onNavigate?: () => void
}

/** A person row: avatar + name + handle + tagline + follow button. */
export default function PersonCard({ person, viewerId, isFollowing, onFollowChange, onNavigate }: PersonCardProps) {
  const href = useProfileLink()(person.username)
  const isSelf = viewerId != null && person.id === viewerId

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white dark:bg-[#1c1c1e] hover:shadow-md hover:border-slate-300 dark:hover:border-white/20 transition-all">
      <Link href={href} onClick={onNavigate} className="flex-shrink-0">
        <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center overflow-hidden border border-white dark:border-white/10 shadow-sm">
          {person.photo_url ? (
            <img src={person.photo_url} alt={displayName(person)} className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{initials(person.full_name)}</span>
          )}
        </div>
      </Link>

      <Link href={href} onClick={onNavigate} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{displayName(person)}</p>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
            person.role === 'recruiter'
              ? 'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300'
              : 'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
          }`}>{roleLabel(person.role)}</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{tagline(person)}</p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
          @{person.username}
          {(person.followers_count ?? 0) > 0 && <span> · {person.followers_count} followers</span>}
        </p>
      </Link>

      {!isSelf && person.id && (
        <FollowButton
          targetId={person.id}
          initialFollowing={isFollowing}
          onChange={onFollowChange}
          size="sm"
          className="flex-shrink-0"
        />
      )}
    </div>
  )
}
