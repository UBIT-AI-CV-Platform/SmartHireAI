'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import ImageCropModal from '@/components/candidate/ImageCropModal'
import ProfileCardSection, { type CardRow } from '@/components/candidate/ProfileCardSection'
import CustomSections from '@/components/candidate/CustomSections'

type Skill = { id: number; name: string }
type Language = { id: number; name: string; level: string }

export default function BuildProfilePage() {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  // Basic info
  const [form, setForm] = useState({
    full_name: '', desired_role: '', location: '', date_of_birth: '', phone: '', email: '',
    linkedin: '', linkedin_url: '', github: '', github_url: '', discord: '', discord_url: '', summary: '',
  })
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  // Sections
  const [skills, setSkills] = useState<Skill[]>([])
  const [languages, setLanguages] = useState<Language[]>([])
  const [education, setEducation] = useState<CardRow[]>([])
  const [certifications, setCertifications] = useState<CardRow[]>([])
  const [courses, setCourses] = useState<CardRow[]>([])
  const [awards, setAwards] = useState<CardRow[]>([])
  const [projects, setProjects] = useState<CardRow[]>([])

  // Skills/languages inline inputs
  const [skillInput, setSkillInput] = useState('')
  const [showSkillInput, setShowSkillInput] = useState(false)
  const [editingSkillId, setEditingSkillId] = useState<number | null>(null)
  const [languageInput, setLanguageInput] = useState('')
  const [languageLevelInput, setLanguageLevelInput] = useState('Fluent')
  const [showLanguageInput, setShowLanguageInput] = useState(false)
  const [editingLanguageId, setEditingLanguageId] = useState<number | null>(null)

  // ── Load everything on mount ────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserId(user.id)

      const [p, sk, lg, ed, ce, co, aw, pr] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('skills').select('*').eq('profile_id', user.id).order('id'),
        supabase.from('languages').select('*').eq('profile_id', user.id).order('id'),
        supabase.from('education').select('*').eq('profile_id', user.id).order('id'),
        supabase.from('certifications').select('*').eq('profile_id', user.id).order('id'),
        supabase.from('courses').select('*').eq('profile_id', user.id).order('id'),
        supabase.from('awards').select('*').eq('profile_id', user.id).order('id'),
        supabase.from('projects').select('*').eq('profile_id', user.id).order('id'),
      ])

      if (p.data) {
        setForm({
          full_name: p.data.full_name ?? '', desired_role: p.data.desired_role ?? '',
          location: p.data.location ?? '', date_of_birth: p.data.date_of_birth ?? '',
          phone: p.data.phone ?? '', email: p.data.email ?? '',
          linkedin: p.data.linkedin ?? '', linkedin_url: p.data.linkedin_url ?? '',
          github: p.data.github ?? '', github_url: p.data.github_url ?? '',
          discord: p.data.discord ?? '', discord_url: p.data.discord_url ?? '',
          summary: p.data.summary ?? '',
        })
        setProfilePhoto(p.data.photo_url ?? null)
      }
      setSkills(sk.data ?? [])
      setLanguages(lg.data ?? [])
      setEducation((ed.data ?? []) as CardRow[])
      setCertifications((ce.data ?? []) as CardRow[])
      setCourses((co.data ?? []) as CardRow[])
      setAwards((aw.data ?? []) as CardRow[])
      setProjects((pr.data ?? []) as CardRow[])
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setField = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }))

  // ── Light validation helpers ────────────────────────────────────────────
  const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
  const isUrl = (v: string) => /^https?:\/\/.+\..+/i.test(v)
  const isPhone = (v: string) => /^\+?[\d\s()-]{7,20}$/.test(v)

  // ── Save basic info + summary + photo ───────────────────────────────────
  const handleSave = async () => {
    if (!userId) return

    // Validate before saving (only non-empty fields)
    if (form.email && !isEmail(form.email)) { setFormError('Please enter a valid email address.'); return }
    if (form.phone && !isPhone(form.phone)) { setFormError('Please enter a valid phone number.'); return }
    if (form.date_of_birth && form.date_of_birth > today) { setFormError('Date of birth cannot be in the future.'); return }
    const urlChecks: [string, string][] = [
      ['LinkedIn', form.linkedin_url], ['GitHub', form.github_url], ['Discord', form.discord_url],
    ]
    for (const [label, val] of urlChecks) {
      if (val && !isUrl(val)) { setFormError(`${label} link must be a valid URL starting with http:// or https://`); return }
    }
    setFormError(null)

    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name || null, desired_role: form.desired_role || null,
      location: form.location || null, date_of_birth: form.date_of_birth || null,
      phone: form.phone || null, email: form.email || null,
      linkedin: form.linkedin || null, linkedin_url: form.linkedin_url || null,
      github: form.github || null, github_url: form.github_url || null,
      discord: form.discord || null, discord_url: form.discord_url || null,
      summary: form.summary || null, photo_url: profilePhoto || null,
    }).eq('id', userId)
    setSaving(false)
    if (error) { alert(error.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  // ── Photo: pick → crop → upload ─────────────────────────────────────────
  const handleCameraClick = () => fileInputRef.current?.click()

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return
    // Validate: image only, JPG/PNG, max 5MB
    const allowed = ['image/jpeg', 'image/jpg', 'image/png']
    if (!allowed.includes(file.type)) {
      alert('Please choose a PNG, JPG or JPEG image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('That image is larger than 5MB. Please choose a smaller file.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setCropSrc(reader.result as string)
    reader.onerror = () => alert('Could not read that file. Please try another image.')
    reader.readAsDataURL(file)
  }

  const onCropped = async (blob: Blob) => {
    if (!userId) { setCropSrc(null); return }
    const path = `${userId}/avatar.jpg`
    const { error } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
    if (error) { alert(error.message); setCropSrc(null); return }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = `${data.publicUrl}?t=${new Date().getTime()}`
    setProfilePhoto(url)
    await supabase.from('profiles').update({ photo_url: url }).eq('id', userId)
    setCropSrc(null)
  }

  const handleRemovePhoto = async () => {
    if (!userId) return
    setProfilePhoto(null)
    await supabase.from('profiles').update({ photo_url: null }).eq('id', userId)
    await supabase.storage.from('avatars').remove([`${userId}/avatar.jpg`])
  }

  // ── Skills CRUD ─────────────────────────────────────────────────────────
  const saveSkill = async () => {
    const name = skillInput.trim()
    if (!name || !userId) return
    if (skills.some((s) => s.name.toLowerCase() === name.toLowerCase() && s.id !== editingSkillId)) {
      alert('That skill is already added.')
      return
    }
    if (editingSkillId) {
      const { data } = await supabase.from('skills').update({ name }).eq('id', editingSkillId).select().single()
      if (data) setSkills(skills.map((s) => (s.id === editingSkillId ? data : s)))
    } else {
      const { data } = await supabase.from('skills').insert({ profile_id: userId, name }).select().single()
      if (data) setSkills([...skills, data])
    }
    setSkillInput(''); setEditingSkillId(null); setShowSkillInput(false)
  }
  const editSkill = (s: Skill) => { setSkillInput(s.name); setEditingSkillId(s.id); setShowSkillInput(true) }
  const removeSkill = async (id: number) => {
    await supabase.from('skills').delete().eq('id', id)
    setSkills(skills.filter((s) => s.id !== id))
  }
  const cancelSkill = () => { setShowSkillInput(false); setEditingSkillId(null); setSkillInput('') }

  // ── Languages CRUD ──────────────────────────────────────────────────────
  const saveLanguage = async () => {
    const name = languageInput.trim()
    if (!name || !userId) return
    if (languages.some((l) => l.name.toLowerCase() === name.toLowerCase() && l.id !== editingLanguageId)) {
      alert('That language is already added.')
      return
    }
    if (editingLanguageId) {
      const { data } = await supabase.from('languages').update({ name, level: languageLevelInput }).eq('id', editingLanguageId).select().single()
      if (data) setLanguages(languages.map((l) => (l.id === editingLanguageId ? data : l)))
    } else {
      const { data } = await supabase.from('languages').insert({ profile_id: userId, name, level: languageLevelInput }).select().single()
      if (data) setLanguages([...languages, data])
    }
    setLanguageInput(''); setLanguageLevelInput('Fluent'); setEditingLanguageId(null); setShowLanguageInput(false)
  }
  const editLanguage = (l: Language) => { setLanguageInput(l.name); setLanguageLevelInput(l.level); setEditingLanguageId(l.id); setShowLanguageInput(true) }
  const removeLanguage = async (id: number) => {
    await supabase.from('languages').delete().eq('id', id)
    setLanguages(languages.filter((l) => l.id !== id))
  }
  const cancelLanguage = () => { setShowLanguageInput(false); setEditingLanguageId(null); setLanguageInput(''); setLanguageLevelInput('Fluent') }

  const inputClass = 'w-full bg-surface-container border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-surface-tint focus:bg-surface-container-lowest transition-all'

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce"></div>
          <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
          <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
        </div>
        <p className="text-sm text-on-surface-variant font-medium">Loading your profile...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 p-4 md:p-8 lg:p-10 bg-surface min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 sm:gap-4 mb-6 md:mb-8 lg:mb-10">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-[2.25rem] font-bold tracking-tight text-on-surface leading-tight">Build Profile</h1>
          <p className="text-on-surface-variant text-xs sm:text-sm md:text-base mt-1 sm:mt-2">Curate your professional presence for the AI age.</p>
        </div>
        <button
          className="flex items-center space-x-2 px-4 sm:px-6 md:px-8 py-1.5 sm:py-2 md:py-3 bg-primary text-white rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm md:text-base shadow-lg shadow-primary/20 hover:shadow-indigo-500/40 transition-all duration-300 active:scale-95 whitespace-nowrap disabled:opacity-60"
          onClick={handleSave}
          disabled={saving}
        >
          <span className="material-symbols-outlined text-base sm:text-lg">{saved ? 'check_circle' : 'save'}</span>
          <span>{saving ? 'Saving...' : saved ? 'Saved!' : 'Save Profile'}</span>
        </button>
      </div>

      {formError && (
        <div className="mb-6 flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <span className="material-symbols-outlined text-red-500">error</span>
          <p className="text-sm text-red-700 font-medium">{formError}</p>
        </div>
      )}

      <div className="space-y-4 md:space-y-6 lg:space-y-8">
        {/* Basic Info */}
        <div className="w-full bg-surface-container-lowest p-4 md:p-6 lg:p-8 rounded-[1.2rem] md:rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)]">
          <div className="flex items-center space-x-2 md:space-x-3 mb-4 md:mb-6">
            <span className="material-symbols-outlined text-primary text-base md:text-lg">person</span>
            <h2 className="text-base md:text-lg lg:text-xl font-bold">Basic Info</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Photo */}
            <div className="col-span-full flex flex-col items-center justify-center mb-8">
              <div className="relative group cursor-pointer">
                <div className="w-32 h-32 rounded-full bg-surface-container flex items-center justify-center border-4 border-white shadow-sm overflow-hidden group-hover:bg-surface-container-high transition-all relative" onClick={handleCameraClick}>
                  {profilePhoto ? (
                    <img alt="Profile photo" className="w-full h-full object-cover object-center" src={profilePhoto} />
                  ) : (
                    <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 group-hover:text-primary transition-colors">person</span>
                  )}
                </div>
                <button onClick={handleCameraClick} className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all">
                  <span className="material-symbols-outlined text-sm">photo_camera</span>
                </button>
              </div>
              <div className="mt-4 text-center">
                <span className="text-on-surface text-sm font-bold">{profilePhoto ? 'Change Photo' : 'Upload Photo'}</span>
                <p className="text-[10px] text-on-surface-variant/60 uppercase font-bold tracking-widest mt-1">PNG, JPG OR JPEG UP TO 5MB</p>
                {profilePhoto && (
                  <button onClick={handleRemovePhoto} className="mt-2 text-xs font-bold text-red-500 hover:text-red-600 inline-flex items-center gap-1 transition-colors">
                    <span className="material-symbols-outlined text-sm">delete</span>
                    Remove photo
                  </button>
                )}
              </div>
              <input ref={fileInputRef} onChange={onFilePick} accept=".png, .jpg, .jpeg" className="hidden" type="file" />
            </div>

            <div className="relative group">
              <label className="text-xs font-bold text-on-surface-variant mb-1 block">Full Name</label>
              <input className={inputClass} placeholder="Enter your full name" type="text" value={form.full_name} onChange={(e) => setField('full_name', e.target.value)} />
            </div>
            <div className="relative group">
              <label className="text-xs font-bold text-on-surface-variant mb-1 block">Desired Role</label>
              <input className={inputClass} placeholder="e.g. Senior UX Designer" type="text" value={form.desired_role} onChange={(e) => setField('desired_role', e.target.value)} />
            </div>
            <div className="relative group">
              <label className="text-xs font-bold text-on-surface-variant mb-1 block">Location</label>
              <input className={inputClass} placeholder="Enter your city and country" type="text" value={form.location} onChange={(e) => setField('location', e.target.value)} />
            </div>
            <div className="relative group">
              <label className="text-xs font-bold text-on-surface-variant mb-1 block">Date of Birth</label>
              <input className={inputClass} type="date" max={today} value={form.date_of_birth} onChange={(e) => setField('date_of_birth', e.target.value)} />
            </div>
            <div className="relative group">
              <label className="text-xs font-bold text-on-surface-variant mb-1 block">Phone Number</label>
              <input className={inputClass} placeholder="Enter your phone number" type="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
            </div>
            <div className="relative group">
              <label className="text-xs font-bold text-on-surface-variant mb-1 block">Email</label>
              <input className={inputClass} placeholder="name@example.com" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
            </div>

            {/* Socials */}
            <div className="space-y-3">
              <div className="relative group">
                <label className="text-xs font-bold text-on-surface-variant mb-1 block">LinkedIn</label>
                <input className={inputClass} placeholder="Enter LinkedIn username" type="text" value={form.linkedin} onChange={(e) => setField('linkedin', e.target.value)} />
              </div>
              <div className="pl-4 border-l-2 border-surface-container-high">
                <label className="text-[10px] font-bold text-on-surface-variant/70 mb-1 block uppercase">Profile Link/URL</label>
                <input className="w-full bg-surface-container/50 border-none rounded-lg px-3 py-2 text-sm text-on-surface focus:ring-2 focus:ring-surface-tint focus:bg-surface-container-lowest transition-all" placeholder="https://linkedin.com/in/username" type="url" value={form.linkedin_url} onChange={(e) => setField('linkedin_url', e.target.value)} />
              </div>
            </div>
            <div className="space-y-3">
              <div className="relative group">
                <label className="text-xs font-bold text-on-surface-variant mb-1 block">GitHub</label>
                <input className={inputClass} placeholder="Enter GitHub username" type="text" value={form.github} onChange={(e) => setField('github', e.target.value)} />
              </div>
              <div className="pl-4 border-l-2 border-surface-container-high">
                <label className="text-[10px] font-bold text-on-surface-variant/70 mb-1 block uppercase">Profile Link/URL</label>
                <input className="w-full bg-surface-container/50 border-none rounded-lg px-3 py-2 text-sm text-on-surface focus:ring-2 focus:ring-surface-tint focus:bg-surface-container-lowest transition-all" placeholder="https://github.com/username" type="url" value={form.github_url} onChange={(e) => setField('github_url', e.target.value)} />
              </div>
            </div>
            <div className="space-y-3">
              <div className="relative group">
                <label className="text-xs font-bold text-on-surface-variant mb-1 block">Discord</label>
                <input className={inputClass} placeholder="Enter Discord username" type="text" value={form.discord} onChange={(e) => setField('discord', e.target.value)} />
              </div>
              <div className="pl-4 border-l-2 border-surface-container-high">
                <label className="text-[10px] font-bold text-on-surface-variant/70 mb-1 block uppercase">Discord Profile URL</label>
                <input className="w-full bg-surface-container/50 border-none rounded-lg px-3 py-2 text-sm text-on-surface focus:ring-2 focus:ring-surface-tint focus:bg-surface-container-lowest transition-all" placeholder="https://discord.com/users/id" type="url" value={form.discord_url} onChange={(e) => setField('discord_url', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Professional Summary */}
        <div className="w-full bg-surface-container-lowest p-6 md:p-8 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)]">
          <div className="flex items-center space-x-3 mb-6">
            <span className="material-symbols-outlined text-primary">auto_awesome</span>
            <h2 className="text-lg md:text-xl font-bold">Professional Summary</h2>
          </div>
          <p className="text-sm text-on-surface-variant mb-4">Briefly describe your career goals and what makes you unique.</p>
          <textarea className="w-full bg-surface-container border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-surface-tint focus:bg-surface-container-lowest transition-all resize-none min-h-[120px]" placeholder="Write your professional narrative here..." value={form.summary} onChange={(e) => setField('summary', e.target.value)}></textarea>
        </div>

        {/* Skills */}
        <div className="w-full bg-surface-container-lowest p-6 md:p-8 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)]">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-3">
              <span className="material-symbols-outlined text-primary">psychology</span>
              <h2 className="text-lg md:text-xl font-bold">Skills</h2>
            </div>
            <button onClick={() => { setEditingSkillId(null); setSkillInput(''); setShowSkillInput(true) }} className="text-primary font-bold text-xs md:text-sm flex items-center gap-1 hover:bg-primary/5 px-2 md:px-3 py-1 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Add Skill</span>
            </button>
          </div>
          <div className="w-full flex flex-col">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
              {skills.map((skill) => (
                <div key={skill.id} className="px-4 py-3 bg-surface-container border border-outline-variant/30 rounded-xl flex items-center justify-between gap-2 group hover:bg-surface-container-high transition-colors">
                  <span className="font-bold text-on-surface text-sm truncate">{skill.name}</span>
                  <div className="flex items-center gap-0.5 flex-shrink-0 opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => editSkill(skill)} className="text-on-surface-variant hover:text-primary p-1 rounded-lg hover:bg-primary/5" title="Edit">
                      <span className="material-symbols-outlined text-base">edit</span>
                    </button>
                    <button onClick={() => removeSkill(skill.id)} className="text-on-surface-variant hover:text-red-500 p-1 rounded-lg hover:bg-red-50" title="Delete">
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {showSkillInput && (
              <div className="w-full max-w-2xl gap-4 flex items-end mb-6 mx-auto bg-surface-container-low p-6 rounded-xl">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-on-surface-variant mb-1 block uppercase">Skill Name</label>
                  <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveSkill()} className="w-full bg-white border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-primary transition-all outline-none" placeholder="e.g. Figma, Python" type="text" autoFocus />
                </div>
                <div className="flex gap-2">
                  <button onClick={cancelSkill} className="px-6 py-2.5 text-on-surface-variant text-sm font-bold rounded-xl transition-colors border border-outline-variant/30 bg-surface-container-low hover:bg-surface-variant">Cancel</button>
                  <button onClick={saveSkill} className="px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl shadow-md hover:opacity-90 transition-opacity">{editingSkillId ? 'Update' : 'Save Skill'}</button>
                </div>
              </div>
            )}
            {skills.length === 0 && !showSkillInput && (
              <div className="flex flex-col items-center text-center pb-6">
                <p className="text-on-surface-variant font-medium">No skills added yet</p>
                <p className="text-xs text-on-surface-variant/70 mt-1">Add your core competencies to stand out to recruiters.</p>
              </div>
            )}
          </div>
        </div>

        {/* Languages */}
        <div className="w-full bg-surface-container-lowest p-6 md:p-8 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)]">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-3">
              <span className="material-symbols-outlined text-primary">translate</span>
              <h2 className="text-lg md:text-xl font-bold">Languages</h2>
            </div>
            <button onClick={() => { setEditingLanguageId(null); setLanguageInput(''); setLanguageLevelInput('Fluent'); setShowLanguageInput(true) }} className="text-primary font-bold text-xs md:text-sm flex items-center gap-1 hover:bg-primary/5 px-2 md:px-3 py-1 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Add Language</span>
            </button>
          </div>
          <div className="flex flex-col">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              {languages.map((lang) => (
                <div key={lang.id} className="p-4 bg-surface-container border border-outline-variant/30 rounded-xl flex items-start justify-between gap-3 group hover:bg-surface-container-high transition-colors">
                  <div className="min-w-0">
                    <h3 className="font-bold text-on-surface text-sm truncate">{lang.name}</h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">{lang.level}</p>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0 opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => editLanguage(lang)} className="text-on-surface-variant hover:text-primary p-1 rounded-lg hover:bg-primary/5" title="Edit">
                      <span className="material-symbols-outlined text-base">edit</span>
                    </button>
                    <button onClick={() => removeLanguage(lang.id)} className="text-on-surface-variant hover:text-red-500 p-1 rounded-lg hover:bg-red-50" title="Delete">
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {showLanguageInput && (
              <div className="w-full max-w-2xl gap-4 flex items-end mb-6 mx-auto bg-surface-container-low p-6 rounded-xl">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-on-surface-variant mb-1 block uppercase">Language Name</label>
                  <input value={languageInput} onChange={(e) => setLanguageInput(e.target.value)} className="w-full bg-white border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-primary transition-all outline-none" placeholder="e.g. Spanish" type="text" autoFocus />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-on-surface-variant mb-1 block uppercase">Proficiency</label>
                  <select value={languageLevelInput} onChange={(e) => setLanguageLevelInput(e.target.value)} className="w-full bg-white border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-primary transition-all appearance-none cursor-pointer outline-none hover:border-primary/50">
                    <option value="Native">Native</option>
                    <option value="Fluent">Fluent</option>
                    <option value="Professional">Professional</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Elementary">Elementary</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={cancelLanguage} className="px-6 py-2.5 text-on-surface-variant text-sm font-bold rounded-xl transition-colors border border-outline-variant/30 bg-surface-container-low hover:bg-surface-variant">Cancel</button>
                  <button onClick={saveLanguage} className="px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl shadow-md hover:opacity-90 transition-opacity">{editingLanguageId ? 'Update' : 'Save'}</button>
                </div>
              </div>
            )}
            {languages.length === 0 && !showLanguageInput && (
              <div className="flex flex-col items-center text-center pb-4">
                <p className="text-on-surface-variant font-medium">No languages added yet</p>
                <p className="text-xs text-on-surface-variant/70 mt-1">Showcase your global communication skills.</p>
              </div>
            )}
          </div>
        </div>

        {/* Education */}
        <ProfileCardSection
          title="Education" icon="school" addLabel="Add Education" table="education" profileId={userId}
          items={education} setItems={setEducation}
          fields={[
            { key: 'degree', label: 'Degree / Education Name', placeholder: 'e.g. B.S. in Computer Science' },
            { key: 'institute', label: 'Institute Name', placeholder: 'e.g. Stanford University' },
            { key: 'start_year', label: 'Start Year', placeholder: 'YYYY' },
            { key: 'end_year', label: 'End Year', placeholder: 'YYYY or Present' },
          ]}
          requiredKeys={['degree', 'institute']}
          emptyTitle="No education added yet" emptyHint="List your degrees and academic background."
          renderItem={(item) => (
            <>
              <h3 className="font-bold text-on-surface">{item.degree as string}</h3>
              <p className="text-sm text-on-surface-variant">{item.institute as string}</p>
              {(item.start_year || item.end_year) && <p className="text-xs text-on-surface-variant/70 mt-1">{(item.start_year as string) || ''} - {(item.end_year as string) || ''}</p>}
            </>
          )}
        />

        {/* Certifications */}
        <ProfileCardSection
          title="Certifications" icon="verified" addLabel="Add Certification" table="certifications" profileId={userId}
          items={certifications} setItems={setCertifications}
          fields={[
            { key: 'name', label: 'Certificate Name', placeholder: 'e.g. AWS Solutions Architect' },
            { key: 'issuer', label: 'Issuer', placeholder: 'e.g. Amazon Web Services' },
            { key: 'issue_date', label: 'Date Earned', placeholder: 'Month YYYY', full: true },
          ]}
          requiredKeys={['name']}
          emptyTitle="No certifications added yet" emptyHint="Showcase your professional credentials."
          renderItem={(item) => (
            <>
              <h3 className="font-bold text-on-surface text-sm md:text-base">{item.name as string}</h3>
              {(item.issuer as string) && <p className="text-xs md:text-sm text-on-surface-variant">{item.issuer as string}</p>}
              {(item.issue_date as string) && <p className="text-xs text-on-surface-variant/70 mt-1">{item.issue_date as string}</p>}
            </>
          )}
        />

        {/* Courses */}
        <ProfileCardSection
          title="Courses" icon="video_library" addLabel="Add Course" table="courses" profileId={userId}
          items={courses} setItems={setCourses}
          fields={[
            { key: 'name', label: 'Course Name', placeholder: 'e.g. Advanced React Patterns' },
            { key: 'provider', label: 'Provider', placeholder: 'e.g. Udemy, Coursera' },
            { key: 'completion_date', label: 'Completion Date', placeholder: 'Month YYYY', full: true },
          ]}
          requiredKeys={['name']}
          emptyTitle="No courses added yet" emptyHint="Showcase your continuous learning."
          renderItem={(item) => (
            <>
              <h3 className="font-bold text-on-surface text-sm md:text-base">{item.name as string}</h3>
              {(item.provider as string) && <p className="text-xs md:text-sm text-on-surface-variant">{item.provider as string}</p>}
              {(item.completion_date as string) && <p className="text-xs text-on-surface-variant/70 mt-1">{item.completion_date as string}</p>}
            </>
          )}
        />

        {/* Awards */}
        <ProfileCardSection
          title="Awards" icon="military_tech" addLabel="Add Award" table="awards" profileId={userId}
          items={awards} setItems={setAwards}
          fields={[
            { key: 'name', label: 'Award Name', placeholder: 'e.g. Employee of the Year' },
            { key: 'issuer', label: 'Issuer', placeholder: 'e.g. Company Name' },
            { key: 'award_date', label: 'Date', placeholder: 'Month YYYY', full: true },
          ]}
          requiredKeys={['name']}
          emptyTitle="No awards added yet" emptyHint="Highlight your achievements and recognition."
          renderItem={(item) => (
            <>
              <h3 className="font-bold text-on-surface text-sm md:text-base">{item.name as string}</h3>
              {(item.issuer as string) && <p className="text-xs md:text-sm text-on-surface-variant">{item.issuer as string}</p>}
              {(item.award_date as string) && <p className="text-xs text-on-surface-variant/70 mt-1">{item.award_date as string}</p>}
            </>
          )}
        />

        {/* Projects */}
        <ProfileCardSection
          title="Projects" icon="folder_open" addLabel="Add Project" table="projects" profileId={userId}
          items={projects} setItems={setProjects}
          fields={[
            { key: 'name', label: 'Project Name', placeholder: 'e.g. E-commerce Platform' },
            { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Brief description of your project' },
            { key: 'link', label: 'Project Link (optional)', placeholder: 'https://example.com', full: true },
          ]}
          requiredKeys={['name']}
          emptyTitle="No projects added yet" emptyHint="Showcase your best work and portfolio pieces."
          renderItem={(item) => (
            <>
              <h3 className="font-bold text-on-surface text-sm md:text-base">{item.name as string}</h3>
              {(item.description as string) && <p className="text-xs md:text-sm text-on-surface-variant mt-1">{item.description as string}</p>}
              {(item.link as string) && <a href={item.link as string} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-2 inline-block break-all">{item.link as string}</a>}
            </>
          )}
        />

        {/* Custom Sections */}
        <CustomSections profileId={userId} />
      </div>

      {/* Image crop popup */}
      {cropSrc && (
        <ImageCropModal imageSrc={cropSrc} onCancel={() => setCropSrc(null)} onCropped={onCropped} />
      )}
    </div>
  )
}
