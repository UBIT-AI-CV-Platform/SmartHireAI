export default function RoleSelector() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
      <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
        {/* Candidate Box */}
        <div className="group relative overflow-hidden bg-[#f0f4ff] p-6 md:p-8 rounded-[2rem] border border-indigo-100 shadow-xl flex flex-col justify-between min-h-[380px] md:min-h-[420px] cursor-pointer transition-all duration-300 hover:shadow-2xl">
          <div className="relative z-10">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-[#4f46e5] to-[#3525cd] rounded-2xl flex items-center justify-center mb-4 shadow-md border border-indigo-300 transition-transform duration-300 group-hover:scale-125">
              <span
                className="material-symbols-outlined text-white text-3xl"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                badge
              </span>
            </div>
            <h3 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 mb-2 tracking-tight">I&apos;m a Candidate</h3>
            <p className="text-slate-700 text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4 max-w-sm">
              Elevate your career trajectory with cutting-edge AI tools designed for modern professionals.
            </p>
            <ul className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6">
              <li className="flex items-start gap-2 sm:gap-3">
                <span className="material-symbols-outlined text-primary font-bold text-lg sm:text-xl flex-shrink-0">check_circle</span>
                <span className="text-slate-800 font-semibold text-[11px] sm:text-sm">ATS-Optimized Resume Builder</span>
              </li>
              <li className="flex items-start gap-2 sm:gap-3">
                <span className="material-symbols-outlined text-primary font-bold text-lg sm:text-xl flex-shrink-0">check_circle</span>
                <span className="text-slate-800 font-semibold text-[11px] sm:text-sm">Hyper-Personalized Job Matching</span>
              </li>
              <li className="flex items-start gap-2 sm:gap-3">
                <span className="material-symbols-outlined text-primary font-bold text-lg sm:text-xl flex-shrink-0">check_circle</span>
                <span className="text-slate-800 font-semibold text-[11px] sm:text-sm">AI Mock Interview Sessions</span>
              </li>
            </ul>
          </div>
          <div className="relative z-10">
            <a href="/auth" className="w-full sm:w-auto bg-gradient-to-r from-[#4f46e5] to-[#3525cd] text-white px-4 sm:px-8 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold text-xs sm:text-base flex items-center justify-center gap-3 transition-all hover:from-[#3525cd] hover:to-[#2818a8] shadow-lg hover:shadow-indigo-600/50 inline-flex">
              Explore Careers{' '}
              <span className="material-symbols-outlined text-lg sm:text-xl">arrow_forward</span>
            </a>
          </div>
          <div className="absolute -right-8 -bottom-8 opacity-20 group-hover:opacity-30 transition-all duration-300 pointer-events-none z-0">
            <span
              className="material-symbols-outlined text-[280px] text-[#4f46e5]"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              account_circle
            </span>
          </div>
        </div>

        {/* Recruiter Box */}
        <div className="group relative overflow-hidden bg-[#f0f4ff] p-6 md:p-8 rounded-[2rem] border border-indigo-100 shadow-xl flex flex-col justify-between min-h-[380px] md:min-h-[420px] cursor-pointer transition-all duration-300 hover:shadow-2xl">
          <div className="relative z-10">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-[#4f46e5] to-[#3525cd] rounded-2xl flex items-center justify-center mb-4 shadow-md border border-indigo-300 transition-transform duration-300 group-hover:scale-125">
              <span
                className="material-symbols-outlined text-white text-3xl"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                work
              </span>
            </div>
            <h3 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 mb-2 tracking-tight">I&apos;m a Recruiter</h3>
            <p className="text-slate-700 text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4 max-w-sm">
              Revolutionize your hiring process with deep intelligence and automated candidate sourcing.
            </p>
            <ul className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6">
              <li className="flex items-start gap-2 sm:gap-3">
                <span className="material-symbols-outlined text-primary font-bold text-lg sm:text-xl flex-shrink-0">check_circle</span>
                <span className="text-slate-800 font-semibold text-[11px] sm:text-sm">Automated Candidate Screening</span>
              </li>
              <li className="flex items-start gap-2 sm:gap-3">
                <span className="material-symbols-outlined text-primary font-bold text-lg sm:text-xl flex-shrink-0">check_circle</span>
                <span className="text-slate-800 font-semibold text-[11px] sm:text-sm">Advanced Talent Analytics</span>
              </li>
              <li className="flex items-start gap-2 sm:gap-3">
                <span className="material-symbols-outlined text-primary font-bold text-lg sm:text-xl flex-shrink-0">check_circle</span>
                <span className="text-slate-800 font-semibold text-[11px] sm:text-sm">ATS &amp; Workflow Integration</span>
              </li>
            </ul>
          </div>
          <div className="relative z-10">
            <a href="/auth" className="w-full sm:w-auto bg-gradient-to-r from-[#4f46e5] to-[#3525cd] text-white px-4 sm:px-8 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold text-xs sm:text-base flex items-center justify-center gap-3 transition-all hover:from-[#3525cd] hover:to-[#2818a8] shadow-lg hover:shadow-indigo-600/50 inline-flex">
              Source Talent <span className="material-symbols-outlined text-lg sm:text-xl">arrow_forward</span>
            </a>
          </div>
          <div className="absolute -right-8 -bottom-8 opacity-20 group-hover:opacity-30 transition-all duration-300 pointer-events-none z-0">
            <span
              className="material-symbols-outlined text-[280px] text-[#4f46e5]"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              settings
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
