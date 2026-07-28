import type { CSSProperties } from 'react'

// Intrinsic sizes of the real logo assets (keeps them from squishing).
const FULL = { src: '/logo-full.png', w: 642, h: 159 } // icon + "SmartHire AI" wordmark
const ICON = { src: '/logo-icon.png', w: 150, h: 159 }  // mark only

interface BrandLogoProps {
  /** Rendered height of the logo in px. Width follows the asset's aspect ratio. */
  size?: number
  /** true → full logo (icon + wordmark). false → icon-only mark (collapsed rails, mobile bars). */
  showText?: boolean
  /** 'auto' = indigo in light / white in dark. 'light' = always white (for dark or coloured backgrounds). */
  tone?: 'auto' | 'light'
  /** Optional caption under the logo (e.g. "Candidate Portal"). Only shown with the full logo. */
  subtitle?: string
  /** Extra classes on the wrapper. */
  className?: string
}

/**
 * Single source of truth for the SmartHire AI brand lockup - uses the real logo
 * asset so it looks identical everywhere. The indigo line-art is flipped to white
 * in dark mode (or when tone="light") so it stays crisp on any background.
 */
export default function BrandLogo({
  size = 32,
  showText = true,
  tone = 'auto',
  subtitle,
  className = '',
}: BrandLogoProps) {
  const asset = showText ? FULL : ICON
  const width = Math.round((size * asset.w) / asset.h)
  const style: CSSProperties = { width, height: size }

  // Turn the indigo art white: always for 'light', otherwise only in dark mode.
  const whiteAlways = tone === 'light'
  const imgClass = whiteAlways
    ? '[filter:brightness(0)_invert(1)]'
    : 'dark:[filter:brightness(0)_invert(1)]'

  return (
    <div className={`inline-flex flex-col ${subtitle && showText ? 'gap-0.5' : ''} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={asset.src}
        alt="SmartHire AI logo"
        width={width}
        height={size}
        style={style}
        draggable={false}
        className={`select-none ${imgClass}`}
      />
      {subtitle && showText && (
        <p className={`text-[11px] font-medium ${whiteAlways ? 'text-white/60' : 'text-slate-400 dark:text-slate-400'}`}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
