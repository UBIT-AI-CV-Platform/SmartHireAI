import type { ReactNode } from 'react'
import { Icon } from '@/components/ui/icon'
import Reveal from '@/components/landing/Reveal'

/* ---------- little building blocks for the fake UI mockups ---------- */

function Bar({ className = '' }: { className?: string }) {
  return <div className={`rounded-full bg-black/10 dark:bg-white/15 ${className}`} />
}

function Window({ children, glow }: { children: ReactNode; glow: string }) {
  return (
    <div className="relative">
      <div
        className={`pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-gradient-to-tr ${glow} opacity-70 blur-2xl`}
      />
      <div className="relative overflow-hidden rounded-2xl md:rounded-[1.75rem] border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] shadow-2xl shadow-black/10 transition-transform duration-500 hover:-translate-y-1">
        <div className="flex items-center gap-1.5 border-b border-black/5 dark:border-white/10 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  )
}

/* ---------- one mockup per feature ---------- */

function CVMockup() {
  return (
    <Window glow="from-pink-400/30 to-rose-400/20">
      <div className="flex gap-4">
        <div className="flex-1 space-y-2.5">
          <div className="text-sm font-black text-on-surface">Ayesha Khan</div>
          <Bar className="h-2 w-2/3" />
          <div className="pt-2 space-y-1.5">
            <Bar className="h-2 w-full" />
            <Bar className="h-2 w-11/12" />
            <Bar className="h-2 w-4/5" />
          </div>
          <div className="flex flex-wrap gap-1.5 pt-2">
            {['React', 'Node', 'Figma'].map((s) => (
              <span
                key={s}
                className="rounded-full bg-pink-100 px-2 py-0.5 text-[9px] font-bold text-pink-700 dark:bg-pink-500/15 dark:text-pink-300"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
        <div className="relative h-16 w-16 shrink-0">
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: 'conic-gradient(#ec4899 92%, rgba(120,120,120,0.15) 0)' }}
          />
          <div className="absolute inset-[4px] grid place-items-center rounded-full bg-white dark:bg-[#1c1c1e]">
            <div className="text-center leading-none">
              <div className="text-base font-black text-pink-600 dark:text-pink-300">92</div>
              <div className="text-[7px] font-bold tracking-wider text-on-surface-variant">ATS</div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-pink-50 dark:bg-pink-500/10 px-3 py-2">
        <Icon name="auto_awesome" solid className="text-pink-500 text-sm" />
        <span className="text-[10px] font-semibold text-pink-900/80 dark:text-pink-200/80">
          Add 2 metrics to the “Projects” section
        </span>
      </div>
    </Window>
  )
}

function JobsMockup() {
  const jobs = [
    { c: 'G', t: 'Frontend Engineer', s: 'Google · Remote', m: 94, tone: 'emerald' },
    { c: 'S', t: 'Product Designer', s: 'Stripe · Hybrid', m: 88, tone: 'emerald' },
    { c: 'A', t: 'Data Analyst', s: 'Airbnb · On-site', m: 72, tone: 'amber' },
  ]
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  }
  return (
    <Window glow="from-sky-400/30 to-blue-400/20">
      <div className="space-y-2.5">
        {jobs.map((j) => (
          <div
            key={j.t}
            className="flex items-center gap-3 rounded-xl border border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] p-2.5"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-xs font-black text-white">
              {j.c}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11px] font-bold text-on-surface">{j.t}</div>
              <div className="truncate text-[9px] font-medium text-on-surface-variant">{j.s}</div>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black ${tones[j.tone]}`}>
              {j.m}%
            </span>
          </div>
        ))}
      </div>
    </Window>
  )
}

function CoachMockup() {
  return (
    <Window glow="from-purple-400/30 to-fuchsia-400/20">
      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-purple-100 dark:bg-purple-500/15 px-2.5 py-1">
        <Icon name="psychology" solid className="text-purple-500 text-xs" />
        <span className="text-[9px] font-bold text-purple-700 dark:text-purple-300">
          Mock Interview · Frontend Developer
        </span>
      </div>
      <div className="space-y-2.5">
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-black/[0.04] dark:bg-white/[0.06] px-3 py-2 text-[10px] font-medium text-on-surface">
            Tell me about a challenging project you led.
          </div>
        </div>
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-purple-500 to-fuchsia-500 px-3 py-2 text-[10px] font-medium text-white">
            Sure - during my internship I rebuilt the checkout flow and cut load time by 40%…
          </div>
        </div>
        <div className="flex justify-start">
          <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-black/[0.04] dark:bg-white/[0.06] px-3 py-2.5">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-400 [animation-delay:-0.2s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-400 [animation-delay:-0.1s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-400" />
          </div>
        </div>
      </div>
    </Window>
  )
}

function ScreeningMockup() {
  const rows = [
    { n: 'Ayesha K.', r: 'Senior React Dev', score: 91, v: 'Shortlist', tone: 'emerald' },
    { n: 'Bilal A.', r: 'Full-stack Eng', score: 78, v: 'Maybe', tone: 'amber' },
    { n: 'Sara M.', r: 'Frontend Dev', score: 63, v: 'Pass', tone: 'grey' },
  ]
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    grey: 'bg-black/5 text-on-surface-variant dark:bg-white/10',
  }
  return (
    <Window glow="from-orange-400/30 to-amber-400/20">
      <div className="space-y-2.5">
        {rows.map((r, i) => (
          <div
            key={r.n}
            className="flex items-center gap-3 rounded-xl border border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] p-2.5"
          >
            <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-orange-100 dark:bg-orange-500/15 text-[10px] font-black text-orange-600 dark:text-orange-300">
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11px] font-bold text-on-surface">{r.n}</div>
              <div className="truncate text-[9px] font-medium text-on-surface-variant">{r.r}</div>
            </div>
            <div className="text-right leading-none">
              <div className="text-xs font-black text-orange-600 dark:text-orange-300">{r.score}</div>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black ${tones[r.tone]}`}>
              {r.v}
            </span>
          </div>
        ))}
      </div>
    </Window>
  )
}

