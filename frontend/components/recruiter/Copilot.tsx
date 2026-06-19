'use client'

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type ChatMsg = { role: 'user' | 'assistant'; content: string }

const STARTERS = [
  { icon: 'edit_note', label: 'Write a job description for a Senior React Developer' },
  { icon: 'mail', label: 'Draft a friendly interview-invite email' },
  { icon: 'quiz', label: 'Give me 5 strong interview questions for a Data Analyst' },
  { icon: 'checklist', label: 'What should I look for when screening Backend Engineers?' },
]

const mdClass = 'text-sm leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_li]:mb-1 [&_strong]:font-bold [&_strong]:text-on-surface [&_code]:bg-surface-container [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_h1]:font-bold [&_h1]:text-base [&_h1]:mb-2 [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:font-bold [&_h3]:mt-2 [&_h3]:mb-1 [&_a]:text-primary [&_a]:underline'

export default function Copilot() {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [messages])
  const adjust = () => { const el = taRef.current; if (!el) return; el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 140)}px` }

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || streaming) return
    const base = [...messages, { role: 'user' as const, content }]
    setMessages([...base, { role: 'assistant', content: '' }])
    setInput(''); requestAnimationFrame(adjust)
    setStreaming(true)
    abortRef.current = new AbortController()
    let acc = ''
    try {
      const res = await fetch('/api/recruiter/copilot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: base }), signal: abortRef.current.signal })
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}))
        acc = `⚠️ ${err.error || 'Something went wrong.'}`
        setMessages([...base, { role: 'assistant', content: acc }])
      } else {
        const reader = res.body.getReader(); const dec = new TextDecoder()
        while (true) { const { done, value } = await reader.read(); if (done) break; acc += dec.decode(value, { stream: true }); setMessages([...base, { role: 'assistant', content: acc }]) }
      }
    } catch { if (!acc) setMessages([...base, { role: 'assistant', content: '⚠️ The response was interrupted.' }]) }
    setStreaming(false); abortRef.current = null
  }

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }

  return (
    <div className="bg-white rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)] border border-surface-container flex flex-col h-[72vh] overflow-hidden">
      <div className="px-4 py-3 border-b border-surface-container flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg premium-gradient flex items-center justify-center text-white"><span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span></div>
        <p className="text-sm font-black text-on-surface">Recruiting Copilot</p>
        {messages.length > 0 && <button onClick={() => setMessages([])} className="ml-auto px-3 py-1.5 rounded-xl bg-surface-container-low text-on-surface font-bold text-xs hover:bg-surface-container transition-colors flex items-center gap-1.5"><span className="material-symbols-outlined text-base">add</span>New</button>}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center text-center pt-6">
            <div className="w-14 h-14 rounded-2xl premium-gradient flex items-center justify-center text-white shadow-lg mb-4"><span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span></div>
            <h3 className="text-lg font-bold text-on-surface mb-1">How can I help you hire?</h3>
            <p className="text-sm text-on-surface-variant max-w-md mb-5">Draft job posts, candidate emails, interview questions, and screening advice — I know your open roles.</p>
            <div className="grid sm:grid-cols-2 gap-2 w-full max-w-xl">
              {STARTERS.map((s) => (
                <button key={s.label} onClick={() => send(s.label)} className="flex items-center gap-2.5 p-3 rounded-2xl bg-surface-container-low text-left hover:bg-surface-container transition-all">
                  <span className="material-symbols-outlined text-primary text-lg">{s.icon}</span><span className="text-sm font-semibold text-on-surface">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && <div className="w-7 h-7 rounded-lg premium-gradient flex items-center justify-center text-white flex-shrink-0 mt-0.5"><span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span></div>}
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${m.role === 'user' ? 'premium-gradient text-white rounded-br-md' : 'bg-surface-container-low text-on-surface rounded-bl-md'}`}>
                  {m.role === 'user' ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  ) : m.content === '' && streaming ? (
                    <div className="flex gap-1 py-1"><span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce"></span><span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]"></span><span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.3s]"></span></div>
                  ) : (
                    <div className={mdClass}><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-surface-container p-3">
        <div className="flex items-end gap-2 bg-surface-container-low rounded-2xl p-2 focus-within:ring-2 focus-within:ring-primary/40 transition">
          <textarea ref={taRef} value={input} onChange={(e) => { setInput(e.target.value); adjust() }} onKeyDown={onKey} rows={1} placeholder="Ask your copilot anything about hiring…" className="flex-1 bg-transparent resize-none outline-none px-2 py-1.5 text-sm text-on-surface placeholder:text-outline-variant max-h-36" />
          <button onClick={() => send(input)} disabled={!input.trim() || streaming} className="h-9 w-9 flex items-center justify-center rounded-xl premium-gradient text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100 flex-shrink-0"><span className="material-symbols-outlined text-lg">send</span></button>
        </div>
      </div>
    </div>
  )
}
