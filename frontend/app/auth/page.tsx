'use client';

import { useState } from 'react';
import BrandingSide from '@/components/auth/BrandingSide';
import LoginForm from '@/components/auth/LoginForm';
import SignupForm from '@/components/auth/SignupForm';
import SocialButton from '@/components/auth/SocialButton';
import Logo from '@/components/auth/Logo';

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  return (
    <div className="relative min-h-screen bg-[#f7f9fb] flex items-center justify-center p-3 sm:p-4 md:p-6 lg:p-8">
      {/* Back Button - Top Left of Main Container */}
      <a
        href="/"
        className="absolute top-4 left-4 md:top-6 md:left-6 lg:top-8 lg:left-8 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-white/60 backdrop-blur-md border border-white/70 text-gray-700 hover:bg-white hover:text-primary transition-all duration-300 shadow-lg group"
        aria-label="Go back"
      >
        <span className="material-symbols-outlined text-xl transition-transform duration-300 group-hover:-translate-x-0.5">
          west
        </span>
      </a>

      {/* Main Content Container */}
      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-0 rounded-2xl overflow-hidden shadow-2xl min-h-[90vh] lg:h-[90vh] auth-fade-up">
        {/* Desktop: Branding Side - Fixed */}
        <div className="hidden lg:flex lg:w-3/5 bg-gradient-to-br from-blue-50 via-purple-50 to-blue-50 auth-animated-gradient overflow-hidden">
          <BrandingSide />
        </div>

        {/* Auth Forms Container - Right Side */}
        <div className="w-full lg:w-2/5 flex flex-col bg-gradient-to-br from-blue-50 via-purple-50 to-blue-50 auth-animated-gradient text-gray-900 p-3 sm:p-4 md:p-5 lg:p-6 overflow-y-auto max-h-[90vh] lg:overflow-hidden lg:max-h-full">
          {/* Mobile: Logo Section */}
          <div className="lg:hidden mb-4 sm:mb-6 text-center">
            <Logo />
          </div>
          {/* Top: Login/Signup Tabs with Slide Indicator */}
          <div className="shrink-0 mb-2 md:mb-3 lg:mb-4 auth-fade-up" style={{ animationDelay: '0.15s' }}>
            <div className="relative flex gap-2 bg-gray-200/50 backdrop-blur-sm p-1 rounded-lg">
              {/* Sliding background */}
              <div
                className="absolute h-full bg-white rounded-md transition-all duration-500 ease-in-out shadow-md"
                style={{
                  width: '50%',
                  left: activeTab === 'login' ? '0%' : '50%',
                }}
              />
              
              {/* Buttons */}
              <button
                onClick={() => setActiveTab('login')}
                className={`flex-1 py-2 md:py-2.5 px-3 text-[11px] md:text-xs font-bold rounded-md transition-all duration-300 relative z-10 ${
                  activeTab === 'login'
                    ? 'text-primary'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setActiveTab('signup')}
                className={`flex-1 py-2 md:py-2.5 px-3 text-[11px] md:text-xs font-bold rounded-md transition-all duration-300 relative z-10 ${
                  activeTab === 'signup'
                    ? 'text-primary'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Center: Forms with Slide Animation */}
          <div className="flex-1 flex flex-col justify-center overflow-hidden min-h-0">
            <div className="relative overflow-hidden h-full">
              {/* Login Form */}
              <div
                className="transition-all duration-500 ease-in-out overflow-y-auto h-full"
                style={{
                  opacity: activeTab === 'login' ? 1 : 0,
                  transform: `translateX(${activeTab === 'login' ? '0%' : '-100%'})`,
                  pointerEvents: activeTab === 'login' ? 'auto' : 'none',
                }}
              >
                <div className="py-2 md:py-4 px-2">
                  <LoginForm />
                </div>
              </div>

              {/* Signup Form */}
              <div
                className="absolute inset-0 transition-all duration-500 ease-in-out overflow-y-auto"
                style={{
                  opacity: activeTab === 'signup' ? 1 : 0,
                  transform: `translateX(${activeTab === 'signup' ? '0%' : '100%'})`,
                  pointerEvents: activeTab === 'signup' ? 'auto' : 'none',
                }}
              >
                <div className="py-2 md:py-4 px-2">
                  <SignupForm />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom: Google Sign In */}
          <div className="pt-3 md:pt-4 shrink-0 auth-fade-up" style={{ animationDelay: '0.3s' }}>
            <div className="relative flex items-center gap-3 mb-3">
              <div className="flex-1 border-t border-gray-300/40" />
              <span className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Or continue with</span>
              <div className="flex-1 border-t border-gray-300/40" />
            </div>
            <SocialButton provider="google" />
          </div>
        </div>
      </div>
    </div>
  );
}
