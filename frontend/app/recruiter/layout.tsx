'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/recruiter/Sidebar'
import SignOutModal from '@/components/candidate/SignOutModal'
import NotificationsBell from '@/components/candidate/NotificationsBell'
import ThemeToggle from '@/components/shared/ThemeToggle'

export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [user, setUser] = useState({ name: 'Recruiter', email: '', photo: '', company: '' })
  const [collapsed, setCollapsed] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setCollapsed(localStorage.getItem('shai_rec_nav_collapsed') === '1')
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/auth'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, photo_url, role, role_selected, company_name')
        .eq('id', user.id)
        .single()
      // Role gating: unselected -> choose role; candidates -> their portal
      if (profile && !profile.role_selected) { router.replace('/auth/select-role'); return }
      if (profile && profile.role === 'candidate') { router.replace('/candidate'); return }
      setUser({
        name: profile?.full_name || user.email?.split('@')[0] || 'Recruiter',
        email: user.email || '',
        photo: profile?.photo_url || '',
        company: profile?.company_name || '',
      })
      setReady(true)
      // send any due "upcoming interview" reminders (one-time per interview)
      supabase.rpc('generate_interview_reminders')
    })
  }, [pathname])

  const toggleCollapse = () => setCollapsed((c) => {
    const next = !c
    localStorage.setItem('shai_rec_nav_collapsed', next ? '1' : '0')
    return next
  })

  const handleSignOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="bg-background text-on-background min-h-screen">
      {mobileMenuOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[55] md:hidden" onClick={() => setMobileMenuOpen(false)} />}

      {/* Desktop sidebar */}
      <aside className={`hidden md:flex md:fixed md:left-0 md:top-0 md:h-screen bg-white dark:bg-[#1c1c1e] border-r border-slate-200/70 dark:border-white/10 flex-col z-[60] transition-all duration-300 ${collapsed ? 'md:w-20 p-3' : 'md:w-64 p-5'}`}>
        <Sidebar pathname={pathname} userName={user.name} userEmail={user.email} userPhoto={user.photo} onSignOutClick={() => setSignOutOpen(true)} collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      </aside>

      {/* Mobile slide-in sidebar */}
      <aside className={`fixed left-0 top-0 h-screen w-64 bg-white dark:bg-[#1c1c1e] flex flex-col p-5 z-[60] md:hidden shadow-2xl transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar pathname={pathname} userName={user.name} userEmail={user.email} userPhoto={user.photo} onLinkClick={() => setMobileMenuOpen(false)} onSignOutClick={() => { setMobileMenuOpen(false); setSignOutOpen(true) }} />
      </aside>

      {/* Top bar */}
      <header className={`fixed top-0 right-0 left-0 flex items-center justify-between px-4 md:px-8 h-16 bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-md border-b border-slate-200/70 dark:border-white/10 z-50 transition-all duration-300 ${collapsed ? 'md:left-20' : 'md:left-64'}`}>
        <div className="flex items-center gap-3">
          <div className="flex md:hidden items-center gap-2">
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors" aria-label="Open menu">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="w-8 h-8 premium-gradient rounded-lg flex items-center justify-center text-white shadow">
              <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>work</span>
            </div>
          </div>
          {user.company && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/15 rounded-full border border-indigo-100 dark:border-white/10">
              <span className="material-symbols-outlined text-indigo-500 text-base">apartment</span>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{user.company}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <NotificationsBell basePath="/recruiter" />
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">{user.name}</p>
            <p className="text-[10px] text-slate-400 leading-tight">Recruiter</p>
          </div>
          <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center border-2 border-white dark:border-white/10 shadow-sm overflow-hidden">
            {user.photo ? (
              <img src={user.photo} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-indigo-700 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>work</span>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className={`pt-16 min-h-screen transition-all duration-300 ${collapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        {ready ? children : (
          <div className="flex items-center justify-center py-32 gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce" />
            <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
            <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
          </div>
        )}
      </main>

      <SignOutModal open={signOutOpen} loading={signingOut} onCancel={() => setSignOutOpen(false)} onConfirm={handleSignOut} />
    </div>
  )
}
