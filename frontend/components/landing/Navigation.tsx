'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/shared/ThemeToggle'
import { Icon } from '@/components/ui/icon'
import { AvatarImage } from '@/components/ui/optimized-image'
import BrandLogo from '@/components/shared/BrandLogo'

/** Who the landing nav should greet, once we know. */
type NavUser = {
  name: string
  photo: string
  /** What we show under the name: "Candidate", "Recruiter", or the setup nudge. */
  label: string
  icon: string
  href: string
}

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [dashboardHref, setDashboardHref] = useState('/auth')
  const [scrolled, setScrolled] = useState(false)
  // 'loading' keeps a placeholder in the slot so the nav doesn't flash "Sign Up" at a
  // signed-in visitor before the session resolves.
  const [authState, setAuthState] = useState<'loading' | 'guest' | 'user'>('loading')
  const [navUser, setNavUser] = useState<NavUser | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setAuthState('guest'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, role_selected, full_name, photo_url, company_name')
        .eq('id', user.id)
        .single()

      const fallbackName = user.email?.split('@')[0] || 'Account'

      // Signed in, but never picked a role - send them to finish that, not to a
      // dashboard they don't have yet.
      if (!profile || !profile.role_selected) {
        setDashboardHref('/auth/select-role')
        setNavUser({
          name: profile?.full_name || fallbackName,
          photo: profile?.photo_url || '',
          label: 'Finish setup',
          icon: 'person',
          href: '/auth/select-role',
        })
        setAuthState('user')
        return
      }

      const isRecruiter = profile.role === 'recruiter'
      const href = isRecruiter ? '/recruiter' : '/candidate'
      setDashboardHref(href)
      setNavUser({
        name: (isRecruiter ? profile.company_name || profile.full_name : profile.full_name) || fallbackName,
        photo: profile.photo_url || '',
        label: isRecruiter ? 'Recruiter' : 'Candidate',
        icon: isRecruiter ? 'work' : 'person',
        href,
      })
      setAuthState('user')
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

          {/* Right: session-aware slot - a greeting when we know who you are, the
              sign-up call to action when we don't. */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <ThemeToggle />

            {authState === 'loading' ? (
              // Same footprint as the two real states, so nothing jumps when it resolves.
              <div className="hidden sm:block h-10 w-32 rounded-full bg-black/5 dark:bg-white/10 animate-pulse" />
            ) : navUser ? (
              <a
                href={navUser.href}
                title={`Go to your ${navUser.label === 'Recruiter' ? 'recruiter' : 'candidate'} dashboard`}
                className="hidden sm:flex items-center gap-2.5 rounded-full border border-black/5 bg-white/70 py-1 pl-1 pr-4 backdrop-blur transition-colors hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-500/15">
                  {navUser.photo ? (
                    <AvatarImage src={navUser.photo} alt={navUser.name} size={64} />
                  ) : (
                    <Icon name={navUser.icon} solid className="text-base text-indigo-700 dark:text-indigo-300" />
                  )}
                </span>
                <span className="leading-tight">
                  <span className="block max-w-[9rem] truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                    {navUser.name}
                  </span>
                  <span className="block text-[10px] font-medium text-slate-400">{navUser.label}</span>
                </span>
              </a>
            ) : (
              <a
                href="/auth"
                className="hidden sm:inline-block premium-gradient text-white px-5 md:px-6 py-2 rounded-full text-sm font-semibold shadow-lg shadow-primary/20 border-2 border-transparent transition-all hover:bg-none hover:bg-[#6366f1] hover:border-[#6366f1]"
              >
                Sign Up
              </a>
            )}

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

            {navUser ? (
              <a
                href={navUser.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex w-full max-w-xs items-center gap-3 rounded-2xl border border-black/5 bg-black/[0.02] p-2.5 text-left transition-colors hover:bg-black/[0.04] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-500/15">
                  {navUser.photo ? (
                    <AvatarImage src={navUser.photo} alt={navUser.name} size={80} />
                  ) : (
                    <Icon name={navUser.icon} solid className="text-lg text-indigo-700 dark:text-indigo-300" />
                  )}
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-sm font-bold text-slate-900 dark:text-slate-100">{navUser.name}</span>
                  <span className="block text-[11px] font-medium text-slate-400">{navUser.label}</span>
                </span>
                <Icon name="chevron_right" className="shrink-0 text-lg text-slate-400" />
              </a>
            ) : (
              <a
                href="/auth"
                className="w-full max-w-xs premium-gradient text-white py-2.5 rounded-full font-semibold shadow-lg shadow-primary/20 transition-all border-2 border-transparent hover:bg-none hover:bg-[#6366f1] hover:border-[#6366f1] text-center text-sm"
              >
                Sign Up
              </a>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
