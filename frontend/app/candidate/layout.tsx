'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/candidate/Sidebar'
import SignOutModal from '@/components/candidate/SignOutModal'

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [user, setUser] = useState({ name: 'Account', email: '', photo: '' })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, photo_url, role, role_selected')
        .eq('id', user.id)
        .single()
      // Role gating: unselected -> choose role; recruiters -> their portal
      if (profile && !profile.role_selected) {
        router.replace('/auth/select-role')
        return
      }
      if (profile && profile.role === 'recruiter') {
        router.replace('/recruiter')
        return
      }
      setUser({
        name: profile?.full_name || user.email?.split('@')[0] || 'Account',
        email: user.email || '',
        photo: profile?.photo_url || '',
      })
    })
    // re-fetch when navigating between candidate pages (e.g. after updating photo)
  }, [pathname])

  const handleSignOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="bg-background text-on-background min-h-screen">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[55] md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:fixed md:left-0 md:top-0 md:h-screen md:w-64 bg-white border-r border-slate-200/70 flex-col p-5 z-[60]">
        <Sidebar
          pathname={pathname}
          userName={user.name}
          userEmail={user.email}
          userPhoto={user.photo}
          onSignOutClick={() => setSignOutOpen(true)}
        />
      </aside>

      {/* Mobile slide-in sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-white flex flex-col p-5 z-[60] md:hidden shadow-2xl transition-transform duration-300 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          pathname={pathname}
          userName={user.name}
          userEmail={user.email}
          userPhoto={user.photo}
          onLinkClick={() => setMobileMenuOpen(false)}
          onSignOutClick={() => {
            setMobileMenuOpen(false)
            setSignOutOpen(true)
          }}
        />
      </aside>

      {/* Top bar */}
      <header className="fixed top-0 right-0 left-0 md:left-64 flex items-center justify-between px-4 md:px-8 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/70 z-50">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger + logo */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="w-8 h-8 premium-gradient rounded-lg flex items-center justify-center text-white shadow">
              <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            </div>
          </div>

          {/* Daily tip */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-full border border-indigo-100">
            <span className="material-symbols-outlined text-indigo-500 text-base">lightbulb</span>
            <span className="text-xs font-medium text-slate-600">Daily Tip: Use active verbs on your resume.</span>
          </div>
        </div>

        {/* Profile */}
        <div className="flex items-center gap-2.5">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-900 leading-tight">{user.name}</p>
            <p className="text-[10px] text-slate-400 leading-tight">Candidate</p>
          </div>
          <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
            {user.photo ? (
              <img src={user.photo} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-indigo-700 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="md:ml-64 pt-16 min-h-screen">{children}</main>

      {/* Sign-out confirmation */}
      <SignOutModal
        open={signOutOpen}
        loading={signingOut}
        onCancel={() => setSignOutOpen(false)}
        onConfirm={handleSignOut}
      />
    </div>
  )
}
