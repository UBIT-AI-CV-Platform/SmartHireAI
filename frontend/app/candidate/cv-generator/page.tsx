'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useReactToPrint } from 'react-to-print'
import { createClient } from '@/lib/supabase/client'

type Contact = {
  email?: string; phone?: string; location?: string
  linkedin?: string; linkedin_url?: string
  github?: string; github_url?: string
  discord?: string; discord_url?: string
}
type CV = {
  full_name: string
  title: string
  photo_url?: string
  contact?: Contact
  summary: string
  experience: { role: string; organization: string; period: string; bullets: string[] }[]
  education: { degree: string; institute: string; period: string }[]
  skills: string[]
  certifications?: { name: string; issuer?: string; date?: string }[]
  courses?: { name: string; provider?: string; date?: string }[]
  awards?: { name: string; issuer?: string; date?: string }[]
  custom_sections?: { heading: string; items: { title: string; description?: string }[] }[]
  ats_score: number
  ats_summary?: string
  ats_breakdown?: { label: string; score: number; note: string }[]
  missing_keywords?: string[]
  suggestions: string[]
}

type CVHistoryRow = { id: string; target_role: string | null; ats_score: number | null; created_at: string; content: CV; is_favorite: boolean }
type CoverRow = { id: string; target_role: string | null; company: string | null; tone: string | null; content: string; created_at: string; is_favorite: boolean }

const TONES = ['Professional', 'Concise', 'Detailed', 'Creative', 'Technical', 'Academic']

const FONTS: Record<string, string> = {
  Sans: "'Inter', system-ui, sans-serif",
  Serif: "Georgia, 'Times New Roman', serif",
  Mono: "'Courier New', ui-monospace, monospace",
}

const SECTION_KEYS = ['Summary', 'Experience', 'Education', 'Skills', 'Certifications', 'Courses', 'Awards']

const TEMPLATES = ['Modern', 'Classic', 'Minimal'] as const
type Template = (typeof TEMPLATES)[number]

type Accent = { text: string; chip: string; link: string; dot: string }
const ACCENTS: Record<string, Accent> = {
  Indigo: { text: 'text-indigo-700', chip: 'bg-indigo-50 text-indigo-700', link: 'text-indigo-600', dot: 'bg-indigo-500' },
  Emerald: { text: 'text-emerald-700', chip: 'bg-emerald-50 text-emerald-700', link: 'text-emerald-600', dot: 'bg-emerald-500' },
  Rose: { text: 'text-rose-700', chip: 'bg-rose-50 text-rose-700', link: 'text-rose-600', dot: 'bg-rose-500' },
  Amber: { text: 'text-amber-700', chip: 'bg-amber-50 text-amber-700', link: 'text-amber-600', dot: 'bg-amber-500' },
  Sky: { text: 'text-sky-700', chip: 'bg-sky-50 text-sky-700', link: 'text-sky-600', dot: 'bg-sky-500' },
  Slate: { text: 'text-slate-700', chip: 'bg-slate-100 text-slate-700', link: 'text-slate-700', dot: 'bg-slate-500' },
}

const hasPeriod = (p?: string) => {
  if (!p) return false
  const x = p.trim().toLowerCase()
  return x !== '' && x !== 'date not specified' && x !== 'n/a' && x !== 'not specified'
}

