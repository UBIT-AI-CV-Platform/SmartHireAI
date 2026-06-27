'use client'

import { useEffect, useMemo, useState } from 'react'

type ExtJob = {
  id: string
  title: string
  company: string
  location: string
  salary: string | null
  source: string
  url: string
  snippet: string
  updated: string | null
}

const SOURCE_STYLE: Record<string, string> = {
  LinkedIn: 'bg-[#0a66c2]/10 text-[#0a66c2]',
  Indeed: 'bg-[#2557a7]/10 text-[#2557a7]',
  Glassdoor: 'bg-[#0caa41]/10 text-[#0caa41]',
}
const sourceCls = (s: string) => SOURCE_STYLE[s] || 'bg-surface-container text-on-surface-variant'

const AVATAR = ['bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300', 'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300', 'bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300', 'bg-pink-100 dark:bg-pink-500/15 text-pink-700 dark:text-pink-300', 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300']
const avatarColor = (s: string) => AVATAR[Array.from(s || '?').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR.length]

export default function ExternalJobs({ defaultQuery = '' }: { defaultQuery?: string }) {
  const [query, setQuery] = useState(defaultQuery)
  const [location, setLocation] = useState('')
  const [jobs, setJobs] = useState<ExtJob[]>([])
  const [provider, setProvider] = useState<string>('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)       // first page / new search
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [source, setSource] = useState('All')
  const [searched, setSearched] = useState(false)

  const fetchJobs = async (q: string, loc: string, nextPage: number, append: boolean) => {
    if (append) setLoadingMore(true)
    else { setLoading(true); setSource('All') }
    setError(false); setSearched(true)
    try {
      const res = await fetch(`/api/external-jobs?q=${encodeURIComponent(q)}&location=${encodeURIComponent(loc)}&page=${nextPage}`)
      const data = await res.json()
      if (!res.ok) { setError(true) }
      else {
        const incoming = (data.jobs as ExtJob[]) ?? []
        setJobs((prev) => {
          if (!append) return incoming
          const seen = new Set(prev.map((j) => j.id))
          return [...prev, ...incoming.filter((j) => !seen.has(j.id))]
        })
        setProvider(data.provider || '')
        setPage(data.page || nextPage)
        setHasMore(!!data.hasMore)
      }
    } catch {
      setError(true)
    }
    setLoading(false); setLoadingMore(false)
  }

  // Initial load
  useEffect(() => { fetchJobs(defaultQuery, '', 1, false) }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const search = () => fetchJobs(query, location, 1, false)
  const loadMore = () => fetchJobs(query, location, page + 1, true)

  const sources = useMemo(() => ['All', ...Array.from(new Set(jobs.map((j) => j.source).filter(Boolean)))], [jobs])
  const filteredJobs = useMemo(() => (source === 'All' ? jobs : jobs.filter((j) => (j.source || '').toLowerCase().includes(source.toLowerCase()))), [jobs, source])

  return (
    <div>
      {/* Search */}
      <div className="bg-white dark:bg-[#2c2c2e] p-3 md:p-4 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container mb-5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="Search jobs on LinkedIn, Indeed, Glassdoor…" className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white dark:focus:bg-[#2c2c2e] transition-all text-on-surface font-medium placeholder:text-outline-variant outline-none" />
          </div>
          <div className="relative sm:w-52">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">location_on</span>
            <input value={location} onChange={(e) => setLocation(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="Location" className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white dark:focus:bg-[#2c2c2e] transition-all text-on-surface font-medium placeholder:text-outline-variant outline-none" />
          </div>
          <button onClick={search} disabled={loading} className="px-6 py-3 rounded-2xl premium-gradient text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] transition-all disabled:opacity-60">
            <span className="material-symbols-outlined text-base">{loading ? 'hourglass_top' : 'travel_explore'}</span>Search
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {sources.map((f) => (
            <button key={f} onClick={() => setSource(f)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${source === f ? 'bg-primary text-white shadow' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}>{f}</button>
          ))}
          {provider === 'demo' && (
            <span className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/15 px-2.5 py-1 rounded-lg">
              <span className="material-symbols-outlined text-sm">info</span>Demo results — add a free API key for live jobs
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce"></div>
            <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
            <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
          </div>
          <p className="text-xs font-black text-primary tracking-widest uppercase">Searching the web...</p>
        </div>
      ) : error ? (
        <div className="bg-white dark:bg-[#2c2c2e] rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container p-10 md:p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/15 flex items-center justify-center text-red-500 dark:text-red-300 mb-5"><span className="material-symbols-outlined text-3xl">cloud_off</span></div>
          <h2 className="text-lg md:text-xl font-bold text-on-surface mb-2">Couldn’t fetch external jobs</h2>
          <p className="text-sm text-on-surface-variant max-w-md mb-4">Something went wrong. Please try again.</p>
          <button onClick={search} className="px-5 py-2.5 rounded-xl premium-gradient text-white font-bold text-sm flex items-center gap-2"><span className="material-symbols-outlined text-base">refresh</span>Retry</button>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white dark:bg-[#2c2c2e] rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container p-10 md:p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-5"><span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>travel_explore</span></div>
          <h2 className="text-lg md:text-xl font-bold text-on-surface mb-2">{searched ? 'No jobs found' : 'Search external job boards'}</h2>
          <p className="text-sm text-on-surface-variant max-w-md">{searched ? 'Try a different search term, location, or source filter.' : 'Find roles from LinkedIn, Indeed, and Glassdoor — apply directly on the source site.'}</p>
        </div>
      ) : (
        <>
          <p className="text-sm font-bold text-on-surface-variant mb-3 px-1">Showing {filteredJobs.length} job{filteredJobs.length === 1 ? '' : 's'} from the web</p>
          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <div key={job.id} className="bg-white dark:bg-[#2c2c2e] p-4 md:p-5 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container flex flex-col hover:shadow-[0_12px_40px_-8px_rgba(25,28,30,0.14)] hover:-translate-y-0.5 transition-all">
                <div className="flex gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-black ${avatarColor(job.company)}`}>{(job.company || '?').charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-base font-bold text-on-surface truncate">{job.title}</h4>
                        <p className="text-on-surface-variant text-sm truncate">{job.company}{job.location ? ` • ${job.location}` : ''}</p>
                      </div>
                      <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg flex-shrink-0 ${sourceCls(job.source)}`}>{job.source}</span>
                    </div>
                  </div>
                </div>
                {job.snippet && <p className="text-sm text-on-surface-variant mt-3 line-clamp-2">{job.snippet}</p>}
                <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-surface-container">
                  {job.salary ? <span className="px-3 py-1 bg-green-50 dark:bg-green-500/15 text-green-700 dark:text-green-300 text-xs font-semibold rounded-lg">{job.salary}</span> : <span className="text-xs text-outline">via {job.source}</span>}
                  <a href={job.url} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 rounded-xl premium-gradient text-white font-bold text-sm flex items-center gap-1.5 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                    Apply<span className="material-symbols-outlined text-base">open_in_new</span>
                  </a>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-6">
              <button onClick={loadMore} disabled={loadingMore} className="px-6 py-3 rounded-2xl bg-white dark:bg-[#2c2c2e] border border-surface-container text-on-surface font-bold text-sm flex items-center gap-2 hover:shadow-lg hover:border-primary/40 transition-all disabled:opacity-60">
                <span className={`material-symbols-outlined text-base ${loadingMore ? 'animate-spin' : ''}`}>{loadingMore ? 'progress_activity' : 'expand_more'}</span>
                {loadingMore ? 'Loading more…' : 'Load more jobs'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
