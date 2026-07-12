import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return {
    rules: [
      {
        userAgent: '*',
        // /auth is the single page that hosts both sign-in and sign-up.
        allow: ['/', '/auth', '/auth/forgot-password'],
        disallow: ['/candidate/', '/recruiter/', '/interview/', '/api/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
