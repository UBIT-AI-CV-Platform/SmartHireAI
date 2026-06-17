'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/auth/Logo'

export default function SelectRolePage() {
  const router = useRouter()
  const [role, setRole] = useState<'candidate' | 'recruiter'>('candidate')
  const [checking, setChecking] = useState(true)
  const [saving, setSaving] = useState(false)

  // Guard: must be logged in; if role already chosen, send to portal
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace('/auth')
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('role, role_selected')
        .eq('id', user.id)
        .single()
      if (data?.role_selected) {
        router.replace(data.role === 'recruiter' ? '/recruiter' : '/candidate')
        return
      }
      setChecking(false)
    })
  }, [router])

  const confirm = async () => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/auth')
      return
    }
    await supabase.from('profiles').update({ role, role_selected: true }).eq('id', user.id)
    router.replace(role === 'recruiter' ? '/recruiter' : '/candidate')
    router.refresh()
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] flex flex-col items-center justify-center gap-3">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce"></div>
          <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
          <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
        </div>
        <p className="text-sm text-on-surface-variant font-medium">Loading...</p>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-[#f7f9fb] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 md:p-8 border border-slate-100">
        <div className="text-center mb-6">
          <Logo />
        </div>
        <div className="text-center mb-6">
          <h1 className="text-lg md:text-xl font-bold text-gray-900 mb-1">One last step</h1>
          <p className="text-gray-600 text-xs md:text-sm">How will you be using SmartHire AI?</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
          <RoleCard
            label="Candidate"
            description="Build CVs, match jobs, prep interviews"
            icon="person"
            selected={role === 'candidate'}
            onClick={() => setRole('candidate')}
          />
          <RoleCard
            label="Recruiter / HR"
            description="Post jobs, screen & hire talent"
            icon="badge"
            selected={role === 'recruiter'}
            onClick={() => setRole('recruiter')}
          />
        </div>

        <button
          onClick={confirm}
          disabled={saving}
          className="w-full bg-gradient-to-r from-[#3525cd] to-[#712ae2] text-white py-2.5 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:shadow-indigo-200/50 transition-all duration-300 disabled:opacity-50"
        >
          {saving ? 'Setting up...' : 'Continue'}
        </button>
        <p className="text-center text-[10px] md:text-[11px] text-gray-500 mt-3">
          This can&apos;t be changed later, so choose carefully.
        </p>
      </div>
    </div>
  )
}

function RoleCard({
  label, description, icon, selected, onClick,
}: { label: string; description: string; icon: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-4 rounded-2xl border-2 text-center transition-all duration-300 ${
        selected
          ? 'border-indigo-400 bg-indigo-100/70 scale-[1.02] shadow-md'
          : 'border-indigo-200/40 bg-white/60 hover:bg-white/80'
      }`}
    >
      <div className={`mx-auto mb-2 w-11 h-11 rounded-xl flex items-center justify-center ${selected ? 'bg-primary text-white' : 'bg-indigo-100 text-primary'}`}>
        <span className="material-symbols-outlined text-2xl">{icon}</span>
      </div>
      <p className="text-sm font-bold text-gray-900">{label}</p>
      <p className="text-[10px] md:text-[11px] text-gray-500 mt-0.5 leading-tight">{description}</p>
    </button>
  )
}
