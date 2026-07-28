import type { ReactNode } from 'react'
import { Icon } from '@/components/ui/icon'
import Reveal from '@/components/landing/Reveal'

/* skeleton line */
function Bar({ className = '' }: { className?: string }) {
  return <div className={`rounded-full bg-black/10 dark:bg-white/15 ${className}`} />
}

/* isometric-tilt wrapper for the on-screen mockup */
const iso = { transform: 'perspective(1500px) rotateY(-16deg) rotateX(7deg)' }

/* ---------------- Candidate illustration ---------------- */
function CandidateArt() {
  return (
    <div className="relative mx-auto h-[270px] w-full max-w-md sm:h-[320px]">
      {/* glow */}
      <div className="pointer-events-none absolute inset-6 rounded-full bg-indigo-400/25 blur-3xl" />
      {/* doodle marks */}
      <span className="absolute left-2 top-8 text-xl font-black text-indigo-300/70">+</span>
      <span className="absolute right-5 bottom-14 text-lg font-black text-sky-300/70">×</span>
      <Icon name="auto_awesome" solid className="absolute left-6 bottom-6 text-sky-300/80 text-lg hiw-float" />

      {/* device */}
      <div className="absolute inset-0 grid place-items-center">
        <div className="w-60 sm:w-64" style={iso}>
          <div className="rounded-2xl border border-black/10 bg-white p-3.5 shadow-2xl shadow-indigo-500/25 dark:border-white/10 dark:bg-[#1c1c1e]">
            <div className="mb-3 flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400/70" />
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400/70" />
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
            </div>
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 shadow-md" />
              <div className="flex-1 space-y-1.5">
                <Bar className="h-2 w-2/3" />
                <Bar className="h-1.5 w-1/2" />
              </div>
              <div className="relative h-11 w-11 shrink-0">
                <div className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(#4f46e5 92%, rgba(120,120,120,0.15) 0)' }} />
                <div className="absolute inset-[3px] grid place-items-center rounded-full bg-white dark:bg-[#1c1c1e]">
                  <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-300">92</span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {['React', 'Node', 'Figma'].map((s) => (
                <span key={s} className="rounded-full bg-indigo-100 px-2 py-0.5 text-[8px] font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                  {s}
                </span>
              ))}
            </div>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-[8px] font-bold">
                <span className="text-on-surface-variant">Job match</span>
                <span className="text-emerald-600 dark:text-emerald-400">94%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-indigo-500 to-blue-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* floating badges */}
      <div className="absolute right-1 top-3 grid h-12 w-12 place-items-center rounded-2xl border border-black/5 bg-white shadow-xl about-float dark:border-white/10 dark:bg-[#2c2c2e]">
        <Icon name="search" solid className="text-indigo-500 text-2xl" />
      </div>
      <div className="absolute -left-1 bottom-16 h-9 w-9 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 shadow-lg ring-2 ring-amber-200/50 about-float-alt grid place-items-center">
        <div className="h-4 w-4 rounded-full border-2 border-amber-700/40" />
      </div>
      <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full border border-black/5 bg-white px-2.5 py-1.5 shadow-xl hiw-float dark:border-white/10 dark:bg-[#2c2c2e]">
        <Icon name="trending_up" solid className="text-emerald-500 text-sm" />
        <span className="text-[10px] font-black text-on-surface">Hired</span>
      </div>
    </div>
  )
}

