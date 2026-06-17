export default function FAQSection() {
  const faqs = [
    {
      id: 1,
      question: 'How accurate is the AI matching engine?',
      answer:
        'Our proprietary AI matching engine boasts a 94.7% accuracy rate. It analyzes semantic meaning, implicit skill markers, and company culture fit by processing over 200 distinct data points per profile.',
    },
    {
      id: 2,
      question: 'Is my data secure?',
      answer:
        'Security is our top priority. We use AES-256 enterprise-grade encryption and are fully compliant with GDPR, CCPA, and maintain SOC2 Type II certification.',
    },
    {
      id: 3,
      question: 'What is the cost for candidates?',
      answer:
        'SmartHire AI is completely free for candidates. We believe in empowering talent. We monetize through enterprise recruitment tools and premium HR features.',
    },
    {
      id: 4,
      question: 'Does it integrate with LinkedIn?',
      answer:
        'Yes, you can import your LinkedIn profile with a single click to instantly populate your SmartHire AI dashboard and start generating optimized CVs.',
    },
    {
      id: 5,
      question: 'How long do mock interviews last?',
      answer:
        'Mock interviews are customizable but typically last between 15 to 45 minutes, depending on the role complexity and the number of questions you choose to practice.',
    },
    {
      id: 6,
      question: 'Can I export my generated CV to PDF?',
      answer:
        'Absolutely. All AI-generated resumes can be exported in professionally formatted PDF or DOCX formats, fully optimized for standard ATS systems.',
    },
  ]

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-16 bg-slate-50/50 rounded-3xl md:rounded-[3rem] mt-4 mb-0" id="faq">
      <div className="text-center mb-6 sm:mb-8 md:mb-10">
        <span className="text-primary font-extrabold tracking-widest uppercase text-[9px] sm:text-[10px] md:text-xs mb-2 block">
          Help Center
        </span>
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-on-surface tracking-tighter mb-2">
          Frequently Asked Questions
        </h2>
        <p className="text-on-surface-variant text-xs sm:text-sm md:text-base max-w-2xl mx-auto px-4">
          Everything you need to know about SmartHire AI and our process.
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-2 sm:space-y-3 px-2">
        {faqs.map((faq) => (
          <div
            key={faq.id}
            className="faq-item group bg-white border border-slate-200 rounded-lg sm:rounded-xl md:rounded-[1.25rem] overflow-hidden"
          >
            <div className="flex justify-between items-center px-4 sm:px-5 md:px-6 py-3 sm:py-4 md:py-5 font-bold text-xs sm:text-sm md:text-base lg:text-lg cursor-pointer transition-colors group-hover:bg-indigo-50/30">
              <span>{faq.question}</span>
              <span className="material-symbols-outlined text-primary text-lg sm:text-xl transition-transform duration-300 faq-icon flex-shrink-0">
                expand_more
              </span>
            </div>
            <div className="faq-answer px-4 sm:px-5 md:px-6 pt-0 text-slate-600 leading-relaxed text-[11px] sm:text-xs md:text-sm lg:text-base group-hover:bg-indigo-50/30">
              <p className="pb-4 sm:pb-5">{faq.answer}</p>
            </div>
          </div>
        ))}

        {/* FAQ CTA */}
        <div className="bg-primary/5 border border-indigo-100 rounded-lg sm:rounded-2xl md:rounded-[2rem] p-4 sm:p-5 md:p-6 text-center mt-4 sm:mt-5 md:mt-6">
          <h4 className="text-indigo-950 font-black text-sm sm:text-base md:text-lg mb-1 tracking-tight">
            Still have questions?
          </h4>
          <p className="text-indigo-800/70 mb-3 sm:mb-4 text-xs sm:text-sm font-medium">
            Our expert team is here to help you.
          </p>
          <div className="flex justify-center">
            <a
              className="bg-primary text-white px-6 md:px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all text-sm"
              href="https://mail.google.com/mail/u/0/?fs=1&to=shanza.iftikhar12@gmail.com&su=Hello%20SmartHire%20AI"
              target="_blank"
              rel="noopener noreferrer"
            >
              Email Support <span className="material-symbols-outlined text-lg">mail</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
