export default function HowItWorks() {
  const steps = [
    {
      id: 1,
      number: '1',
      title: 'Create Profile',
      description: 'Add your details, skills, and experience to build your foundation.',
      bgColor: 'bg-[#fff1f2]',
      borderColor: 'border-pink-100',
      circleBg: 'bg-pink-200',
      circleColor: 'text-pink-700',
      badgeBg: 'bg-white border-pink-400 text-pink-700',
      icon: 'person_add',
      textColor: 'text-pink-950',
      descColor: 'text-pink-900/70',
    },
    {
      id: 2,
      number: '2',
      title: 'Generate CV',
      description: 'AI creates your ATS-optimized resume instantly for maximum impact.',
      bgColor: 'bg-[#f0f9ff]',
      borderColor: 'border-blue-100',
      circleBg: 'bg-blue-200',
      circleColor: 'text-blue-700',
      badgeBg: 'bg-white border-blue-400 text-blue-700',
      icon: 'auto_awesome',
      textColor: 'text-blue-950',
      descColor: 'text-blue-900/70',
    },
    {
      id: 3,
      number: '3',
      title: 'Get Matched',
      description: 'Discover jobs that match your profile with real-time match scores.',
      bgColor: 'bg-[#fff7ed]',
      borderColor: 'border-orange-100',
      circleBg: 'bg-orange-200',
      circleColor: 'text-orange-700',
      badgeBg: 'bg-white border-orange-400 text-orange-700',
      icon: 'travel_explore',
      textColor: 'text-orange-950',
      descColor: 'text-orange-900/70',
    },
    {
      id: 4,
      number: '4',
      title: 'Apply & Prepare',
      description: 'Apply with one click and practice with AI-driven mock interviews.',
      bgColor: 'bg-[#faf5ff]',
      borderColor: 'border-purple-100',
      circleBg: 'bg-purple-200',
      circleColor: 'text-purple-700',
      badgeBg: 'bg-white border-purple-400 text-purple-700',
      icon: 'rocket_launch',
      textColor: 'text-purple-950',
      descColor: 'text-purple-900/70',
    },
  ]

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-16" id="how-it-works">
      <div className="text-center mb-6 sm:mb-9 md:mb-12">
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-on-surface tracking-tighter mb-2">
          How It Works
        </h2>
        <p className="text-primary font-bold text-xs sm:text-sm md:text-base lg:text-lg tracking-tight max-w-2xl mx-auto px-4">
          Simple Steps to Your Dream Job
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex flex-col items-center text-center group ${step.bgColor} p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] border ${step.borderColor} transition-all`}
          >
            <div className="relative mb-3 sm:mb-4">
              <div
                className={`w-12 sm:w-14 h-12 sm:h-14 ${step.circleBg} rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500`}
              >
                <span
                  className={`material-symbols-outlined ${step.circleColor} text-xl sm:text-2xl`}
                >
                  {step.icon}
                </span>
              </div>
              <div
                className={`absolute -top-1 -right-1 w-5 h-5 ${step.badgeBg} border-2 font-black flex items-center justify-center rounded-full text-[7px] sm:text-[8px] shadow-sm`}
              >
                {step.number}
              </div>
            </div>
            <h4 className={`text-sm sm:text-base md:text-lg font-extrabold ${step.textColor} mb-1`}>
              {step.title}
            </h4>
            <p className={`${step.descColor} text-[11px] sm:text-xs font-medium`}>
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
