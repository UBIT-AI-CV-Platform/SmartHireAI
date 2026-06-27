'use client'

import { useEffect, useRef, useState } from 'react'

export type Option = { value: string; label: string }

export default function FancySelect({
  value,
  options,
  onChange,
  icon,
  placeholder = 'Select…',
  className = '',
}: {
  value: string
  options: Option[]
  onChange: (v: string) => void
  icon?: string
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.value === value)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-4 py-3 bg-surface-container-low border-2 border-transparent rounded-2xl font-medium text-on-surface outline-none cursor-pointer hover:bg-surface-container transition-all aria-expanded:border-primary"
      >
        {icon && <span className="material-symbols-outlined text-outline text-lg flex-shrink-0">{icon}</span>}
        <span className={`flex-1 text-left truncate ${current ? '' : 'text-outline-variant'}`}>{current?.label || placeholder}</span>
        <span className={`material-symbols-outlined text-outline transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>expand_more</span>
      </button>
      {open && (
        <div className="absolute z-40 mt-2 w-full bg-white dark:bg-[#2c2c2e] rounded-2xl shadow-xl border border-surface-container overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-72 overflow-y-auto">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-between gap-2 ${o.value === value ? 'bg-primary/10 text-primary font-bold' : 'text-on-surface hover:bg-surface-container-low'}`}
            >
              <span className="truncate">{o.label}</span>
              {o.value === value && <span className="material-symbols-outlined text-base flex-shrink-0">check</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
