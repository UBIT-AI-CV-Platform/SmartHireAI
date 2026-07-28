import { Icon } from '@/components/ui/icon'
import Reveal from '@/components/landing/Reveal'

/**
 * Landing "About Us" section. A soft headline box on top, then a two-column
 * layout: an animated app mockup on the left (a living snapshot of the whole
 * platform - ATS score, skill match, job cards, AI + interview cues) and the
 * about copy on the right.
 */
export default function AboutSection() {
  const matches = [
    { role: 'Product Designer', score: '96%' },
    { role: 'Frontend Engineer', score: '91%' },
  ]

  return (
    <section id="about" className="max-w-7xl mx-auto scroll-mt-24 px-4 md:px-6 py-10 md:py-16 overflow-hidden">
      {/* Heading (matches the other landing sections) */}
      <div className="text-center mb-6 sm:mb-9 md:mb-12">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-on-surface tracking-tighter mb-2">
          About Us
        </h2>
        <p className="text-primary font-bold text-sm sm:text-base md:text-lg tracking-tight max-w-2xl mx-auto">
          Turning potential into opportunity
        </p>
      </div>

      {/* Two columns: animation left, copy right */}
      <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
        {/* Left: animated mockup */}
        <Reveal from="left" className="relative order-2 lg:order-1">
          <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-500/20 via-purple-500/10 to-transparent blur-2xl rounded-[2rem]" />

          {/* Browser window */}
          <div className="relative rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#232325] shadow-2xl shadow-indigo-500/10 overflow-hidden">
            {/* Top bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-white/5">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="w-3 h-3 rounded-full bg-green-400" />
              <div className="ml-3 flex-1 max-w-[200px] h-5 rounded-full bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/10 flex items-center gap-1.5 px-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-[9px] font-semibold text-slate-400 tracking-tight">smarthire.ai</span>
              </div>
            </div>

            {/* Body */}
            <div className="relative grid grid-cols-[auto_1fr] gap-4 p-4 sm:p-5 min-h-[250px]">
              {/* Mini sidebar */}
              <div className="flex flex-col items-center gap-3 pr-4 border-r border-slate-100 dark:border-white/10">
                <div className="w-8 h-8 rounded-xl premium-gradient shadow-lg shadow-primary/25" />
                {['work', 'psychology', 'auto_awesome'].map((n) => (
                  <div key={n} className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                    <Icon name={n} className="text-slate-400 text-base" />
                  </div>
                ))}
              </div>

              {/* Main panel */}
              <div className="relative min-w-0">
                {/* Profile + ATS ring */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative w-16 h-16 shrink-0">
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{ background: 'conic-gradient(var(--color-primary) 0 92%, rgba(148,163,184,0.25) 92% 100%)' }}
                    />
                    <div className="absolute inset-[6px] rounded-full bg-white dark:bg-[#232325] flex flex-col items-center justify-center">
                      <span className="text-base font-black text-primary leading-none">92</span>
                      <span className="text-[6px] font-bold tracking-[0.2em] text-slate-400 mt-0.5">ATS</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="h-2.5 rounded-full bg-slate-200 dark:bg-white/10 w-3/4" />
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-white/5 w-1/2" />
                  </div>
                </div>

                {/* Skill bars filling (CV optimizing) */}
                <div className="space-y-2.5 mb-4">
                  <div className="h-2.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full premium-gradient about-bar" />
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full premium-gradient about-bar-alt" />
                  </div>
                </div>

                {/* Job match cards */}
                <div className="space-y-2">
                  {matches.map((m) => (
                    <div
                      key={m.role}
                      className="flex items-center gap-2.5 rounded-xl border border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 px-2.5 py-2"
                    >
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
                        <Icon name="work" className="text-primary text-sm" solid />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-on-surface truncate">{m.role}</p>
                        <div className="h-1.5 mt-1 rounded-full bg-slate-200 dark:bg-white/10 w-2/3" />
                      </div>
                      <span className="text-[10px] font-black text-green-600 dark:text-green-400 shrink-0">{m.score}</span>
                    </div>
                  ))}
                </div>

                {/* Light sweep to feel "live" */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div className="absolute top-0 -left-1/3 w-1/3 h-full bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent about-sweep" />
                </div>
              </div>
            </div>
          </div>

          {/* Floating badge: match */}
          <div className="absolute -right-2 sm:-right-4 top-16 about-float">
            <div className="flex items-center gap-1.5 rounded-full bg-white dark:bg-[#2c2c2e] border border-slate-200 dark:border-white/10 shadow-xl px-3 py-1.5">
              <Icon name="trending_up" className="text-green-500 text-sm" solid />
              <span className="text-[11px] font-bold text-on-surface">94% Match</span>
            </div>
          </div>

          {/* Floating badge: AI */}
          <div className="absolute -left-2 sm:-left-4 bottom-14 about-float-alt">
            <div className="flex items-center gap-1.5 rounded-full premium-gradient text-white shadow-xl shadow-primary/30 px-3 py-1.5">
              <Icon name="auto_awesome" className="text-sm" solid />
              <span className="text-[11px] font-bold">AI powered</span>
            </div>
          </div>

          {/* Floating interview mic with pulse */}
          <div className="absolute -bottom-3 right-10 sm:right-16">
            <div className="relative w-11 h-11">
              <span className="absolute inset-0 rounded-full bg-purple-500/40 about-ping" />
              <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-xl">
                <Icon name="mic" className="text-white text-lg" solid />
              </div>
            </div>
          </div>
        </Reveal>

        {/* Right: about copy */}
        <Reveal from="right" className="order-1 lg:order-2">
          <h3 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-on-surface mb-4">
            One platform for the whole hiring journey.
          </h3>
          <div className="space-y-4 text-sm md:text-base text-on-surface-variant leading-relaxed">
            <p>
              SmartHire AI is an all-in-one, AI-powered hiring platform. We help candidates present their
              best selves with ATS-optimized CVs, skill-based job matches, and real interview practice, while
              recruiters get smart screening and a clean, effortless hiring pipeline.
            </p>
            <p>
              Job hunting and hiring are still full of friction, generic resumes, mismatched roles, and
              stressful interviews. We built one connected ecosystem where AI removes the busywork so people
              can focus on what matters: better matches, less wasted effort, for everyone.
            </p>
          </div>

          {/* Highlights */}
          <div className="grid sm:grid-cols-2 gap-3 mt-6">
            {[
              { icon: 'auto_awesome', title: 'AI CV & Cover Letters', color: 'text-indigo-600 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-500/15' },
              { icon: 'trending_up', title: 'Skill-based Matching', color: 'text-green-600 dark:text-green-300', bg: 'bg-green-50 dark:bg-green-500/15' },
              { icon: 'psychology', title: 'Mock Interviews', color: 'text-purple-600 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-500/15' },
              { icon: 'verified', title: 'Smart Screening', color: 'text-sky-600 dark:text-sky-300', bg: 'bg-sky-50 dark:bg-sky-500/15' },
            ].map((h) => (
              <div key={h.title} className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg ${h.bg} flex items-center justify-center shrink-0`}>
                  <Icon name={h.icon} className={`${h.color} text-base`} solid />
                </div>
                <span className="text-xs md:text-sm font-bold text-on-surface">{h.title}</span>
              </div>
            ))}
          </div>

          <a
            href="/auth"
            className="inline-flex items-center gap-1.5 mt-7 text-sm font-bold text-primary hover:gap-2.5 transition-all"
          >
            One platform. Every step of the journey.
            <Icon name="arrow_forward" className="text-base" />
          </a>
        </Reveal>
      </div>
    </section>
  )
}
