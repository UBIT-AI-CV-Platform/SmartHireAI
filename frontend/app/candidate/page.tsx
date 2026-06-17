'use client'

export default function OverviewPage() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <header className="mb-4 md:mb-6">
        <h2 className="text-xl md:text-3xl lg:text-[2.25rem] font-bold tracking-tight text-on-surface">Welcome back, Alex</h2>
      </header>

      {/* Top Row: Stats + AI Coach Box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 mb-6 md:mb-8">
        {/* Stats Containers (Grouped Left) - Fills remaining width */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6 items-stretch">
          <div className="p-4 md:p-6 rounded-[1.5rem] bg-purple-200/60 shadow-sm flex flex-col h-full group">
            <div className="mb-auto">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white/70 flex items-center justify-center text-purple-700 text-base md:text-lg mb-3">
                <span className="material-symbols-outlined transition-transform duration-300 group-hover:scale-110" style={{ fontVariationSettings: "'FILL' 1" }}>
                  description
                </span>
              </div>
              <h3 className="text-xl md:text-3xl font-bold text-purple-950 mb-1">24</h3>
            </div>
            <div className="pt-3 border-t border-purple-300/40">
              <p className="font-bold text-purple-800/80 uppercase tracking-wider text-[0.55rem] md:text-[0.7rem] mb-1">Applications</p>
              <p className="text-xs font-medium text-purple-700/90 bg-white/50 inline-block px-2 py-0.5 rounded-lg text-[0.7rem] md:text-xs">8 active processes</p>
            </div>
          </div>

          <div className="p-4 md:p-6 rounded-[1.5rem] bg-sky-200/60 shadow-sm flex flex-col h-full group">
            <div className="mb-auto">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white/70 flex items-center justify-center text-sky-700 text-base md:text-lg mb-3">
                <span className="material-symbols-outlined transition-transform duration-300 group-hover:scale-110" style={{ fontVariationSettings: "'FILL' 1" }}>
                  event_available
                </span>
              </div>
              <h3 className="text-xl md:text-3xl font-bold text-sky-950 mb-1">3</h3>
            </div>
            <div className="pt-3 border-t border-sky-300/40">
              <p className="font-bold text-sky-800/80 uppercase tracking-wider text-[0.55rem] md:text-[0.7rem] mb-1">Interviews</p>
              <p className="text-xs font-medium text-sky-700/90 bg-white/50 inline-block px-2 py-0.5 rounded-lg text-[0.7rem] md:text-xs">Next one: Tomorrow</p>
            </div>
          </div>

          <div className="p-4 md:p-6 rounded-[1.5rem] bg-pink-200/60 shadow-sm flex flex-col h-full group">
            <div className="mb-auto">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white/70 flex items-center justify-center text-pink-700 text-base md:text-lg mb-3">
                <span className="material-symbols-outlined transition-transform duration-300 group-hover:scale-110" style={{ fontVariationSettings: "'FILL' 1" }}>
                  emoji_events
                </span>
              </div>
              <h3 className="text-xl md:text-3xl font-bold text-pink-950 mb-1">2</h3>
            </div>
            <div className="pt-3 border-t border-pink-300/40">
              <p className="font-bold text-pink-800/80 uppercase tracking-wider text-[0.55rem] md:text-[0.7rem] mb-1">Offers</p>
              <p className="text-xs font-medium text-pink-700/90 bg-white/50 inline-block px-2 py-0.5 rounded-lg text-[0.7rem] md:text-xs">1 Pending Response</p>
            </div>
          </div>
        </div>

        {/* AI Coach Highlight Box (Right) - Same width as sidebar cards */}
        <div className="lg:col-span-1 bg-[#2c1f4a] p-4 md:p-6 rounded-[1.5rem] text-white flex flex-col justify-between shadow-xl relative overflow-hidden group cursor-pointer active:scale-95 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-900/50">
          <div className="relative z-10">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-white/10 flex items-center justify-center mb-3 md:mb-4 border border-white/20 text-base md:text-2xl">
              <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
                psychology
              </span>
            </div>
            <h3 className="text-sm md:text-lg font-bold leading-tight mb-2">Get interview-ready with your AI Coach</h3>
            <p className="text-indigo-200/80 text-xs font-medium">Practice personalized questions for your upcoming sessions.</p>
          </div>
          <div className="mt-4 md:mt-6 flex items-center gap-2 text-xs md:text-sm font-bold relative z-10 text-indigo-100 bg-white/10 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl self-start group-hover:bg-white/20 transition-colors">
            <span>Start Session</span>
            <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </div>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
          <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
        {/* Recommended Jobs Section */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base md:text-lg font-bold text-on-surface">Recommended for You</h3>
            <a className="text-primary font-medium hover:underline flex items-center gap-1 text-sm" href="#">
              View More <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </a>
          </div>

          {/* Job Cards */}
          <div className="space-y-3">
            {/* Job 1 */}
            <div className="bg-surface-container-lowest p-4 md:p-6 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] flex flex-col sm:flex-row gap-4 md:gap-6 hover:bg-surface-container-low transition-all duration-300 hover:shadow-[0_12px_40px_-8px_rgba(25,28,30,0.12)] hover:-translate-y-1 cursor-pointer">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <img alt="Tech Corp" className="w-10 h-10 object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBtWtY6bWp6hgtB3_wwcx5LvJbCvz_6pGEKBmq7GKdU4a1UQp754fr6rlMuO85y3RglS3vdkSk0Ve6fHuPhF1eUP7fhH1zdcimBt7sCvxiHPUDLLgQoeyK_rdM-K0wp4QQOhHSOiWKYaLrPJBLt6sB9QSM9AT9RKV8Ky5NhVWyv04yhnE_6-Noey3rNT-bga2tJF99GDvL8_P2Xc2-ayxXe_o6Mrb849m_rrYzf5NTZPD5IS-M9HDq02PjuqFdR-9ODb8bzWn4Jnxg" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-lg font-bold text-on-surface">Senior UX Designer</h4>
                    <p className="text-on-surface-variant text-sm mb-2">InnovateHQ • Remote</p>
                  </div>
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">98% Match</span>
                </div>
                <div className="flex gap-2 mt-4">
                  <span className="px-3 py-1 bg-surface-container text-on-surface-variant text-xs rounded-lg">Figma</span>
                  <span className="px-3 py-1 bg-surface-container text-on-surface-variant text-xs rounded-lg">UI/UX</span>
                  <span className="px-3 py-1 bg-surface-container text-on-surface-variant text-xs rounded-lg">$140k - $180k</span>
                </div>
              </div>
            </div>

            {/* Job 2 */}
            <div className="bg-surface-container-lowest p-4 md:p-6 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] flex flex-col sm:flex-row gap-4 md:gap-6 hover:bg-surface-container-low transition-all duration-300 hover:shadow-[0_12px_40px_-8px_rgba(25,28,30,0.12)] hover:-translate-y-1 cursor-pointer">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                <img alt="Cloud Systems" className="w-10 h-10 object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBbTYW5qrUyzwVbWQFufiKK1p9iddzqgLU2z7OjdF5zagt83zJ2RoR-PaxRXQ_XBX1tP8UJdAsSc54BUPWYkHiTq_cYGonFSQ34g9GaHI6Huh_qtfNEf5-LAE7Wy2R4Yw7sPZgxl22wNGhucVKH7UY7C9mLNAM9Gw3hE1EvZKiKR1RSFYmsyw4aA0vwAW6uieCnVPvmAlcU3l3eKaz7uCWh56Xx5eqWA_dTtoLXbMLp85FqUlhm1pgIhtLLf4LyDsC_ANnAjDmND7M" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-lg font-bold text-on-surface">Product Lead</h4>
                    <p className="text-on-surface-variant text-sm mb-2">CloudScale • New York, NY</p>
                  </div>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">92% Match</span>
                </div>
                <div className="flex gap-2 mt-4">
                  <span className="px-3 py-1 bg-surface-container text-on-surface-variant text-xs rounded-lg">Strategy</span>
                  <span className="px-3 py-1 bg-surface-container text-on-surface-variant text-xs rounded-lg">SaaS</span>
                  <span className="px-3 py-1 bg-surface-container text-on-surface-variant text-xs rounded-lg">$160k+</span>
                </div>
              </div>
            </div>

            {/* Job 3 */}
            <div className="bg-surface-container-lowest p-4 md:p-6 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] flex flex-col sm:flex-row gap-4 md:gap-6 hover:bg-surface-container-low transition-all duration-300 hover:shadow-[0_12px_40px_-8px_rgba(25,28,30,0.12)] hover:-translate-y-1 cursor-pointer">
              <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center flex-shrink-0">
                <img alt="FutureFlow" className="w-10 h-10 object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDSuAP05-vsZC5b4LqvHx6d8GLTvSImagr9KzCFth-KHJviq8WGUzKY5v_fGtVxdlX5tIZ50AiU_nZtf7A3iAYnaui1GIk_gxgqBbgY4v_bBATWjQcgBRq0AdhKvZHDJT55tUZI2zRTZHg2_2oTUwSSi1QcwumAEfAfgEBwP3Cj6tA9A3qgNZYL5ou6jiGzGQm8fqHmB72RXaBz2NOFaYANdwW0yF4f9mZkzeQ_TXWwBA0FWS1zro23rMIOTKrG3NMSyaI1xArbXXo" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-lg font-bold text-on-surface">Interactive Developer</h4>
                    <p className="text-on-surface-variant text-sm mb-2">FutureFlow • San Francisco, CA</p>
                  </div>
                  <span className="px-3 py-1 bg-sky-100 text-sky-700 text-xs font-bold rounded-full">89% Match</span>
                </div>
                <div className="flex gap-2 mt-4">
                  <span className="px-3 py-1 bg-surface-container text-on-surface-variant text-xs rounded-lg">React</span>
                  <span className="px-3 py-1 bg-surface-container text-on-surface-variant text-xs rounded-lg">Three.js</span>
                  <span className="px-3 py-1 bg-surface-container text-on-surface-variant text-xs rounded-lg">$130k - $155k</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Side Widget Area */}
        <div className="lg:col-span-1 space-y-3 md:space-y-6">
          {/* Resume Performance Widget */}
          <div className="p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] bg-gradient-to-br from-[#1a0f2e] to-[#0d0618] text-white relative overflow-hidden shadow-xl transition-all duration-300 hover:shadow-2xl hover:shadow-purple-900/50 cursor-pointer">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3 flex-col sm:flex-row gap-2">
                <h3 className="text-base md:text-lg font-bold text-white">AI Resume Strength</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl md:text-2xl font-black text-white">82</span>
                  <span className="text-white/80 text-xs md:text-sm font-bold">/ 100</span>
                </div>
              </div>
              <div className="w-full h-2 md:h-3 bg-white/30 rounded-full mb-4 md:mb-6 overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: '82%' }}></div>
              </div>
              <p className="text-white/90 text-xs md:text-sm mb-6 md:mb-8 leading-relaxed">Your resume is highly optimized, but adding 2 more quantified achievements could boost your score to 90+.</p>
            </div>
            <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -left-10 -top-10 w-40 h-40 bg-purple-400/20 rounded-full blur-2xl"></div>
          </div>

          {/* Upcoming Interviews (Sidebar) */}
          <div className="p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] bg-indigo-50/50 shadow-sm border border-indigo-200/50 transition-all duration-300 hover:shadow-[0_12px_40px_-12px_rgba(79,70,229,0.15)] hover:-translate-y-1 cursor-pointer">
            <h3 className="text-sm md:text-lg font-bold text-on-surface mb-4 md:mb-6">Upcoming Interviews</h3>
            <div className="space-y-3 md:space-y-5">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                <p className="text-xs md:text-sm font-semibold text-slate-800">Senior UI Designer - Oct 25</p>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <p className="text-xs md:text-sm font-semibold text-slate-800">Technical Interview - Oct 27</p>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-2 h-2 rounded-full bg-sky-500"></div>
                <p className="text-xs md:text-sm font-semibold text-slate-800">Culture Fit Chat - Oct 30</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
