'use client'

import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { Icon } from '@/components/ui/icon'

type Step = {
  n: number
  icon: string
  title: string
  desc: string
  grad: string
  glow: string
  accent: string
  activeBorder: string
  activeBg: string
  bar: string
}

const steps: Step[] = [
  {
    n: 1,
    icon: 'person_add',
    title: 'Build Your Profile',
    desc: 'Add your skills, experience, education and projects - the foundation every AI feature builds on.',
    grad: 'from-pink-500 to-rose-500',
    glow: 'from-pink-400/30 to-rose-400/20',
    accent: 'text-pink-600 dark:text-pink-300',
    activeBorder: 'border-pink-300 dark:border-pink-400/40',
    activeBg: 'bg-pink-50/80 dark:bg-pink-500/10',
    bar: 'bg-pink-500',
  },
  {
    n: 2,
    icon: 'auto_awesome',
    title: 'Generate Your AI CV',
    desc: 'AI turns your profile into an ATS-optimized CV and cover letter, with a live score and fix suggestions.',
    grad: 'from-sky-500 to-blue-600',
    glow: 'from-sky-400/30 to-blue-400/20',
    accent: 'text-sky-600 dark:text-sky-300',
    activeBorder: 'border-sky-300 dark:border-sky-400/40',
    activeBg: 'bg-sky-50/80 dark:bg-sky-500/10',
    bar: 'bg-sky-500',
  },
  {
    n: 3,
    icon: 'travel_explore',
    title: 'Match & Discover',
    desc: 'Browse internal and external jobs, each showing a real skill-match % so you focus on roles that fit.',
    grad: 'from-orange-500 to-amber-500',
    glow: 'from-orange-400/30 to-amber-400/20',
    accent: 'text-orange-600 dark:text-orange-300',
    activeBorder: 'border-orange-300 dark:border-orange-400/40',
    activeBg: 'bg-orange-50/80 dark:bg-orange-500/10',
    bar: 'bg-orange-500',
  },
  {
    n: 4,
    icon: 'send',
    title: 'Apply in One Click',
    desc: 'Pick a CV - we snapshot it, send it to the recruiter, and email you an instant confirmation.',
    grad: 'from-purple-500 to-fuchsia-500',
    glow: 'from-purple-400/30 to-fuchsia-400/20',
    accent: 'text-purple-600 dark:text-purple-300',
    activeBorder: 'border-purple-300 dark:border-purple-400/40',
    activeBg: 'bg-purple-50/80 dark:bg-purple-500/10',
    bar: 'bg-purple-500',
  },
  {
    n: 5,
    icon: 'videocam',
    title: 'Screen & Interview',
    desc: 'The recruiter’s AI ranks and shortlists you, then schedules a built-in WebRTC video interview.',
    grad: 'from-teal-500 to-emerald-600',
    glow: 'from-teal-400/30 to-emerald-400/20',
    accent: 'text-teal-600 dark:text-teal-300',
    activeBorder: 'border-teal-300 dark:border-teal-400/40',
    activeBg: 'bg-teal-50/80 dark:bg-teal-500/10',
    bar: 'bg-teal-500',
  },
  {
    n: 6,
    icon: 'workspace_premium',
    title: 'Get the Offer',
    desc: 'Accept your offer right inside the chat, stay notified at every step, and land the job. 🎉',
    grad: 'from-indigo-500 to-violet-500',
    glow: 'from-indigo-400/30 to-violet-400/20',
    accent: 'text-indigo-600 dark:text-indigo-300',
    activeBorder: 'border-indigo-300 dark:border-indigo-400/40',
    activeBg: 'bg-indigo-50/80 dark:bg-indigo-500/10',
    bar: 'bg-indigo-500',
  },
]

/* skeleton line */
function Bar({ className = '' }: { className?: string }) {
  return <div className={`rounded-full bg-black/10 dark:bg-white/15 ${className}`} />
}

function grow(width: string): CSSProperties {
  return { ['--hiw-w' as string]: width } as CSSProperties
}

