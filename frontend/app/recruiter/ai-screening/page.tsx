'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import CVPreview, { type CVContent } from '@/components/candidate/CVPreview'
import Copilot from '@/components/recruiter/Copilot'

type Job = { id: string; title: string; company: string }
type Ranked = { application_id: string; name: string; score: number; verdict: string; strengths: string[]; concerns: string[]; recommendation: 'Shortlist' | 'Maybe' | 'Pass' }
type ScreenResult = { overall_summary: string; ranked: Ranked[] }
type KitResult = { intro: string; categories: { name: string; questions: { question: string; look_for: string }[] }[]; red_flags: string[]; closing_tip: string }

const REC_STYLE: Record<string, string> = {
  Shortlist: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  Maybe: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  Pass: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400',
}
const scoreColor = (s: number) => (s >= 75 ? 'text-green-600 dark:text-green-300' : s >= 45 ? 'text-amber-600 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400')
const scoreBg = (s: number) => (s >= 75 ? 'bg-green-500' : s >= 45 ? 'bg-amber-500' : 'bg-slate-400')

const AVATAR = ['bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300', 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300', 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300']
const avatarColor = (s: string) => AVATAR[Array.from(s || '?').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR.length]

export default function AIScreeningPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [jobId, setJobId] = useState('')
  const [mode, setMode] = useState<'rank' | 'kit'>('rank')
  const [tab, setTab] = useState<'screen' | 'copilot'>('screen')
  const [booting, setBooting] = useState(true)

  const [cvMap, setCvMap] = useState<Record<string, CVContent | null>>({})
  const [viewCv, setViewCv] = useState<CVContent | null>(null)

  const [screen, setScreen] = useState<ScreenResult | null>(null)
  const [kit, setKit] = useState<KitResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setBooting(false); return }
      const { data } = await supabase.from('jobs').select('id, title, company').eq('recruiter_id', user.id).order('created_at', { ascending: false })
      const list = (data as Job[]) ?? []
      setJobs(list)
      if (list.length) setJobId(list[0].id)
      setBooting(false)
    })
  }, [])

  // reset results + load CV snapshots when the selected job changes
  useEffect(() => {
    setScreen(null); setKit(null); setError(null)
    if (!jobId) { setCvMap({}); return }
    const supabase = createClient()
    supabase.from('applications').select('id, cv_snapshot').eq('job_id', jobId).then(({ data }) => {
      const m: Record<string, CVContent | null> = {}
      for (const a of (data ?? []) as { id: string; cv_snapshot: CVContent | null }[]) m[a.id] = a.cv_snapshot
      setCvMap(m)
    })
  }, [jobId])

  const run = async () => {
    if (!jobId) return
    setLoading(true); setError(null)
    if (mode === 'rank') setScreen(null); else setKit(null)
    try {
      const url = mode === 'rank' ? '/api/recruiter/screen-applicants' : '/api/recruiter/interview-kit'
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong.'); setLoading(false); return }
      if (mode === 'rank') setScreen(data as ScreenResult)
      else setKit(data as KitResult)
    } catch {
      setError('Network error. Please try again.')
    }
    setLoading(false)
  }

  const kitText = useMemo(() => {
    if (!kit) return ''
    return [kit.intro, '', ...kit.categories.flatMap((c) => [`# ${c.name}`, ...c.questions.map((q) => `- ${q.question}\n  (Look for: ${q.look_for})`), '']), 'Red flags:', ...kit.red_flags.map((r) => `- ${r}`), '', `Tip: ${kit.closing_tip}`].join('\n')
  }, [kit])

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-5xl mx-auto">
      <header className="mb-5">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-[2.25rem] font-bold tracking-tight text-on-surface leading-tight flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>AI Tools
        </h1>
        <p className="text-on-surface-variant text-xs sm:text-sm md:text-base mt-1 sm:mt-2">Rank applicants, build interview kits, and chat with your recruiting copilot.</p>
      </header>

      <div className="flex bg-surface-container-low rounded-2xl p-1 mb-5 w-fit">
        <button onClick={() => setTab('screen')} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'screen' ? 'bg-white dark:bg-[#2c2c2e] shadow text-primary' : 'text-on-surface-variant'}`}>Screening</button>
        <button onClick={() => setTab('copilot')} className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all ${tab === 'copilot' ? 'bg-white dark:bg-[#2c2c2e] shadow text-primary' : 'text-on-surface-variant'}`}><span className="material-symbols-outlined text-base">smart_toy</span>Copilot</button>
      </div>

      {tab === 'copilot' ? <Copilot /> : (
      <>
      {/* Controls */}
      <div className="bg-white dark:bg-[#2c2c2e] p-3 md:p-4 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container mb-5 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none">work</span>
          <select value={jobId} onChange={(e) => setJobId(e.target.value)} className="w-full appearance-none pl-12 pr-10 py-3 bg-surface-container-low border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white dark:focus:bg-[#2c2c2e] transition-all text-on-surface font-medium outline-none cursor-pointer" disabled={jobs.length === 0}>
            {jobs.length === 0 ? <option>No jobs yet</option> : jobs.map((j) => <option key={j.id} value={j.id}>{j.title} · {j.company}</option>)}
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">expand_more</span>
        </div>
        <div className="flex bg-surface-container-low rounded-2xl p-1">
          <button onClick={() => setMode('rank')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${mode === 'rank' ? 'bg-white dark:bg-[#2c2c2e] shadow text-primary' : 'text-on-surface-variant'}`}>Rank Applicants</button>
          <button onClick={() => setMode('kit')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${mode === 'kit' ? 'bg-white dark:bg-[#2c2c2e] shadow text-primary' : 'text-on-surface-variant'}`}>Interview Kit</button>
        </div>
        <button onClick={run} disabled={loading || !jobId} className="px-6 py-3 rounded-2xl premium-gradient text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:hover:scale-100">
          <span className="material-symbols-outlined">{loading ? 'hourglass_top' : 'magic_button'}</span>
          {loading ? 'Thinking...' : mode === 'rank' ? 'Analyze' : 'Generate kit'}
        </button>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-2xl bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/30 px-4 py-3">
          <span className="material-symbols-outlined text-red-500">error</span>
          <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
        </div>
      )}

      {booting ? null : jobs.length === 0 ? (
        <Empty icon="work_off" title="Post a job first" text="AI screening works on the applicants for your jobs." action={<Link href="/recruiter/jobs" className="mt-4 px-5 py-2.5 rounded-xl premium-gradient text-white font-bold text-sm inline-block">Post a Job</Link>} />
      ) : loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce"></div>
            <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
            <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
          </div>
          <p className="text-xs font-black text-primary tracking-widest uppercase">{mode === 'rank' ? 'AI is screening your applicants...' : 'AI is building your interview kit...'}</p>
        </div>
      ) : mode === 'rank' ? (
        !screen ? (
          <Empty icon="leaderboard" title="Rank applicants with AI" text="Pick a job and hit Analyze. The AI reads every applicant's CV and ranks them by fit, with strengths, concerns, and a shortlist recommendation." />
        ) : (
          <div className="space-y-3">
            <div className="p-5 rounded-[1.5rem] bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-xl">
              <h3 className="text-sm font-bold mb-1 flex items-center gap-2"><span className="material-symbols-outlined text-base">summarize</span>AI Summary</h3>
              <p className="text-sm text-indigo-50 leading-relaxed">{screen.overall_summary}</p>
            </div>
            {screen.ranked.map((r, i) => {
              const cv = cvMap[r.application_id]
              return (
                <div key={r.application_id} className="bg-white dark:bg-[#2c2c2e] p-4 md:p-5 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-black ${avatarColor(r.name)}`}>{(r.name || '?').charAt(0).toUpperCase()}</div>
                      <span className="text-[10px] font-black text-outline">#{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm md:text-base font-bold text-on-surface truncate">{r.name}</p>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex-shrink-0 ${REC_STYLE[r.recommendation] || 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'}`}>{r.recommendation}</span>
                      </div>
                      <p className="text-sm text-on-surface-variant mt-0.5">{r.verdict}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 h-2 bg-surface-container-low rounded-full overflow-hidden"><div className={`h-full rounded-full ${scoreBg(r.score)}`} style={{ width: `${r.score}%` }} /></div>
                        <span className={`text-sm font-black ${scoreColor(r.score)}`}>{r.score}%</span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3 mt-3">
                        {r.strengths.length > 0 && (
                          <div>
                            <p className="text-[10px] font-black text-green-700 dark:text-green-300 uppercase tracking-widest mb-1">Strengths</p>
                            <ul className="space-y-1">{r.strengths.map((s, j) => <li key={j} className="text-xs text-on-surface flex items-start gap-1"><span className="material-symbols-outlined text-green-500 text-sm">add</span>{s}</li>)}</ul>
                          </div>
                        )}
                        {r.concerns.length > 0 && (
                          <div>
                            <p className="text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest mb-1">Concerns</p>
                            <ul className="space-y-1">{r.concerns.map((s, j) => <li key={j} className="text-xs text-on-surface flex items-start gap-1"><span className="material-symbols-outlined text-amber-500 text-sm">remove</span>{s}</li>)}</ul>
                          </div>
                        )}
                      </div>
                      {cv && (
                        <button onClick={() => setViewCv(cv)} className="mt-3 text-xs font-bold text-primary hover:underline flex items-center gap-1"><span className="material-symbols-outlined text-sm">description</span>View CV</button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        !kit ? (
          <Empty icon="quiz" title="Build an interview kit" text="Pick a job and hit Generate kit. The AI creates tailored questions by category, with what to look for in each answer." />
        ) : (
          <div className="space-y-4">
            <div className="p-5 rounded-[1.5rem] bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-xl flex items-start justify-between gap-3">
              <p className="text-sm text-indigo-50 leading-relaxed">{kit.intro}</p>
              <button onClick={() => navigator.clipboard.writeText(kitText)} title="Copy kit" className="flex-shrink-0 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"><span className="material-symbols-outlined text-base">content_copy</span>Copy</button>
            </div>
            {kit.categories.map((c, i) => (
              <div key={i} className="bg-white dark:bg-[#2c2c2e] p-5 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container">
                <h3 className="text-sm font-black text-on-surface uppercase tracking-wide mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-primary text-lg">label</span>{c.name}</h3>
                <div className="space-y-3">
                  {c.questions.map((q, j) => (
                    <div key={j} className="pl-3 border-l-2 border-primary/30">
                      <p className="text-sm font-semibold text-on-surface">{q.question}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5"><span className="font-bold text-green-700 dark:text-green-300">Look for:</span> {q.look_for}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {kit.red_flags.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 p-5 rounded-[1.5rem]">
                <h3 className="text-sm font-black text-amber-900 dark:text-amber-300 mb-2 flex items-center gap-2"><span className="material-symbols-outlined text-amber-600 text-lg">flag</span>Red Flags</h3>
                <ul className="space-y-1">{kit.red_flags.map((r, i) => <li key={i} className="text-sm text-amber-900 dark:text-amber-300 flex items-start gap-1.5"><span className="material-symbols-outlined text-amber-500 text-sm mt-0.5">warning</span>{r}</li>)}</ul>
              </div>
            )}
            <div className="bg-white dark:bg-[#2c2c2e] p-4 rounded-[1.5rem] border border-surface-container flex items-start gap-2"><span className="material-symbols-outlined text-primary">lightbulb</span><p className="text-sm text-on-surface"><span className="font-bold">Tip:</span> {kit.closing_tip}</p></div>
          </div>
        )
      )}
      </>
      )}

      {viewCv && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md" onClick={() => setViewCv(null)} />
          <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-[#2c2c2e] rounded-3xl shadow-2xl overflow-hidden auth-pop max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-surface-container flex items-center justify-between">
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-primary">description</span>Candidate CV</h3>
              <button onClick={() => setViewCv(null)} className="text-on-surface-variant hover:text-on-surface p-1"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="overflow-y-auto p-6 flex-1 bg-surface-container-low/40"><CVPreview cv={viewCv} /></div>
          </div>
        </div>
      )}
    </div>
  )
}

function Empty({ icon, title, text, action }: { icon: string; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#2c2c2e] rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container p-10 md:p-16 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-5"><span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span></div>
      <h2 className="text-lg md:text-xl font-bold text-on-surface mb-2">{title}</h2>
      <p className="text-sm text-on-surface-variant max-w-md">{text}</p>
      {action}
    </div>
  )
}
