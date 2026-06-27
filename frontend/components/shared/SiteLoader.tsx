'use client'

import { useEffect, useState } from 'react'

/**
 * Branded entry splash. Shows once per browser session (sessionStorage flag) so
 * it greets the user on their first load and doesn't repeat on every navigation
 * or refresh. Covers the screen during hydration, then fades out. Click to skip.
 */
export default function SiteLoader() {
  const [show, setShow] = useState(true)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    // Already greeted this session → don't show again (hide before paint settles).
    if (sessionStorage.getItem('shai_splash') === '1') {
      setShow(false)
      return
    }
    const dismiss = () => {
      setLeaving(true)
      sessionStorage.setItem('shai_splash', '1')
      window.setTimeout(() => setShow(false), 650)
    }
    const t = window.setTimeout(dismiss, 1900)
    return () => window.clearTimeout(t)
  }, [])

  if (!show) return null

  const skip = () => {
    if (leaving) return
    setLeaving(true)
    sessionStorage.setItem('shai_splash', '1')
    window.setTimeout(() => setShow(false), 650)
  }

  return (
    <div className={`site-loader ${leaving ? 'site-loader--leaving' : ''}`} onClick={skip} role="status" aria-label="Loading SmartHire AI">
      <div className="site-loader__bg" />

      <div className="relative flex flex-col items-center gap-7">
        {/* Logo mark with glow + orbiting dots */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          <span className="loader-glow" />
          <span className="loader-ring" />
          <span className="loader-orbit">
            <span className="loader-dot" />
            <span className="loader-dot loader-dot--2" />
            <span className="loader-dot loader-dot--3" />
          </span>
          <div className="relative w-16 h-16 rounded-2xl premium-gradient flex items-center justify-center text-white shadow-2xl loader-badge">
            <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          </div>
        </div>

        {/* Wordmark with shimmer sweep */}
        <div className="loader-wordmark text-2xl md:text-3xl font-black tracking-tight">SmartHire AI</div>

        {/* Indeterminate progress */}
        <div className="loader-track"><span className="loader-fill" /></div>

        <p className="text-[11px] font-medium tracking-wide text-white/40">Preparing your workspace…</p>
      </div>
    </div>
  )
}
