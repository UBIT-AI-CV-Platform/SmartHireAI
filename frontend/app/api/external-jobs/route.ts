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

// ── Adzuna (free app id + key, no card) ──────────────────────────────────────
async function fromAdzuna(q: string, location: string, page: number): Promise<ExtJob[]> {
  const id = process.env.ADZUNA_APP_ID
  const key = process.env.ADZUNA_APP_KEY
  if (!id || !key) return []
  const country = process.env.ADZUNA_COUNTRY || 'us'
  const params = new URLSearchParams({ app_id: id, app_key: key, results_per_page: String(PAGE_SIZE), what: q || 'developer', where: location || '', 'content-type': 'application/json' })
  const res = await fetch(`https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?${params.toString()}`)
  if (!res.ok) return []
  const data = await res.json()
  return ((data?.results ?? []) as Record<string, unknown>[]).map((j, i) => {
    const min = j.salary_min as number | undefined
    const max = j.salary_max as number | undefined
    const salary = min || max ? `${min ? `$${Math.round(min / 1000)}k` : ''}${min && max ? ' – ' : ''}${max ? `$${Math.round(max / 1000)}k` : ''}` : null
    return {
      id: `adzuna-${page}-${(j.id as string) || i}`,
      title: (j.title as string) || 'Job',
      company: ((j.company as { display_name?: string })?.display_name) || '',
      location: ((j.location as { display_name?: string })?.display_name) || '',
      salary,
      source: 'Adzuna',
      url: (j.redirect_url as string) || '#',
      snippet: strip((j.description as string) || ''),
      updated: (j.created as string) || null,
    }
  })
}

// ── Demo fallback (no key needed — realistic sample external jobs) ────────────
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const location = searchParams.get('location') || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))

  try {
    let jobs = await fromJooble(q, location, page)
    let provider = 'jooble'
    if (jobs.length === 0 && page === 1) { jobs = await fromAdzuna(q, location, page); provider = 'adzuna' }
    else if (provider === 'jooble' && jobs.length === 0) { jobs = await fromAdzuna(q, location, page); provider = 'adzuna' }
    if (jobs.length === 0 && page === 1) { jobs = demoFiltered(q, location); provider = 'demo' }
    // hasMore: a provider page came back full → there's likely another page
    const hasMore = provider !== 'demo' && jobs.length >= PAGE_SIZE
    return NextResponse.json({ jobs, provider, page, hasMore })
  } catch {
    return NextResponse.json({ jobs: page === 1 ? demoFiltered(q, location) : [], provider: 'demo', page, hasMore: false })
  }
}
