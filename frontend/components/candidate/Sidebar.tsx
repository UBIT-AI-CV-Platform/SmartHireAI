'use client'

import Link from 'next/link'

export const candidateNavLinks = [
  { href: '/candidate', label: 'Overview', icon: 'dashboard' },
  { href: '/candidate/build-profile', label: 'Build Profile', icon: 'person_edit' },
  { href: '/candidate/cv-generator', label: 'CV Generator', icon: 'auto_awesome' },
  { href: '/candidate/my-applications', label: 'My Applications', icon: 'work_history' },
  { href: '/candidate/ai-coach', label: 'AI Interview Coach', icon: 'psychology' },
]

interface SidebarProps {
  pathname: string
  userName: string
  userEmail: string
  userPhoto?: string
  onSignOutClick: () => void
  onLinkClick?: () => void
}

export default function Sidebar({ pathname, userName, userEmail, userPhoto, onSignOutClick, onLinkClick }: SidebarProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-3 mb-8 px-1">
        <div className="w-10 h-10 premium-gradient rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/25">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
        </div>
        <div>
          <h1 className="text-base font-black text-slate-900 leading-tight tracking-tight">SmartHire AI</h1>
          <p className="text-[11px] font-medium text-slate-400">Candidate Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5">
        {candidateNavLinks.map((link) => {
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onLinkClick}
              className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-[#3525cd] to-[#712ae2] text-white shadow-lg shadow-primary/25'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {link.icon}
              </span>
              <span>{link.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User card + sign out */}
      <div className="mt-auto pt-4 border-t border-slate-200/70">
        <div className="flex items-center gap-3 px-2 py-2.5 mb-1">
          <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {userPhoto ? (
              <img src={userPhoto} alt={userName} className="h-full w-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-indigo-700 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{userName}</p>
            <p className="text-[11px] text-slate-400 truncate">{userEmail}</p>
          </div>
        </div>
        <button
          onClick={onSignOutClick}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )
}
