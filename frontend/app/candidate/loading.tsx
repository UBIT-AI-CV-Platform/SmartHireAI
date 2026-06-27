export default function CandidateLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-white/5 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading…</p>
      </div>
    </div>
  )
}
