'use client'

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { createClient } from '@/lib/supabase/client'
import { useVoiceInput } from '@/lib/useVoiceInput'

type ChatMsg = { role: 'user' | 'assistant'; content: string }
type SessionRow = { id: string; title: string | null; role: string | null; job_id: string | null; messages: ChatMsg[]; updated_at: string }
type AppliedJob = { id: string; title: string; company: string }
type Difficulty = 'Easy' | 'Medium' | 'Hard'

const STARTERS = [
  { icon: 'record_voice_over', label: 'Run a full mock interview' },
  { icon: 'quiz', label: 'What questions should I expect for this role?' },
  { icon: 'person', label: "Help me answer 'Tell me about yourself'" },
  { icon: 'psychology_alt', label: 'Give me a tough behavioral question' },
]

const QUICK_ACTIONS = [
  { label: 'Sample answer', prompt: 'Give me a strong sample answer to that, written in my voice using my real background.' },
  { label: 'Make it harder', prompt: 'Ask me a harder, more senior-level version of that question.' },
  { label: 'Next question', prompt: 'Great — ask me the next question.' },
  { label: 'Why this matters', prompt: 'Why do interviewers ask this, and what exactly are they looking for?' },
]

const mdClass = 'text-sm leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_li]:mb-1 [&_strong]:font-bold [&_strong]:text-on-surface [&_code]:bg-surface-container [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_h1]:font-bold [&_h1]:text-base [&_h1]:mb-2 [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:font-bold [&_h3]:mt-2 [&_h3]:mb-1 [&_a]:text-primary [&_a]:underline [&_hr]:my-3 [&_hr]:border-surface-container'

