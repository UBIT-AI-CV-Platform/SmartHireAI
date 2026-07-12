'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/shared/ThemeToggle'
import { Icon } from '@/components/ui/icon'
import BrandLogo from '@/components/shared/BrandLogo'

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [dashboardHref, setDashboardHref] = useState('/auth')
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, role_selected')
        .eq('id', user.id)
        .single()
      if (!profile || !profile.role_selected) setDashboardHref('/auth/select-role')
      else setDashboardHref(profile.role === 'recruiter' ? '/recruiter' : '/candidate')
    })
  }, [])

  // Glassmorphism kicks in once the user scrolls away from the hero.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const toggleMobileMenu = () => {
    if (mobileMenuOpen) {
      setIsClosing(true)
      setTimeout(() => {
        setMobileMenuOpen(false)
        setIsClosing(false)
      }, 300)
    } else {
      setMobileMenuOpen(true)
    }
  }

  const scrollToId = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMobileMenuOpen(false)
  }

  const links: { label: string; href?: string; onClick?: (e: React.MouseEvent) => void }[] = [
    { label: 'Dashboard', href: dashboardHref },
    { label: 'Features', href: '#features', onClick: scrollToId('features') },
    { label: 'How It Works', href: '#how-it-works', onClick: scrollToId('how-it-works') },
    { label: 'For Candidates', href: dashboardHref },
    { label: 'For Recruiters', href: dashboardHref },
    { label: 'FAQ', href: '#faq', onClick: scrollToId('faq') },
  ]

  return (
    <nav
      className={`nav-enter fixed top-0 inset-x-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'bg-white/70 dark:bg-[#1c1c1e]/70 backdrop-blur-xl border-b border-black/5 dark:border-white/10 shadow-lg shadow-black/5'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="relative w-full px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between h-16 md:h-17">
          {/* Left: logo */}
          <a href="/" className="shrink-0" aria-label="SmartHire AI home">
            <BrandLogo size={30} />
          </a>

          {/* Center: nav options. Only from xl - at lg the six links cram into the
              centred column and wrap onto two lines, so tablets get the hamburger. */}
          <div className="hidden xl:flex items-center gap-7 2xl:gap-9 absolute left-1/2 -translate-x-1/2 text-sm font-medium tracking-tight">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={link.onClick}
                className="whitespace-nowrap text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-300"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right: buttons */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <ThemeToggle />
            <a
              href={dashboardHref}
              className="hidden sm:inline-block premium-gradient text-white px-5 md:px-6 py-2 rounded-full text-sm font-semibold shadow-lg shadow-primary/20 border-2 border-transparent transition-all hover:bg-none hover:bg-[#6366f1] hover:border-[#6366f1]"
            >
              Sign Up
            </a>

            {/* Mobile toggle */}
            <button
              onClick={toggleMobileMenu}
              aria-label="Toggle Menu"
              className="xl:hidden p-2 text-slate-900 dark:text-slate-100 focus:outline-none"
            >
              <Icon name={mobileMenuOpen ? 'close' : 'menu'} className="text-2xl" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          className={`xl:hidden bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-xl border-b border-black/5 dark:border-white/10 shadow-2xl max-h-[calc(100svh-4rem)] overflow-y-auto overscroll-contain ${
            isClosing ? 'animate-out slide-out-to-top-4 duration-300' : 'animate-in slide-in-from-top-4 duration-500'
          }`}
        >
          <div className="flex flex-col items-center justify-center py-6 px-4 w-full text-center gap-4">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={link.onClick ?? (() => setMobileMenuOpen(false))}
                className="text-slate-800 dark:text-slate-200 font-semibold text-base hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="w-full h-px bg-slate-100 dark:bg-white/10 my-2" />
            <a
              href={dashboardHref}
              className="w-full max-w-xs premium-gradient text-white py-2.5 rounded-full font-semibold shadow-lg shadow-primary/20 transition-all border-2 border-transparent hover:bg-none hover:bg-[#6366f1] hover:border-[#6366f1] text-center text-sm"
            >
              Sign Up
            </a>
          </div>
        </div>
      )}
    </nav>
  )
}