/* ---------------- Recruiter illustration ---------------- */
function RecruiterArt() {
  const rows = [
    { i: 1, s: 91 },
    { i: 2, s: 78 },
  ]
  return (
    <div className="relative mx-auto h-[270px] w-full max-w-md sm:h-[320px]">
      <div className="pointer-events-none absolute inset-6 rounded-full bg-purple-400/25 blur-3xl" />
      <span className="absolute right-3 top-8 text-xl font-black text-purple-300/70">+</span>
      <span className="absolute left-5 bottom-14 text-lg font-black text-fuchsia-300/70">×</span>
      <Icon name="auto_awesome" solid className="absolute right-8 bottom-6 text-fuchsia-300/80 text-lg hiw-float" />

      <div className="absolute inset-0 grid place-items-center">
        <div className="w-60 sm:w-64" style={iso}>
          <div className="rounded-2xl border border-black/10 bg-white p-3.5 shadow-2xl shadow-purple-500/25 dark:border-white/10 dark:bg-[#1c1c1e]">
            <div className="mb-3 flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400/70" />
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400/70" />
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
            </div>
            {/* ranked applicants */}
            <div className="space-y-1.5">
              {rows.map((r) => (
                <div key={r.i} className="flex items-center gap-2 rounded-lg border border-black/5 bg-black/[0.02] p-1.5 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="grid h-5 w-5 place-items-center rounded-full bg-purple-100 text-[9px] font-black text-purple-600 dark:bg-purple-500/15 dark:text-purple-300">{r.i}</div>
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500" />
                  <div className="flex-1 space-y-1">
                    <Bar className="h-1.5 w-3/4" />
                    <Bar className="h-1.5 w-1/2" />
                  </div>
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[8px] font-black text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">{r.s}</span>
                </div>
              ))}
            </div>
            {/* mini analytics */}
            <div className="mt-3 flex h-12 items-end gap-1.5">
              {[40, 65, 50, 85, 70, 95].map((h, i) => (
                <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-purple-500 to-fuchsia-400" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* floating badges */}
      <div className="absolute left-1 top-3 grid h-12 w-12 place-items-center rounded-2xl border border-black/5 bg-white shadow-xl about-float dark:border-white/10 dark:bg-[#2c2c2e]">
        <Icon name="work" solid className="text-purple-500 text-2xl" />
      </div>
      <div className="absolute -right-1 bottom-16 h-9 w-9 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 shadow-lg ring-2 ring-amber-200/50 about-float-alt grid place-items-center">
        <div className="h-4 w-4 rounded-full border-2 border-amber-700/40" />
      </div>
      <div className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full border border-black/5 bg-white px-2.5 py-1.5 shadow-xl hiw-float dark:border-white/10 dark:bg-[#2c2c2e]">
        <Icon name="verified" solid className="text-purple-500 text-sm" />
        <span className="text-[10px] font-black text-on-surface">Shortlist</span>
      </div>
    </div>
  )
}

/* ---------------- Banner ---------------- */
type Role = {
  eyebrow: string
  heading: string
  desc: string
  features: { icon: string; label: string }[]
  cta: string
  art: ReactNode
  reverse: boolean
  bg: string
  border: string
  accent: string
  chip: string
  btn: string
}

function RoleBanner({ role }: { role: Role }) {
  return (
    <div className={`group relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] border ${role.border} bg-gradient-to-br ${role.bg} p-6 sm:p-8 md:p-10 shadow-xl transition-shadow duration-300 hover:shadow-2xl`}>
      <div className="grid items-center gap-6 lg:grid-cols-2 lg:gap-10">
        {/* copy */}
        <div className={role.reverse ? 'lg:order-2' : ''}>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${role.chip}`}>
            {role.eyebrow}
          </span>
          <h3 className="mt-4 text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter text-on-surface">
            {role.heading}
            <span className={role.accent}> +</span>
          </h3>
          <p className="mt-3 max-w-md text-sm sm:text-base font-medium leading-relaxed text-on-surface-variant">
            {role.desc}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {role.features.map((f) => (
              <span key={f.label} className="inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-white/70 px-3 py-1.5 text-xs font-bold text-on-surface backdrop-blur dark:border-white/10 dark:bg-white/10">
                <Icon name={f.icon} solid className={`${role.accent} text-sm`} />
                {f.label}
              </span>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <a
              href="/auth"
              className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r ${role.btn} px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.03]`}
            >
              {role.cta}
              <Icon name="arrow_forward" className="text-lg" />
            </a>
            <a href="/auth" className={`inline-flex items-center gap-1 text-sm font-bold ${role.accent} transition-all hover:gap-2`}>
              Learn more
              <Icon name="chevron_right" className="text-base" />
            </a>
          </div>
        </div>

        {/* illustration */}
        <div className={role.reverse ? 'lg:order-1' : ''}>{role.art}</div>
      </div>
    </div>
  )
}

export default function RoleSelector() {
  const roles: Role[] = [
    {
      eyebrow: 'For Candidates',
      heading: 'Land your dream job, faster',
      desc: 'Build an ATS-ready CV, match with roles that fit your skills, and practice interviews with AI - everything you need to get hired, in one place.',
      features: [
        { icon: 'description', label: 'ATS CV Builder' },
        { icon: 'travel_explore', label: 'Smart Matching' },
        { icon: 'psychology', label: 'AI Interview Coach' },
      ],
      cta: "I'm a Candidate",
      art: <CandidateArt />,
      reverse: false,
      bg: 'from-indigo-50 via-white to-sky-50 dark:from-indigo-500/10 dark:via-[#1c1c1e] dark:to-sky-500/10',
      border: 'border-indigo-100 dark:border-white/10',
      accent: 'text-indigo-600 dark:text-indigo-300',
      chip: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
      btn: 'from-indigo-600 to-blue-600',
    },
    {
      eyebrow: 'For Recruiters',
      heading: 'Hire the best, effortlessly',
      desc: 'Post jobs, let AI screen and rank applicants, schedule interviews, and message candidates - a complete hiring pipeline without the busywork.',
      features: [
        { icon: 'insights', label: 'AI Screening' },
        { icon: 'groups', label: 'Applicant Pipeline' },
        { icon: 'videocam', label: 'Video Interviews' },
      ],
      cta: "I'm a Recruiter",
      art: <RecruiterArt />,
      reverse: true,
      bg: 'from-purple-50 via-white to-fuchsia-50 dark:from-purple-500/10 dark:via-[#1c1c1e] dark:to-fuchsia-500/10',
      border: 'border-purple-100 dark:border-white/10',
      accent: 'text-purple-600 dark:text-purple-300',
      chip: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
      btn: 'from-purple-600 to-fuchsia-600',
    },
  ]

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-6 md:space-y-8">
      {roles.map((role) => (
        <Reveal key={role.eyebrow} from="bottom">
          <RoleBanner role={role} />
        </Reveal>
      ))}
    </section>
  )
}