export default function AICoachPage() {
  const [uid, setUid] = useState<string | null>(null)
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [mode, setMode] = useState<'mock' | 'chat'>('chat')
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium')

  const [appliedJobs, setAppliedJobs] = useState<AppliedJob[]>([])
  const [focusJobId, setFocusJobId] = useState('')
  const [customRole, setCustomRole] = useState('')

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [booting, setBooting] = useState(true)
  const [bootError, setBootError] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [showScrollDown, setShowScrollDown] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  // voice input (Web Speech API + Gemini fallback) — see lib/useVoiceInput
  const voiceBaseRef = useRef('')
  const voice = useVoiceInput({
    onTranscript: (text) => {
      const base = voiceBaseRef.current
      setInput(base ? `${base} ${text}` : text)
      requestAnimationFrame(adjustHeight)
    },
  })

  const focusJob = appliedJobs.find((j) => j.id === focusJobId)
  const focusRole = focusJob ? focusJob.title : customRole.trim()

  useEffect(() => {
    loadInit()
  }, [])

  const loadInit = async () => {
    setBooting(true); setBootError(false)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setBootError(true); setBooting(false); return }
      setUid(user.id)
      const [sesRes, appsRes, profRes] = await Promise.all([
        supabase.from('interview_sessions').select('id, title, role, job_id, messages, updated_at').eq('profile_id', user.id).order('updated_at', { ascending: false }),
        supabase.from('applications').select('job:jobs(id, title, company)').eq('candidate_id', user.id),
        supabase.from('profiles').select('desired_role').eq('id', user.id).single(),
      ])
      setSessions((sesRes.data as unknown as SessionRow[]) ?? [])
      const jobs: AppliedJob[] = []
      const seen = new Set<string>()
      for (const r of (appsRes.data ?? []) as { job: AppliedJob | null }[]) {
        if (r.job && !seen.has(r.job.id)) { seen.add(r.job.id); jobs.push(r.job) }
      }
      setAppliedJobs(jobs)
      if (profRes.data?.desired_role) setCustomRole(profRes.data.desired_role)
    } catch {
      setBootError(true)
    }
    setBooting(false)
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setShowScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 240)
  }
  const scrollToBottom = () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })

  const adjustHeight = () => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  const newSession = () => { setCurrentId(null); setMessages([]); setInput(''); setSidebarOpen(false) }

  const loadSession = (s: SessionRow) => {
    setCurrentId(s.id)
    setMessages(Array.isArray(s.messages) ? s.messages : [])
    setFocusJobId(s.job_id || '')
    if (!s.job_id && s.role) setCustomRole(s.role)
    setSidebarOpen(false)
  }

  const deleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!window.confirm('Delete this session?')) return
    const supabase = createClient()
    const { error } = await supabase.from('interview_sessions').delete().eq('id', id)
    if (error) { console.error('deleteSession failed:', error.message); return }
    setSessions((s) => s.filter((x) => x.id !== id))
    if (currentId === id) newSession()
  }

  const persist = async (msgs: ChatMsg[]) => {
    if (!uid) return
    const supabase = createClient()
    const title = focusJob ? `${focusJob.title} · ${focusJob.company}` : (focusRole || msgs.find((m) => m.role === 'user')?.content.slice(0, 42) || 'Interview prep')
    if (currentId) {
      const { error } = await supabase.from('interview_sessions').update({ messages: msgs as never, title, role: focusRole || null, job_id: focusJobId || null }).eq('id', currentId)
      if (error) { console.error('persist update failed:', error.message); return }
      setSessions((s) => s.map((x) => (x.id === currentId ? { ...x, title, messages: msgs, updated_at: new Date().toISOString() } : x)))
    } else {
      const { data, error } = await supabase.from('interview_sessions').insert({ profile_id: uid, messages: msgs as never, title, role: focusRole || null, job_id: focusJobId || null }).select('id, title, role, job_id, messages, updated_at').single()
      if (error) { console.error('persist insert failed:', error.message); return }
      if (data) { setCurrentId(data.id as string); setSessions((s) => [data as unknown as SessionRow, ...s]) }
    }
  }

  const runStream = async (base: ChatMsg[]) => {
    setMessages([...base, { role: 'assistant', content: '' }])
    setStreaming(true)
    abortRef.current = new AbortController()
    let acc = ''
    try {
      const res = await fetch('/api/interview-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: base, role: focusRole, jobId: focusJobId || undefined, mode, difficulty }),
        signal: abortRef.current.signal,
      })
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}))
        acc = `⚠️ ${err.error || 'Something went wrong. Please try again.'}`
        setMessages([...base, { role: 'assistant', content: acc }])
      } else {
        const reader = res.body.getReader()
        const dec = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          acc += dec.decode(value, { stream: true })
          setMessages([...base, { role: 'assistant', content: acc }])
        }
      }
    } catch {
      if (!acc) acc = '⚠️ The response was interrupted.'
      setMessages([...base, { role: 'assistant', content: acc }])
    }
    setStreaming(false)
    abortRef.current = null
    await persist([...base, { role: 'assistant', content: acc }])
  }

  const send = (text: string) => {
    const content = text.trim()
    if (!content || streaming) return
    runStream([...messages, { role: 'user', content }])
    setInput('')
    requestAnimationFrame(adjustHeight)
  }

  const regenerate = () => {
    if (streaming) return
    let base = [...messages]
    if (base.length && base[base.length - 1].role === 'assistant') base = base.slice(0, -1)
    if (base.length) runStream(base)
  }

  const stop = () => abortRef.current?.abort()

  const copyMsg = (i: number, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedIdx(i)
    setTimeout(() => setCopiedIdx((c) => (c === i ? null : c)), 1600)
  }

  const toggleMic = () => {
    if (!voice.listening && !voice.busy) voiceBaseRef.current = input.trim()
    voice.toggle()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  const lastIsAssistant = messages.length > 0 && messages[messages.length - 1].role === 'assistant'

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sessions sidebar */}
      <aside className={`fixed md:static z-40 inset-y-16 md:inset-y-0 left-0 w-72 bg-white dark:bg-[#1c1c1e] border-r border-surface-container flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-3">
          <button onClick={newSession} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl premium-gradient text-white font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
            <span className="material-symbols-outlined text-lg">add</span>New Session
          </button>
        </div>
        <div className="px-3 pb-1 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">History</div>
        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
          {sessions.length === 0 ? (
            <p className="text-xs text-on-surface-variant text-center py-6 px-2">No sessions yet. Start a new one!</p>
          ) : (
            sessions.map((s) => (
              <button key={s.id} onClick={() => loadSession(s)} className={`group w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-colors ${currentId === s.id ? 'bg-primary/10' : 'hover:bg-surface-container-low'}`}>
                <span className={`material-symbols-outlined text-base flex-shrink-0 ${currentId === s.id ? 'text-primary' : 'text-on-surface-variant'}`}>forum</span>
                <span className={`flex-1 min-w-0 truncate text-sm font-semibold ${currentId === s.id ? 'text-primary' : 'text-on-surface'}`}>{s.title || 'Untitled'}</span>
                <span onClick={(e) => deleteSession(e, s.id)} className="material-symbols-outlined text-base text-on-surface-variant hover:text-red-500 opacity-0 group-hover:opacity-100 transition flex-shrink-0">delete</span>
              </button>
            ))
          )}
        </div>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 bg-slate-900/40 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header / focus controls */}
        <div className="border-b border-surface-container bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-md px-3 md:px-5 py-3 flex items-center gap-2 flex-wrap">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 -ml-1 text-on-surface-variant hover:bg-surface-container-low rounded-lg">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div className="flex items-center gap-2 mr-auto">
            <div className="w-8 h-8 rounded-lg premium-gradient flex items-center justify-center text-white flex-shrink-0">
              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
            </div>
            <div className="leading-tight">
              <p className="text-sm font-black text-on-surface">Interview Coach</p>
              <p className="text-[11px] text-on-surface-variant">{focusRole ? `${focusRole} · ${difficulty}` : `General practice · ${difficulty}`}</p>
            </div>
          </div>

          {messages.length > 0 && (
            <button onClick={() => send('End the session and give me my full interview scorecard.')} disabled={streaming} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container-low text-on-surface font-bold text-xs hover:bg-surface-container transition-colors disabled:opacity-50">
              <span className="material-symbols-outlined text-base">assessment</span><span className="hidden sm:inline">End &amp; feedback</span>
            </button>
          )}

          {/* Focus selector */}
          <div className="relative">
            <select value={focusJobId} onChange={(e) => setFocusJobId(e.target.value)} className="appearance-none pl-3 pr-8 py-2 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface outline-none cursor-pointer hover:bg-surface-container transition-colors max-w-[190px]">
              <option value="">General / type a role</option>
              {appliedJobs.map((j) => <option key={j.id} value={j.id}>{j.title} · {j.company}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-base">expand_more</span>
          </div>
          {!focusJobId && (
            <input value={customRole} onChange={(e) => setCustomRole(e.target.value)} placeholder="Role e.g. Frontend Dev" className="px-3 py-2 bg-surface-container-low rounded-xl text-xs font-medium text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/40 w-36" />
          )}
          {/* Difficulty */}
          <div className="flex bg-surface-container-low rounded-xl p-0.5">
            {(['Easy', 'Medium', 'Hard'] as const).map((d) => (
              <button key={d} onClick={() => setDifficulty(d)} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${difficulty === d ? 'bg-white dark:bg-white/10 shadow text-primary' : 'text-on-surface-variant'}`}>{d}</button>
            ))}
          </div>
          {/* Mode toggle */}
          <div className="flex bg-surface-container-low rounded-xl p-0.5">
            {(['chat', 'mock'] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === m ? 'bg-white dark:bg-white/10 shadow text-primary' : 'text-on-surface-variant'}`}>
                {m === 'chat' ? 'Chat' : 'Mock'}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} onScroll={onScroll} className="relative flex-1 overflow-y-auto px-3 md:px-0 py-6">
          <div className="max-w-3xl mx-auto space-y-5">
            {booting ? (
              <div className="flex flex-col items-center justify-center gap-3 pt-20">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce"></div>
                  <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
                </div>
                <p className="text-xs font-black text-primary tracking-widest uppercase">Loading coach...</p>
              </div>
            ) : bootError ? (
              <div className="flex flex-col items-center text-center pt-16">
                <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-500/15 flex items-center justify-center text-red-500 mb-4"><span className="material-symbols-outlined text-2xl">cloud_off</span></div>
                <h3 className="text-lg font-bold text-on-surface mb-1">Couldn’t load the coach</h3>
                <p className="text-sm text-on-surface-variant max-w-sm mb-4">Something went wrong. Please check your connection and try again.</p>
                <button onClick={loadInit} className="px-5 py-2.5 rounded-xl premium-gradient text-white font-bold text-sm flex items-center gap-2"><span className="material-symbols-outlined text-base">refresh</span>Retry</button>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center text-center pt-8 md:pt-16">
                <div className="w-16 h-16 rounded-3xl premium-gradient flex items-center justify-center text-white shadow-xl shadow-primary/20 mb-5">
                  <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-on-surface mb-1">Let&apos;s ace your interview</h2>
                <p className="text-sm text-on-surface-variant max-w-md mb-6">Pick a job or type a role, set the difficulty, choose <b>Chat</b> or <b>Mock</b>, and start practicing. I know your profile and CV, so I&apos;ll tailor everything to you.</p>
                <div className="grid sm:grid-cols-2 gap-3 w-full max-w-xl">
                  {STARTERS.map((s) => (
                    <button key={s.label} onClick={() => send(s.label)} className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-[#2c2c2e] border border-surface-container text-left hover:border-primary/40 hover:shadow-lg transition-all">
                      <span className="material-symbols-outlined text-primary">{s.icon}</span>
                      <span className="text-sm font-semibold text-on-surface">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg premium-gradient flex items-center justify-center text-white flex-shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                    </div>
                  )}
                  <div className={`group max-w-[85%] ${m.role === 'user' ? '' : 'min-w-0'}`}>
                    <div className={`rounded-2xl px-4 py-3 ${m.role === 'user' ? 'premium-gradient text-white rounded-br-md' : 'bg-white dark:bg-[#2c2c2e] border border-surface-container text-on-surface rounded-bl-md shadow-sm'}`}>
                      {m.role === 'user' ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                      ) : m.content === '' && streaming ? (
                        <div className="flex gap-1 py-1">
                          <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce"></span>
                          <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]"></span>
                          <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.3s]"></span>
                        </div>
                      ) : (
                        <div className={mdClass}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                    {/* assistant message actions */}
                    {m.role === 'assistant' && m.content !== '' && !(streaming && i === messages.length - 1) && (
                      <div className="flex items-center gap-1 mt-1 ml-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => copyMsg(i, m.content)} className="text-xs text-on-surface-variant hover:text-primary flex items-center gap-1 px-1.5 py-1 rounded-lg hover:bg-surface-container-low">
                          <span className="material-symbols-outlined text-sm">{copiedIdx === i ? 'check' : 'content_copy'}</span>{copiedIdx === i ? 'Copied' : 'Copy'}
                        </button>
                        {i === messages.length - 1 && (
                          <button onClick={regenerate} className="text-xs text-on-surface-variant hover:text-primary flex items-center gap-1 px-1.5 py-1 rounded-lg hover:bg-surface-container-low">
                            <span className="material-symbols-outlined text-sm">refresh</span>Regenerate
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Quick follow-up actions */}
            {lastIsAssistant && !streaming && (
              <div className="flex flex-wrap gap-2 pl-11">
                {QUICK_ACTIONS.map((q) => (
                  <button key={q.label} onClick={() => send(q.prompt)} className="px-3 py-1.5 rounded-full bg-white dark:bg-[#2c2c2e] border border-surface-container text-xs font-bold text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all">
                    {q.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {showScrollDown && (
            <button onClick={scrollToBottom} className="sticky bottom-2 left-full ml-auto mr-3 w-9 h-9 rounded-full bg-white dark:bg-[#2c2c2e] border border-surface-container shadow-lg flex items-center justify-center text-on-surface-variant hover:text-primary">
              <span className="material-symbols-outlined">arrow_downward</span>
            </button>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-surface-container bg-white dark:bg-[#1c1c1e] px-3 md:px-0 py-3">
          <div className="max-w-3xl mx-auto">
            {voice.error && (
              <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs">
                <span className="material-symbols-outlined text-sm flex-shrink-0">info</span>
                <span className="flex-1">{voice.error}</span>
                <button onClick={voice.clearError} aria-label="Dismiss" className="material-symbols-outlined text-sm hover:opacity-70 flex-shrink-0">close</button>
              </div>
            )}
            <div className="flex items-end gap-2 bg-surface-container-low rounded-2xl p-2 focus-within:ring-2 focus-within:ring-primary/40 transition">
              <button
                onClick={toggleMic}
                disabled={voice.busy}
                title={voice.listening ? 'Stop' : voice.busy ? 'Transcribing…' : 'Speak your answer'}
                className={`h-10 w-10 flex items-center justify-center rounded-xl transition-colors flex-shrink-0 ${voice.listening ? 'bg-red-500 text-white animate-pulse' : voice.busy ? 'text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
              >
                <span className={`material-symbols-outlined ${voice.busy ? 'animate-spin' : ''}`}>{voice.listening ? 'mic' : voice.busy ? 'progress_activity' : 'mic_none'}</span>
              </button>
              <textarea
                ref={taRef}
                value={input}
                onChange={(e) => { setInput(e.target.value); adjustHeight() }}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder={voice.listening ? 'Listening…' : voice.busy ? 'Transcribing…' : mode === 'mock' ? 'Type your answer…' : 'Ask your interview coach anything…'}
                className="flex-1 bg-transparent resize-none outline-none px-2 py-2 text-sm text-on-surface placeholder:text-outline-variant max-h-40"
              />
              {streaming ? (
                <button onClick={stop} className="h-10 w-10 flex items-center justify-center rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors flex-shrink-0" title="Stop">
                  <span className="material-symbols-outlined">stop</span>
                </button>
              ) : (
                <button onClick={() => send(input)} disabled={!input.trim()} className="h-10 w-10 flex items-center justify-center rounded-xl premium-gradient text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100 flex-shrink-0" title="Send">
                  <span className="material-symbols-outlined">send</span>
                </button>
              )}
            </div>
            <p className="text-[10px] text-outline text-center mt-2">AI can make mistakes — always prepare with your own judgment too.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
