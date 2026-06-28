'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import FancySelect from '@/components/shared/FancySelect'
import { useProfileLink } from '@/lib/useProfileLink'

type Role = 'recruiter' | 'candidate'

type Conv = {
  id: string; recruiter_id: string; candidate_id: string; job_id: string | null
  recruiter_name: string | null; candidate_name: string | null; company: string | null; job_title: string | null
  last_message: string | null; last_sender_id: string | null; last_message_at: string | null
  recruiter_unread: number; candidate_unread: number; updated_at: string; is_hiring: boolean
}
type Msg = { id: string; conversation_id: string; sender_id: string; body: string | null; kind: string; meta: Record<string, unknown> | null; created_at: string }
type Iv = {
  id: string; application_id: string | null; job_id: string | null; candidate_id: string; recruiter_id: string
  candidate_name: string | null; job_title: string | null; scheduled_at: string | null
  duration_min: number; meeting_link: string | null; stage: string; notes: string | null
}
type AppRow = { id: string; job_id: string; candidate_id: string; candidate_name: string | null; status: string; job: { id: string; title: string; company: string } | null }
type NewItem = { otherId: string; name: string; sub: string; jobId: string | null }

const STAGE_META: Record<string, { label: string; cls: string; icon: string }> = {
  proposed: { label: 'Awaiting response', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', icon: 'schedule' },
  accepted: { label: 'Confirmed', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', icon: 'event_available' },
  declined: { label: 'Declined', cls: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300', icon: 'event_busy' },
  completed: { label: 'Awaiting result', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300', icon: 'how_to_reg' },
  offer: { label: 'Offer sent', cls: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300', icon: 'workspace_premium' },
  offer_accepted: { label: 'Hired 🎉', cls: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300', icon: 'verified' },
  offer_declined: { label: 'Offer declined', cls: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400', icon: 'cancel' },
  rejected: { label: 'Not selected', cls: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400', icon: 'do_not_disturb_on' },
  cancelled: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400', icon: 'event_busy' },
}
const AVATAR = ['bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300', 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300', 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300']
const avatarColor = (s: string) => AVATAR[Array.from(s || '?').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR.length]
const initial = (s: string | null) => (s || '?').charAt(0).toUpperCase()
const fmtWhen = (iso: string | null) => iso ? new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Time to be confirmed'
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
const timeAgo = (iso: string | null) => {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000); if (d > 0) return `${d}d`
  const h = Math.floor(diff / 3600000); if (h > 0) return `${h}h`
  const m = Math.floor(diff / 60000); return m > 1 ? `${m}m` : 'now'
}

const EMPTY_SCHED = { ivId: '', date: '', time: '', duration: '30', link: '', notes: '' }

export default function Inbox({ role }: { role: Role }) {
  const supabase = useMemo(() => createClient(), [])
  const profileLink = useProfileLink()
  const [uid, setUid] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [convos, setConvos] = useState<Conv[]>([])
  const [active, setActive] = useState<Conv | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [ivById, setIvById] = useState<Record<string, Iv>>({})
  const [activeApp, setActiveApp] = useState<AppRow | null>(null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  // modals
  const [showNew, setShowNew] = useState(false)
  const [newItems, setNewItems] = useState<NewItem[]>([])
  const [peopleQ, setPeopleQ] = useState('')
  const [peopleResults, setPeopleResults] = useState<{ id: string; full_name: string | null; username: string | null; role: string | null; company_name: string | null }[]>([])
  const peopleDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  // other-party profile info (username + photo) for avatars that link to /u/<handle>
  const [otherInfo, setOtherInfo] = useState<Record<string, { username: string | null; photo: string | null }>>({})
  // top tabs: chat list vs interviews list
  const [view, setView] = useState<'messages' | 'interviews'>('messages')
  const [showSched, setShowSched] = useState(false)
  const [sched, setSched] = useState(EMPTY_SCHED)
  const [schedErr, setSchedErr] = useState<string | null>(null)

  const uidRef = useRef('')
  const activeRef = useRef<string | null>(null)
  const activeConvRef = useRef<Conv | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const isRecruiter = role === 'recruiter'
  const basePath = isRecruiter ? '/recruiter' : '/candidate'
  // Slot-aware: a conversation has two participants in the recruiter_id/candidate_id
  // slots. "Who am I / who is the other" is decided per-conversation, so the SAME
  // inbox works for hiring threads AND any-to-any social DMs.
  // NOTE: use uidRef.current (not the uid state) — openConv runs from the bootstrap
  // effect before the uid state has committed, so the state would still be ''.
  const iAmRecruiterSlot = (c: Conv) => c.recruiter_id === uidRef.current
  const otherId = (c: Conv) => (iAmRecruiterSlot(c) ? c.candidate_id : c.recruiter_id)
  const otherName = (c: Conv) => (iAmRecruiterSlot(c) ? c.candidate_name : (c.company || c.recruiter_name)) || 'User'
  const unreadOf = (c: Conv) => (iAmRecruiterSlot(c) ? c.recruiter_unread : c.candidate_unread)
  const myUnreadPatch = (c: Conv) => (iAmRecruiterSlot(c) ? { recruiter_unread: 0 } : { candidate_unread: 0 })
  // Hiring quick-actions (schedule/offer/reject) show only when I'm the recruiter
  // on a hiring thread — never on a plain social DM.
  const canHire = (c: Conv | null) => !!c && isRecruiter && c.recruiter_id === uidRef.current && c.is_hiring

  // ── data loaders ───────────────────────────────────────────────────────────
  const loadConvos = async (id: string) => {
    const { data } = await supabase.from('conversations').select('*').or(`recruiter_id.eq.${id},candidate_id.eq.${id}`).order('updated_at', { ascending: false })
    const list = (data as Conv[]) ?? []
    setConvos(list)
    // fetch the other participant's handle + photo so avatars link to /u/<handle>
    const ids = Array.from(new Set(list.map((c) => (c.recruiter_id === id ? c.candidate_id : c.recruiter_id))))
    if (ids.length) {
      const { data: profs } = await supabase.from('public_profiles').select('id, username, photo_url').in('id', ids)
      const map: Record<string, { username: string | null; photo: string | null }> = {}
      ;((profs as { id: string; username: string | null; photo_url: string | null }[]) ?? []).forEach((p) => { map[p.id] = { username: p.username, photo: p.photo_url } })
      setOtherInfo(map)
    }
    return list
  }
  const loadInterviews = async (id: string) => {
    const { data } = await supabase.from('interviews').select('*').or(`recruiter_id.eq.${id},candidate_id.eq.${id}`)
    const map: Record<string, Iv> = {}
    ;((data as Iv[]) ?? []).forEach((iv) => { map[iv.id] = iv })
    setIvById(map)
  }
  const loadMessages = async (convId: string) => {
    const { data } = await supabase.from('messages').select('*').eq('conversation_id', convId).order('created_at', { ascending: true })
    setMsgs((data as Msg[]) ?? [])
  }

  const openConv = async (c: Conv) => {
    setActive(c); activeRef.current = c.id; activeConvRef.current = c
    await loadMessages(c.id)
    // mark my side read
    const patch = myUnreadPatch(c)
    if (unreadOf(c) > 0) {
      await supabase.from('conversations').update(patch).eq('id', c.id)
      setConvos((list) => list.map((x) => (x.id === c.id ? { ...x, ...patch } : x)))
    }
    if (canHire(c)) {
      const { data } = await supabase
        .from('applications')
        .select('id, job_id, candidate_id, candidate_name, status, job:jobs(id, title, company)')
        .eq('candidate_id', c.candidate_id)
        .order('applied_at', { ascending: false })
      const rows = (data as unknown as AppRow[]) ?? []
      setActiveApp(rows.find((r) => r.job_id === c.job_id) || rows[0] || null)
    } else {
      setActiveApp(null)
    }
  }

  useEffect(() => {
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoadError(true); setLoading(false); return }
      setUid(user.id); uidRef.current = user.id
      try {
        const [list] = await Promise.all([loadConvos(user.id), loadInterviews(user.id)])
        // deep-links: ?c=<conversationId> opens that thread; ?tab=interviews opens the Interviews tab
        const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
        if (params?.get('tab') === 'interviews') setView('interviews')
        const wanted = params?.get('c') || null
        const target = (wanted && list.find((x) => x.id === wanted)) || list[0]
        if (target) await openConv(target)
      } catch { setLoadError(true) }
      setLoading(false)
      if (cancelled) return

      // Unique channel name per mount so React StrictMode's double-invoke doesn't
      // reuse an already-subscribed channel (which throws "cannot add callbacks
      // after subscribe()"). RLS still scopes what each user receives.
      channel = supabase
        .channel(`inbox:${user.id}:${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const m = payload.new as Msg
          loadConvos(uidRef.current)
          if (m.conversation_id === activeRef.current) {
            loadMessages(activeRef.current!)
            loadInterviews(uidRef.current)
            const c = activeConvRef.current
            if (m.sender_id !== uidRef.current && c) {
              const patch = c.recruiter_id === uidRef.current ? { recruiter_unread: 0 } : { candidate_unread: 0 }
              supabase.from('conversations').update(patch).eq('id', activeRef.current!)
            }
          }
        })
        .subscribe()
    })
    const onFocus = () => { if (uidRef.current) { loadConvos(uidRef.current); loadInterviews(uidRef.current); if (activeRef.current) loadMessages(activeRef.current) } }
    window.addEventListener('focus', onFocus)
    return () => { cancelled = true; window.removeEventListener('focus', onFocus); if (channel) supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [msgs])

  // ── messaging ──────────────────────────────────────────────────────────────
  const insertMsg = async (kind: string, body: string | null, meta: Record<string, unknown> | null = null) => {
    if (!active) return null
    const { data } = await supabase.from('messages').insert({ conversation_id: active.id, sender_id: uid, body, kind, meta: meta as never }).select('*').single()
    if (data) setMsgs((m) => [...m, data as Msg])
    return data as Msg | null
  }
  const emailEvent = (payload: Record<string, unknown>) => {
    fetch('/api/inbox', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, conversationId: active?.id }) }).catch(() => {})
  }
  const sendText = async () => {
    const body = input.trim()
    if (!body || !active || busy) return
    setInput('')
    await insertMsg('text', body)
    loadConvos(uid)
    emailEvent({ event: 'message', preview: body })
  }

  // ── interview lifecycle ──────────────────────────────────────────────────────
  const patchIv = (iv: Iv) => setIvById((m) => ({ ...m, [iv.id]: iv }))
  const setStage = async (iv: Iv, stage: string) => {
    const next = { ...iv, stage }; patchIv(next)
    await supabase.from('interviews').update({ stage }).eq('id', iv.id)
    if (iv.application_id) {
      const appStatus = stage.startsWith('offer') ? 'offer' : stage === 'rejected' ? 'rejected' : stage === 'proposed' || stage === 'accepted' ? 'interview' : null
      if (appStatus) await supabase.from('applications').update({ status: appStatus }).eq('id', iv.application_id)
    }
  }

  // find or create the interview backing this conversation (for offer/reject from the menu)
  const ensureIv = async (): Promise<Iv | null> => {
    if (!active) return null
    const existing = Object.values(ivById).find((v) => v.candidate_id === active.candidate_id && (activeApp ? v.application_id === activeApp.id : true) && !['rejected', 'cancelled', 'offer_declined'].includes(v.stage))
    if (existing) return existing
    const { data } = await supabase.from('interviews').insert({
      application_id: activeApp?.id ?? null, job_id: activeApp?.job?.id ?? active.job_id, recruiter_id: uid,
      candidate_id: active.candidate_id, candidate_name: active.candidate_name, job_title: activeApp?.job?.title ?? active.job_title,
      duration_min: 30, stage: 'completed',
    }).select('*').single()
    if (!data) return null
    patchIv(data as Iv)
    await insertMsg('interview', null, { interview_id: (data as Iv).id })
    return data as Iv
  }

  const act = async (iv: Iv, action: string) => {
    if (busy) return
    setBusy(true)
    try {
      const job = iv.job_title || active?.job_title || 'the role'
      if (action === 'accept') { await setStage(iv, 'accepted'); await insertMsg('system', '✅ Interview confirmed by candidate.') }
      else if (action === 'decline') { await setStage(iv, 'declined'); await insertMsg('system', 'Candidate declined the interview.') }
      else if (action === 'complete') { await setStage(iv, 'completed'); await insertMsg('system', 'Interview marked completed.') }
      else if (action === 'offer') { await setStage(iv, 'offer'); await insertMsg('system', `🎉 Offer extended for ${job}.`); emailEvent({ event: 'offer', jobTitle: job }) }
      else if (action === 'reject') { await setStage(iv, 'rejected'); await insertMsg('system', `Application for ${job} was closed.`); emailEvent({ event: 'rejection', jobTitle: job }) }
      else if (action === 'cancel') { await setStage(iv, 'cancelled'); await insertMsg('system', 'Interview cancelled.') }
      else if (action === 'offer_accept') { await setStage(iv, 'offer_accepted'); await insertMsg('system', '🎉 Candidate accepted the offer!') }
      else if (action === 'offer_decline') { await setStage(iv, 'offer_declined'); await insertMsg('system', 'Candidate declined the offer.') }
      else if (action === 'reschedule') { openSchedule(iv) }
      loadConvos(uid)
    } finally { setBusy(false) }
  }

  // ── scheduling modal ─────────────────────────────────────────────────────────
  const openSchedule = (iv?: Iv) => {
    if (iv) {
      const d = iv.scheduled_at ? new Date(iv.scheduled_at) : null
      setSched({ ivId: iv.id, date: d ? d.toISOString().slice(0, 10) : '', time: d ? d.toTimeString().slice(0, 5) : '', duration: String(iv.duration_min || 30), link: iv.meeting_link || '', notes: iv.notes || '' })
    } else setSched(EMPTY_SCHED)
    setSchedErr(null); setShowSched(true)
  }
  const submitSchedule = async () => {
    if (!active) return
    if (!sched.date || !sched.time) { setSchedErr('Pick a date and time.'); return }
    setBusy(true)
    try {
      const scheduled_at = new Date(`${sched.date}T${sched.time}`).toISOString()
      const whenText = fmtWhen(scheduled_at)
      const job = activeApp?.job?.title || active.job_title || 'the role'
      if (sched.ivId) {
        const { data } = await supabase.from('interviews').update({ scheduled_at, duration_min: Number(sched.duration), meeting_link: sched.link.trim() || null, notes: sched.notes.trim() || null }).eq('id', sched.ivId).select('*').single()
        if (data) patchIv(data as Iv)
        await insertMsg('system', `📅 Interview rescheduled to ${whenText}.`)
      } else {
        const { data } = await supabase.from('interviews').insert({
          application_id: activeApp?.id ?? null, job_id: activeApp?.job?.id ?? active.job_id, recruiter_id: uid,
          candidate_id: active.candidate_id, candidate_name: active.candidate_name, job_title: job,
          scheduled_at, duration_min: Number(sched.duration), meeting_link: sched.link.trim() || null, notes: sched.notes.trim() || null, stage: 'proposed',
        }).select('*').single()
        if (data) { patchIv(data as Iv); await insertMsg('interview', null, { interview_id: (data as Iv).id }) }
        if (activeApp?.id) await supabase.from('applications').update({ status: 'interview' }).eq('id', activeApp.id)
      }
      emailEvent({ event: 'interview', jobTitle: job, whenText, durationMin: Number(sched.duration), notes: sched.notes.trim() || null })
      loadConvos(uid)
      setShowSched(false)
    } finally { setBusy(false) }
  }

  const sendOfferFromMenu = async () => { const iv = await ensureIv(); if (iv) await act(iv, 'offer') }
  const rejectFromMenu = async () => { if (!window.confirm('Send a rejection to this candidate?')) return; const iv = await ensureIv(); if (iv) await act(iv, 'reject') }

  // ── new conversation ─────────────────────────────────────────────────────────
  const openNew = async () => {
    setShowNew(true)
    if (isRecruiter) {
      const { data: jobsData } = await supabase.from('jobs').select('id').eq('recruiter_id', uid)
      const jobIds = (jobsData ?? []).map((j) => j.id)
      const { data } = jobIds.length
        ? await supabase.from('applications').select('candidate_id, candidate_name, job_id, job:jobs(title)').in('job_id', jobIds).order('applied_at', { ascending: false })
        : { data: [] }
      const seen = new Set<string>(); const items: NewItem[] = []
      ;((data as unknown as { candidate_id: string; candidate_name: string | null; job_id: string; job: { title: string } | null }[]) ?? []).forEach((a) => {
        if (seen.has(a.candidate_id)) return; seen.add(a.candidate_id)
        items.push({ otherId: a.candidate_id, name: a.candidate_name || 'Candidate', sub: a.job?.title || 'Applicant', jobId: a.job_id })
      })
      setNewItems(items)
    } else {
      const { data } = await supabase.from('applications').select('job:jobs(id, title, company, recruiter_id)').order('applied_at', { ascending: false })
      const seen = new Set<string>(); const items: NewItem[] = []
      ;((data as unknown as { job: { id: string; title: string; company: string; recruiter_id: string } | null }[]) ?? []).forEach((a) => {
        const j = a.job; if (!j || seen.has(j.recruiter_id)) return; seen.add(j.recruiter_id)
        items.push({ otherId: j.recruiter_id, name: j.company || 'Company', sub: j.title, jobId: j.id })
      })
      setNewItems(items)
    }
  }
  const startConv = async (item: NewItem) => {
    const recruiter = isRecruiter ? uid : item.otherId
    const candidate = isRecruiter ? item.otherId : uid
    const { data: convId } = await supabase.rpc('ensure_conversation', { p_recruiter: recruiter, p_candidate: candidate, p_job: item.jobId ?? undefined })
    closeNew()
    const list = await loadConvos(uid)
    const c = list.find((x) => x.id === convId)
    if (c) await openConv(c)
  }

  // DM anyone: search all people, then ensure_dm() to open/create the thread
  const searchPeople = (q: string) => {
    setPeopleQ(q)
    if (peopleDebounce.current) clearTimeout(peopleDebounce.current)
    const term = q.trim()
    if (!term) { setPeopleResults([]); return }
    peopleDebounce.current = setTimeout(async () => {
      const like = `%${term.replace(/[%,]/g, '')}%`
      const { data } = await supabase
        .from('public_profiles')
        .select('id, full_name, username, role, company_name')
        .or(`full_name.ilike.${like},username.ilike.${like},company_name.ilike.${like}`)
        .neq('id', uid)
        .limit(20)
      setPeopleResults((data as typeof peopleResults) ?? [])
    }, 250)
  }
  const startDm = async (otherId: string) => {
    const { data: convId } = await supabase.rpc('ensure_dm', { p_other: otherId })
    closeNew()
    const list = await loadConvos(uid)
    const c = list.find((x) => x.id === convId)
    if (c) await openConv(c)
  }
  const closeNew = () => { setShowNew(false); setPeopleQ(''); setPeopleResults([]) }

  // Interviews tab: open the chat that backs an interview (create the thread if needed)
  const openFromInterview = async (iv: Iv) => {
    let c = convos.find((x) => x.recruiter_id === iv.recruiter_id && x.candidate_id === iv.candidate_id)
    if (!c) {
      const { data: convId } = await supabase.rpc('ensure_conversation', { p_recruiter: iv.recruiter_id, p_candidate: iv.candidate_id, p_job: iv.job_id ?? undefined })
      const list = await loadConvos(uid)
      c = list.find((x) => x.id === convId)
    }
    if (c) { setView('messages'); await openConv(c) }
  }
  const interviewList = Object.values(ivById).sort((a, b) => +new Date(b.scheduled_at || 0) - +new Date(a.scheduled_at || 0))

  // Once the candidate has a live offer / is hired / was rejected, the recruiter
  // shouldn't be able to re-offer or reject. Scheduling an interview stays open.
  const dealIvs = active ? Object.values(ivById).filter((v) => v.candidate_id === active.candidate_id) : []
  const hired = dealIvs.some((v) => v.stage === 'offer_accepted')
  const offerLocked = dealIvs.some((v) => ['offer', 'offer_accepted', 'rejected'].includes(v.stage))
  const rejectLocked = dealIvs.some((v) => ['offer', 'offer_accepted', 'rejected'].includes(v.stage))
  const offerHint = hired ? 'Candidate is already hired' : offerLocked ? 'An offer or decision already exists' : 'Send a job offer'
  const rejectHint = hired ? 'Candidate is already hired — you can’t reject them' : rejectLocked ? 'A decision was already made for this candidate' : 'Reject this candidate'

  if (loading) return <Loader />
  if (loadError) return <ErrorBox />

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Conversation list */}
      <aside className={`${active ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col border-r border-surface-container bg-white dark:bg-[#1c1c1e] flex-shrink-0`}>
        <div className="p-4 border-b border-surface-container flex items-center justify-between">
          <h1 className="text-lg font-bold text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-primary">forum</span>Inbox</h1>
          {view === 'messages' && <button onClick={openNew} className="h-9 px-3 rounded-xl premium-gradient text-white text-xs font-bold flex items-center gap-1 hover:scale-105 transition-transform"><span className="material-symbols-outlined text-base">edit_square</span>New</button>}
        </div>
        {/* Tabs: Messages | Interviews */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-surface-container">
          {(['messages', 'interviews'] as const).map((t) => (
            <button key={t} onClick={() => setView(t)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${view === t ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container-low'}`}>
              {t}{t === 'interviews' && interviewList.length ? ` (${interviewList.length})` : ''}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {view === 'messages' ? (
            convos.length === 0 ? (
              <div className="p-8 text-center text-sm text-on-surface-variant">No conversations yet. Tap <b>New</b> to start one.</div>
            ) : convos.map((c) => {
              const u = unreadOf(c)
              const oi = otherInfo[otherId(c)]
              return (
                <button key={c.id} onClick={() => openConv(c)} className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-surface-container/60 hover:bg-surface-container-low transition-colors ${active?.id === c.id ? 'bg-primary/5' : ''}`}>
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black overflow-hidden ${avatarColor(otherName(c))}`}>
                    {oi?.photo ? <img src={oi.photo} alt={otherName(c)} className="h-full w-full object-cover" /> : initial(otherName(c))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-on-surface truncate">{otherName(c)}</p>
                      <span className="text-[10px] text-outline flex-shrink-0">{timeAgo(c.last_message_at)}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant truncate">{c.job_title || (c.is_hiring ? 'Conversation' : 'Direct message')}</p>
                    <p className={`text-xs truncate mt-0.5 ${u > 0 ? 'text-on-surface font-semibold' : 'text-outline'}`}>{c.last_sender_id === uid ? 'You: ' : ''}{c.last_message || 'Say hello 👋'}</p>
                  </div>
                  {u > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-1">{u}</span>}
                </button>
              )
            })
          ) : (
            interviewList.length === 0 ? (
              <div className="p-8 text-center text-sm text-on-surface-variant">No interviews yet.</div>
            ) : interviewList.map((iv) => {
              const c = convos.find((x) => x.recruiter_id === iv.recruiter_id && x.candidate_id === iv.candidate_id)
              const who = c ? otherName(c) : (iv.candidate_name || 'Interview')
              const sm = STAGE_META[iv.stage] || STAGE_META.proposed
              return (
                <button key={iv.id} onClick={() => openFromInterview(iv)} className="w-full text-left flex items-start gap-3 px-4 py-3 border-b border-surface-container/60 hover:bg-surface-container-low transition-colors">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary/10 text-primary"><span className="material-symbols-outlined">{sm.icon}</span></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-on-surface truncate">{iv.job_title || 'Interview'}</p>
                    <p className="text-xs text-on-surface-variant truncate">with {who}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${sm.cls}`}>{sm.label}</span>
                      {iv.scheduled_at && <span className="text-[10px] text-outline">{fmtWhen(iv.scheduled_at)}</span>}
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-outline flex-shrink-0">chevron_right</span>
                </button>
              )
            })
          )}
        </div>
      </aside>

      {/* Thread */}
      <section className={`${active ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-surface-container-low min-w-0`}>
        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4"><span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>forum</span></div>
            <h2 className="text-lg font-bold text-on-surface mb-1">Your messages</h2>
            <p className="text-sm text-on-surface-variant max-w-xs">Select a conversation, or start a new one to {isRecruiter ? 'reach out to a candidate' : 'message a recruiter'}.</p>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <header className="h-16 px-3 md:px-5 flex items-center gap-3 border-b border-surface-container bg-white dark:bg-[#1c1c1e] flex-shrink-0">
              <button onClick={() => { setActive(null); activeRef.current = null; activeConvRef.current = null }} className="md:hidden p-1.5 -ml-1 rounded-lg hover:bg-surface-container text-on-surface-variant"><span className="material-symbols-outlined">arrow_back</span></button>
              {(() => {
                const oi = otherInfo[otherId(active)]
                const avatar = (
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black overflow-hidden ${avatarColor(otherName(active))}`}>
                    {oi?.photo ? <img src={oi.photo} alt={otherName(active)} className="h-full w-full object-cover" /> : initial(otherName(active))}
                  </div>
                )
                const name = <p className="text-sm font-bold text-on-surface truncate">{otherName(active)}</p>
                return (
                  <>
                    {oi?.username ? <Link href={profileLink(oi.username)} title="View profile" className="flex-shrink-0">{avatar}</Link> : avatar}
                    <div className="flex-1 min-w-0">
                      {oi?.username ? <Link href={profileLink(oi.username)} className="hover:underline">{name}</Link> : name}
                      <p className="text-xs text-on-surface-variant truncate">{active.job_title || (active.is_hiring ? (isRecruiter ? 'Candidate' : 'Recruiter') : 'Direct message')}</p>
                    </div>
                  </>
                )
              })()}
            </header>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
              {msgs.length === 0 && <p className="text-center text-xs text-on-surface-variant py-8">This is the start of your conversation.</p>}
              {msgs.map((m) => {
                if (m.kind === 'system') return <div key={m.id} className="flex justify-center"><span className="px-3 py-1 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-semibold">{m.body}</span></div>
                if (m.kind === 'interview' || m.kind === 'offer') {
                  const iv = m.meta?.interview_id ? ivById[m.meta.interview_id as string] : null
                  if (iv) return <div key={m.id} className="flex justify-center"><InterviewCard iv={iv} role={role} busy={busy} onAction={(a) => act(iv, a)} /></div>
                  return <div key={m.id} className="flex justify-center"><span className="px-3 py-1 rounded-full bg-surface-container text-on-surface-variant text-[11px]">Interview details</span></div>
                }
                const mine = m.sender_id === uid
                if (m.kind === 'post') {
                  const meta = (m.meta || {}) as { post_id?: string; author_name?: string; content?: string; image_url?: string }
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[78%] md:max-w-[70%] ${mine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                        {m.body && <p className={`px-4 py-2 rounded-2xl text-sm ${mine ? 'premium-gradient text-white' : 'bg-white dark:bg-white/10 text-on-surface border border-surface-container'}`}>{m.body}</p>}
                        <Link href={meta.post_id ? `/post/${meta.post_id}` : '#'} className="block w-full bg-white dark:bg-white/10 border border-surface-container rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                          {meta.image_url && <img src={meta.image_url} alt="shared post" className="w-full max-h-44 object-cover" />}
                          <div className="p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-primary flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">dynamic_feed</span>Shared post</p>
                            <p className="text-xs font-semibold text-on-surface mt-1">{meta.author_name || 'A post'}</p>
                            {meta.content && <p className="text-xs text-on-surface-variant line-clamp-3 mt-0.5">{meta.content}</p>}
                          </div>
                        </Link>
                        <p className="text-[10px] text-outline px-1">{fmtTime(m.created_at)}</p>
                      </div>
                    </div>
                  )
                }
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] md:max-w-[65%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${mine ? 'premium-gradient text-white rounded-br-md' : 'bg-white dark:bg-white/10 text-on-surface border border-surface-container rounded-bl-md'}`}>
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p className={`text-[10px] mt-1 ${mine ? 'text-white/70' : 'text-outline'}`}>{fmtTime(m.created_at)}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Recruiter quick actions (hiring threads only) */}
            {canHire(active) && (
              <div className="px-3 md:px-5 pt-2 flex flex-wrap gap-2 bg-white dark:bg-[#1c1c1e] border-t border-surface-container">
                <button onClick={() => openSchedule()} disabled={busy} title="Schedule an interview" className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 text-xs font-bold flex items-center gap-1.5 hover:bg-sky-100 dark:hover:bg-sky-500/25 transition-colors disabled:opacity-50"><span className="material-symbols-outlined text-base">videocam</span>Schedule interview</button>
                <button onClick={sendOfferFromMenu} disabled={busy || offerLocked} title={offerHint} className="px-3 py-1.5 rounded-xl bg-green-50 dark:bg-green-500/15 text-green-700 dark:text-green-300 text-xs font-bold flex items-center gap-1.5 hover:bg-green-100 dark:hover:bg-green-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-green-50 dark:disabled:hover:bg-green-500/15"><span className="material-symbols-outlined text-base">{hired ? 'verified' : 'workspace_premium'}</span>{hired ? 'Hired' : 'Send offer'}</button>
                <button onClick={rejectFromMenu} disabled={busy || rejectLocked} title={rejectHint} className="px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-300 text-xs font-bold flex items-center gap-1.5 hover:bg-red-100 dark:hover:bg-red-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-50 dark:disabled:hover:bg-red-500/15"><span className="material-symbols-outlined text-base">do_not_disturb_on</span>Reject</button>
              </div>
            )}

            {/* Composer */}
            <div className="p-3 md:p-4 bg-white dark:bg-[#1c1c1e] border-t border-surface-container flex items-end gap-2 flex-shrink-0">
              <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText() } }} rows={1} placeholder="Write a message…" className="flex-1 resize-none max-h-32 px-4 py-3 bg-surface-container-low border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white dark:focus:bg-white/10 transition-all text-on-surface text-sm outline-none" />
              <button onClick={sendText} disabled={!input.trim()} className="w-11 h-11 rounded-2xl premium-gradient text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:scale-105 transition-transform"><span className="material-symbols-outlined">send</span></button>
            </div>
          </>
        )}
      </section>

      {/* New conversation modal */}
      {showNew && (
        <Modal title="New message" onClose={closeNew}>
          {/* Search anyone */}
          <div className="relative mb-3">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
            <input
              value={peopleQ}
              onChange={(e) => searchPeople(e.target.value)}
              placeholder="Search anyone by name, @handle, or company…"
              className="w-full pl-10 pr-3 py-2.5 bg-surface-container-low border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white dark:focus:bg-white/10 transition-all text-on-surface text-sm outline-none"
            />
          </div>

          <div className="max-h-[55vh] overflow-y-auto -mx-1 px-1">
            {peopleQ.trim() ? (
              peopleResults.length === 0 ? (
                <p className="text-sm text-on-surface-variant text-center py-8">No people found.</p>
              ) : peopleResults.map((p) => {
                const label = p.full_name || (p.username ? '@' + p.username : 'User')
                const sub = p.role === 'recruiter' ? [p.company_name, 'Recruiter'].filter(Boolean).join(' · ') : 'Candidate'
                return (
                  <button key={p.id} onClick={() => startDm(p.id)} className="w-full text-left flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-surface-container-low transition-colors">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black ${avatarColor(label)}`}>{initial(label)}</div>
                    <div className="min-w-0"><p className="text-sm font-bold text-on-surface truncate">{label}</p><p className="text-xs text-on-surface-variant truncate">{sub}</p></div>
                    <span className="material-symbols-outlined text-outline ml-auto">chat</span>
                  </button>
                )
              })
            ) : (
              <>
                <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-2 mb-1">{isRecruiter ? 'Your applicants' : 'Companies you applied to'}</p>
                {newItems.length === 0 ? (
                  <p className="text-sm text-on-surface-variant text-center py-6">{isRecruiter ? 'No applicants yet — search above to message anyone.' : 'Search above to message anyone on SmartHire.'}</p>
                ) : newItems.map((it) => (
                  <button key={it.otherId} onClick={() => startConv(it)} className="w-full text-left flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-surface-container-low transition-colors">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black ${avatarColor(it.name)}`}>{initial(it.name)}</div>
                    <div className="min-w-0"><p className="text-sm font-bold text-on-surface truncate">{it.name}</p><p className="text-xs text-on-surface-variant truncate">{it.sub}</p></div>
                    <span className="material-symbols-outlined text-outline ml-auto">chat</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Schedule modal */}
      {showSched && (
        <Modal title={sched.ivId ? 'Reschedule interview' : 'Schedule interview'} onClose={() => setShowSched(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date" type="date" value={sched.date} onChange={(v) => setSched((s) => ({ ...s, date: v }))} />
              <Field label="Time" type="time" value={sched.time} onChange={(v) => setSched((s) => ({ ...s, time: v }))} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Duration</label>
              <FancySelect value={sched.duration} options={['15', '30', '45', '60'].map((d) => ({ value: d, label: `${d} min` }))} onChange={(v) => setSched((s) => ({ ...s, duration: v }))} icon="timer" />
            </div>
            <Field label="Meeting link (optional)" value={sched.link} onChange={(v) => setSched((s) => ({ ...s, link: v }))} placeholder="Leave empty to use the built-in video room" />
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Note (optional)</label>
              <textarea value={sched.notes} onChange={(e) => setSched((s) => ({ ...s, notes: e.target.value }))} rows={2} className="w-full px-4 py-3 bg-surface-container-low border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white dark:focus:bg-white/10 transition-all text-on-surface text-sm outline-none resize-none" placeholder="Anything the candidate should know…" />
            </div>
            {schedErr && <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/30 px-4 py-3"><span className="material-symbols-outlined text-red-500 dark:text-red-300">error</span><p className="text-sm text-red-700 dark:text-red-300 font-medium">{schedErr}</p></div>}
            <button onClick={submitSchedule} disabled={busy} className="w-full py-3 rounded-2xl premium-gradient text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"><span className="material-symbols-outlined text-lg">{busy ? 'hourglass_top' : 'check'}</span>{busy ? 'Saving…' : sched.ivId ? 'Reschedule & notify' : 'Schedule & notify'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function InterviewCard({ iv, role, busy, onAction }: { iv: Iv; role: Role; busy: boolean; onAction: (a: string) => void }) {
  const m = STAGE_META[iv.stage] || STAGE_META.proposed
  const isRecruiter = role === 'recruiter'
  const joinHref = iv.meeting_link || `/interview/${iv.id}`
  const external = !!iv.meeting_link
  const Btn = ({ icon, label, onClick, cls = '' }: { icon: string; label: string; onClick: () => void; cls?: string }) => (
    <button onClick={onClick} disabled={busy} className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 ${cls || 'bg-surface-container-low text-on-surface hover:bg-surface-container'}`}><span className="material-symbols-outlined text-base">{icon}</span>{label}</button>
  )
  const Join = () => external
    ? <a href={joinHref} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-xl premium-gradient text-white text-xs font-bold flex items-center gap-1.5 hover:scale-105 transition-transform"><span className="material-symbols-outlined text-base">open_in_new</span>Join</a>
    : <Link href={joinHref} className="px-3 py-1.5 rounded-xl premium-gradient text-white text-xs font-bold flex items-center gap-1.5 hover:scale-105 transition-transform"><span className="material-symbols-outlined text-base">videocam</span>Join room</Link>

  return (
    <div className="w-full max-w-sm bg-white dark:bg-[#2c2c2e] rounded-2xl border border-surface-container shadow-sm overflow-hidden">
      <div className="px-4 py-3 premium-gradient text-white flex items-center gap-2">
        <span className="material-symbols-outlined text-lg">event</span>
        <div className="min-w-0"><p className="text-sm font-bold truncate">{iv.job_title || 'Interview'}</p><p className="text-[11px] text-white/80">{fmtWhen(iv.scheduled_at)} · {iv.duration_min} min</p></div>
      </div>
      <div className="p-3">
        <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold items-center gap-1 ${m.cls}`}><span className="material-symbols-outlined text-sm">{m.icon}</span>{m.label}</span>
        {iv.notes && <p className="text-xs text-on-surface-variant mt-2 bg-surface-container-low rounded-lg px-2.5 py-1.5">{iv.notes}</p>}
        <div className="flex flex-wrap gap-2 mt-3">
          {!isRecruiter && iv.stage === 'proposed' && <><Btn icon="check" label="Accept" onClick={() => onAction('accept')} cls="premium-gradient text-white" /><Btn icon="close" label="Decline" onClick={() => onAction('decline')} /></>}
          {!isRecruiter && iv.stage === 'accepted' && <Join />}
          {!isRecruiter && iv.stage === 'completed' && <span className="text-xs text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-base text-purple-500">hourglass_top</span>Awaiting the result…</span>}
          {!isRecruiter && iv.stage === 'offer' && <><Btn icon="celebration" label="Accept offer" onClick={() => onAction('offer_accept')} cls="bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-500/25" /><Btn icon="close" label="Decline" onClick={() => onAction('offer_decline')} /></>}

          {isRecruiter && (iv.stage === 'proposed' || iv.stage === 'accepted') && <><Join />{iv.stage === 'accepted' && <Btn icon="task_alt" label="Completed" onClick={() => onAction('complete')} />}<Btn icon="edit_calendar" label="Reschedule" onClick={() => onAction('reschedule')} /><Btn icon="event_busy" label="Cancel" onClick={() => onAction('cancel')} /></>}
          {isRecruiter && iv.stage === 'completed' && <><Btn icon="workspace_premium" label="Make offer" onClick={() => onAction('offer')} cls="bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-500/25" /><Btn icon="do_not_disturb_on" label="Reject" onClick={() => onAction('reject')} cls="bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/25" /></>}
          {isRecruiter && iv.stage === 'offer' && <span className="text-xs text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-base text-indigo-500">hourglass_top</span>Awaiting the candidate&apos;s response…</span>}
        </div>
      </div>
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-[#2c2c2e] rounded-3xl shadow-2xl overflow-hidden auth-pop">
        <div className="p-4 border-b border-surface-container flex items-center justify-between">
          <h3 className="text-base font-bold text-on-surface">{title}</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1"><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 ml-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-4 py-3 bg-surface-container-low border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white dark:focus:bg-white/10 transition-all text-on-surface text-sm font-medium placeholder:text-outline-variant outline-none" />
    </div>
  )
}
function Loader() {
  return <div className="flex flex-col items-center justify-center gap-3 py-32"><div className="flex gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce"></div><div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div><div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div></div><p className="text-xs font-black text-primary tracking-widest uppercase">Loading inbox...</p></div>
}
function ErrorBox() {
  return <div className="p-8 max-w-3xl mx-auto"><div className="bg-white dark:bg-[#2c2c2e] rounded-[1.5rem] border border-surface-container p-12 flex flex-col items-center text-center"><div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/15 flex items-center justify-center text-red-500 dark:text-red-300 mb-5"><span className="material-symbols-outlined text-3xl">cloud_off</span></div><h2 className="text-lg font-bold text-on-surface mb-2">Couldn’t load your inbox</h2><p className="text-sm text-on-surface-variant">Please refresh the page.</p></div></div>
}
