'use client'

import { useState } from 'react'

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

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

  return (
    <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-white border border-slate-200 transition-all duration-300 rounded-2xl shadow-lg w-11/12 max-w-6xl">
      <div className="flex justify-between items-center px-3 sm:px-4 md:px-8 py-3.5 w-full">
        {/* Logo */}
        <div className="text-xl font-bold tracking-tight shrink-0">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 premium-gradient rounded-lg md:rounded-xl flex items-center justify-center text-white shadow-lg">
              <span className="material-symbols-outlined text-sm md:text-base" style={{ fontVariationSettings: '"FILL" 1' }}>
                auto_awesome
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-base md:text-lg font-black text-slate-900 leading-tight">SmartHire</span>
              <span className="text-base md:text-lg font-black text-primary leading-tight">AI</span>
            </div>
          </div>
        </div>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-6 xl:gap-8 ml-auto mr-8 font-sans antialiased text-sm font-medium tracking-tight">
          <a className="nav-link text-slate-600 hover:text-indigo-600 transition-colors duration-300" href="/auth">
            Dashboard
          </a>
          <a className="nav-link text-slate-600 hover:text-indigo-600 transition-colors duration-300" href="#features" onClick={(e) => {
            e.preventDefault();
            document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
          }}>
            Features
          </a>
          <a className="nav-link text-slate-600 hover:text-indigo-600 transition-colors duration-300" href="#how-it-works" onClick={(e) => {
            e.preventDefault();
            document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
          }}>
            How It Works
          </a>
          <a className="nav-link text-slate-600 hover:text-indigo-600 transition-colors duration-300" href="/auth">
            For Candidates
          </a>
          <a className="nav-link text-slate-600 hover:text-indigo-600 transition-colors duration-300" href="/auth">
            For Recruiters
          </a>
          <a className="nav-link text-slate-600 hover:text-indigo-600 transition-colors duration-300" href="#faq" onClick={(e) => {
            e.preventDefault();
            document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
          }}>
            FAQ
          </a>
        </div>

        {/* Desktop & Tablet CTA */}
        <div className="flex items-center gap-2 sm:gap-4 lg:ml-0 ml-auto">
          <div className="hidden sm:flex items-center gap-4 mr-2 sm:mr-0">
            <a 
              href="/auth"
              className="premium-gradient text-white border-2 border-transparent px-5 md:px-6 py-2 rounded-full text-sm font-semibold transition-all hover:bg-none hover:bg-[#6366f1] hover:border-[#6366f1] shadow-lg shadow-primary/20 inline-block">
              Sign Up
            </a>
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={toggleMobileMenu}
            aria-label="Toggle Menu"
            className="lg:hidden p-2 text-slate-900 focus:outline-none"
          >
            <span className="material-symbols-outlined text-2xl">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className={`absolute top-full left-0 right-0 mt-3 bg-white border border-slate-200 rounded-2xl lg:hidden shadow-2xl overflow-hidden ${
          isClosing 
            ? 'animate-out slide-out-to-top-4 duration-300' 
            : 'animate-in slide-in-from-top-4 duration-500'
        }`}>
          <div className="flex flex-col items-center justify-center py-6 px-4 w-full text-center gap-4">
            <a className="nav-link text-slate-800 font-semibold text-base hover:text-primary transition-colors" href="/auth">
              Dashboard
            </a>
            <a className="nav-link text-slate-800 font-semibold text-base hover:text-primary transition-colors" href="#features" onClick={(e) => {
              e.preventDefault();
              document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              setMobileMenuOpen(false);
            }}>
              Features
            </a>
            <a className="nav-link text-slate-800 font-semibold text-base hover:text-primary transition-colors" href="#how-it-works" onClick={(e) => {
              e.preventDefault();
              document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
              setMobileMenuOpen(false);
            }}>
              How It Works
            </a>
            <a className="nav-link text-slate-800 font-semibold text-base hover:text-primary transition-colors" href="/auth">
              For Candidates
            </a>
            <a className="nav-link text-slate-800 font-semibold text-base hover:text-primary transition-colors" href="/auth">
              For Recruiters
            </a>
            <a className="nav-link text-slate-800 font-semibold text-base hover:text-primary transition-colors" href="#faq" onClick={(e) => {
              e.preventDefault();
              document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
              setMobileMenuOpen(false);
            }}>
              FAQ
            </a>
            <div className="w-full h-px bg-slate-100 my-2"></div>
            <div className="flex flex-col gap-2 w-full max-w-xs sm:hidden">
              <a href="/auth" className="w-full premium-gradient text-white py-2.5 rounded-lg font-semibold shadow-lg shadow-primary/20 transition-all border-2 border-transparent hover:bg-none hover:bg-[#6366f1] hover:border-[#6366f1] block text-center text-sm">
                Sign Up
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
