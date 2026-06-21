'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<string>('candidate')
  const [fullName, setFullName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameMsg, setNameMsg] = useState<string | null>(null)

  // password
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const [signingOut, setSigningOut] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const load = async () => {
    setLoading(true); setLoadError(false)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoadError(true); setLoading(false); return }
      setEmail(user.email || '')
      const { data, error } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
      if (error) { setLoadError(true); setLoading(false); return }
      setFullName(data?.full_name || '')
      setRole(data?.role || 'candidate')
    } catch {
      setLoadError(true)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const saveName = async () => {
    if (!fullName.trim()) { setNameMsg('Name cannot be empty.'); return }
    setSavingName(true); setNameMsg(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('id', user.id)
    setSavingName(false); setNameMsg('Saved!')
    setTimeout(() => setNameMsg(null), 2000)
  }

  const changePassword = async () => {
    setPwMsg(null)
    if (pw.length < 8) { setPwMsg({ type: 'err', text: 'Password must be at least 8 characters.' }); return }
    if (pw !== pw2) { setPwMsg({ type: 'err', text: 'Passwords do not match.' }); return }
    setSavingPw(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: pw })
    setSavingPw(false)
    if (error) { setPwMsg({ type: 'err', text: error.message }); return }
    setPw(''); setPw2('')
    setPwMsg({ type: 'ok', text: 'Password updated successfully.' })
  }

  const signOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce"></div>
          <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
          <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
        </div>
        <p className="text-xs font-black text-primary tracking-widest uppercase">Loading settings...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="p-4 md:p-8 lg:p-10 max-w-3xl mx-auto">
        <div className="bg-white rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container p-10 md:p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 mb-5"><span className="material-symbols-outlined text-3xl">cloud_off</span></div>
          <h2 className="text-lg md:text-xl font-bold text-on-surface mb-2">Couldn’t load settings</h2>
          <p className="text-sm text-on-surface-variant max-w-md mb-4">Something went wrong reaching the server. Please try again.</p>
          <button onClick={load} className="px-5 py-2.5 rounded-xl premium-gradient text-white font-bold text-sm flex items-center gap-2"><span className="material-symbols-outlined text-base">refresh</span>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-3xl mx-auto">
      <header className="mb-6 md:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-[2.25rem] font-bold tracking-tight text-on-surface leading-tight">Settings</h1>
        <p className="text-on-surface-variant text-xs sm:text-sm md:text-base mt-1 sm:mt-2">Manage your account, password, and session.</p>
      </header>

      <div className="space-y-5">
        {/* Account info */}
        <section className="bg-white rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container p-5 md:p-6">
          <h2 className="text-base font-bold text-on-surface mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-primary">account_circle</span>Account</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Email</label>
              <div className="flex items-center gap-2 px-4 py-3 bg-surface-container-low rounded-2xl text-on-surface-variant font-medium">
                <span className="material-symbols-outlined text-outline text-lg">mail</span>
                <span className="truncate">{email}</span>
                <span className="ml-auto text-[10px] font-bold text-outline uppercase">Locked</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Account type</label>
              <div className="flex items-center gap-2 px-4 py-3 bg-surface-container-low rounded-2xl text-on-surface font-medium capitalize">
                <span className="material-symbols-outlined text-primary text-lg">{role === 'recruiter' ? 'work' : 'person'}</span>
                {role}
                <span className="ml-auto text-[10px] font-medium text-outline normal-case">One email = one role</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Full name</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="flex-1 px-4 py-3 bg-surface-container-low border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all text-on-surface font-medium outline-none" placeholder="Your name" />
                <button onClick={saveName} disabled={savingName} className="px-5 py-3 rounded-2xl premium-gradient text-white font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-60">
                  <span className="material-symbols-outlined text-base">{savingName ? 'hourglass_top' : 'check'}</span>{savingName ? 'Saving...' : 'Save'}
                </button>
              </div>
              {nameMsg && <p className={`text-xs font-semibold mt-2 ml-1 ${nameMsg === 'Saved!' ? 'text-green-600' : 'text-red-600'}`}>{nameMsg}</p>}
              <p className="text-xs text-on-surface-variant mt-2 ml-1">Want to edit your skills, photo, and more? <Link href="/candidate/build-profile" className="text-primary font-semibold hover:underline">Go to Build Profile →</Link></p>
            </div>
          </div>
        </section>

        {/* Change password */}
        <section className="bg-white rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container p-5 md:p-6">
          <h2 className="text-base font-bold text-on-surface mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-primary">lock</span>Change Password</h2>
          <div className="space-y-3">
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" className="w-full px-4 py-3 pr-12 bg-surface-container-low border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all text-on-surface font-medium outline-none" />
              <button onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"><span className="material-symbols-outlined text-lg">{showPw ? 'visibility_off' : 'visibility'}</span></button>
            </div>
            <input type={showPw ? 'text' : 'password'} value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Confirm new password" className="w-full px-4 py-3 bg-surface-container-low border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all text-on-surface font-medium outline-none" />
            {pwMsg && (
              <div className={`flex items-start gap-2 rounded-xl px-4 py-3 ${pwMsg.type === 'ok' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <span className={`material-symbols-outlined ${pwMsg.type === 'ok' ? 'text-green-500' : 'text-red-500'}`}>{pwMsg.type === 'ok' ? 'check_circle' : 'error'}</span>
                <p className={`text-sm font-medium ${pwMsg.type === 'ok' ? 'text-green-700' : 'text-red-700'}`}>{pwMsg.text}</p>
              </div>
            )}
            <button onClick={changePassword} disabled={savingPw} className="px-5 py-3 rounded-2xl premium-gradient text-white font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-60">
              <span className="material-symbols-outlined text-base">{savingPw ? 'hourglass_top' : 'lock_reset'}</span>{savingPw ? 'Updating...' : 'Update password'}
            </button>
          </div>
        </section>

        {/* Session */}
        <section className="bg-white rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container p-5 md:p-6">
          <h2 className="text-base font-bold text-on-surface mb-1 flex items-center gap-2"><span className="material-symbols-outlined text-primary">logout</span>Session</h2>
          <p className="text-sm text-on-surface-variant mb-4">Sign out of your account on this device.</p>
          <button onClick={signOut} disabled={signingOut} className="px-5 py-3 rounded-2xl bg-red-50 text-red-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-100 transition-all disabled:opacity-60">
            <span className="material-symbols-outlined text-base">logout</span>{signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </section>
      </div>
    </div>
  )
}
