/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
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
}

export default nextConfig
