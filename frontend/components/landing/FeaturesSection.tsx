export default function FeaturesSection() {
  const features = [
    {
      id: 1,
      title: 'AI CV Generator',
      description: 'Create ATS-optimized resumes in minutes with AI assistance.',
      bgColor: 'bg-[#fff1f2]',
      borderColor: 'border-pink-100',
      iconColor: 'text-pink-500',
      icon: 'description',
      textColor: 'text-pink-950',
      descColor: 'text-pink-900/70',
    },
    {
      id: 2,
      title: 'Smart Job Matching',
      description: 'Get matched with roles that perfectly fit your skills.',
      bgColor: 'bg-[#f0f9ff]',
      borderColor: 'border-blue-100',
      iconColor: 'text-blue-500',
      icon: 'hub',
      textColor: 'text-blue-950',
      descColor: 'text-blue-900/70',
    },
    {
      id: 3,
      title: 'HR Dashboard',
      description: 'Streamline hiring with powerful recruitment analytics.',
      bgColor: 'bg-[#fff7ed]',
      borderColor: 'border-orange-100',
      iconColor: 'text-orange-500',
      icon: 'dashboard_customize',
      textColor: 'text-orange-950',
      descColor: 'text-orange-900/70',
    },
    {
      id: 4,
      title: 'Interview Prep',
      description: 'Practice with AI-generated questions and get feedback.',
      bgColor: 'bg-[#faf5ff]',
      borderColor: 'border-purple-100',
      iconColor: 'text-purple-500',
      icon: 'record_voice_over',
      textColor: 'text-purple-950',
      descColor: 'text-purple-900/70',
    },
  ]

  return (
    <section className="bg-surface-container-low/30 py-10 md:py-16 px-4" id="features">
      <div className="max-w-7xl mx-auto px-2 md:px-6">
        <div className="text-center mb-6 sm:mb-8 md:mb-10 relative">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-on-surface tracking-tighter mb-2">
            Powerful Features
          </h2>
          <p className="text-primary font-bold text-xs sm:text-sm md:text-base lg:text-lg tracking-tight max-w-2xl mx-auto px-4">
            Everything You Need to Succeed in the Modern Market
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {features.map((feature) => (
            <div
              key={feature.id}
              className={`group ${feature.bgColor} p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] transition-all duration-300 hover:shadow-xl border ${feature.borderColor}`}
            >
              <div className="w-10 sm:w-12 h-10 sm:h-12 bg-white rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 shadow-sm group-hover:scale-110 transition-transform">
                <span
                  className={`material-symbols-outlined ${feature.iconColor} text-xl sm:text-2xl`}
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  {feature.icon}
                </span>
              </div>
              <h4 className={`text-sm sm:text-base md:text-lg font-extrabold ${feature.textColor} mb-1.5 sm:mb-2`}>
                {feature.title}
              </h4>
              <p className={`${feature.descColor} text-xs sm:text-sm leading-relaxed font-medium`}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
