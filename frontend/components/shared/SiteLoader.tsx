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
    const reveal = () => document.documentElement.classList.add('splash-done')
    // Already greeted this session → don't show again; let entrances play at once.
    if (sessionStorage.getItem('shai_splash') === '1') {
      setShow(false)
      reveal()
      return
    }
    const dismiss = () => {
      setLeaving(true)
      reveal() // start the page's on-load animations as the splash fades away
      sessionStorage.setItem('shai_splash', '1')
      window.setTimeout(() => setShow(false), 650)
    }
    const t = window.setTimeout(dismiss, 5000)
    return () => window.clearTimeout(t)
  }, [])

  if (!show) return null

  const skip = () => {
    if (leaving) return
    setLeaving(true)
    document.documentElement.classList.add('splash-done')
    sessionStorage.setItem('shai_splash', '1')
    window.setTimeout(() => setShow(false), 650)
  }

  return (
    <div className={`site-loader ${leaving ? 'site-loader--leaving' : ''}`} onClick={skip} role="status" aria-label="Loading SmartHire AI">
      <div className="flex flex-col items-center gap-6">
        {/* Logo badge inside a rotating gradient ring */}
        <div className="loader-mark">
          <span className="loader-spinner" />
          <div className="loader-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.png" alt="" aria-hidden="true" draggable={false} className="w-7 h-7 select-none" style={{ filter: 'brightness(0) invert(1)' }} />
          </div>
        </div>

        {/* Wordmark */}
        <div className="loader-wordmark text-lg md:text-xl">SmartHire AI</div>
      </div>
    </div>
  )
}
