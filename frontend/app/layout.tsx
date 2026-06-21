import type { Metadata, Viewport } from 'next'
import { Inter, Sora } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

// Primary font — used for all body / UI text
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

// Secondary font — used for display headings (h1–h4) and brand wordmarks
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
    { media: '(prefers-color-scheme: dark)', color: '#312e81' },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'SmartHire AI — AI-Powered Hiring Platform',
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
    title: 'SmartHire AI — AI-Powered Hiring Platform',
    description: 'Build ATS-optimized CVs, match jobs by skills, and ace interviews with AI.',
    images: [{ url: '/icon.svg', width: 512, height: 512, alt: 'SmartHire AI' }],
  },
  twitter: {
    card: 'summary',
    title: 'SmartHire AI — AI-Powered Hiring Platform',
    description: 'Build ATS-optimized CVs, match jobs by skills, and ace interviews with AI.',
    images: ['/icon.svg'],
  },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable} scroll-smooth`}>
      <head>
        {/* Preconnect so the Material Symbols sheet loads faster */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans bg-surface text-on-surface antialiased overflow-x-hidden">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
