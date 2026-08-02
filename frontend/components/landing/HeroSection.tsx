'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/ui/icon'

const PHRASES = ['Get Matched', 'Get Noticed', 'Get Hired', 'Get Ahead']

function Bar({ className = '' }: { className?: string }) {
  return <div className={`rounded-full bg-black/10 dark:bg-white/15 ${className}`} />
}

/* the cycling app-screen inside the circle */
function Screen({ i }: { i: number }) {
  switch (i) {
    case 0: // AI CV
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-black text-on-surface">AI CV Builder</span>
            <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-black text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">92 ATS</span>
          </div>
          <Bar className="h-2.5 w-full" />
          <Bar className="h-2.5 w-11/12" />
          <Bar className="h-2.5 w-4/5" />
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {['React', 'Node', 'UI/UX'].map((s) => (
              <span key={s} className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">{s}</span>
            ))}
          </div>
          <button className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-xs font-black text-white shadow-lg">
            <Icon name="auto_awesome" solid className="text-xs" /> Generate CV
          </button>
        </div>
      )
    case 1: // Job matches
      return (
        <div className="space-y-2.5">
          <span className="text-sm font-black text-on-surface">Top Matches</span>
          {[{ c: 'G', t: 'Frontend Engineer', s: 'Google', m: 94 }, { c: 'S', t: 'Product Designer', s: 'Stripe', m: 88 }].map((j) => (
            <div key={j.t} className="flex items-center gap-2.5 rounded-xl border border-black/5 bg-black/[0.02] p-2.5 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-xs font-black text-white">{j.c}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold text-on-surface">{j.t}</div>
                <div className="truncate text-[10px] font-medium text-on-surface-variant">{j.s}</div>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">{j.m}%</span>
            </div>
          ))}
        </div>
      )
    case 2: // Live interview
      return (
        <div className="space-y-3">
          <span className="text-sm font-black text-on-surface">Live Interview</span>
          <div className="grid grid-cols-2 gap-2">
            {[{ i: 'A', g: 'from-teal-500 to-emerald-600' }, { i: 'R', g: 'from-sky-500 to-indigo-600' }].map((t) => (
              <div key={t.i} className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-xl bg-slate-800">
                <div className={`grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br ${t.g} text-xs font-black text-white`}>{t.i}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2.5 pt-0.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-black/5 dark:bg-white/10"><Icon name="mic" solid className="text-on-surface text-sm" /></span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-black/5 dark:bg-white/10"><Icon name="videocam" solid className="text-on-surface text-sm" /></span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-red-500"><Icon name="call_end" solid className="text-white text-sm" /></span>
          </div>
        </div>
      )
    default: // Offer
      return (
        <div className="flex flex-col items-center py-2 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg">
            <Icon name="workspace_premium" solid className="text-white text-2xl" />
          </div>
          <div className="mt-3 text-lg font-black text-on-surface">You&apos;re hired! 🎉</div>
          <div className="text-[11px] font-medium text-on-surface-variant">Frontend Engineer · Google</div>
          <button className="mt-3 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-xs font-black text-white shadow-lg">Accept offer</button>
        </div>
      )
  }
}

/* the full circular visual (rendered on desktop + mobile) */
function CircleVisual({ screen }: { screen: number }) {
  return (
    <div className="relative h-full w-full">
      {/* big gradient circle */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-400 via-purple-500 to-fuchsia-500 shadow-2xl shadow-purple-500/30" />
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/25 to-transparent" />

      {/* rotating dashed ring with orbiting dots */}
      <div className="hero-orbit absolute inset-[6%] rounded-full border-2 border-dashed border-white/40">
        <span className="absolute left-1/2 top-0 -ml-2 -mt-2 h-4 w-4 rounded-full bg-amber-300 shadow-lg" />
        <span className="absolute right-0 top-1/2 -mr-2 -mt-2 h-3.5 w-3.5 rounded-full bg-teal-300 shadow-lg" />
        <span className="absolute bottom-[8%] left-[12%] h-3 w-3 rounded-full bg-pink-300 shadow-lg" />
      </div>

      {/* centered cycling app screen */}
      <div className="absolute inset-0 grid place-items-center p-[8%]">
        <div className="w-full max-w-[240px] rounded-[1.4rem] border border-black/5 bg-white p-3 shadow-2xl dark:border-white/10 dark:bg-[#1c1c1e] sm:max-w-[320px] sm:p-4">
          <div className="mb-2.5 flex gap-1.5 sm:mb-3">
            <span className="h-2 w-2 rounded-full bg-red-400/70" />
            <span className="h-2 w-2 rounded-full bg-amber-400/70" />
            <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
          </div>
          <div key={screen} className="hiw-reveal min-h-[168px] sm:min-h-[172px]">
            <Screen i={screen} />
          </div>
        </div>
      </div>

      {/* Floating pills hang off the circle's left edge. The circle bleeds past
          the right edge at every breakpoint, so there is always room on its left. */}
      <div className="absolute left-[-5%] top-[16%] flex items-center gap-1.5 rounded-full border border-black/5 bg-white px-2.5 py-1.5 shadow-xl about-float dark:border-white/10 dark:bg-[#2c2c2e] sm:px-3 sm:py-2">
        <Icon name="trending_up" solid className="text-emerald-500 text-sm" />
        <span className="text-[10px] font-black text-on-surface sm:text-[11px]">94% Match</span>
      </div>

      <div className="absolute bottom-[14%] left-[-7%] flex items-center gap-1.5 rounded-full border border-black/5 bg-white px-2.5 py-1.5 shadow-xl about-float-alt dark:border-white/10 dark:bg-[#2c2c2e] sm:px-3 sm:py-2">
        <Icon name="location_on" solid className="text-rose-500 text-sm sm:text-base" />
        <span className="text-[10px] font-black text-on-surface sm:text-[11px]">Remote · Karachi</span>
      </div>

      {/* Pulled further in than the desktop 2% so it clears the right-edge bleed
          instead of being sliced in half by the viewport. */}
      <div className="absolute right-[14%] top-[2%] grid h-9 w-9 place-items-center rounded-xl border border-black/5 bg-white shadow-xl hiw-float dark:border-white/10 dark:bg-[#2c2c2e] sm:h-11 sm:w-11 sm:rounded-2xl xl:right-[2%]">
        <Icon name="notifications" solid className="text-purple-500 text-lg sm:text-xl" />
      </div>
    </div>
  )
}

type RoleKey = 'candidate' | 'recruiter'

const ROLES: { key: RoleKey; label: string; icon: string; blurb: string }[] = [
  { key: 'candidate', label: 'Candidate', icon: 'person', blurb: 'Find my next job' },
  { key: 'recruiter', label: 'Recruiter', icon: 'work', blurb: 'Hire top talent' },
]

export default function HeroSection() {
  const [wi, setWi] = useState(0)
  const [role, setRole] = useState<RoleKey>('candidate')
  const [roleOpen, setRoleOpen] = useState(false)
  const roleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = setInterval(() => setWi((w) => (w + 1) % PHRASES.length), 2600)
    return () => clearInterval(id)
  }, [])

  // Close the role dropdown on an outside click or Escape
  useEffect(() => {
    if (!roleOpen) return
    const onDown = (e: MouseEvent) => {
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) setRoleOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setRoleOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [roleOpen])

  const isCand = role === 'candidate'

  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden pt-20 sm:pt-24 lg:block lg:pb-12">
      {/* Desktop circle - bleeds off the right edge of the page. The bleed is
          smaller at lg (iPad landscape), where 44vw leaves the circle too small
          for a 16% bleed to clear the screen inside it. */}
      <div className="pointer-events-none absolute right-0 top-1/2 hidden aspect-square w-[44vw] max-w-[600px] -translate-y-1/2 translate-x-[8%] lg:block xl:translate-x-[16%]">
        <div className="hero-enter-right h-full w-full">
          <CircleVisual screen={wi} />
        </div>
      </div>

      {/* Copy. On phones/tablets it fills the top half of the screen; on desktop
          it goes back to being a vertically-centred 52% column. */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-4 sm:px-6 lg:min-h-[calc(100svh-9rem)]">
        <div className="w-full text-left lg:w-[52%]">
          <span style={{ animationDelay: '0.05s' }} className="auth-fade-up inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-[11px] font-bold text-white shadow-lg shadow-indigo-500/30 sm:text-xs">
            AI-Powered Hiring
            <span className="text-sm">✨</span>
          </span>

          <h1 style={{ animationDelay: '0.15s' }} className="auth-fade-up font-heading mt-4 text-[2.6rem] font-black leading-[1.05] tracking-tighter text-on-surface sm:mt-5 sm:text-6xl md:text-7xl lg:text-6xl xl:text-7xl">
            Smart Recruitment,
            <br />
            <span key={wi} className="hiw-reveal inline-block bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
              {PHRASES[wi]}
            </span>
          </h1>

          <p style={{ animationDelay: '0.25s' }} className="auth-fade-up mt-5 max-w-lg text-sm leading-relaxed text-on-surface-variant sm:text-base md:max-w-xl md:text-lg">
            AI-optimized CVs, real job matches, mock interviews, and a professional network that gets you noticed - the whole hiring journey in one place.
          </p>

          {/* Action bar with a role dropdown. Below `sm` the three cells stack into
              a card so nothing has to truncate; from `sm` up it's the one-line bar. */}
          <div style={{ animationDelay: '0.35s' }} className="auth-fade-up mt-6 flex max-w-xl flex-col gap-1.5 rounded-2xl border border-black/5 bg-white/90 p-2 shadow-xl backdrop-blur dark:border-white/10 dark:bg-[#232325]/90 sm:mt-8 sm:flex-row sm:items-center">
            <div ref={roleRef} className="relative w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setRoleOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={roleOpen}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06] sm:w-auto"
              >
                <Icon name={isCand ? 'person' : 'work'} solid className="shrink-0 text-xl text-indigo-500" />
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">I&apos;m a</div>
                  <div className="flex items-center gap-0.5 text-sm font-black text-on-surface">
                    {isCand ? 'Candidate' : 'Recruiter'}
                    <Icon
                      name="expand_more"
                      className={`text-base text-on-surface-variant transition-transform ${roleOpen ? 'rotate-180' : ''}`}
                    />
                  </div>
                </div>
              </button>

              {roleOpen && (
                <div
                  role="listbox"
                  className="absolute left-0 top-full z-30 mt-2 w-full min-w-[13rem] overflow-hidden rounded-xl border border-black/5 bg-white shadow-2xl dark:border-white/10 dark:bg-[#232325] sm:w-56"
                >
                  {ROLES.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      role="option"
                      aria-selected={role === r.key}
                      onClick={() => { setRole(r.key); setRoleOpen(false) }}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    >
                      <Icon name={r.icon} solid className="shrink-0 text-xl text-indigo-500" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-black text-on-surface">{r.label}</div>
                        <div className="truncate text-[11px] font-medium text-on-surface-variant">{r.blurb}</div>
                      </div>
                      {role === r.key && <Icon name="check" className="shrink-0 text-base text-indigo-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="h-px w-full shrink-0 bg-black/10 dark:bg-white/10 sm:h-9 sm:w-px" />

            <div className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2">
              <Icon name={isCand ? 'travel_explore' : 'groups'} solid className="shrink-0 text-xl text-purple-500" />
              <div className="min-w-0">
                <div className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">Looking to</div>
                <div className="truncate text-sm font-black text-on-surface">{isCand ? 'Find my next job' : 'Hire top talent'}</div>
              </div>
            </div>

            <a
              href="/auth"
              className="flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-sm font-black text-white shadow-lg shadow-indigo-500/30 transition-transform hover:scale-105 active:scale-95 sm:w-11 sm:gap-0"
            >
              <span className="sm:hidden">Get Started</span>
              <Icon name="arrow_forward" className="text-xl" />
            </a>
          </div>

          {/* trust row */}
          <div style={{ animationDelay: '0.45s' }} className="auth-fade-up mt-30 flex items-center gap-3">
            <div className="flex -space-x-2">
              {['from-pink-400 to-rose-500', 'from-sky-400 to-blue-500', 'from-amber-400 to-orange-500', 'from-emerald-400 to-teal-500'].map((g, i) => (
                <div key={i} className={`h-7 w-7 rounded-full border-2 border-white bg-gradient-to-br dark:border-[#1c1c1e] ${g}`} />
              ))}
            </div>
            <p className="text-xs font-semibold text-on-surface-variant">
              <span className="font-black text-on-surface">Free</span>{' '}for candidates &amp; recruiters
            </p>
          </div>
        </div>
      </div>

      {/* Phone + tablet circle: owns the lower half of the screen and bleeds off
          the right edge, mirroring the desktop treatment. The offsets are
          translate-% (relative to the circle, like desktop) rather than inset-%
          (relative to the band), so the bleed scales with the circle and the
          screen inside it never gets clipped by the viewport edge. */}
      <div className="relative z-0 h-[40svh] min-h-[320px] w-full shrink-0 sm:h-[44svh] lg:hidden">
        <div className="hero-enter-right absolute bottom-0 right-0 aspect-square h-full translate-x-[10%] translate-y-[6%]">
          <CircleVisual screen={wi} />
        </div>
      </div>
    </section>
  )
}
