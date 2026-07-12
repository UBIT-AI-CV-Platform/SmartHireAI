'use client'

import Navigation from '@/components/landing/Navigation'
import HeroSection from '@/components/landing/HeroSection'
import RoleSelector from '@/components/landing/RoleSelector'
import FeaturesSection from '@/components/landing/FeaturesSection'
import Separator from '@/components/landing/Separator'
import HowItWorks from '@/components/landing/HowItWorks'
import AboutSection from '@/components/landing/AboutSection'
import FAQSection from '@/components/landing/FAQSection'
import CTASection from '@/components/landing/CTASection'
import Footer from '@/components/landing/Footer'

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navigation />
      {/* overflow-x-clip is the safety net for the decorative glows/blobs that
          intentionally bleed past their section on small screens. */}
      <main className="overflow-x-clip">
        <HeroSection />
        <RoleSelector />
        {/* Each section owns its own anchor id + scroll-mt, so the wrappers here
            are spacing only. */}
        <div className="-mt-8">
          <FeaturesSection />
        </div>
        <Separator />
        <div className="-mt-8">
          <HowItWorks />
        </div>
        <AboutSection />
        <div className="-mt-6">
          <FAQSection />
        </div>
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
