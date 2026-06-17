'use client'

import Navigation from '@/components/landing/Navigation'
import HeroSection from '@/components/landing/HeroSection'
import RoleSelector from '@/components/landing/RoleSelector'
import FeaturesSection from '@/components/landing/FeaturesSection'
import Separator from '@/components/landing/Separator'
import HowItWorks from '@/components/landing/HowItWorks'
import FAQSection from '@/components/landing/FAQSection'
import CTASection from '@/components/landing/CTASection'
import Footer from '@/components/landing/Footer'

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        <HeroSection />
        <RoleSelector />
        <section id="features" className="-mt-8">
          <FeaturesSection />
        </section>
        <Separator />
        <section id="how-it-works" className="-mt-8">
          <HowItWorks />
        </section>
        <section id="faq" className="-mt-6">
          <FAQSection />
        </section>
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
