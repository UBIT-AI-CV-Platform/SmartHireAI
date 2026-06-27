import type { Metadata } from 'next'
import Navigation from '@/components/landing/Navigation'
import Footer from '@/components/landing/Footer'

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'SmartHire AI is an all-in-one, AI-powered hiring platform — build ATS-optimized CVs, match with the right jobs, practice interviews, and hire smarter.',
}

const VALUES = [
  { icon: 'bolt', title: 'AI that actually helps', desc: 'Every feature is built around real outcomes — better CVs, stronger matches, sharper interview prep — not gimmicks.' },
  { icon: 'diversity_3', title: 'Fair for both sides', desc: 'Candidates and recruiters get purpose-built portals, so hiring feels transparent and human on both ends.' },
  { icon: 'lock', title: 'Your data, your control', desc: 'You decide what to share. We only process what a feature needs, and you can delete your account anytime.' },
  { icon: 'auto_awesome', title: 'Always improving', desc: 'We keep refining matching, coaching, and screening so the platform gets more useful over time.' },
]

const PILLARS = [
  { icon: 'description', title: 'AI CV & Cover Letters', desc: 'Generate ATS-optimized resumes and tailored cover letters from your profile in seconds.' },
  { icon: 'work', title: 'Smart Job Matching', desc: 'Get matched to roles by real skills overlap, apply in one click, and track every application.' },
  { icon: 'record_voice_over', title: 'AI Interview Coach', desc: 'Practice with realistic mock interviews and get instant, personalized feedback.' },
  { icon: 'groups', title: 'Recruiter Toolkit', desc: 'Post jobs, screen applicants with AI, run pipelines, and schedule interviews end to end.' },
]

export default function AboutPage() {
  return (
    <div className="bg-surface text-on-surface min-h-screen">
      <Navigation />

      {/* Hero */}
      <section className="hero-gradient pt-36 pb-16 md:pt-44 md:pb-20 px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="inline-block px-3 py-1 rounded-full text-indigo-700 dark:text-indigo-300 text-[10px] md:text-xs font-extrabold tracking-widest uppercase mb-5 glass-tag shadow-sm">
            About SmartHire AI
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 mb-5 leading-tight">
            Hiring, reimagined with{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800">
              intelligent simplicity
            </span>
          </h1>
          <p className="text-base md:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            SmartHire AI is an all-in-one platform that helps candidates present their best selves and helps
            recruiters find the right people — powered by AI, designed to feel effortless.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="px-6 py-14 md:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">Our mission</h2>
          <p className="text-base md:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            Job hunting and hiring are still full of friction — generic resumes, mismatched roles, and stressful
            interviews. We&apos;re building one connected ecosystem where AI removes the busywork: candidates get
            ATS-ready CVs, skill-based matches, and real interview practice, while recruiters get smart screening
            and a clean hiring pipeline. The goal is simple — better matches, less wasted effort, for everyone.
          </p>
        </div>
      </section>

      {/* What we do */}
      <section className="px-6 pb-14 md:pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8 text-center">What we do</h2>
          <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
            {PILLARS.map((p) => (
              <div
                key={p.title}
                className="flex items-start gap-4 p-5 md:p-6 rounded-2xl bg-white dark:bg-[#2c2c2e] border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-11 h-11 rounded-xl premium-gradient flex items-center justify-center text-white flex-shrink-0">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{p.icon}</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">{p.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="px-6 pb-14 md:pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8 text-center">What we believe</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="p-5 rounded-2xl bg-white dark:bg-[#2c2c2e] border border-slate-200 dark:border-white/10 text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-300 mx-auto mb-3">
                  <span className="material-symbols-outlined">{v.icon}</span>
                </div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1.5">{v.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-16 md:pb-24">
        <div className="max-w-3xl mx-auto rounded-[2rem] p-8 md:p-12 text-center vibrant-cta-gradient border border-indigo-100 dark:border-white/10 shadow-xl">
          <h2 className="text-xl md:text-3xl font-black text-indigo-950 dark:text-slate-100 mb-3">Ready to get started?</h2>
          <p className="text-sm md:text-base text-indigo-800/80 dark:text-slate-300 font-medium mb-6">
            Join SmartHire AI and experience hiring built around you.
          </p>
          <a
            href="/auth"
            className="inline-block px-8 md:px-10 py-3 md:py-3.5 rounded-xl font-bold text-sm md:text-base premium-gradient text-white shadow-xl shadow-primary/20 transition-transform hover:scale-105 active:scale-95"
          >
            Get Started Free
          </a>
        </div>
      </section>

      <Footer />
    </div>
  )
}
