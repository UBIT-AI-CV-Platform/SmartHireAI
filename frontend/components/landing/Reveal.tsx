'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

/**
 * Scroll-in reveal: slides its children from the left or right into place
 * (with a fade) the first time they enter the viewport. Respects
 * prefers-reduced-motion by showing content instantly.
 */
export default function Reveal({
  children,
  from,
  className = '',
}: {
  children: ReactNode
  from: 'left' | 'right' | 'bottom'
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setShown(true)
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShown(true)
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.2, rootMargin: '0px 0px -10% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const hidden =
    from === 'left'
      ? '-translate-x-16 opacity-0'
      : from === 'right'
        ? 'translate-x-16 opacity-0'
        : 'translate-y-16 opacity-0'

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out will-change-transform ${
        shown ? 'translate-x-0 opacity-100' : hidden
      } ${className}`}
    >
      {children}
    </div>
  )
}
