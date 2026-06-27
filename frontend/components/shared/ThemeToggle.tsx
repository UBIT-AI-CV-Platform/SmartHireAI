'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

/**
 * Light/Dark theme toggle. Renders a circular icon button that swaps the active
 * theme and persists the choice (handled by next-themes). The mounted-guard
 * avoids a hydration mismatch since the resolved theme is only known on the client.
 *
 * `className` lets callers tweak placement/size (e.g. a fixed corner on standalone
 * pages); the default styling matches the portal topbar icon buttons.
 */
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === 'dark'

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
      {/* Before mount, render a stable neutral icon to avoid hydration mismatch */}
      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
        {mounted ? (isDark ? 'light_mode' : 'dark_mode') : 'dark_mode'}
      </span>
    </button>
  )
}
