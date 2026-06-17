export default function HeroSection() {
  return (
    <section className="pt-40 pb-20 md:pt-48 md:pb-24 lg:pt-56 lg:pb-32 -mt-24 relative overflow-hidden" style={{
      background: `
        linear-gradient(110deg, #e0f2fe 0%, #e0e7ff 15%, #f0e7ff 30%, #e8deff 45%, #dbe9ff 60%, #e0f2fe 75%, #f0e7ff 90%, #e0e7ff 100%),
        radial-gradient(ellipse at 15% 20%, rgba(79, 70, 229, 0.25) 0%, transparent 35%),
        radial-gradient(ellipse at 85% 10%, rgba(139, 92, 246, 0.2) 0%, transparent 40%),
        radial-gradient(ellipse at 50% 80%, rgba(112, 42, 226, 0.15) 0%, transparent 45%),
        radial-gradient(ellipse at 25% 70%, rgba(168, 85, 247, 0.12) 0%, transparent 40%),
        radial-gradient(ellipse at 75% 60%, rgba(79, 70, 229, 0.1) 0%, transparent 50%)`
    }}>
      {/* Abstract Animated Elements */}
      <div className="abstract-blob w-[500px] h-[500px] bg-indigo-500/10 top-[-10%] left-[-10%]"></div>
      <div className="abstract-blob w-[400px] h-[400px] bg-purple-500/10 bottom-[0%] right-[-5%]"></div>
      <div className="abstract-blob w-[300px] h-[300px] bottom-[20%] right-[10%]"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 flex flex-col items-center text-center">
        <span className="inline-block px-3 py-1 rounded-full text-indigo-700 text-[9px] sm:text-[10px] md:text-xs font-extrabold tracking-widest uppercase mb-4 sm:mb-5 md:mb-6 glass-tag shadow-sm">
          Next-Gen Recruitment
        </span>
        <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight sm:tracking-tighter mb-4 sm:mb-5 md:mb-6 max-w-4xl leading-snug sm:leading-tight md:leading-[1.05]">
          Build Smart CVs.{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800">
            Match Jobs. Crack Interviews.
          </span>
        </h1>
        <p className="text-sm sm:text-base md:text-lg lg:text-xl text-slate-600 max-w-2xl mb-6 sm:mb-8 md:mb-10 leading-relaxed px-2 sm:px-4">
          The all-in-one ecosystem for the modern workforce. Generate ATS-optimized resumes, get hyper-personalized job
          matches, and prepare with AI-driven mock interviews.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 w-full sm:w-auto px-2 sm:px-4">
          <a href="/auth" className="premium-gradient text-white px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs md:text-sm font-bold shadow-xl shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95 inline-block text-center whitespace-nowrap">
            Get Started as Candidate
          </a>
          <a href="/auth" className="bg-white/80 backdrop-blur-sm text-indigo-700 px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs md:text-sm font-bold shadow-md transition-all hover:scale-105 active:scale-95 hover:bg-white border border-indigo-100/50 inline-block text-center whitespace-nowrap">
            Hire Talent (HR)
          </a>
        </div>
      </div>
    </section>
  )
}