/* ---------- per-step animated preview ---------- */
function StepVisual({ id }: { id: number }) {
  switch (id) {
    /* 1 - Build Profile */
    case 1:
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 shrink-0 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg" />
            <div className="space-y-2">
              <div className="text-sm font-black text-on-surface">Ayesha Khan</div>
              <Bar className="h-2 w-28" />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['React', 'Node.js', 'Figma', 'UI/UX', 'SQL'].map((s) => (
              <span key={s} className="rounded-full bg-pink-100 px-2.5 py-1 text-[10px] font-bold text-pink-700 dark:bg-pink-500/15 dark:text-pink-300">
                {s}
              </span>
            ))}
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold">
              <span className="text-on-surface-variant">Profile strength</span>
              <span className="text-pink-600 dark:text-pink-300">80%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
              <div className="hiw-grow h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-500" style={grow('80%')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            {[{ i: 'school', t: 'Education' }, { i: 'work', t: 'Projects' }].map((c) => (
              <div key={c.t} className="flex items-center gap-2 rounded-xl border border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] px-2.5 py-2">
                <Icon name={c.i} solid className="text-pink-500 text-base" />
                <span className="text-[10px] font-bold text-on-surface">{c.t}</span>
              </div>
            ))}
          </div>
        </div>
      )

    /* 2 - AI CV */
    case 2:
      return (
        <div className="flex gap-4">
          <div className="flex-1 space-y-2.5">
            <div className="text-sm font-black text-on-surface">Ayesha Khan</div>
            <Bar className="h-2 w-2/3" />
            <div className="space-y-1.5 pt-2">
              <Bar className="h-2 w-full" />
              <Bar className="h-2 w-11/12" />
              <Bar className="h-2 w-4/5" />
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 dark:bg-sky-500/10">
              <Icon name="auto_awesome" solid className="text-sky-500 text-sm" />
              <span className="text-[10px] font-semibold text-sky-900/80 dark:text-sky-200/80">Add 2 metrics to “Projects”</span>
            </div>
          </div>
          <div className="relative h-16 w-16 shrink-0 hiw-float">
            <div className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(#0ea5e9 92%, rgba(120,120,120,0.15) 0)' }} />
            <div className="absolute inset-[4px] grid place-items-center rounded-full bg-white dark:bg-[#1c1c1e]">
              <div className="text-center leading-none">
                <div className="text-base font-black text-sky-600 dark:text-sky-300">92</div>
                <div className="text-[7px] font-bold tracking-wider text-on-surface-variant">ATS</div>
              </div>
            </div>
          </div>
        </div>
      )

    /* 3 - Match & Discover */
    case 3: {
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
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 px-3 py-2">
            <Icon name="search" className="text-on-surface-variant text-sm" />
            <span className="text-[10px] font-medium text-on-surface-variant">Frontend · Karachi</span>
          </div>
          {jobs.map((j) => (
            <div key={j.t} className="flex items-center gap-3 rounded-xl border border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] p-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-xs font-black text-white">{j.c}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-bold text-on-surface">{j.t}</div>
                <div className="truncate text-[9px] font-medium text-on-surface-variant">{j.s}</div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black ${tones[j.tone]}`}>{j.m}%</span>
            </div>
          ))}
        </div>
      )
    }

    /* 4 - Apply */
    case 4:
      return (
        <div className="flex flex-col items-center text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 shadow-xl hiw-float">
            <Icon name="check" className="text-white text-3xl" />
          </div>
          <div className="mt-4 text-base font-black text-on-surface">Application sent!</div>
          <div className="mt-1 text-[11px] font-medium text-on-surface-variant">Frontend Engineer · Google</div>
          <div className="mt-4 w-full space-y-2">
            {[
              { i: 'description', t: 'CV snapshot attached' },
              { i: 'mark_email_read', t: 'Confirmation emailed to you' },
              { i: 'hourglass_top', t: 'Status: Applied' },
            ].map((r) => (
              <div key={r.t} className="flex items-center gap-2.5 rounded-xl border border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] px-3 py-2">
                <Icon name={r.i} solid className="text-purple-500 text-base" />
                <span className="text-[11px] font-semibold text-on-surface">{r.t}</span>
                <Icon name="check_circle" solid className="ml-auto text-emerald-500 text-base" />
              </div>
            ))}
          </div>
        </div>
      )

    /* 5 - Screen & Interview */
    case 5: {
      const ranked = [
        { n: 'You', s: 91, v: 'Shortlist', me: true },
        { n: 'Bilal A.', s: 78, v: 'Maybe', me: false },
        { n: 'Sara M.', s: 63, v: 'Pass', me: false },
      ]
      return (
        <div className="space-y-3">
          {ranked.map((r, i) => (
            <div key={r.n} className={`flex items-center gap-3 rounded-xl border p-2.5 ${r.me ? 'border-teal-300 bg-teal-50/80 dark:border-teal-400/40 dark:bg-teal-500/10' : 'border-black/5 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]'}`}>
              <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-teal-100 text-[10px] font-black text-teal-600 dark:bg-teal-500/15 dark:text-teal-300">{i + 1}</div>
              <span className="flex-1 truncate text-[11px] font-bold text-on-surface">{r.n}</span>
              <span className="text-xs font-black text-teal-600 dark:text-teal-300">{r.s}</span>
              <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[9px] font-black text-on-surface-variant dark:bg-white/10">{r.v}</span>
            </div>
          ))}
          <div className="flex items-center gap-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 px-3 py-2.5 text-white shadow-lg">
            <Icon name="videocam" solid className="text-lg" />
            <div className="flex-1">
              <div className="text-[11px] font-black">Interview scheduled</div>
              <div className="text-[9px] font-medium text-white/80">Tue, 3:00 PM · Video room</div>
            </div>
            <span className="rounded-lg bg-white/20 px-2 py-1 text-[9px] font-black backdrop-blur">Join</span>
          </div>
        </div>
      )
    }

    /* 6 - Offer */
    case 6:
      return (
        <div className="relative flex flex-col items-center text-center">
          {/* confetti dots */}
          {[
            'left-4 top-2 bg-pink-400', 'right-6 top-4 bg-sky-400', 'left-10 top-10 bg-amber-400',
            'right-10 top-12 bg-emerald-400', 'left-20 top-1 bg-violet-400', 'right-20 top-8 bg-rose-400',
          ].map((c, i) => (
            <span key={i} className={`absolute h-1.5 w-1.5 rounded-full ${c} hiw-float`} style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-xl hiw-float">
            <Icon name="workspace_premium" solid className="text-white text-3xl" />
          </div>
          <div className="mt-4 text-lg font-black text-on-surface">You’re hired! 🎉</div>
          <div className="mt-1 text-[11px] font-medium text-on-surface-variant">Offer from Google · Frontend Engineer</div>
          <div className="mt-4 w-full rounded-2xl border border-indigo-200/70 bg-indigo-50/80 p-3 dark:border-indigo-400/20 dark:bg-indigo-500/10">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-on-surface-variant">Annual salary</span>
              <span className="font-black text-indigo-600 dark:text-indigo-300">Competitive</span>
            </div>
            <button className="mt-3 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 py-2 text-xs font-black text-white shadow-lg">
              Accept offer
            </button>
          </div>
        </div>
      )

    default:
      return null
  }
}

export default function HowItWorks() {
  const [active, setActive] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)

  // auto-advance progress for the active step (~2.5s per step)
  useEffect(() => {
    if (paused) return
    const id = setInterval(() => setProgress((p) => Math.min(100, p + 4)), 100)
    return () => clearInterval(id)
  }, [paused, active])

  // when the bar fills, move to the next step
  useEffect(() => {
    if (progress >= 100) {
      setProgress(0)
      setActive((a) => (a + 1) % steps.length)
    }
  }, [progress])

  const select = (i: number) => {
    setActive(i)
    setProgress(0)
  }

  const current = steps[active]

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-16" id="how-it-works">
      <div className="text-center mb-8 sm:mb-12 md:mb-14">
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-on-surface tracking-tighter mb-2">
          How It Works
        </h2>
        <p className="text-primary font-bold text-xs sm:text-sm md:text-base lg:text-lg tracking-tight max-w-2xl mx-auto px-4">
          From profile to offer - your whole journey in one flow
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 lg:gap-12 items-center">
        {/* ---- step list ---- */}
        <div className="order-2 lg:order-1 space-y-2.5">
          {steps.map((s, i) => {
            const isActive = i === active
            return (
              <button
                key={s.n}
                type="button"
                onClick={() => select(i)}
                onMouseEnter={() => { if (isActive) setPaused(true) }}
                onMouseLeave={() => setPaused(false)}
                aria-current={isActive}
                className={`w-full text-left rounded-2xl border p-3.5 sm:p-4 transition-all duration-300 ${
                  isActive
                    ? `${s.activeBorder} ${s.activeBg} shadow-md`
                    : 'border-black/5 dark:border-white/10 hover:border-black/10 dark:hover:border-white/20 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`grid h-11 w-11 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-xl sm:rounded-2xl transition-all duration-300 ${
                      isActive
                        ? `bg-gradient-to-br ${s.grad} shadow-lg`
                        : 'bg-black/5 dark:bg-white/[0.06]'
                    }`}
                  >
                    <Icon name={s.icon} solid className={isActive ? 'text-white text-xl sm:text-2xl' : 'text-on-surface-variant text-xl sm:text-2xl'} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black ${isActive ? s.accent : 'text-on-surface-variant/60'}`}>
                        STEP {s.n}
                      </span>
                    </div>
                    <h4 className={`text-sm sm:text-base font-extrabold tracking-tight ${isActive ? 'text-on-surface' : 'text-on-surface/70'}`}>
                      {s.title}
                    </h4>
                  </div>
                  <Icon
                    name="chevron_right"
                    className={`shrink-0 text-lg transition-transform duration-300 ${isActive ? `${s.accent} translate-x-0` : 'text-on-surface-variant/40 -translate-x-1'}`}
                  />
                </div>

                {/* expanded detail + progress on the active step */}
                <div className={`grid transition-all duration-300 ${isActive ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <p className="text-xs sm:text-[13px] text-on-surface-variant font-medium leading-relaxed pl-[3.6rem] pr-2">
                      {s.desc}
                    </p>
                    <div className="mt-3 ml-[3.6rem] mr-2 h-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                      <div
                        className={`h-full rounded-full ${s.bar} transition-[width] duration-100 ease-linear`}
                        style={{ width: `${isActive ? progress : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* ---- animated preview ---- */}
        <div className="order-1 lg:order-2">
          <div className="relative">
            <div className={`pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-gradient-to-tr ${current.glow} opacity-70 blur-2xl transition-all duration-700`} />
            <div className="relative overflow-hidden rounded-2xl md:rounded-[1.75rem] border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] shadow-2xl shadow-black/10">
              {/* window bar */}
              <div className="flex items-center gap-1.5 border-b border-black/5 dark:border-white/10 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                <div className="ml-3 flex items-center gap-1.5 rounded-full border border-black/10 dark:border-white/10 px-2.5 py-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[9px] font-semibold tracking-tight text-on-surface-variant">smarthire.ai</span>
                </div>
              </div>
              {/* body - remounts per step for the reveal animation */}
              <div key={active} className="hiw-reveal p-4 sm:p-6 min-h-[280px] sm:min-h-[320px] flex flex-col justify-center">
                <StepVisual id={current.n} />
              </div>
            </div>
          </div>

          {/* dots */}
          <div className="mt-5 flex items-center justify-center gap-2">
            {steps.map((s, i) => (
              <button
                key={s.n}
                type="button"
                onClick={() => select(i)}
                aria-label={`Go to step ${s.n}`}
                className={`h-2 rounded-full transition-all duration-300 ${i === active ? `w-6 ${s.bar}` : 'w-2 bg-black/15 dark:bg-white/20 hover:bg-black/25'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
