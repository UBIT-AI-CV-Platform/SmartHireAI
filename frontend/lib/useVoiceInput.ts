'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Cross-browser voice-to-text hook.
 *
 * Two engines, picked automatically:
 *   1. Web Speech API (Chrome / Edge / Safari) — live interim transcription, no key.
 *   2. MediaRecorder → /api/transcribe (Gemini) fallback (Firefox + anything without
 *      Web Speech). Records audio, sends it to our server route which transcribes it
 *      with the free Gemini key. Final text only (no live interim).
 *
 * Both engines need a SECURE CONTEXT (https or localhost) — opening the app over a
 * plain-http LAN IP disables microphone access in every browser, so we surface a
 * clear message instead of failing silently.
 *
 * The button using this hook should ALWAYS render; when voice can't run we explain
 * why on click via `error`, which keeps the UI consistent across machines.
 */

type Options = {
  /** Called with recognized text. `isFinal` is false for live interim updates. */
  onTranscript: (text: string, isFinal: boolean) => void
}

type SpeechRecognitionLike = {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  onresult: ((e: SpeechResultEvent) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error?: string }) => void) | null
}
type SpeechResultEvent = {
  resultIndex: number
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>
}

function mapSpeechError(code?: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access is blocked. Allow it in your browser’s site settings, then try again.'
    case 'no-speech':
      return 'Didn’t catch that — please try speaking again.'
    case 'audio-capture':
      return 'No microphone found. Plug one in and try again.'
    case 'network':
      return 'Voice recognition needs an internet connection.'
    case 'aborted':
      return ''
    default:
      return 'Voice input failed. Please try again.'
  }
}

function mapMediaError(err: unknown): string {
  const name = (err as { name?: string })?.name
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Microphone access is blocked. Allow it in your browser’s site settings, then try again.'
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError')
    return 'No microphone found. Plug one in and try again.'
  return 'Could not access the microphone. Please try again.'
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const res = reader.result as string
      resolve(res.includes(',') ? res.split(',')[1] : res)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function useVoiceInput({ onTranscript }: Options) {
  const [listening, setListening] = useState(false) // actively capturing audio
  const [busy, setBusy] = useState(false) // transcribing the recorded clip (fallback)
  const [error, setError] = useState<string | null>(null)

  const cbRef = useRef(onTranscript)
  cbRef.current = onTranscript

  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  // Capability detection (client-only).
  const win = typeof window !== 'undefined' ? window : undefined
  const secure = !!win && (win.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  const SR = win ? ((win as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition || (win as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition) : undefined
  const hasWebSpeech = !!SR
  const hasMediaRecorder = !!win && !!navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== 'undefined'
  /** Voice can run at all (secure context + at least one engine). */
  const available = secure && (hasWebSpeech || hasMediaRecorder)

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  const startWebSpeech = useCallback(() => {
    if (!SR) return
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.continuous = false
    let finalText = ''
    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += chunk
        else interim += chunk
      }
      cbRef.current((finalText + interim).trim(), false)
    }
    rec.onerror = (e) => {
      const msg = mapSpeechError(e?.error)
      if (msg) setError(msg)
      setListening(false)
    }
    rec.onend = () => {
      setListening(false)
      if (finalText.trim()) cbRef.current(finalText.trim(), true)
    }
    recRef.current = rec
    try {
      rec.start()
      setListening(true)
      setError(null)
    } catch {
      setListening(false)
      setError('Could not start the microphone. Please try again.')
    }
  }, [SR])

  const startFallback = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        cleanupStream()
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        if (blob.size < 1500) return // basically silence
        setBusy(true)
        try {
          const audio = await blobToBase64(blob)
          const res = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio, mimeType: blob.type }),
          })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(data.error || 'Transcription failed.')
          if (data.text) cbRef.current(String(data.text).trim(), true)
          else setError('Didn’t catch that — please try speaking again.')
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Transcription failed.')
        } finally {
          setBusy(false)
        }
      }
      mediaRef.current = mr
      mr.start()
      setListening(true)
      setError(null)
    } catch (err) {
      setListening(false)
      setError(mapMediaError(err))
    }
  }, [])

  const toggle = useCallback(() => {
    setError(null)
    if (busy) return
    if (listening) {
      if (recRef.current) recRef.current.stop()
      else mediaRef.current?.stop()
      setListening(false)
      return
    }
    if (!secure) {
      setError('Voice input needs a secure connection. Open the app via localhost or an https URL.')
      return
    }
    if (hasWebSpeech) startWebSpeech()
    else if (hasMediaRecorder) startFallback()
    else setError('Your browser doesn’t support voice input. Try Chrome or Edge.')
  }, [busy, listening, secure, hasWebSpeech, hasMediaRecorder, startWebSpeech, startFallback])

  // Stop everything on unmount.
  useEffect(() => () => {
    try { recRef.current?.stop() } catch { /* noop */ }
    try { mediaRef.current?.stop() } catch { /* noop */ }
    cleanupStream()
  }, [])

  return { available, listening, busy, error, toggle, clearError: () => setError(null) }
}
