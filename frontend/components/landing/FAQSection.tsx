'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui/icon'

export default function FAQSection() {
  const [openId, setOpenId] = useState<number | null>(null)

  const faqs = [
    {
      id: 1,
      question: 'How does job matching work?',
      answer:
        'Every job lists the skills it needs. We compare those against the skills on your profile and show you the overlap as a match percentage, so you can see at a glance how well a role fits before you apply. The more complete your profile, the more useful the score.',
    },
    {
      id: 2,
      question: 'What does the AI actually do?',
      answer:
        'It writes and rewrites for you. It turns your profile into an ATS-friendly CV and cover letter, suggests concrete improvements, runs mock interviews you can practise with, and helps recruiters summarise and rank the applications they receive.',
    },
    {
      id: 3,
      question: 'Is SmartHire AI free to use?',
      answer:
        'Yes. SmartHire AI is a final-year university project, and every feature - CV generation, job matching, mock interviews, messaging and interviews - is free for both candidates and recruiters. There are no paid plans.',
    },
    {
      id: 4,
      question: 'How is my data handled?',
      answer:
        'Your data lives in your own account and is only visible to you, plus any recruiter you actually apply to. Recruiters can see the CV you chose to send, not your whole profile history. You can edit or delete your information at any time from your settings.',
    },
    {
      id: 5,
      question: 'Can I export my CV?',
      answer:
        'Yes. Any CV you generate can be downloaded as a PDF or a Word (DOCX) file, with a layout that plain-text ATS scanners can read properly.',
    },
    {
      id: 6,
      question: 'What can recruiters do on the platform?',
      answer:
        'Recruiters can post jobs, let the AI screen and rank applicants, message candidates directly, schedule and run video interviews in the browser, and send offers - all from one dashboard.',
    },
  ]

  return (
    <section
      className="max-w-7xl mx-auto scroll-mt-24 px-4 md:px-6 py-10 md:py-16 bg-slate-50/50 dark:bg-white/5 rounded-3xl md:rounded-[3rem] mt-4 mb-0"
      id="faq"
    >
      <div className="text-center mb-6 sm:mb-8 md:mb-10">
        <span className="text-primary font-extrabold tracking-widest uppercase text-[10px] md:text-xs mb-2 block">
          Help Center
        </span>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-on-surface tracking-tighter mb-2">
          Frequently Asked Questions
        </h2>
        <p className="text-on-surface-variant text-sm md:text-base max-w-2xl mx-auto">
          Everything you need to know about SmartHire AI and our process.
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-2 sm:space-y-3">
        {faqs.map((faq) => {
          const isOpen = openId === faq.id
          return (
            <div
              key={faq.id}
              className={`faq-item group bg-white dark:bg-[#2c2c2e] border border-slate-200 dark:border-white/10 rounded-xl md:rounded-[1.25rem] overflow-hidden ${
                isOpen ? 'is-open' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : faq.id)}
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${faq.id}`}
                className="flex w-full items-center justify-between gap-3 px-4 sm:px-5 md:px-6 py-4 md:py-5 text-left font-bold text-sm md:text-base lg:text-lg text-on-surface transition-colors group-hover:bg-indigo-50/30 dark:group-hover:bg-white/[0.04]"
              >
                <span className="min-w-0">{faq.question}</span>
                <Icon
                  name="expand_more"
                  className="faq-icon shrink-0 text-primary text-xl transition-transform duration-300"
                />
              </button>
              <div
                id={`faq-answer-${faq.id}`}
                className="faq-answer px-4 sm:px-5 md:px-6 pt-0 text-slate-600 dark:text-slate-300 leading-relaxed text-xs sm:text-sm md:text-base group-hover:bg-indigo-50/30 dark:group-hover:bg-white/[0.04]"
              >
                <p className="pb-4 sm:pb-5">{faq.answer}</p>
              </div>
            </div>
          )
        })}

        {/* FAQ CTA */}
        <div className="bg-primary/5 border border-indigo-100 dark:border-white/10 rounded-2xl md:rounded-[2rem] p-5 sm:p-6 text-center mt-4 sm:mt-5 md:mt-6">
          <h4 className="text-indigo-950 dark:text-slate-100 font-black text-base md:text-lg mb-1 tracking-tight">
            Still have questions?
          </h4>
          <p className="text-indigo-800/70 dark:text-slate-300 mb-4 text-xs sm:text-sm font-medium">
            Our expert team is here to help you.
          </p>
          <a
            className="bg-primary text-white px-6 md:px-8 py-2.5 rounded-xl font-bold inline-flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all text-sm"
            href="https://mail.google.com/mail/u/0/?fs=1&to=smarthireai.fyp@gmail.com&su=Hello%20SmartHire%20AI"
            target="_blank"
            rel="noopener noreferrer"
          >
            Email Support <Icon name="mail" className="text-lg" />
          </a>
        </div>
      </div>
    </section>
  )
}
