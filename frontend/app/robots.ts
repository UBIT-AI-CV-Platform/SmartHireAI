import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/auth/login', '/auth/signup'],
        disallow: ['/candidate/', '/recruiter/', '/interview/', '/api/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
