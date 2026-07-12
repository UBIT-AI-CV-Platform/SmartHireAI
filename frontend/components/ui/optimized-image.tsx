'use client'

import Image from 'next/image'

/**
 * Drop-in replacements for the raw <img> tags used across the app.
 *
 * Why: profile photos and post images are uploaded at whatever resolution the
 * user picked (often 2-4 MB straight off a phone camera) and were then being
 * scaled down to a 36px avatar *by the browser* - the full file was still
 * downloaded every time. next/image makes the server resize and re-encode to
 * AVIF/WebP, and lazy-loads anything below the fold.
 *
 * `width`/`height` here are the dimensions the optimizer fetches, NOT the
 * rendered size - the caller's CSS (h-9 w-9, max-h-72, …) still drives layout.
 *
 * Note: these are only for REMOTE urls (Supabase storage / Google avatars, both
 * allowlisted in next.config.mjs). Local `blob:`/`data:` previews from a file
 * picker must stay as plain <img> - next/image cannot optimize them, and there
 * is nothing to gain since the bytes are already on the device.
 */

/**
 * Hosts declared in next.config.mjs `images.remotePatterns`.
 *
 * This guard exists because next/image THROWS on an unlisted hostname, and a throw
 * during render takes down the entire page - a single stray photo_url in the
 * database is enough to break a whole dashboard. Image URLs come from user data, so
 * we can never be sure they are on an allowlisted host. Anything we cannot optimize
 * therefore degrades to a plain <img>, which is exactly what it was before.
 */
const OPTIMIZABLE_HOSTS = [
  /\.supabase\.co$/,
  /^lh3\.googleusercontent\.com$/,
  /^randomuser\.me$/,
  /^picsum\.photos$/,
]

function canOptimize(src: string): boolean {
  try {
    return OPTIMIZABLE_HOSTS.some((h) => h.test(new URL(src).hostname))
  } catch {
    // Relative path, blob:, data: or a malformed URL - not something next/image
    // can (or should) handle.
    return false
  }
}

/** Square profile photo. Callers own the rounded, overflow-hidden container. */
export function AvatarImage({
  src,
  alt = '',
  className = 'h-full w-full object-cover',
  /** Fetch at 2x the largest rendered avatar (48px) so it stays crisp on retina. */
  size = 96,
}: {
  src: string
  alt?: string
  className?: string
  size?: number
}) {
  if (!canOptimize(src)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} loading="lazy" />
  }
  return <Image src={src} alt={alt} width={size} height={size} className={className} />
}

/** Wide content image (post attachments, shared-post thumbnails). */
export function ContentImage({
  src,
  alt = '',
  className,
  sizes = '(max-width: 768px) 100vw, 640px',
}: {
  src: string
  alt?: string
  className?: string
  sizes?: string
}) {
  if (!canOptimize(src)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} loading="lazy" />
  }
  return <Image src={src} alt={alt} width={1200} height={800} sizes={sizes} className={className} />
}
