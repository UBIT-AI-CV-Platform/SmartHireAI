'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Interview = {
  id: string; job_title: string | null; candidate_name: string | null
  candidate_id: string; recruiter_id: string; scheduled_at: string | null; duration_min: number; stage: string
}
type SignalBody =
  | { type: 'offer' | 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'candidate'; candidate: RTCIceCandidateInit }
type Signal = SignalBody & { from: string; to: string }

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]
const fmtWhen = (iso: string | null) => iso ? new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Now'
const initial = (s: string) => (s || '?').charAt(0).toUpperCase()

export default function InterviewRoomPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = useRef(createClient()).current

  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [iv, setIv] = useState<Interview | null>(null)
  const [isRecruiter, setIsRecruiter] = useState(false)
  const [me, setMe] = useState('You')
  const [other, setOther] = useState('Participant')
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [peerPresent, setPeerPresent] = useState(false)
  const [connState, setConnState] = useState<RTCPeerConnectionState>('new')
  const [remoteActive, setRemoteActive] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const pendingIce = useRef<RTCIceCandidateInit[]>([])
  const offeredRef = useRef(false)
  const idsRef = useRef<{ me: string; other: string }>({ me: '', other: '' })

  // ── access check + identities ────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/auth'); return }
      const { data } = await supabase.from('interviews').select('id, job_title, candidate_name, candidate_id, recruiter_id, scheduled_at, duration_min, stage').eq('id', id).single()
      if (!data) { setDenied(true); setLoading(false); return }
      const row = data as Interview
      if (user.id !== row.recruiter_id && user.id !== row.candidate_id) { setDenied(true); setLoading(false); return }
      const rec = user.id === row.recruiter_id
      setIsRecruiter(rec); setIv(row)
      idsRef.current = { me: user.id, other: rec ? row.candidate_id : row.recruiter_id }
      const { data: prof } = await supabase.from('profiles').select('full_name, company_name').eq('id', user.id).single()
      setMe(prof?.full_name || prof?.company_name || 'You')
      if (rec) setOther(row.candidate_name || 'Candidate')
      else {
        const { data: r } = await supabase.from('profiles').select('full_name, company_name').eq('id', row.recruiter_id).single()
        setOther(r?.company_name || r?.full_name || 'Interviewer')
      }
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // ── WebRTC setup once identities are known ───────────────────────────────────
  useEffect(() => {
    if (loading || denied || !iv) return
    const { me: myId, other: otherId } = idsRef.current
    if (!myId || !otherId) return
    const isInitiator = myId < otherId
    let cancelled = false

    const sendSignal = (payload: SignalBody) => {
      channelRef.current?.send({ type: 'broadcast', event: 'signal', payload: { ...payload, from: myId, to: otherId } })
    }

    const makeOffer = async () => {
      const pc = pcRef.current
      if (!pc || offeredRef.current) return
      offeredRef.current = true
      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        sendSignal({ type: 'offer', sdp: pc.localDescription! })
      } catch { offeredRef.current = false }
    }

    const drainIce = async () => {
      const pc = pcRef.current; if (!pc) return
      for (const c of pendingIce.current) { try { await pc.addIceCandidate(c) } catch { /* noop */ } }
      pendingIce.current = []
    }

    const setup = async () => {
      // 1) local media (best-effort — room still works audio/placeholder if denied)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        localStreamRef.current = stream
        if (localVideoRef.current) localVideoRef.current.srcObject = stream
      } catch {
        setMediaError('We couldn’t access your camera/mic. Check browser permissions — you can still see the other participant.')
      }
      if (cancelled) return

      // 2) peer connection
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      pcRef.current = pc
      localStreamRef.current?.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!))
      pc.onicecandidate = (e) => { if (e.candidate) sendSignal({ type: 'candidate', candidate: e.candidate.toJSON() }) }
      pc.ontrack = (e) => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0]; setRemoteActive(true) }
      pc.onconnectionstatechange = () => { setConnState(pc.connectionState); if (pc.connectionState === 'failed') offeredRef.current = false }

      // 3) signaling channel over Supabase Realtime
      const channel = supabase.channel(`room-${id}`, { config: { broadcast: { self: false }, presence: { key: myId } } })
      channelRef.current = channel

      channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
        const sig = payload as Signal
        if (sig.to !== myId) return
        const pc2 = pcRef.current; if (!pc2) return
        try {
          if (sig.type === 'offer') {
            await pc2.setRemoteDescription(sig.sdp); await drainIce()
            const answer = await pc2.createAnswer(); await pc2.setLocalDescription(answer)
            sendSignal({ type: 'answer', sdp: pc2.localDescription! })
          } else if (sig.type === 'answer') {
            await pc2.setRemoteDescription(sig.sdp); await drainIce()
          } else if (sig.type === 'candidate') {
            if (pc2.remoteDescription) await pc2.addIceCandidate(sig.candidate)
            else pendingIce.current.push(sig.candidate)
          }
        } catch { /* swallow transient negotiation errors */ }
      })

      channel.on('presence', { event: 'sync' }, () => {
        const present = Object.keys(channel.presenceState()).includes(otherId)
        setPeerPresent(present)
        if (present && isInitiator) makeOffer()
        if (!present) { offeredRef.current = false; setRemoteActive(false) }
      })

      channel.subscribe((status) => { if (status === 'SUBSCRIBED') channel.track({ uid: myId }) })
    }

    setup()
    return () => {
      cancelled = true
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
      pcRef.current?.close(); pcRef.current = null
      channelRef.current?.unsubscribe(); channelRef.current = null
      pendingIce.current = []; offeredRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, denied, iv])

  // call timer once connected
  useEffect(() => {
    if (connState !== 'connected') return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [connState])

  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0]
    if (track) { track.enabled = !track.enabled; setMicOn(track.enabled) }
  }
  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0]
    if (track) { track.enabled = !track.enabled; setCamOn(track.enabled) }
  }

  const backHref = isRecruiter ? '/recruiter/interviews' : '/candidate/interviews'
  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`
  const statusText = connState === 'connected' ? `Connected · ${mmss}` : peerPresent ? 'Connecting…' : `Waiting for ${other}…`

  if (loading) {
    return <div className="min-h-screen bg-[#0d0d12] flex items-center justify-center"><div className="flex gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce"></div><div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div><div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div></div></div>
  }
  if (denied || !iv) {
    return (
      <div className="min-h-screen bg-[#0d0d12] flex flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-white mb-5"><span className="material-symbols-outlined text-3xl">lock</span></div>
        <h1 className="text-xl font-bold text-white mb-2">Room not available</h1>
        <p className="text-white/60 text-sm max-w-sm mb-5">This interview room doesn’t exist or you don’t have access to it.</p>
        <Link href="/" className="px-5 py-2.5 rounded-xl premium-gradient text-white font-bold text-sm">Go home</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen h-screen bg-[#0d0d12] flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 md:px-6 h-16 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 premium-gradient rounded-lg flex items-center justify-center text-white flex-shrink-0"><span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>videocam</span></div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{iv.job_title || 'Interview'}</p>
            <p className="text-[11px] text-white/50">{fmtWhen(iv.scheduled_at)} · {iv.duration_min} min</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-bold"><span className={`w-2 h-2 rounded-full ${connState === 'connected' ? 'bg-green-400' : 'bg-amber-400 animate-pulse'}`} />{statusText}</span>
          <Link href={backHref} className="px-3 py-2 rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/20 transition-colors flex items-center gap-1.5"><span className="material-symbols-outlined text-base">close</span>Leave</Link>
        </div>
      </header>

      {mediaError && (
        <div className="px-4 md:px-6 pt-3 flex-shrink-0">
          <div className="max-w-3xl mx-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs"><span className="material-symbols-outlined text-base">videocam_off</span>{mediaError}</div>
        </div>
      )}

      {/* Stage */}
      <div className="flex-1 p-3 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 min-h-0">
        {/* Remote */}
        <Tile name={other} tag={isRecruiter ? 'Candidate' : 'Interviewer'} waiting={!remoteActive} waitLabel={peerPresent ? 'Connecting…' : 'Waiting to join…'}>
          <video ref={remoteVideoRef} autoPlay playsInline className={`w-full h-full object-cover ${remoteActive ? '' : 'hidden'}`} />
        </Tile>
        {/* Local */}
        <Tile name={me} tag="You" muted={!micOn} camOff={!camOn}>
          <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover -scale-x-100 ${camOn && localStreamRef.current ? '' : 'hidden'}`} />
        </Tile>
      </div>

      {/* Controls */}
      <footer className="px-4 md:px-6 py-4 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center justify-center gap-3">
          <Ctrl on={micOn} onClick={toggleMic} onIcon="mic" offIcon="mic_off" />
          <Ctrl on={camOn} onClick={toggleCam} onIcon="videocam" offIcon="videocam_off" />
          <Link href={backHref} className="w-14 h-12 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors" title="Leave"><span className="material-symbols-outlined">call_end</span></Link>
        </div>
      </footer>
    </div>
  )
}