function VideoMockup() {
  const tiles = [
    { n: 'You', i: 'Y', from: 'from-teal-500 to-emerald-600' },
    { n: 'Recruiter', i: 'R', from: 'from-sky-500 to-indigo-600' },
  ]
  return (
    <Window glow="from-teal-400/30 to-emerald-400/20">
      <div className="grid grid-cols-2 gap-2">
        {tiles.map((t) => (
          <div
            key={t.n}
            className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-slate-900"
          >
            <div className="absolute inset-0 grid place-items-center">
              <div className={`grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br ${t.from} text-xs font-black text-white`}>
                {t.i}
              </div>
            </div>
            <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/40 px-1.5 py-0.5 text-[8px] font-bold text-white backdrop-blur">
              {t.n}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-center gap-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[9px] font-black text-red-500">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> LIVE 12:04
        </span>
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-black/5 dark:bg-white/10">
            <Icon name="mic" solid className="text-on-surface text-sm" />
          </span>
          <span className="grid h-7 w-7 place-items-center rounded-full bg-black/5 dark:bg-white/10">
            <Icon name="videocam" solid className="text-on-surface text-sm" />
          </span>
          <span className="grid h-7 w-7 place-items-center rounded-full bg-red-500">
            <Icon name="call_end" solid className="text-white text-sm" />
          </span>
        </div>
      </div>
    </Window>
  )
}

function InboxMockup() {
  return (
    <Window glow="from-indigo-400/30 to-violet-400/20">
      <div className="space-y-2.5">
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-black/[0.04] dark:bg-white/[0.06] px-3 py-2 text-[10px] font-medium text-on-surface">
            Hi Ayesha! Loved your portfolio 👏 Are you open to a chat?
          </div>
        </div>
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-indigo-500 to-violet-500 px-3 py-2 text-[10px] font-medium text-white">
            Absolutely - thank you! I’d love to.
          </div>
        </div>
        <div className="rounded-xl border border-indigo-200/60 dark:border-indigo-400/20 bg-indigo-50 dark:bg-indigo-500/10 p-2.5">
          <div className="flex items-center gap-2">
            <Icon name="event" solid className="text-indigo-500 text-sm" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-black text-indigo-900 dark:text-indigo-200">
                Interview · Tomorrow, 3:00 PM
              </div>
              <div className="text-[8px] font-medium text-indigo-700/70 dark:text-indigo-300/70">
                Google Meet · 30 min
              </div>
            </div>
            <span className="rounded-lg bg-indigo-500 px-2 py-1 text-[9px] font-black text-white">Join</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 px-3 py-1.5">
        <span className="text-[9px] font-medium text-on-surface-variant">Type a message…</span>
        <Icon name="send" solid className="ml-auto text-indigo-500 text-sm" />
      </div>
    </Window>
  )
}

/* ---------- feature data ---------- */

const features = [
  {
    id: 1,
    audience: 'For Candidates',
    icon: 'description',
    title: 'AI CV Generator',
    description:
      'Turn your profile into an ATS-optimized resume in seconds - complete with a live score, targeted fixes, and matching cover letters.',
    bullets: ['Live ATS score + fix suggestions', 'PDF & Word export, multiple templates', 'One-click cover letters'],
    theme: {
      chip: 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300',
      icon: 'from-pink-500 to-rose-500',
      check: 'text-pink-500',
    },
    mockup: <CVMockup />,
  },
  {
    id: 2,
    audience: 'For Candidates',
    icon: 'travel_explore',
    title: 'Smart Job Matching',
    description:
      'Discover roles that actually fit. Every job shows a real skill-match score, so you can save, apply, and track everything in one place.',
    bullets: ['Real-time % skill match', 'Save, apply & track applications', 'External web jobs included'],
    theme: {
      chip: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
      icon: 'from-sky-500 to-blue-600',
      check: 'text-sky-500',
    },
    mockup: <JobsMockup />,
  },
  {
    id: 3,
    audience: 'For Candidates',
    icon: 'psychology',
    title: 'AI Interview Coach',
    description:
      'Practice with an AI coach that streams answers in real time, runs full mock interviews, and adapts to the exact role you’re chasing.',
    bullets: ['Live streaming responses', 'Chat or mock-interview mode', 'Tailored to your target role'],
    theme: {
      chip: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
      icon: 'from-purple-500 to-fuchsia-500',
      check: 'text-purple-500',
    },
    mockup: <CoachMockup />,
  },
  {
    id: 4,
    audience: 'For Recruiters',
    icon: 'insights',
    title: 'AI Applicant Screening',
    description:
      'Let AI read every CV for you - ranked shortlists with scores, strengths and concerns, plus ready-made interview kits per candidate.',
    bullets: ['AI-ranked shortlist with scores', 'Strengths, concerns & verdict', 'Auto-generated interview kits'],
    theme: {
      chip: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
      icon: 'from-orange-500 to-amber-500',
      check: 'text-orange-500',
    },
    mockup: <ScreeningMockup />,
  },
  {
    id: 5,
    audience: 'For Everyone',
    icon: 'videocam',
    title: 'Video Interviews & Offers',
    description:
      'Schedule interviews, jump into built-in video calls, and send offers - with automatic reminders and notifications for both sides.',
    bullets: ['Built-in video call room', 'Schedule right from chat', 'Offers, reminders & notifications'],
    theme: {
      chip: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
      icon: 'from-teal-500 to-emerald-600',
      check: 'text-teal-500',
    },
    mockup: <VideoMockup />,
  },
  {
    id: 6,
    audience: 'For Everyone',
    icon: 'forum',
    title: 'Real-Time Inbox',
    description:
      'Recruiters and candidates talk directly in a real-time inbox, with interviews and offers handled right inside the conversation.',
    bullets: ['Instant real-time messaging', 'Interviews & offers inside chat', 'Email notifications on every event'],
    theme: {
      chip: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
      icon: 'from-indigo-500 to-violet-500',
      check: 'text-indigo-500',
    },
    mockup: <InboxMockup />,
  },
]

export default function FeaturesSection() {
  return (
    <section className="bg-surface-container-low/30 py-10 md:py-16 px-4 overflow-hidden" id="features">
      <div className="max-w-6xl mx-auto px-2 md:px-6">
        <div className="text-center mb-10 sm:mb-14 md:mb-20">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-on-surface tracking-tighter mb-2">
            Powerful Features
          </h2>
          <p className="text-primary font-bold text-xs sm:text-sm md:text-base lg:text-lg tracking-tight max-w-2xl mx-auto px-4">
            One platform for candidates and recruiters - from CV to offer
          </p>
        </div>

        <div className="space-y-14 sm:space-y-20 md:space-y-28">
          {features.map((feature, index) => {
            const reverse = index % 2 === 1
            return (
              <div
                key={feature.id}
                className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-14 items-center"
              >
                {/* feature copy */}
                <Reveal
                  from={reverse ? 'right' : 'left'}
                  className={reverse ? 'lg:order-2' : ''}
                >
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] sm:text-xs font-bold ${feature.theme.chip}`}>
                    {feature.audience}
                  </span>
                  <div className="mt-4 flex items-center gap-3">
                    <div className={`grid h-11 w-11 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-xl sm:rounded-2xl bg-gradient-to-br ${feature.theme.icon} shadow-lg`}>
                      <Icon name={feature.icon} solid className="text-white text-xl sm:text-2xl" />
                    </div>
                    <h3 className="text-lg sm:text-xl md:text-2xl lg:text-[1.7rem] font-black text-on-surface tracking-tight">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="mt-3 sm:mt-4 text-sm sm:text-base text-on-surface-variant leading-relaxed font-medium max-w-md">
                    {feature.description}
                  </p>
                  <ul className="mt-4 sm:mt-5 space-y-2">
                    {feature.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2.5">
                        <Icon name="check_circle" solid className={`${feature.theme.check} text-base sm:text-lg shrink-0`} />
                        <span className="text-xs sm:text-sm font-semibold text-on-surface/80">{b}</span>
                      </li>
                    ))}
                  </ul>
                </Reveal>

                {/* interface mockup */}
                <Reveal
                  from={reverse ? 'left' : 'right'}
                  className={reverse ? 'lg:order-1' : ''}
                >
                  {feature.mockup}
                </Reveal>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
