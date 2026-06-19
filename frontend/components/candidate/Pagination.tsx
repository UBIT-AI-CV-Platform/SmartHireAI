'use client'

export default function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null

  // windowed page numbers with ellipsis
  const pages: (number | '…')[] = []
  const push = (p: number | '…') => pages.push(p)
  const window = 1
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= page - window && p <= page + window)) push(p)
    else if (pages[pages.length - 1] !== '…') push('…')
  }

  const go = (p: number) => { if (p >= 1 && p <= totalPages && p !== page) onChange(p) }

  return (
    <div className="flex items-center justify-center gap-1.5 mt-6">
      <button onClick={() => go(page - 1)} disabled={page === 1} className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-surface-container text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
        <span className="material-symbols-outlined text-lg">chevron_left</span>
      </button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="px-1 text-on-surface-variant">…</span>
        ) : (
          <button key={p} onClick={() => go(p)} className={`h-9 min-w-9 px-2 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${p === page ? 'premium-gradient text-white shadow' : 'bg-white border border-surface-container text-on-surface hover:bg-surface-container-low'}`}>{p}</button>
        )
      )}
      <button onClick={() => go(page + 1)} disabled={page === totalPages} className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-surface-container text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
        <span className="material-symbols-outlined text-lg">chevron_right</span>
      </button>
    </div>
  )
}
