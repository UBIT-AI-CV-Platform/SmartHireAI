import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  // The app lives in frontend/, but a stray empty package-lock.json in the repo
  // root makes Turbopack pick the root as the workspace and resolve modules
  // from there - where there is no node_modules, so it panics with
  // "Next.js package not found" and the dev server serves a page that never
  // finishes loading. Pin the root to this directory so lockfile placement
  // above us cannot change module resolution.
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
  images: {
    // NOTE: keep this list in sync with OPTIMIZABLE_HOSTS in
    // components/ui/optimized-image.tsx - next/image throws (and takes the whole
    // page down) when it is handed a hostname that is not listed here.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        // Google OAuth profile pictures
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        // Seeded demo profile photos (backend/seed-social.sql)
        protocol: 'https',
        hostname: 'randomuser.me',
      },
      {
        // Seeded demo post images (backend/seed-social.sql)
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  // unpdf bundles pdf.js in a worker and pulls init-time assets out of the
  // package; don't let Turbopack/webpack inline those or the worker breaks.
  serverExternalPackages: ['unpdf'],
}

export default nextConfig
