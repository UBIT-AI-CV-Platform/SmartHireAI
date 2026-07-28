'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import type { SVGProps } from 'react'

/**
 * Light/Dark theme toggle. Renders a circular icon button that swaps the active
 * theme and persists the choice (handled by next-themes). The mounted-guard
 * avoids a hydration mismatch since the resolved theme is only known on the client.
 *
 * The sun/moon glyphs are inline SVGs (heroicons paths) so they always render,
 * independent of the shared Icon map.
 *
 * `className` lets callers tweak placement/size (e.g. a fixed corner on standalone
 * pages); the default styling matches the portal topbar icon buttons.
 */
function SunIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.166a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.061l1.591-1.59ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM17.834 18.894a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 1 0-1.061 1.06l1.59 1.591ZM12 18a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-2.25A.75.75 0 0 1 12 18ZM7.758 17.303a.75.75 0 0 0-1.061-1.06l-1.591 1.59a.75.75 0 0 0 1.06 1.061l1.592-1.59ZM6 12a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h2.25A.75.75 0 0 1 6 12ZM6.697 7.757a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 0 0-1.061 1.06l1.59 1.592Z" />
    </svg>
  )
}

function MoonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path fillRule="evenodd" clipRule="evenodd" d="M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.7-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z" />
    </svg>
  )
}

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === 'dark'

  const toggle = () => setTheme(isDark ? 'light' : 'dark')

  return (
    <button
      onClick={toggle}
      aria-label={mounted ? `Switch to ${isDark ? 'light' : 'dark'} theme` : 'Toggle theme'}
      title={mounted ? `Switch to ${isDark ? 'light' : 'dark'} theme` : 'Toggle theme'}
      className={
        className ||
        'relative h-9 w-9 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors'
      }
    >
      {/* Show the sun when in dark mode (click → light), moon otherwise. */}
      {isDark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
    </button>
  )
}
