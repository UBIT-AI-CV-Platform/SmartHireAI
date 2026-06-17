'use client'

export default function AICoachPage() {
  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto">
      <header className="mb-6 md:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-[2.25rem] font-bold tracking-tight text-on-surface leading-tight">
          AI Interview Coach
        </h1>
        <p className="text-on-surface-variant text-xs sm:text-sm md:text-base mt-1 sm:mt-2">
          Practice with AI-generated questions and get instant, personalized feedback.
        </p>
      </header>

      <div className="bg-surface-container-lowest rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] p-10 md:p-16 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-5">
          <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            psychology
          </span>
        </div>
        <h2 className="text-lg md:text-xl font-bold text-on-surface mb-2">Coming Soon</h2>
        <p className="text-sm text-on-surface-variant max-w-md">
          Your AI interview coach is being trained. Soon you&apos;ll run mock interviews tailored to each role and get actionable feedback.
        </p>
      </div>
    </div>
  )
}
