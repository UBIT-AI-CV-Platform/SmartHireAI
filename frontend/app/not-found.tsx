import Link from 'next/link'
import type { Metadata } from 'next'
import ThemeToggle from '@/components/shared/ThemeToggle'

export const metadata: Metadata = {
  title: '404 — Page Not Found',
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#1c1c1e] flex flex-col items-center justify-center p-6 text-center">
      <ThemeToggle className="fixed top-4 right-4 z-50 h-10 w-10 rounded-full flex items-center justify-center bg-white/80 dark:bg-white/10 backdrop-blur border border-slate-200/70 dark:border-white/10 text-slate-600 dark:text-slate-200 shadow-sm hover:bg-white dark:hover:bg-white/20 transition-colors" />
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2 mb-10">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-md">
          <span className="material-symbols-outlined text-white text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
        </div>
        <span className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">SmartHire AI</span>
      </Link>

      {/* 404 */}
      <div className="text-[96px] font-extrabold leading-none bg-gradient-to-br from-indigo-600 to-purple-500 bg-clip-text text-transparent select-none mb-4">
        404
      </div>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Page not found</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mb-8">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          Go to Home
        </Link>
        <Link
          href="/auth/login"
          className="px-6 py-2.5 bg-white dark:bg-[#2c2c2e] text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
        >
          Sign In
        </Link>
      </div>
    </div>
  )
}