export default function CVGeneratorPage() {
  const [targetRole, setTargetRole] = useState('')
  const [tone, setTone] = useState('Professional')
  const [customInstructions, setCustomInstructions] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cv, setCv] = useState<CV | null>(null)

  // Documents history (CVs + cover letters)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<CVHistoryRow[]>([])
  const [coverHistory, setCoverHistory] = useState<CoverRow[]>([])
  const [docTab, setDocTab] = useState<'cvs' | 'covers'>('cvs')
  const [favOnly, setFavOnly] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  // Quick-view popup (stores type + id so it stays in sync with the live list)
  const [preview, setPreview] = useState<{ type: 'cv' | 'cover'; id: string } | null>(null)

  // Cover letter
  const [showCover, setShowCover] = useState(false)
  const [coverCompany, setCoverCompany] = useState('')
  const [coverLoading, setCoverLoading] = useState(false)
  const [coverText, setCoverText] = useState('')
  const [coverError, setCoverError] = useState<string | null>(null)
  const [coverId, setCoverId] = useState<string | null>(null)
  const [coverFav, setCoverFav] = useState(false)

  const generateCover = async () => {
    setCoverLoading(true)
    setCoverError(null)
    try {
      const res = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole, tone, company: coverCompany, jobDescription }),
      })
      const data = await res.json()
      if (!res.ok) setCoverError(data.error || 'Something went wrong.')
      else { setCoverText(data.letter || ''); setCoverId(data.id ?? null); setCoverFav(false) }
    } catch {
      setCoverError('Network error. Please try again.')
    }
    setCoverLoading(false)
  }

  const toggleCoverFav = async () => {
    if (!coverId) return
    const next = !coverFav
    setCoverFav(next)
    const supabase = createClient()
    await supabase.from('cover_letters').update({ is_favorite: next }).eq('id', coverId)
    setCoverHistory((h) => h.map((r) => (r.id === coverId ? { ...r, is_favorite: next } : r)))
  }

  const downloadCover = () => {
    const blob = new Blob([coverText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${cv?.full_name || 'Cover'}_Cover_Letter.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  const [docxLoading, setDocxLoading] = useState(false)
  const downloadDocx = async () => {
    if (!cv) return
    setDocxLoading(true)
    try {
      const { cvToDocxBlob } = await import('@/lib/cvDocx')
      const blob = await cvToDocxBlob(cv)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${cv.full_name || 'CV'}.docx`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Could not create the Word file. Please try again.')
    }
    setDocxLoading(false)
  }

  // Presentation options
  const [layout, setLayout] = useState<'single' | 'two'>('single')
  const [includePhoto, setIncludePhoto] = useState(false)
  const [accentKey, setAccentKey] = useState('Indigo')
  const a = ACCENTS[accentKey]
  const [font, setFont] = useState('Sans')
  const [template, setTemplate] = useState<Template>('Modern')
  const [hidden, setHidden] = useState<string[]>([])
  const isHidden = (k: string) => hidden.includes(k)
  const toggleHidden = (k: string) => setHidden((h) => (h.includes(k) ? h.filter((x) => x !== k) : [...h, k]))

  const previewRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({ contentRef: previewRef, documentTitle: cv ? `${cv.full_name}_CV` : 'CV' })

  const [restoring, setRestoring] = useState(true)

  // Inline editing
  const [cvId, setCvId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [savingEdits, setSavingEdits] = useState(false)
  const edit = (fn: (d: CV) => void) =>
    setCv((c) => {
      if (!c) return c
      const d = structuredClone(c) as CV
      fn(d)
      return d
    })

  const saveEdits = async () => {
    if (!cv) return
    setEditing(false)
    if (!cvId) return
    setSavingEdits(true)
    const supabase = createClient()
    await supabase.from('cvs').update({ content: cv }).eq('id', cvId)
    setSavingEdits(false)
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setRestoring(false); return }
      const [prof, latest] = await Promise.all([
        supabase.from('profiles').select('desired_role').eq('id', user.id).single(),
        supabase.from('cvs').select('id, content, target_role, tone').eq('profile_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      if (prof.data?.desired_role) setTargetRole(prof.data.desired_role)
      if (latest.data?.content) {
        setCv(latest.data.content as CV)
        setCvId(latest.data.id as string)
        if (latest.data.target_role) setTargetRole(latest.data.target_role)
        if (latest.data.tone) setTone(latest.data.tone)
      }
      setRestoring(false)
    })
  }, [])

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/generate-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole, tone, customInstructions, jobDescription }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error || 'Something went wrong.')
      else { setCv(data.cv); setCvId(data.id ?? null); setEditing(false) }
    } catch {
      setError('Network error. Please try again.')
    }
    setLoading(false)
  }

  const openHistory = async () => {
    setShowHistory(true)
    setHistoryLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setHistoryLoading(false); return }
    const [cvRes, coverRes] = await Promise.all([
      supabase
        .from('cvs')
        .select('id, target_role, ats_score, created_at, content, is_favorite')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('cover_letters')
        .select('id, target_role, company, tone, content, created_at, is_favorite')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ])
    setHistory((cvRes.data as CVHistoryRow[]) ?? [])
    setCoverHistory((coverRes.data as CoverRow[]) ?? [])
    setHistoryLoading(false)
  }

  const loadFromHistory = (row: CVHistoryRow) => {
    if (row.content) setCv(row.content)
    setCvId(row.id)
    setEditing(false)
    setShowHistory(false)
  }

  const renameCV = async (row: CVHistoryRow) => {
    const name = window.prompt('Rename this CV', row.target_role || '')
    if (name === null) return
    const supabase = createClient()
    await supabase.from('cvs').update({ target_role: name.trim() || null }).eq('id', row.id)
    setHistory((h) => h.map((r) => (r.id === row.id ? { ...r, target_role: name.trim() || null } : r)))
  }

  const deleteCV = async (row: CVHistoryRow) => {
    if (!window.confirm('Delete this CV permanently?')) return
    const supabase = createClient()
    await supabase.from('cvs').delete().eq('id', row.id)
    setHistory((h) => h.filter((r) => r.id !== row.id))
  }

  const toggleFavCV = async (row: CVHistoryRow) => {
    const next = !row.is_favorite
    setHistory((h) => h.map((r) => (r.id === row.id ? { ...r, is_favorite: next } : r)))
    const supabase = createClient()
    await supabase.from('cvs').update({ is_favorite: next }).eq('id', row.id)
  }

  const loadCover = (row: CoverRow) => {
    setCoverText(row.content)
    setCoverId(row.id)
    setCoverFav(row.is_favorite)
    setCoverCompany(row.company || '')
    setShowHistory(false)
    setShowCover(true)
    setCoverError(null)
  }

  const deleteCover = async (row: CoverRow) => {
    if (!window.confirm('Delete this cover letter permanently?')) return
    const supabase = createClient()
    await supabase.from('cover_letters').delete().eq('id', row.id)
    setCoverHistory((h) => h.filter((r) => r.id !== row.id))
    if (coverId === row.id) { setCoverId(null); setCoverFav(false) }
  }

  const toggleFavCoverRow = async (row: CoverRow) => {
    const next = !row.is_favorite
    setCoverHistory((h) => h.map((r) => (r.id === row.id ? { ...r, is_favorite: next } : r)))
    if (coverId === row.id) setCoverFav(next)
    const supabase = createClient()
    await supabase.from('cover_letters').update({ is_favorite: next }).eq('id', row.id)
  }

  // ── CV section blocks (reused for single & two-column layouts) ──────────
  const summaryEl = cv?.summary && !isHidden('Summary') ? (
    <Section title="Professional Summary" accent={a} variant={template}>
      <Editable as="div" editing={editing} value={cv.summary} onSave={(v) => edit((d) => { d.summary = v })} className="text-on-surface leading-relaxed text-sm sm:text-[15px]" />
    </Section>
  ) : null

  const experienceEl = cv && cv.experience?.length > 0 && !isHidden('Experience') ? (
    <Section title="Experience" accent={a} variant={template}>
      <div className="space-y-6">
        {cv.experience.map((exp, i) => (
          <div key={i} className="cv-keep">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-0.5 mb-1">
              <Editable as="div" editing={editing} value={exp.role} onSave={(v) => edit((d) => { d.experience[i].role = v })} className="text-base sm:text-lg font-bold text-on-surface" />
              {(hasPeriod(exp.period) || editing) && (
                <Editable editing={editing} value={exp.period || ''} onSave={(v) => edit((d) => { d.experience[i].period = v })} className="text-xs sm:text-sm font-semibold text-outline" />
              )}
            </div>
            {(exp.organization || editing) && (
              <Editable as="div" editing={editing} value={exp.organization || ''} onSave={(v) => edit((d) => { d.experience[i].organization = v })} className={`text-sm font-bold mb-2 ${a.text}`} />
            )}
            <ul className="text-sm text-on-surface-variant space-y-1.5 list-disc list-inside marker:text-current">
              {exp.bullets?.map((b, j) => (
                <li key={j}><Editable editing={editing} value={b} onSave={(v) => edit((d) => { d.experience[i].bullets[j] = v })} /></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  ) : null

  const educationEl = cv && cv.education?.length > 0 && !isHidden('Education') ? (
    <Section title="Education" accent={a} variant={template}>
      <div className="space-y-3">
        {cv.education.map((e, i) => (
          <div key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline cv-keep">
            <div>
              <Editable as="div" editing={editing} value={e.degree} onSave={(v) => edit((d) => { d.education[i].degree = v })} className="text-base font-bold text-on-surface" />
              <Editable as="div" editing={editing} value={e.institute} onSave={(v) => edit((d) => { d.education[i].institute = v })} className="text-sm text-on-surface-variant" />
            </div>
            {(hasPeriod(e.period) || editing) && (
              <Editable editing={editing} value={e.period || ''} onSave={(v) => edit((d) => { d.education[i].period = v })} className="text-xs sm:text-sm font-semibold text-outline" />
            )}
          </div>
        ))}
      </div>
    </Section>
  ) : null

  const skillsEl = cv && cv.skills?.length > 0 && !isHidden('Skills') ? (
    <Section title="Skills" accent={a} variant={template}>
      <div className="flex flex-wrap gap-2 cv-keep">
        {cv.skills.map((s, i) => (
          <span key={i} className={`px-3 py-1.5 font-bold text-xs sm:text-sm rounded-lg ${a.chip}`}>
            <Editable editing={editing} value={s} onSave={(v) => edit((d) => { d.skills[i] = v })} />
          </span>
        ))}
      </div>
    </Section>
  ) : null

  const certsEl = cv && cv.certifications && cv.certifications.length > 0 && !isHidden('Certifications') ? (
    <Section title="Certifications" accent={a} variant={template}>
      <div className="space-y-3">
        {cv.certifications.map((c, i) => (
          <div key={i} className="flex items-start gap-2.5 cv-keep">
            <span className={`material-symbols-outlined text-lg mt-0.5 ${a.text}`} style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            <div>
              <Editable as="div" editing={editing} value={c.name} onSave={(v) => edit((d) => { if (d.certifications) d.certifications[i].name = v })} className="text-sm font-bold text-on-surface leading-tight" />
              {(c.issuer || c.date) && (
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {c.issuer}{c.issuer && c.date ? ' • ' : ''}{c.date}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Section>
  ) : null

  const coursesEl = cv && cv.courses && cv.courses.length > 0 && !isHidden('Courses') ? (
    <Section title="Courses" accent={a} variant={template}>
      <div className="space-y-3">
        {cv.courses.map((c, i) => (
          <div key={i} className="flex items-start gap-2.5 cv-keep">
            <span className={`material-symbols-outlined text-lg mt-0.5 ${a.text}`} style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
            <div>
              <Editable as="div" editing={editing} value={c.name} onSave={(v) => edit((d) => { if (d.courses) d.courses[i].name = v })} className="text-sm font-bold text-on-surface leading-tight" />
              {(c.provider || c.date) && <p className="text-xs text-on-surface-variant mt-0.5">{c.provider}{c.provider && c.date ? ' • ' : ''}{c.date}</p>}
            </div>
          </div>
        ))}
      </div>
    </Section>
  ) : null

  const awardsEl = cv && cv.awards && cv.awards.length > 0 && !isHidden('Awards') ? (
    <Section title="Awards" accent={a} variant={template}>
      <div className="space-y-3">
        {cv.awards.map((c, i) => (
          <div key={i} className="flex items-start gap-2.5 cv-keep">
            <span className={`material-symbols-outlined text-lg mt-0.5 ${a.text}`} style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
            <div>
              <Editable as="div" editing={editing} value={c.name} onSave={(v) => edit((d) => { if (d.awards) d.awards[i].name = v })} className="text-sm font-bold text-on-surface leading-tight" />
              {(c.issuer || c.date) && <p className="text-xs text-on-surface-variant mt-0.5">{c.issuer}{c.issuer && c.date ? ' • ' : ''}{c.date}</p>}
            </div>
          </div>
        ))}
      </div>
    </Section>
  ) : null

  const customEls = (cv?.custom_sections ?? [])
    .filter((s) => s.heading && s.items?.length)
    .map((s, si) => (
      <Section key={si} title={s.heading} accent={a} variant={template}>
        <div className="space-y-3">
          {s.items.map((it, ii) => (
            <div key={ii} className="cv-keep">
              <Editable as="div" editing={editing} value={it.title} onSave={(v) => edit((d) => { if (d.custom_sections) d.custom_sections[si].items[ii].title = v })} className="text-sm font-bold text-on-surface" />
              {(it.description || editing) && <Editable as="div" editing={editing} value={it.description || ''} onSave={(v) => edit((d) => { if (d.custom_sections) d.custom_sections[si].items[ii].description = v })} className="text-sm text-on-surface-variant mt-0.5" />}
            </div>
          ))}
        </div>
      </Section>
    ))

  return (
    <div className="p-4 md:p-8 pb-32 min-h-screen">
      {/* Control bar */}
      <section className="mb-6 bg-white p-4 md:p-6 rounded-3xl cv-preview-shadow border border-surface-container">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
          <div className="flex flex-col sm:flex-row flex-1 w-full gap-4 sm:gap-6 sm:items-end">
            <div className="flex-1 group">
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Target Role</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">search</span>
                <input
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all text-on-surface font-medium placeholder:text-outline-variant outline-none"
                  placeholder="e.g. Frontend Developer"
                  type="text"
                />
              </div>
            </div>
            <div className="w-full sm:w-52">
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Tone</label>
              <FancySelect value={tone} options={TONES} onChange={setTone} />
            </div>
          </div>
          <div className="w-full md:w-auto">
            <button
              onClick={generate}
              disabled={loading}
              className="h-[56px] w-full md:w-auto justify-center px-10 rounded-2xl premium-gradient text-white font-bold flex items-center gap-2 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-60 disabled:hover:scale-100"
            >
              <span className="material-symbols-outlined">{loading ? 'hourglass_top' : 'magic_button'}</span>
              {loading ? 'Generating...' : 'Generate CV'}
            </button>
          </div>
        </div>

        {/* Custom instructions */}
        <div className="mt-4">
          <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 ml-1">
            Custom Instructions <span className="text-outline-variant lowercase font-medium tracking-normal">— optional</span>
          </label>
          <textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            rows={2}
            maxLength={1000}
            className="w-full px-4 py-3 bg-surface-container-low border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all text-on-surface text-sm font-medium placeholder:text-outline-variant outline-none resize-none"
            placeholder="Tell the AI what you want. e.g. 'Keep it to one page, emphasize my React & e-commerce work, highlight teamwork.'"
          />
        </div>

        {/* Job description targeting */}
        <div className="mt-4">
          <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 ml-1">
            Target Job Description <span className="text-outline-variant lowercase font-medium tracking-normal">— optional, for ATS match</span>
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={3}
            maxLength={4000}
            className="w-full px-4 py-3 bg-surface-container-low border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all text-on-surface text-sm font-medium placeholder:text-outline-variant outline-none resize-none"
            placeholder="Paste a job posting here. The AI will tailor your CV to it, score the match, and list missing keywords."
          />
        </div>
      </section>

      {/* Customize (layout / photo / colour / font / sections) */}
      <section className="mb-8 bg-white p-4 md:p-5 rounded-3xl cv-preview-shadow border border-surface-container flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 sm:gap-x-6">
          <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-2 w-full sm:w-auto">
            <span className="material-symbols-outlined text-primary text-base">tune</span>Customize
          </span>
          {/* Template */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-on-surface-variant">Template</span>
            <div className="flex bg-surface-container-low rounded-xl p-1">
              {TEMPLATES.map((t) => (
                <button key={t} onClick={() => setTemplate(t)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${template === t ? 'bg-white shadow text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          {/* Layout */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-on-surface-variant">Layout</span>
            <div className="flex bg-surface-container-low rounded-xl p-1">
              {(['single', 'two'] as const).map((l) => (
                <button key={l} onClick={() => setLayout(l)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${layout === l ? 'bg-white shadow text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>
                  {l === 'single' ? 'Single' : 'Two Column'}
                </button>
              ))}
            </div>
          </div>
          {/* Font */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-on-surface-variant">Font</span>
            <div className="flex bg-surface-container-low rounded-xl p-1">
              {Object.keys(FONTS).map((f) => (
                <button key={f} onClick={() => setFont(f)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${font === f ? 'bg-white shadow text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          {/* Photo */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-on-surface-variant">Photo</span>
            <button onClick={() => setIncludePhoto((v) => !v)} className={`relative w-12 h-6 rounded-full transition-colors ${includePhoto ? 'bg-primary' : 'bg-surface-container-high'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${includePhoto ? 'translate-x-6' : ''}`}></span>
            </button>
          </div>
          {/* Accent colour */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-on-surface-variant">Colour</span>
            <div className="flex gap-1.5">
              {Object.entries(ACCENTS).map(([key, val]) => (
                <button key={key} onClick={() => setAccentKey(key)} title={key} className={`w-6 h-6 rounded-full ${val.dot} transition-transform hover:scale-110 ${accentKey === key ? 'ring-2 ring-offset-2 ring-on-surface/40 scale-110' : ''}`} />
              ))}
            </div>
          </div>
          {/* Cover letter + History */}
          <div className="w-full sm:w-auto sm:ml-auto flex items-center gap-2">
            <button onClick={() => { setShowCover(true); setCoverError(null) }} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-container-low text-on-surface font-bold text-xs hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-base">mail</span>
              Cover Letter
            </button>
            <button onClick={openHistory} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-container-low text-on-surface font-bold text-xs hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-base">folder_open</span>
              My CVs
            </button>
          </div>
        </div>

        {/* Section show/hide */}
        <div className="flex flex-wrap items-center gap-2 border-t border-surface-container pt-3">
          <span className="text-xs font-bold text-on-surface-variant mr-1">Sections</span>
          {SECTION_KEYS.map((k) => {
            const on = !isHidden(k)
            return (
              <button
                key={k}
                onClick={() => toggleHidden(k)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${on ? 'bg-primary/10 text-primary' : 'bg-surface-container-low text-on-surface-variant line-through opacity-60'}`}
              >
                <span className="material-symbols-outlined text-sm">{on ? 'check_circle' : 'cancel'}</span>
                {k}
              </button>
            )
          })}
        </div>
      </section>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 max-w-4xl">
          <span className="material-symbols-outlined text-red-500">error</span>
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Content grid */}
      <div className="grid grid-cols-12 gap-4 md:gap-8 items-start">
        {/* CV preview */}
        <div className="col-span-12 lg:col-span-8 order-1">
          <div ref={previewRef} style={{ fontFamily: FONTS[font] }} className="bg-white rounded-[2rem] cv-preview-shadow overflow-hidden lg:min-h-[800px] flex flex-col border border-surface-container">
            {loading || restoring ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-16 min-h-[600px]">
                <div className="flex gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce"></div>
                  <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
                </div>
                <p className="text-xs font-black text-primary tracking-widest uppercase">{loading ? 'AI is crafting your CV...' : 'Loading your CV...'}</p>
              </div>
            ) : !cv ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-16 min-h-[600px] text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                  <span className="material-symbols-outlined text-3xl">description</span>
                </div>
                <h3 className="text-lg font-bold text-on-surface">Your CV will appear here</h3>
                <p className="text-sm text-on-surface-variant max-w-sm">Enter a target role, set your options, and click <span className="font-semibold text-primary">Generate CV</span>. Make sure your profile is filled in first.</p>
                <Link href="/candidate/build-profile" className="mt-2 text-sm font-bold text-primary hover:underline">Go to Build Profile →</Link>
              </div>
            ) : (
              <div className="p-5 sm:p-8 lg:p-12">
                {/* Header */}
                <div className={`flex gap-5 pb-5 ${template === 'Classic' ? 'flex-col items-center text-center' : 'items-start'}`}>
                  {includePhoto && cv.photo_url && (
                    <img src={cv.photo_url} alt={cv.full_name} className="w-24 h-24 rounded-2xl object-cover flex-shrink-0 border border-surface-container shadow-sm" />
                  )}
                  <div className="flex-1 min-w-0">
                    <Editable as="div" editing={editing} value={cv.full_name} onSave={(v) => edit((d) => { d.full_name = v })} className="text-3xl sm:text-4xl font-black text-on-surface tracking-tighter mb-1" />
                    <Editable as="div" editing={editing} value={cv.title} onSave={(v) => edit((d) => { d.title = v })} className={`text-lg sm:text-xl font-semibold mb-4 ${a.text}`} />
                    <div className={`flex flex-wrap gap-x-5 gap-y-1.5 text-xs sm:text-sm font-medium ${template === 'Classic' ? 'justify-center' : ''}`}>
                      <ContactItem icon="mail" text={cv.contact?.email} />
                      <ContactItem icon="call" text={cv.contact?.phone} />
                      <ContactItem icon="location_on" text={cv.contact?.location} />
                      <ContactItem icon="link" text={cv.contact?.linkedin || cv.contact?.linkedin_url} href={cv.contact?.linkedin_url} accent={a} />
                      <ContactItem icon="code" text={cv.contact?.github || cv.contact?.github_url} href={cv.contact?.github_url} accent={a} />
                      <ContactItem icon="forum" text={cv.contact?.discord || cv.contact?.discord_url} href={cv.contact?.discord_url} accent={a} />
                    </div>
                  </div>
                </div>
                {template === 'Minimal' ? (
                  <div className="h-px w-full bg-surface-container mb-7"></div>
                ) : template === 'Classic' ? (
                  <div className={`h-1 w-24 mx-auto rounded-full mb-7 ${a.dot}`}></div>
                ) : (
                  <div className={`h-1.5 w-full rounded-full mb-7 ${a.dot}`}></div>
                )}

                {layout === 'two' ? (
                  <div className="cv-two-col">
                    <div>{summaryEl}{experienceEl}{customEls}</div>
                    <div className="bg-surface-container-low/60 rounded-2xl p-5">{skillsEl}{educationEl}{certsEl}{coursesEl}{awardsEl}</div>
                  </div>
                ) : (
                  <>{summaryEl}{experienceEl}{educationEl}{skillsEl}{certsEl}{coursesEl}{awardsEl}{customEls}</>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-4 order-2 lg:sticky lg:top-24 space-y-6">
          {/* ATS strength */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white relative overflow-hidden shadow-2xl">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">AI Resume Strength</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black">{cv?.ats_score ?? '--'}</span>
                  <span className="text-indigo-200 text-sm font-bold">/ 100</span>
                </div>
              </div>
              <div className="w-full h-3 bg-white/20 rounded-full mb-4 overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${cv?.ats_score ?? 0}%` }}></div>
              </div>
              <p className="text-indigo-50 text-sm leading-relaxed font-medium">
                {cv?.ats_summary || (cv ? 'Generated from your profile and tailored to your target role.' : 'Generate a CV to see your ATS-optimization score.')}
              </p>
            </div>
            <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          </div>

          {/* Score breakdown */}
          {cv?.ats_breakdown && cv.ats_breakdown.length > 0 && (
            <div className="p-6 rounded-3xl bg-white border border-surface-container cv-preview-shadow">
              <h3 className="text-base font-black text-on-surface tracking-tight mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">insights</span>
                Score Breakdown
              </h3>
              <div className="space-y-4">
                {cv.ats_breakdown.map((b, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-on-surface">{b.label}</span>
                      <span className={`text-sm font-black ${b.score >= 75 ? 'text-green-600' : b.score >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{b.score}</span>
                    </div>
                    <div className="w-full h-2 bg-surface-container-low rounded-full overflow-hidden mb-1">
                      <div className={`h-full rounded-full transition-all duration-700 ${b.score >= 75 ? 'bg-green-500' : b.score >= 50 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${b.score}%` }}></div>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-snug">{b.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing keywords (job-description match) */}
          {cv?.missing_keywords && cv.missing_keywords.length > 0 && (
            <div className="p-6 rounded-3xl bg-amber-50 border border-amber-200">
              <h3 className="text-base font-black text-amber-900 tracking-tight mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 text-xl">key_off</span>
                Missing Keywords
              </h3>
              <p className="text-xs text-amber-800/80 mb-4">From the job description — add these to your profile if you have them.</p>
              <div className="flex flex-wrap gap-2 cv-keep">
                {cv.missing_keywords.map((k, i) => (
                  <span key={i} className="px-3 py-1.5 bg-white text-amber-800 font-bold text-xs rounded-lg border border-amber-200">{k}</span>
                ))}
              </div>
            </div>
          )}

          {/* AI Suggestions */}
          <div className="p-6 rounded-3xl bg-pink-200/60 shadow-sm border border-pink-300/20">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center text-pink-700 shadow-sm">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              </div>
              <h3 className="text-lg font-black text-pink-950 tracking-tight">Top AI Suggestions</h3>
            </div>
            <div className="space-y-3">
              {(cv?.suggestions?.length ? cv.suggestions : ['Fill in your profile and generate a CV to get personalized suggestions.']).map((s, i) => (
                <div key={i} className="p-4 bg-white/60 rounded-2xl flex items-start gap-3 shadow-sm border border-pink-300/10">
                  <div className="h-7 w-7 rounded-full bg-pink-200 text-pink-700 flex items-center justify-center flex-shrink-0 text-xs font-black">{i + 1}</div>
                  <p className="text-sm text-pink-950 font-medium leading-relaxed">{s}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            {/* Edit / Save inline editing */}
            {cv && (
              editing ? (
                <button onClick={saveEdits} className="w-full py-3.5 rounded-2xl bg-green-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:bg-green-600 transition-all">
                  <span className="material-symbols-outlined text-lg">check</span>
                  {savingEdits ? 'Saving...' : 'Done Editing'}
                </button>
              ) : (
                <button onClick={() => setEditing(true)} className="w-full py-3.5 rounded-2xl bg-amber-100 text-amber-800 font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-200 transition-all">
                  <span className="material-symbols-outlined text-lg">edit_note</span>
                  Edit CV text
                </button>
              )
            )}
            <div className="flex gap-4">
              <Link href="/candidate/build-profile" className="flex-1 px-4 py-3.5 rounded-2xl bg-white border border-surface-container text-on-surface font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg transition-all">
                <span className="material-symbols-outlined text-lg">person</span>
                Edit Profile
              </Link>
              <button onClick={generate} disabled={loading} className="flex-1 px-4 py-3.5 rounded-2xl bg-white border border-surface-container text-on-surface font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-60">
                <span className="material-symbols-outlined text-lg">refresh</span>
                Regenerate
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handlePrint()}
                disabled={!cv}
                className="flex-1 py-4 rounded-2xl premium-gradient text-white font-bold text-sm flex items-center justify-center gap-2 shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>picture_as_pdf</span>
                PDF
              </button>
              <button
                onClick={downloadDocx}
                disabled={!cv || docxLoading}
                className="flex-1 py-4 rounded-2xl bg-sky-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                <span className="material-symbols-outlined text-xl">description</span>
                {docxLoading ? '...' : 'Word'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cover Letter modal */}
      {showCover && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCover(false)} />
          <div className="relative z-10 w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden auth-pop max-h-[88vh] flex flex-col">
            <div className="p-5 border-b border-surface-container flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">mail</span>
                AI Cover Letter
              </h3>
              <button onClick={() => setShowCover(false)} className="text-on-surface-variant hover:text-on-surface p-1">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="flex-1">
                  <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Company (optional)</label>
                  <input value={coverCompany} onChange={(e) => setCoverCompany(e.target.value)} placeholder="e.g. Google" className="w-full px-4 py-3 bg-surface-container-low border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white transition-all text-on-surface font-medium outline-none" />
                </div>
                <button onClick={generateCover} disabled={coverLoading} className="h-[50px] px-6 rounded-2xl premium-gradient text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-60 disabled:hover:scale-100">
                  <span className="material-symbols-outlined">{coverLoading ? 'hourglass_top' : 'magic_button'}</span>
                  {coverLoading ? 'Writing...' : coverText ? 'Regenerate' : 'Generate'}
                </button>
              </div>
              <p className="text-xs text-on-surface-variant -mt-1 ml-1">Uses your profile, target role ({targetRole || '—'}), tone, and the job description (if pasted).</p>

              {coverError && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                  <span className="material-symbols-outlined text-red-500">error</span>
                  <p className="text-sm text-red-700 font-medium">{coverError}</p>
                </div>
              )}

              {coverLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce"></div>
                    <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
                  </div>
                  <p className="text-xs font-black text-primary tracking-widest uppercase">Writing your cover letter...</p>
                </div>
              ) : coverText ? (
                <>
                  <div className="bg-surface-container-low rounded-2xl p-5 whitespace-pre-line text-sm text-on-surface leading-relaxed">{coverText}</div>
                  <div className="flex gap-3">
                    {coverId && (
                      <button onClick={toggleCoverFav} title={coverFav ? 'Remove from favorites' : 'Add to favorites'} className={`px-4 py-3 rounded-2xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${coverFav ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-white border-surface-container text-on-surface hover:shadow-lg'}`}>
                        <span className="material-symbols-outlined text-lg" style={coverFav ? { fontVariationSettings: "'FILL' 1" } : undefined}>star</span>
                      </button>
                    )}
                    <button onClick={() => navigator.clipboard.writeText(coverText)} className="flex-1 py-3 rounded-2xl bg-white border border-surface-container text-on-surface font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg transition-all">
                      <span className="material-symbols-outlined text-lg">content_copy</span>Copy
                    </button>
                    <button onClick={downloadCover} className="flex-1 py-3 rounded-2xl premium-gradient text-white font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition-all">
                      <span className="material-symbols-outlined text-lg">download</span>Download
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-on-surface-variant text-center py-8">Click <span className="font-bold text-primary">Generate</span> to write a tailored cover letter from your profile.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* My Documents modal (CVs + Cover Letters + favorites) */}
      {showHistory && (() => {
        const cvList = favOnly ? history.filter((r) => r.is_favorite) : history
        const coverList = favOnly ? coverHistory.filter((r) => r.is_favorite) : coverHistory
        return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="relative z-10 w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden auth-pop max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-surface-container flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">folder_open</span>
                My CVs
              </h3>
              <button onClick={() => setShowHistory(false)} className="text-on-surface-variant hover:text-on-surface p-1">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Tabs + favorites filter */}
            <div className="px-5 pt-4 pb-3 flex items-center gap-3 border-b border-surface-container">
              <div className="flex bg-surface-container-low rounded-xl p-1">
                <button onClick={() => setDocTab('cvs')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${docTab === 'cvs' ? 'bg-white shadow text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>
                  CVs ({history.length})
                </button>
                <button onClick={() => setDocTab('covers')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${docTab === 'covers' ? 'bg-white shadow text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>
                  Cover Letters ({coverHistory.length})
                </button>
              </div>
              <button
                onClick={() => setFavOnly((v) => !v)}
                title="Show favorites only"
                className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${favOnly ? 'bg-amber-50 text-amber-600' : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}`}
              >
                <span className="material-symbols-outlined text-base" style={favOnly ? { fontVariationSettings: "'FILL' 1" } : undefined}>star</span>
                Favorites
              </button>
            </div>

            <div className="overflow-y-auto p-3 flex-1">
              {historyLoading ? (
                <div className="flex items-center justify-center gap-1.5 py-12">
                  <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce"></div>
                  <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
                </div>
              ) : docTab === 'cvs' ? (
                cvList.length === 0 ? (
                  <p className="text-sm text-on-surface-variant text-center py-12">{favOnly ? 'No favorite CVs yet. Tap the star on a CV to save it here.' : 'No saved CVs yet. Generate one first.'}</p>
                ) : (
                  cvList.map((row) => (
                    <div key={row.id} className="group flex items-center gap-1.5 p-4 rounded-2xl hover:bg-surface-container-low transition-colors">
                      <button onClick={() => toggleFavCV(row)} title={row.is_favorite ? 'Unfavorite' : 'Favorite'} className={`p-1.5 rounded-lg transition flex-shrink-0 ${row.is_favorite ? 'text-amber-500' : 'text-outline-variant hover:text-amber-500'}`}>
                        <span className="material-symbols-outlined text-lg" style={row.is_favorite ? { fontVariationSettings: "'FILL' 1" } : undefined}>star</span>
                      </button>
                      <button onClick={() => setPreview({ type: 'cv', id: row.id })} className="flex-1 text-left min-w-0">
                        <p className="text-sm font-bold text-on-surface truncate">{row.target_role || 'Untitled role'}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">{new Date(row.created_at).toLocaleString()}</p>
                      </button>
                      <span className="flex items-baseline gap-0.5 text-sm font-black text-primary flex-shrink-0">
                        {row.ats_score ?? '--'}<span className="text-[10px] text-on-surface-variant font-medium">/100</span>
                      </span>
                      <button onClick={() => renameCV(row)} title="Rename" className="text-on-surface-variant hover:text-primary p-1.5 rounded-lg hover:bg-primary/5 opacity-60 group-hover:opacity-100 transition">
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                      <button onClick={() => deleteCV(row)} title="Delete" className="text-on-surface-variant hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 opacity-60 group-hover:opacity-100 transition">
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  ))
                )
              ) : (
                coverList.length === 0 ? (
                  <p className="text-sm text-on-surface-variant text-center py-12">{favOnly ? 'No favorite cover letters yet. Tap the star on a letter to save it here.' : 'No saved cover letters yet. Generate one from the Cover Letter button.'}</p>
                ) : (
                  coverList.map((row) => (
                    <div key={row.id} className="group flex items-center gap-1.5 p-4 rounded-2xl hover:bg-surface-container-low transition-colors">
                      <button onClick={() => toggleFavCoverRow(row)} title={row.is_favorite ? 'Unfavorite' : 'Favorite'} className={`p-1.5 rounded-lg transition flex-shrink-0 ${row.is_favorite ? 'text-amber-500' : 'text-outline-variant hover:text-amber-500'}`}>
                        <span className="material-symbols-outlined text-lg" style={row.is_favorite ? { fontVariationSettings: "'FILL' 1" } : undefined}>star</span>
                      </button>
                      <button onClick={() => setPreview({ type: 'cover', id: row.id })} className="flex-1 text-left min-w-0">
                        <p className="text-sm font-bold text-on-surface truncate">
                          {row.target_role || 'Cover letter'}{row.company ? ` · ${row.company}` : ''}
                        </p>
                        <p className="text-xs text-on-surface-variant mt-0.5 truncate">{row.content.replace(/\s+/g, ' ').slice(0, 70)}…</p>
                        <p className="text-[11px] text-outline mt-0.5">{new Date(row.created_at).toLocaleString()}</p>
                      </button>
                      <button onClick={() => deleteCover(row)} title="Delete" className="text-on-surface-variant hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 opacity-60 group-hover:opacity-100 transition">
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </div>
        )
      })()}

      {/* Quick-view popup (CV or cover letter) */}
      {preview && (() => {
        const cvRow = preview.type === 'cv' ? history.find((r) => r.id === preview.id) : null
        const coverRow = preview.type === 'cover' ? coverHistory.find((r) => r.id === preview.id) : null
        if (!cvRow && !coverRow) return null
        const fav = cvRow?.is_favorite ?? coverRow?.is_favorite ?? false
        const title = preview.type === 'cv'
          ? (cvRow?.target_role || 'Untitled CV')
          : ((coverRow?.target_role || 'Cover letter') + (coverRow?.company ? ` · ${coverRow.company}` : ''))
        const toggleFav = () => { if (cvRow) toggleFavCV(cvRow); else if (coverRow) toggleFavCoverRow(coverRow) }
        const downloadThisCover = () => {
          if (!coverRow) return
          const blob = new Blob([coverRow.content], { type: 'text/plain;charset=utf-8' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `${coverRow.target_role || 'Cover'}_Cover_Letter.txt`
          link.click()
          URL.revokeObjectURL(url)
        }
        return (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md" onClick={() => setPreview(null)} />
            <div className="relative z-10 w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden auth-pop max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="p-5 border-b border-surface-container flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">{preview.type === 'cv' ? 'description' : 'mail'}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-on-surface truncate">{title}</h3>
                  <p className="text-xs text-on-surface-variant">
                    {preview.type === 'cv' ? 'CV quick view' : 'Cover letter quick view'}
                    {cvRow ? ` · ATS ${cvRow.ats_score ?? '--'}/100` : ''}
                  </p>
                </div>
                <button onClick={toggleFav} title={fav ? 'Remove from favorites' : 'Add to favorites'} className={`p-2 rounded-xl transition flex-shrink-0 ${fav ? 'text-amber-500 bg-amber-50' : 'text-outline-variant hover:text-amber-500 hover:bg-surface-container-low'}`}>
                  <span className="material-symbols-outlined" style={fav ? { fontVariationSettings: "'FILL' 1" } : undefined}>star</span>
                </button>
                <button onClick={() => setPreview(null)} className="text-on-surface-variant hover:text-on-surface p-1 flex-shrink-0">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto p-6 flex-1 bg-surface-container-low/40">
                {preview.type === 'cv' && cvRow ? (
                  <CVQuickView cv={cvRow.content} />
                ) : coverRow ? (
                  <div className="bg-white rounded-2xl border border-surface-container p-6 whitespace-pre-line text-sm text-on-surface leading-relaxed shadow-sm">
                    {coverRow.content}
                  </div>
                ) : null}
              </div>

              {/* Footer actions */}
              <div className="p-4 border-t border-surface-container flex flex-wrap gap-3">
                {preview.type === 'cv' && cvRow ? (
                  <>
                    <button onClick={() => { loadFromHistory(cvRow); setPreview(null) }} className="flex-1 min-w-[140px] py-3 rounded-2xl premium-gradient text-white font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition-all">
                      <span className="material-symbols-outlined text-lg">edit_note</span>Open &amp; Edit
                    </button>
                    <button onClick={() => { deleteCV(cvRow); setPreview(null) }} className="px-5 py-3 rounded-2xl bg-white border border-surface-container text-red-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-all">
                      <span className="material-symbols-outlined text-lg">delete</span>Delete
                    </button>
                  </>
                ) : coverRow ? (
                  <>
                    <button onClick={() => { loadCover(coverRow); setPreview(null) }} className="flex-1 min-w-[120px] py-3 rounded-2xl premium-gradient text-white font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition-all">
                      <span className="material-symbols-outlined text-lg">edit_note</span>Open &amp; Edit
                    </button>
                    <button onClick={() => navigator.clipboard.writeText(coverRow.content)} className="px-5 py-3 rounded-2xl bg-white border border-surface-container text-on-surface font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg transition-all">
                      <span className="material-symbols-outlined text-lg">content_copy</span>Copy
                    </button>
                    <button onClick={downloadThisCover} className="px-5 py-3 rounded-2xl bg-white border border-surface-container text-on-surface font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg transition-all">
                      <span className="material-symbols-outlined text-lg">download</span>Download
                    </button>
                    <button onClick={() => { deleteCover(coverRow); setPreview(null) }} className="px-5 py-3 rounded-2xl bg-white border border-surface-container text-red-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-all">
                      <span className="material-symbols-outlined text-lg">delete</span>Delete
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function CVQuickView({ cv }: { cv: CV }) {
  if (!cv) return <p className="text-sm text-on-surface-variant text-center py-8">This CV has no saved content.</p>
  const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-5">
      <h4 className="text-[11px] font-black uppercase tracking-[0.18em] text-primary mb-2">{title}</h4>
      {children}
    </div>
  )
  const credLine = (c: { name: string; issuer?: string; provider?: string; date?: string }, i: number) => {
    const sub = [c.issuer || c.provider, c.date].filter(Boolean).join(' • ')
    return (
      <li key={i} className="text-sm text-on-surface">
        <span className="font-bold">{c.name}</span>
        {sub ? <span className="text-on-surface-variant"> — {sub}</span> : null}
      </li>
    )
  }
  return (
    <div className="bg-white rounded-2xl border border-surface-container p-6 shadow-sm">
      <h2 className="text-2xl font-black text-on-surface tracking-tight">{cv.full_name}</h2>
      {cv.title && <p className="text-base font-semibold text-primary mb-2">{cv.title}</p>}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant mb-5">
        {cv.contact?.email && <span>{cv.contact.email}</span>}
        {cv.contact?.phone && <span>{cv.contact.phone}</span>}
        {cv.contact?.location && <span>{cv.contact.location}</span>}
      </div>

      {cv.summary && <Block title="Summary"><p className="text-sm text-on-surface leading-relaxed">{cv.summary}</p></Block>}

      {cv.experience?.length > 0 && (
        <Block title="Experience">
          <div className="space-y-3">
            {cv.experience.map((e, i) => (
              <div key={i}>
                <div className="flex justify-between items-baseline gap-2">
                  <p className="text-sm font-bold text-on-surface">{e.role}</p>
                  {hasPeriod(e.period) && <span className="text-xs text-outline font-semibold">{e.period}</span>}
                </div>
                {e.organization && <p className="text-xs font-semibold text-primary">{e.organization}</p>}
                <ul className="list-disc list-inside text-sm text-on-surface-variant mt-1 space-y-0.5">
                  {e.bullets?.map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Block>
      )}

      {cv.education?.length > 0 && (
        <Block title="Education">
          <div className="space-y-2">
            {cv.education.map((e, i) => (
              <div key={i} className="flex justify-between items-baseline gap-2">
                <div>
                  <p className="text-sm font-bold text-on-surface">{e.degree}</p>
                  <p className="text-xs text-on-surface-variant">{e.institute}</p>
                </div>
                {hasPeriod(e.period) && <span className="text-xs text-outline font-semibold">{e.period}</span>}
              </div>
            ))}
          </div>
        </Block>
      )}

      {cv.skills?.length > 0 && (
        <Block title="Skills">
          <div className="flex flex-wrap gap-1.5">
            {cv.skills.map((s, i) => <span key={i} className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">{s}</span>)}
          </div>
        </Block>
      )}

      {cv.certifications && cv.certifications.length > 0 && <Block title="Certifications"><ul className="space-y-1">{cv.certifications.map(credLine)}</ul></Block>}
      {cv.courses && cv.courses.length > 0 && <Block title="Courses"><ul className="space-y-1">{cv.courses.map(credLine)}</ul></Block>}
      {cv.awards && cv.awards.length > 0 && <Block title="Awards"><ul className="space-y-1">{cv.awards.map(credLine)}</ul></Block>}

      {(cv.custom_sections ?? []).filter((s) => s.heading && s.items?.length).map((s, si) => (
        <Block key={si} title={s.heading}>
          <div className="space-y-2">
            {s.items.map((it, ii) => (
              <div key={ii}>
                <p className="text-sm font-bold text-on-surface">{it.title}</p>
                {it.description && <p className="text-sm text-on-surface-variant">{it.description}</p>}
              </div>
            ))}
          </div>
        </Block>
      ))}
    </div>
  )
}

function Editable({
  value, onSave, editing, className, as = 'span',
}: { value: string; onSave: (v: string) => void; editing: boolean; className?: string; as?: 'span' | 'div' }) {
  const Tag = as
  if (!editing) return <Tag className={className}>{value}</Tag>
  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => onSave((e.currentTarget.textContent || '').trim())}
      className={`${className || ''} outline-none rounded px-1 -mx-1 ring-1 ring-amber-300 ring-inset bg-amber-50/40 focus:bg-amber-50 focus:ring-2 focus:ring-amber-400 cursor-text transition`}
    >
      {value}
    </Tag>
  )
}

function Section({ title, accent, variant = 'Modern', children }: { title: string; accent: Accent; variant?: Template; children: React.ReactNode }) {
  const head =
    variant === 'Classic' ? (
      <h3 className={`text-sm font-black uppercase tracking-[0.18em] text-center pb-1.5 mb-4 border-b border-on-surface/15 ${accent.text}`}>{title}</h3>
    ) : variant === 'Minimal' ? (
      <h3 className="text-[11px] font-bold uppercase tracking-[0.25em] text-outline pb-1.5 mb-4 border-b border-surface-container">{title}</h3>
    ) : (
      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-block w-6 h-[3px] rounded-full ${accent.dot}`}></span>
        <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${accent.text}`}>{title}</h3>
      </div>
    )
  return (
    <div className="mb-7">
      {head}
      {children}
    </div>
  )
}

function ContactItem({ icon, text, href, accent }: { icon: string; text?: string; href?: string; accent?: Accent }) {
  if (!text) return null
  const inner = (
    <>
      <span className="material-symbols-outlined text-base">{icon}</span>
      {text}
    </>
  )
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1.5 hover:underline underline-offset-2 ${accent?.link ?? 'text-primary'}`}>
        {inner}
      </a>
    )
  }
  return <span className="flex items-center gap-1.5 text-on-surface-variant">{inner}</span>
}

function FancySelect({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-surface-container-low border-2 border-transparent rounded-2xl font-medium text-on-surface outline-none cursor-pointer hover:bg-surface-container transition-all aria-expanded:border-primary"
        aria-expanded={open}
      >
        <span>{value}</span>
        <span className={`material-symbols-outlined text-outline transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>expand_more</span>
      </button>
      {open && (
        <div className="absolute z-30 mt-2 w-full bg-white rounded-2xl shadow-xl border border-surface-container overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => { onChange(o); setOpen(false) }}
              className={`w-full text-left px-5 py-2.5 text-sm font-medium transition-colors flex items-center justify-between ${o === value ? 'bg-primary/10 text-primary font-bold' : 'text-on-surface hover:bg-surface-container-low'}`}
            >
              {o}
              {o === value && <span className="material-symbols-outlined text-base">check</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
