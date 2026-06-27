'use client'

import { useEffect } from 'react'
import { useState } from 'react'

type Kind = 'privacy' | 'terms'

type Section = { heading: string; body: string }

const LAST_UPDATED = 'June 2026'

const CONTENT: Record<Kind, { title: string; intro: string; sections: Section[] }> = {
  privacy: {
    title: 'Privacy Policy',
    intro:
      'SmartHire AI ("we", "us") respects your privacy. This policy explains what we collect, why, and the choices you have. By using SmartHire AI you agree to the practices described here.',
    sections: [
      {
        heading: '1. Information We Collect',
        body: 'Account details you provide (name, email, role), the profile content you add (skills, education, experience, projects, photo), documents you generate (CVs, cover letters), job applications and messages, and basic usage data needed to operate the service.',
      },
      {
        heading: '2. How We Use Your Information',
        body: 'To create your profile and portals, generate AI-assisted CVs/cover letters, match you with jobs, power the AI interview coach and recruiting copilot, deliver notifications and emails, and keep the platform secure and reliable.',
      },
      {
        heading: '3. AI Processing',
        body: 'Some features send the relevant content you provide (for example, your profile or a job description) to our AI provider to generate results. We only send what is needed for the feature you triggered, and we do not sell your data.',
      },
      {
        heading: '4. Data Sharing',
        body: 'When you apply to a job, the recruiter for that job can see the CV snapshot and details you choose to submit. We do not share your personal data with third parties for advertising. Service providers (hosting, email, AI) process data only to provide the service.',
      },
      {
        heading: '5. Data Security & Retention',
        body: 'We use industry-standard measures to protect your data and keep it only as long as your account is active or as needed to provide the service. You can delete your account, which removes your associated profile data.',
      },
      {
        heading: '6. Your Rights',
        body: 'You can access, update, or delete your information at any time from your settings. For any privacy request, contact us at smarthireai.fyp@gmail.com.',
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    intro:
      'These Terms govern your use of SmartHire AI. By creating an account or using the platform, you agree to these Terms. Please read them carefully.',
    sections: [
      {
        heading: '1. Eligibility & Accounts',
        body: 'You must provide accurate information when signing up and are responsible for activity under your account. One email maps to one role (candidate or recruiter); keep your credentials secure.',
      },
      {
        heading: '2. Acceptable Use',
        body: 'You agree not to misuse the platform — no unlawful, misleading, abusive, or infringing content, no scraping or attempts to disrupt the service, and no impersonation of others.',
      },
      {
        heading: '3. Your Content',
        body: 'You retain ownership of the content you submit (profile, CVs, messages). You grant us a limited license to process and display it solely to operate the features you use, such as generating documents and sharing applications with recruiters you apply to.',
      },
      {
        heading: '4. AI-Generated Output',
        body: 'AI features assist you but can make mistakes. You are responsible for reviewing generated CVs, cover letters, coaching answers, and other output before relying on or submitting them. We do not guarantee employment or hiring outcomes.',
      },
      {
        heading: '5. Service Availability',
        body: 'We work to keep the platform available but provide it "as is" without warranties. Features may change, and free AI tiers may be rate-limited from time to time.',
      },
      {
        heading: '6. Termination & Contact',
        body: 'You may stop using the service and delete your account anytime. We may suspend accounts that violate these Terms. Questions? Contact us at smarthireai.fyp@gmail.com.',
      },
    ],
  },
}

/** The modal itself (controlled). */
function LegalModal({ kind, onClose }: { kind: Kind; onClose: () => void }) {
  const data = CONTENT[kind]

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col bg-white dark:bg-[#2c2c2e] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={data.title}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-white/10">
          <div className="w-9 h-9 rounded-xl premium-gradient flex items-center justify-center text-white flex-shrink-0">
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
              {kind === 'privacy' ? 'shield' : 'gavel'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">{data.title}</h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-400">Last updated: {LAST_UPDATED}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 flex items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-4 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{data.intro}</p>
          {data.sections.map((s) => (
            <div key={s.heading}>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">{s.heading}</h3>
              <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl premium-gradient text-white text-sm font-bold hover:scale-105 active:scale-95 transition-transform"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * A clickable inline trigger that opens the Privacy/Terms modal. Self-contained
 * (owns its open state) so it can drop straight into server components like the
 * footer, or inline text like the signup form.
 */
export default function LegalLink({
  kind,
  className,
  children,
}: {
  kind: Kind
  className?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open && <LegalModal kind={kind} onClose={() => setOpen(false)} />}
    </>
  )
}