function Tile({ name, tag, muted, camOff, waiting, waitLabel, children }: { name: string; tag: string; muted?: boolean; camOff?: boolean; waiting?: boolean; waitLabel?: string; children?: React.ReactNode }) {
  return (
    <div className="relative rounded-3xl bg-[#16161d] border border-white/10 flex items-center justify-center min-h-[30vh] overflow-hidden">
      {children}
      {(waiting || camOff) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-4xl font-black">{initial(name)}</div>
          {waiting && <p className="text-white/50 text-xs font-semibold">{waitLabel}</p>}
          {camOff && !waiting && <span className="material-symbols-outlined text-white/40 text-2xl">videocam_off</span>}
        </div>
      )}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur">
        <span className="text-sm font-bold text-white">{name}</span>
        <span className="text-[10px] font-bold text-white/60 uppercase tracking-wide">{tag}</span>
        {muted && <span className="material-symbols-outlined text-red-400 text-base">mic_off</span>}
      </div>
    </div>
  )
}

function Ctrl({ on, onClick, onIcon, offIcon }: { on: boolean; onClick: () => void; onIcon: string; offIcon: string }) {
  return (
    <button onClick={onClick} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${on ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500 text-white hover:bg-red-600'}`}>
      <span className="material-symbols-outlined">{on ? onIcon : offIcon}</span>
    </button>
  )
}
