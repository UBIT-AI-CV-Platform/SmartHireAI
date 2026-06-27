'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ImageCropModal from '@/components/candidate/ImageCropModal'

const SIZES = ['1–10', '11–50', '51–200', '201–500', '500+']

type Form = {
  full_name: string
  company_name: string
  company_website: string
  company_industry: string
  company_size: string
  location: string
  company_about: string
}
const EMPTY: Form = { full_name: '', company_name: '', company_website: '', company_industry: '', company_size: '', location: '', company_about: '' }

export default function CompanyProfilePage() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [uid, setUid] = useState<string | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [photo, setPhoto] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const load = async () => {
    setLoading(true); setLoadError(false)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoadError(true); setLoading(false); return }
      setUid(user.id)
      const { data, error } = await supabase.from('profiles').select('full_name, company_name, company_website, company_industry, company_size, location, company_about, photo_url').eq('id', user.id).single()
      if (error) { setLoadError(true); setLoading(false); return }
      setForm({
        full_name: data?.full_name || '',
        company_name: data?.company_name || '',
        company_website: data?.company_website || '',
        company_industry: data?.company_industry || '',
        company_size: data?.company_size || '',
        location: data?.location || '',
        company_about: data?.company_about || '',
      })
      setPhoto(data?.photo_url || null)
    } catch {
      setLoadError(true)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setMsg({ type: 'err', text: 'Please choose an image file.' }); return }
    if (file.size > 5 * 1024 * 1024) { setMsg({ type: 'err', text: 'Image must be under 5MB.' }); return }
    const reader = new FileReader()
    reader.onload = () => setCropSrc(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const onCropped = async (blob: Blob) => {
    if (!uid) return
    setUploading(true); setCropSrc(null)
    const supabase = createClient()
    const path = `${uid}/avatar.jpg`
    const { error } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = data.publicUrl
      const { error: urlErr } = await supabase.from('profiles').update({ photo_url: url }).eq('id', uid)
      if (urlErr) { console.error('photo_url update failed:', urlErr.message) }
      // Cache-buster only for immediate on-screen refresh; the DB keeps the clean URL.
      setPhoto(`${url}?t=${Date.now()}`)
    } else {
      setMsg({ type: 'err', text: 'Could not upload the logo. Please try again.' })
    }
    setUploading(false)
  }

  const save = async () => {
    if (!uid) return
    if (!form.company_name.trim()) { setMsg({ type: 'err', text: 'Company name is required.' }); return }
    if (form.company_website && !/^https?:\/\/.+/i.test(form.company_website)) { setMsg({ type: 'err', text: 'Website must start with http:// or https://' }); return }
    setSaving(true); setMsg(null)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name.trim() || null,
      company_name: form.company_name.trim(),
      company_website: form.company_website.trim() || null,
      company_industry: form.company_industry.trim() || null,
      company_size: form.company_size || null,
      location: form.location.trim() || null,
      company_about: form.company_about.trim() || null,
    }).eq('id', uid)
    setSaving(false)
    setMsg(error ? { type: 'err', text: error.message } : { type: 'ok', text: 'Company profile saved!' })
    if (!error) setTimeout(() => setMsg(null), 2500)
  }

  if (loading) return <Loader />
  if (loadError) return <ErrorBox onRetry={load} />

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-6xl mx-auto">
      <header className="mb-6 md:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-[2.25rem] font-bold tracking-tight text-on-surface leading-tight">Company Profile</h1>
        <p className="text-on-surface-variant text-xs sm:text-sm md:text-base mt-1 sm:mt-2">This is what candidates see on your job posts. Keep it sharp.</p>
      </header>

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 lg:col-span-8 space-y-5">
        {/* Logo + identity */}
        <section className="bg-white dark:bg-[#2c2c2e] rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container p-5 md:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center border border-surface-container">
                {photo ? <img src={photo} alt="Logo" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-indigo-700 dark:text-indigo-300 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>apartment</span>}
              </div>
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full premium-gradient text-white flex items-center justify-center shadow-lg hover:scale-105 transition-all disabled:opacity-60" title="Upload logo">
                <span className="material-symbols-outlined text-lg">{uploading ? 'hourglass_top' : 'photo_camera'}</span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
            </div>
            <div className="flex-1 w-full space-y-4">
              <Field label="Company name *" value={form.company_name} onChange={(v) => set('company_name', v)} placeholder="Acme Inc." />
              <Field label="Your name (recruiter)" value={form.full_name} onChange={(v) => set('full_name', v)} placeholder="Jane Doe" />
            </div>
          </div>
        </section>

        {/* Details */}
        <section className="bg-white dark:bg-[#2c2c2e] rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container p-5 md:p-6 space-y-4">
          <h2 className="text-base font-bold text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-primary">info</span>Company Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Website" value={form.company_website} onChange={(v) => set('company_website', v)} placeholder="https://acme.com" />
            <Field label="Industry" value={form.company_industry} onChange={(v) => set('company_industry', v)} placeholder="Software, Fintech…" />
            <Field label="Location" value={form.location} onChange={(v) => set('location', v)} placeholder="Lahore / Remote" />
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Company size</label>
              <div className="relative">
                <select value={form.company_size} onChange={(e) => set('company_size', e.target.value)} className="w-full appearance-none px-4 pr-10 py-3 bg-surface-container-low border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white dark:focus:bg-[#2c2c2e] transition-all text-on-surface font-medium outline-none cursor-pointer">
                  <option value="">Select…</option>
                  {SIZES.map((s) => <option key={s} value={s}>{s} employees</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">expand_more</span>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 ml-1">About the company</label>
            <textarea value={form.company_about} onChange={(e) => set('company_about', e.target.value)} rows={5} className="w-full px-4 py-3 bg-surface-container-low border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white dark:focus:bg-[#2c2c2e] transition-all text-on-surface text-sm font-medium placeholder:text-outline-variant outline-none resize-none" placeholder="What does your company do? What's the mission and culture?" />
          </div>
        </section>

        {msg && (
          <div className={`flex items-start gap-2 rounded-xl px-4 py-3 ${msg.type === 'ok' ? 'bg-green-50 dark:bg-green-500/15 border border-green-200 dark:border-white/10' : 'bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-white/10'}`}>
            <span className={`material-symbols-outlined ${msg.type === 'ok' ? 'text-green-500' : 'text-red-500'}`}>{msg.type === 'ok' ? 'check_circle' : 'error'}</span>
            <p className={`text-sm font-medium ${msg.type === 'ok' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>{msg.text}</p>
          </div>
        )}

        <button onClick={save} disabled={saving} className="w-full sm:w-auto px-6 py-3.5 rounded-2xl premium-gradient text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] transition-all disabled:opacity-60">
          <span className="material-symbols-outlined text-lg">{saving ? 'hourglass_top' : 'save'}</span>{saving ? 'Saving...' : 'Save company profile'}
        </button>
        </div>

        {/* Live preview + tips */}
        <aside className="col-span-12 lg:col-span-4 space-y-4 lg:sticky lg:top-20 self-start">
          <div className="bg-white dark:bg-[#2c2c2e] rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3">Candidate preview</p>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center flex-shrink-0 border border-surface-container">
                {photo ? <img src={photo} alt="Logo" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-indigo-700 dark:text-indigo-300 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>apartment</span>}
              </div>
              <div className="min-w-0">
                <h4 className="text-base font-bold text-on-surface truncate">{form.company_name || 'Your Company'}</h4>
                <p className="text-xs text-on-surface-variant truncate">{[form.company_industry, form.location].filter(Boolean).join(' • ') || 'Industry • Location'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {form.company_size && <span className="px-2.5 py-1 bg-surface-container text-on-surface-variant text-xs font-semibold rounded-lg flex items-center gap-1"><span className="material-symbols-outlined text-sm">groups</span>{form.company_size}</span>}
              {form.company_website && <a href={form.company_website} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-lg flex items-center gap-1 hover:bg-primary/15"><span className="material-symbols-outlined text-sm">link</span>Website</a>}
            </div>
            {form.company_about && <p className="text-sm text-on-surface-variant mt-3 leading-relaxed line-clamp-5">{form.company_about}</p>}
            {form.full_name && <p className="text-xs text-outline mt-3 pt-3 border-t border-surface-container">Recruiter: <span className="font-semibold text-on-surface-variant">{form.full_name}</span></p>}
          </div>

          <div className="p-5 rounded-[1.5rem] bg-pink-200/50 dark:bg-pink-500/15 border border-pink-300/30 dark:border-white/10">
            <div className="flex items-center gap-2 mb-2"><span className="material-symbols-outlined text-pink-700 dark:text-pink-300" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span><h3 className="text-sm font-black text-pink-950 dark:text-pink-300">A strong profile</h3></div>
            <ul className="text-xs text-pink-900/80 dark:text-pink-300 leading-relaxed space-y-1.5 list-disc list-inside">
              <li>Add a logo — posts with logos get more applicants.</li>
              <li>Write a clear, honest "About" with your mission.</li>
              <li>Keep website &amp; industry up to date for trust.</li>
            </ul>
          </div>
        </aside>
      </div>

      {cropSrc && <ImageCropModal imageSrc={cropSrc} onCancel={() => setCropSrc(null)} onCropped={onCropped} />}
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 ml-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-4 py-3 bg-surface-container-low border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white dark:focus:bg-[#2c2c2e] transition-all text-on-surface text-sm font-medium placeholder:text-outline-variant outline-none" />
    </div>
  )
}

function Loader() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-32">
      <div className="flex gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce"></div>
        <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
        <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
      </div>
      <p className="text-xs font-black text-primary tracking-widest uppercase">Loading...</p>
    </div>
  )
}

function ErrorBox({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-3xl mx-auto">
      <div className="bg-white dark:bg-[#2c2c2e] rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container p-10 md:p-16 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/15 flex items-center justify-center text-red-500 dark:text-red-300 mb-5"><span className="material-symbols-outlined text-3xl">cloud_off</span></div>
        <h2 className="text-lg md:text-xl font-bold text-on-surface mb-2">Couldn’t load profile</h2>
        <p className="text-sm text-on-surface-variant max-w-md mb-4">Something went wrong. Please try again.</p>
        <button onClick={onRetry} className="px-5 py-2.5 rounded-xl premium-gradient text-white font-bold text-sm flex items-center gap-2"><span className="material-symbols-outlined text-base">refresh</span>Retry</button>
      </div>
    </div>
  )
}
