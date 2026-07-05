import type { Metadata, Viewport } from 'next'
import { Inter, Sora } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import ThemeProvider from '@/components/shared/ThemeProvider'
import SiteLoader from '@/components/shared/SiteLoader'
import './globals.css'

// Primary font - used for all body / UI text
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

// Secondary font - used for display headings (h1–h4) and brand wordmarks
const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1c1c1e' },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'SmartHire AI - AI-Powered Hiring Platform',
    template: '%s | SmartHire AI',
  },
  description: 'Build ATS-optimized CVs with AI, match jobs by skills, and ace interviews. The all-in-one hiring platform for candidates and recruiters.',
  keywords: ['AI CV builder', 'ATS optimizer', 'job matching', 'interview coach', 'AI recruitment', 'hiring platform', 'resume builder'],
  authors: [{ name: 'SmartHire AI' }],
  creator: 'SmartHire AI',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'SmartHire AI',
    title: 'SmartHire AI - AI-Powered Hiring Platform',
    description: 'Build ATS-optimized CVs, match jobs by skills, and ace interviews with AI.',
    images: [{ url: '/logo-full.png', width: 642, height: 159, alt: 'SmartHire AI' }],
  },
  twitter: {
    card: 'summary',
    title: 'SmartHire AI - AI-Powered Hiring Platform',
    description: 'Build ATS-optimized CVs, match jobs by skills, and ace interviews with AI.',
    images: ['/logo-full.png'],
  },
  icons: {
    icon: [{ url: '/logo-icon.png', type: 'image/png' }],
    shortcut: '/logo-icon.png',
    apple: '/logo-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable} scroll-smooth`} suppressHydrationWarning>
      <head />
      <body className="font-sans bg-surface text-on-surface antialiased overflow-x-hidden">
        <ThemeProvider>
          <SiteLoader />
          {children}
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </ThemeProvider>
      </body>
    </html>
  )
}
