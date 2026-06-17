export default function CTASection() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">
      <div className="rounded-[2rem] p-8 md:p-12 text-center relative overflow-hidden vibrant-cta-gradient border border-indigo-100 shadow-xl">
        {/* Background Blobs */}
        <div className="absolute top-0 left-0 w-48 md:w-64 h-48 md:h-64 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 opacity-60"></div>
        <div className="absolute bottom-0 right-0 w-64 md:w-80 h-64 md:h-80 bg-secondary/15 rounded-full blur-3xl translate-x-1/4 translate-y-1/4 opacity-60"></div>

        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black mb-2 sm:mb-3 leading-tight text-indigo-950">
            Ready to transform your hiring workflow?
          </h2>
          <p className="text-xs sm:text-sm md:text-base mb-4 sm:mb-5 md:mb-6 text-indigo-800/80 font-medium">
            Join over 2,000+ forward-thinking companies already using SmartHire AI.
          </p>
          <div className="flex justify-center">
            <a href="/auth" className="px-6 sm:px-8 md:px-10 py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm md:text-base shadow-xl shadow-primary/20 transition-transform hover:scale-105 active:scale-95 premium-gradient text-white inline-block whitespace-nowrap">
              Get Started Now
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
