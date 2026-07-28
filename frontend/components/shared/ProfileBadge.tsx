'use client'

import Link from 'next/link'
import { Icon } from '@/components/ui/icon'
import { AvatarImage } from '@/components/ui/optimized-image'

/**
 * The name + avatar cluster in the top-right of both portal headers.
 *
 * Clicking it opens your own public profile. `href` is null until the username has
 * loaded (or if the profile somehow has none) - in that case we render a plain div
 * rather than an <a href="#">, so there is never a link that goes nowhere.
 */
export default function ProfileBadge({
  href,
  name,
  photo,
  roleLabel,
  fallbackIcon,
}: {
  href: string | null
  name: string
  photo: string
  roleLabel: string
  fallbackIcon: string
}) {
  const inner = (
    <>
      <div className="text-right hidden sm:block">
        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">{name}</p>
        <p className="text-[10px] text-slate-400 leading-tight">{roleLabel}</p>
      </div>
      <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center border-2 border-white dark:border-white/10 shadow-sm overflow-hidden">
        {photo ? (
          <AvatarImage src={photo} alt={name} />
        ) : (
          <Icon name={fallbackIcon} className="text-indigo-700 dark:text-indigo-300 text-lg" solid />
        )}
      </div>
    </>
  )

  if (!href) return <div className="flex items-center gap-2.5">{inner}</div>

  return (
    <Link
      href={href}
      title="View your profile"
      aria-label="View your profile"
      className="flex items-center gap-2.5 rounded-full transition-opacity hover:opacity-80 active:scale-95"
    >
      {inner}
    </Link>
  )
}
