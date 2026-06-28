'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useProfileLink } from '@/lib/useProfileLink'
import { initials, type PublicProfile } from '@/lib/social'

/** Top-of-dashboard people search with a live results dropdown. */
export default function PeopleSearchBar() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<PublicProfile[]>([])
  const [open, setOpen] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const profileLink = useProfileLink()

  const search = (val: string) => {
    setQ(val)
    if (debounce.current) clearTimeout(debounce.current)
    const term = val.trim()
    if (!term) { setResults([]); setOpen(false); return }
    setOpen(true)
    debounce.current = setTimeout(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const like = `%${term.replace(/[%,()]/g, '')}%`
      const { data } = await supabase
        .from('public_profiles')
        .select('id, username, full_name, headline, desired_role, role, photo_url, company_name')
        .or(`full_name.ilike.${like},username.ilike.${like},company_name.ilike.${like}`)
        .neq('id', user?.id ?? '00000000-0000-0000-0000-000000000000')
        .limit(8)
      setResults((data as PublicProfile[]) ?? [])
    }, 250)
  }

  return (
    <div className="relative">
      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
      <input
        value={q}
        onChange={(e) => search(e.target.value)}
        onFocus={() => q.trim() && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search people by name, @handle, or company…"
        className="w-full pl-11 pr-4 py-2.5 rounded-full bg-white dark:bg-[#1c1c1e] border border-slate-200/70 dark:border-white/10 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/40 focus:border-primary/40 outline-none transition-all shadow-sm"
      />
      {open && (
        <div className="absolute z-30 mt-2 w-full bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-xl border border-slate-200/70 dark:border-white/10 py-1.5 max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-5">{q.trim() ? 'No people found.' : 'Type to search…'}</p>
          ) : results.map((p) => (
            <Link key={p.id} href={profileLink(p.username)} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-white/10">
              <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center overflow-hidden flex-shrink-0">
                {p.photo_url ? <img src={p.photo_url} alt="" className="h-full w-full object-cover" /> : <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">{initials(p.full_name)}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{p.full_name || '@' + p.username}</p>
                <p className="text-xs text-slate-400 truncate">@{p.username} · {p.role === 'recruiter' ? 'Recruiter' : 'Candidate'}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
