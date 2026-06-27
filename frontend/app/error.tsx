'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#1c1c1e] flex items-center justify-center p-6">
      <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl shadow-sm border border-slate-200 dark:border-white/10 p-8 max-w-md w-full text-center">
        <span className="material-symbols-outlined text-4xl text-red-400 mb-3 block" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Something went wrong</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">An unexpected error occurred. Please try again.</p>
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
