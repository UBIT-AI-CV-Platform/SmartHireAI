import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

const PAGE_SIZE = 30

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

const strip = (html: string) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

// ── Jooble (free key; results carry the originating board in `source`) ───────
async function fromJooble(q: string, location: string, page: number): Promise<ExtJob[]> {
  const key = process.env.JOOBLE_API_KEY
  if (!key) return []
  const res = await fetch(`https://jooble.org/api/${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keywords: q || 'developer', location: location || '', page: String(page), ResultOnPage: PAGE_SIZE }),
  })
  if (!res.ok) return []
  const data = await res.json()
  return ((data?.jobs ?? []) as Record<string, string>[]).map((j, i) => ({
    id: `jooble-${page}-${j.id || i}`,
    title: j.title || 'Job',
    company: j.company || '',
    location: j.location || '',
    salary: j.salary || null,
    source: j.source || 'Jooble',
    url: j.link || '#',
    snippet: strip(j.snippet || ''),
    updated: j.updated || null,
  }))
}

// ── Demo fallback (no key needed - realistic sample external jobs) ────────────
const DEMO: ExtJob[] = [
  { id: 'demo-1', title: 'Senior Frontend Engineer', company: 'Stripe', location: 'Remote', salary: '$140k – $190k', source: 'LinkedIn', url: 'https://www.linkedin.com/jobs/', snippet: 'Build delightful, high-performance UIs with React and TypeScript for millions of users.', updated: null },
  { id: 'demo-2', title: 'Backend Developer (Node.js)', company: 'Shopify', location: 'Remote', salary: '$120k – $160k', source: 'Indeed', url: 'https://www.indeed.com/', snippet: 'Design scalable APIs and services powering commerce for millions of merchants.', updated: null },
  { id: 'demo-3', title: 'Full Stack Engineer', company: 'Atlassian', location: 'Austin, TX', salary: '$130k – $175k', source: 'Glassdoor', url: 'https://www.glassdoor.com/Job/index.htm', snippet: 'Work across the stack on collaboration tools used by teams worldwide.', updated: null },
  { id: 'demo-4', title: 'Product Designer', company: 'Figma', location: 'Remote', salary: '$110k – $150k', source: 'LinkedIn', url: 'https://www.linkedin.com/jobs/', snippet: 'Shape intuitive design experiences for the tools designers love.', updated: null },
  { id: 'demo-5', title: 'Data Scientist', company: 'Spotify', location: 'New York, NY', salary: '$125k – $170k', source: 'Indeed', url: 'https://www.indeed.com/', snippet: 'Turn listening data into models that personalize music for everyone.', updated: null },
  { id: 'demo-6', title: 'DevOps Engineer', company: 'Datadog', location: 'Remote', salary: '$135k – $180k', source: 'Glassdoor', url: 'https://www.glassdoor.com/Job/index.htm', snippet: 'Own reliability and CI/CD for a large-scale observability platform.', updated: null },
  { id: 'demo-7', title: 'Mobile Engineer (React Native)', company: 'Coinbase', location: 'Remote', salary: '$130k – $165k', source: 'LinkedIn', url: 'https://www.linkedin.com/jobs/', snippet: 'Ship secure, fast mobile experiences for millions of crypto users.', updated: null },
  { id: 'demo-8', title: 'Machine Learning Engineer', company: 'OpenAI', location: 'San Francisco, CA', salary: '$160k – $220k', source: 'Indeed', url: 'https://www.indeed.com/', snippet: 'Train and deploy state-of-the-art models into production systems.', updated: null },
  { id: 'demo-9', title: 'QA Automation Engineer', company: 'Airbnb', location: 'Remote', salary: '$110k – $145k', source: 'Glassdoor', url: 'https://www.glassdoor.com/Job/index.htm', snippet: 'Build robust automated test suites to keep releases rock solid.', updated: null },
  { id: 'demo-10', title: 'Cloud Architect', company: 'Microsoft', location: 'Redmond, WA', salary: '$150k – $200k', source: 'LinkedIn', url: 'https://www.linkedin.com/jobs/', snippet: 'Design secure, scalable cloud solutions on Azure for enterprise clients.', updated: null },
  { id: 'demo-11', title: 'UX Researcher', company: 'Google', location: 'Remote', salary: '$120k – $160k', source: 'Indeed', url: 'https://www.indeed.com/', snippet: 'Run studies that shape product direction across Google surfaces.', updated: null },
  { id: 'demo-12', title: 'Cybersecurity Analyst', company: 'Cloudflare', location: 'Remote', salary: '$115k – $155k', source: 'Glassdoor', url: 'https://www.glassdoor.com/Job/index.htm', snippet: 'Monitor, detect, and respond to threats across global infrastructure.', updated: null },
]

function demoFiltered(q: string, location: string): ExtJob[] {
  const k = q.toLowerCase().trim()
  const l = location.toLowerCase().trim()
  return DEMO.filter((j) =>
    (!k || j.title.toLowerCase().includes(k) || j.company.toLowerCase().includes(k) || j.snippet.toLowerCase().includes(k)) &&
    (!l || j.location.toLowerCase().includes(l))
  )
}

// ── Cache ────────────────────────────────────────────────────────────────────
// Job boards change on the order of hours, but a user re-hits this route on every
// search. Without a cache each one burned a Jooble call (a rate-limited free tier)
// and cost the user a 1-2s wait.
//
// Two layers:
//   1. This in-process Map - absorbs repeats hitting the same warm instance.
//   2. The Cache-Control header - lets Vercel's CDN serve the response outright,
//      so repeats never even reach our function. stale-while-revalidate means a
//      slightly-stale hit is served instantly while a fresh one is fetched behind it.
const TTL_MS = 10 * 60 * 1000
const MAX_ENTRIES = 200

type Payload = { jobs: ExtJob[]; provider: string; page: number; hasMore: boolean }
const cache = new Map<string, { at: number; payload: Payload }>()

function cacheGet(key: string): Payload | null {
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() - hit.at > TTL_MS) {
    cache.delete(key)
    return null
  }
  // refresh recency for the LRU eviction below
  cache.delete(key)
  cache.set(key, hit)
  return hit.payload
}

function cacheSet(key: string, payload: Payload) {
  if (cache.size >= MAX_ENTRIES) {
    // Map preserves insertion order, so the first key is the least recently used.
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(key, { at: Date.now(), payload })
}

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800',
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const location = searchParams.get('location') || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))

  const key = `${q.toLowerCase().trim()}|${location.toLowerCase().trim()}|${page}`
  const cached = cacheGet(key)
  if (cached) {
    return NextResponse.json(cached, { headers: { ...CACHE_HEADERS, 'X-Cache': 'HIT' } })
  }

  try {
    // Live listings come from Jooble. If it has nothing for this query (or no key is
    // configured), the first page falls back to the sample set - which the UI labels
    // as sample results, so it never passes them off as real listings.
    let jobs = await fromJooble(q, location, page)
    let provider = 'jooble'
    if (jobs.length === 0 && page === 1) {
      jobs = demoFiltered(q, location)
      provider = 'demo'
    }
    // hasMore: a provider page came back full → there's likely another page
    const hasMore = provider !== 'demo' && jobs.length >= PAGE_SIZE

    const payload: Payload = { jobs, provider, page, hasMore }
    cacheSet(key, payload)
    return NextResponse.json(payload, { headers: { ...CACHE_HEADERS, 'X-Cache': 'MISS' } })
  } catch {
    // Don't cache failures - the next request should get a real attempt.
    return NextResponse.json({ jobs: page === 1 ? demoFiltered(q, location) : [], provider: 'demo', page, hasMore: false })
  }
}
