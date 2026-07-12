import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const now = new Date()
  return [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    // /auth hosts both sign-in and sign-up - there are no separate /auth/login
    // or /auth/signup routes, so listing them here only fed Google 404s.
    { url: `${base}/auth`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/auth/forgot-password`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ]
}
