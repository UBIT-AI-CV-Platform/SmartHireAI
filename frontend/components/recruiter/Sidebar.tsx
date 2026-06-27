'use client'

import Link from 'next/link'

export const recruiterNavLinks = [
  { href: '/recruiter', label: 'Dashboard', icon: 'dashboard' },
  { href: '/recruiter/jobs', label: 'Jobs', icon: 'work' },
  { href: '/recruiter/applicants', label: 'Applicants', icon: 'group' },
  { href: '/recruiter/interviews', label: 'Interviews', icon: 'videocam' },
  { href: '/recruiter/inbox', label: 'Inbox', icon: 'inbox' },
  { href: '/recruiter/ai-screening', label: 'AI Tools', icon: 'auto_awesome' },
  { href: '/recruiter/analytics', label: 'Analytics', icon: 'monitoring' },
  { href: '/recruiter/company-profile', label: 'Company', icon: 'apartment' },
  { href: '/recruiter/settings', label: 'Settings', icon: 'settings' },
]

interface SidebarProps {
  pathname: string
  userName: string
  userEmail: string
  userPhoto?: string
  onSignOutClick: () => void
  onLinkClick?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export default function Sidebar({ pathname, userName, userEmail, userPhoto, onSignOutClick, onLinkClick, collapsed = false, onToggleCollapse }: SidebarProps) {
  const avatar = (
    <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center flex-shrink-0 overflow-hidden">
      {userPhoto ? (
        <img src={userPhoto} alt={userName} className="h-full w-full object-cover" />
      ) : (
        <span className="material-symbols-outlined text-indigo-700 dark:text-indigo-300 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>work</span>
      )}
    </div>
  )

  const isActive = (href: string) => (href === '/recruiter' ? pathname === href : pathname === href || pathname.startsWith(href + '/'))

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={`flex items-center mb-6 px-1 ${collapsed ? 'flex-col gap-2' : 'gap-3'}`}>
        <div className="w-10 h-10 premium-gradient rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/25 flex-shrink-0">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>work</span>
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-black text-slate-900 dark:text-slate-100 leading-tight tracking-tight truncate">SmartHire AI</h1>
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-400">Recruiter Portal</p>
          </div>
        )}
        {onToggleCollapse && (
          <button onClick={onToggleCollapse} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
            <span className="material-symbols-outlined text-xl">{collapsed ? 'chevron_right' : 'chevron_left'}</span>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto -mr-2 pr-2">
        {recruiterNavLinks.map((link) => {
          const active = isActive(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onLinkClick}
              title={collapsed ? link.label : undefined}
              className={`group flex items-center rounded-xl text-[13px] font-semibold transition-all duration-200 ${collapsed ? 'justify-center px-2.5 py-2.5' : 'gap-3 px-3 py-2'} ${
                active ? 'bg-gradient-to-r from-[#3525cd] to-[#712ae2] text-white shadow-lg shadow-primary/25' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
            >
              <span className="material-symbols-outlined text-[19px]" style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}>{link.icon}</span>
              {!collapsed && <span className="truncate">{link.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User card + sign out */}
      <div className="mt-auto pt-4 border-t border-slate-200/70 dark:border-white/10">
        {collapsed ? (
          <div className="flex justify-center mb-2">{avatar}</div>
        ) : (
          <div className="flex items-center gap-3 px-2 py-2.5 mb-1">
            {avatar}
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{userName}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-400 truncate">{userEmail}</p>
            </div>
          </div>
        )}
        <button
          onClick={onSignOutClick}
          title={collapsed ? 'Sign Out' : undefined}
          className={`w-full flex items-center rounded-xl text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/15 transition-all duration-200 ${collapsed ? 'justify-center px-2.5 py-3' : 'gap-3 px-3.5 py-2.5'}`}
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  )
}
