'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Cross-browser voice-to-text hook.
 *
 * Behaviour (press-to-start, press-to-stop):
 *   Press the mic once and it keeps recording - through pauses, through thinking,
 *   through mid-sentence silences - until you press it again. The only thing that
 *   ends a session on its own is SILENCE_MS of hearing nothing at all.
 *
 * Two engines, picked automatically:
 *   1. Web Speech API (Chrome / Edge / Safari) - live interim transcription, no key.
 *   2. MediaRecorder → /api/transcribe (Gemini) fallback (Firefox + anything without
 *      Web Speech). Records audio, sends it to our server route which transcribes it
 *      with the free Gemini key. Final text only (no live interim).
 *
 * CONTINUITY - the subtle bit. SpeechRecognition is not a recorder: Chrome ends the
 * session on its own after an utterance (and again after a short pause) and fires
 * `onend`, even with continuous = true. Treating that as "the user is done" is what
 * made the button flick out of its red state after a single sentence. So `onend`
 * silently restarts recognition unless WE asked it to stop, and the accumulated
 * transcript lives in a ref that survives those restarts.
 *
 * PERMISSIONS - SpeechRecognition.start() does NOT raise the microphone prompt. With
 * no existing grant it just fires onerror('not-allowed'), so the user was told access
 * was "blocked" without ever being asked (most visibly on Android Chrome).
 * getUserMedia() is the API that actually prompts, so we take the grant through it
 * first and then hand over to SpeechRecognition.
 *
 * Both engines need a SECURE CONTEXT (https or localhost) - opening the app over a
 * plain-http LAN IP disables microphone access in every browser, so we surface a
 * clear message instead of failing silently.
 */

/** Hearing nothing for this long ends the session by itself. */
const SILENCE_MS = 10_000

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
  abort?: () => void
  onresult: ((e: SpeechResultEvent) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error?: string }) => void) | null
}
type SpeechResultEvent = {
  resultIndex: number
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>
}

/** Shown only when the mic was genuinely refused - so it must say how to undo that. */
const BLOCKED_MSG =
  'Microphone access is blocked for this site. Tap the lock (or ⓘ) icon next to the address bar → Permissions → allow Microphone, then reload and try again.'

function mapSpeechError(code?: string): string {
  switch (code) {
    case 'audio-capture':
      return 'No microphone found. Plug one in and try again.'
    // 'no-speech' and 'aborted' are normal during a long session and are swallowed.
    // 'not-allowed' / 'service-not-allowed' / 'network' are handled by the caller,
    // which retries on the MediaRecorder engine instead of giving up here.
    default:
      return 'Voice input failed. Please try again.'
  }
}

function mapMediaError(err: unknown): string {
  const name = (err as { name?: string })?.name
  if (name === 'NotAllowedError' || name === 'SecurityError') return BLOCKED_MSG
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError')
    return 'No microphone found. Plug one in and try again.'
  if (name === 'NotReadableError' || name === 'TrackStartError')
    return 'Your microphone is already in use by another app. Close it and try again.'
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

  /** Everything finalised so far in THIS session. Survives Chrome's auto-restarts. */
  const finalRef = useRef('')
  /** True once we (user or silence timer) have decided the session is over. */
  const stoppingRef = useRef(false)
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Web Audio plumbing used to notice silence on the MediaRecorder engine. */
  const audioCtxRef = useRef<AudioContext | null>(null)
  const vadRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
    if (vadRef.current) { clearInterval(vadRef.current); vadRef.current = null }
    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
  }

  const clearSilenceTimer = () => {
    if (silenceRef.current) { clearTimeout(silenceRef.current); silenceRef.current = null }
  }

  /** Called by whichever engine hears something - pushes the auto-stop back. */
  const heardSomething = useCallback(() => {
    clearSilenceTimer()
    silenceRef.current = setTimeout(() => {
      // SILENCE_MS with nothing at all: end the session for real.
      stoppingRef.current = true
      try { recRef.current?.stop() } catch { /* noop */ }
      try { mediaRef.current?.stop() } catch { /* noop */ }
      setListening(false)
    }, SILENCE_MS)
  }, [])

  /**
   * Obtain (and if necessary prompt for) microphone permission.
   *
   * This exists because SpeechRecognition.start() never prompts - see the note at
   * the top of the file. getUserMedia is what shows the browser's permission dialog,
   * so we open a stream purely to get the grant and close it again immediately.
   */
  const ensureMicPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      // No getUserMedia at all - nothing can prompt. Let Web Speech try on its own.
      return true
    }
    try {
      const probe = await navigator.mediaDevices.getUserMedia({ audio: true })
      probe.getTracks().forEach((t) => t.stop())
      return true
    } catch (err) {
      setError(mapMediaError(err))
      return false
    }
  }, [])

  // These two engines can hand off to / restart each other, and they are declared in
  // the wrong order to reference each other directly. Bridge them through refs.
  const startFallbackRef = useRef<() => Promise<void>>(async () => {})
  const startWebSpeechRef = useRef<() => void>(() => {})

  const startWebSpeech = useCallback(() => {
    if (!SR) return
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.continuous = true // keep going through pauses instead of one-shot
    let handedOver = false

    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript
        if (e.results[i].isFinal) finalRef.current += chunk
        else interim += chunk
      }
      cbRef.current((finalRef.current + interim).trim(), false)
      heardSomething()
    }

    rec.onerror = (e) => {
      const code = e?.error
      // A pause is not a failure. Chrome fires 'no-speech' during ordinary thinking
      // gaps and 'aborted' whenever we stop it ourselves - neither ends the session;
      // only the silence timer does.
      if (code === 'no-speech' || code === 'aborted') return

      // Android Chrome's speech service is flaky: even with the mic granted it can
      // answer 'not-allowed' / 'service-not-allowed' / 'network'. We already hold the
      // permission at this point, so rather than dead-ending the user we hand the
      // recording over to MediaRecorder + /api/transcribe, which only needs the mic.
      const recoverable = code === 'not-allowed' || code === 'service-not-allowed' || code === 'network'
      if (recoverable && hasMediaRecorder) {
        handedOver = true
        recRef.current = null
        void startFallbackRef.current()
        return
      }

      stoppingRef.current = true
      setError(mapSpeechError(code))
      setListening(false)
      clearSilenceTimer()
      recRef.current = null
    }

    rec.onend = () => {
      recRef.current = null
      if (handedOver) return // the fallback engine owns the session now

      if (!stoppingRef.current) {
        // Chrome ended the turn by itself (an utterance finished, or it heard a
        // pause). The user has NOT pressed stop, so pick straight back up - this is
        // what makes the recording continuous.
        startWebSpeechRef.current()
        return
      }

      setListening(false)
      clearSilenceTimer()
      if (finalRef.current.trim()) cbRef.current(finalRef.current.trim(), true)
    }

    recRef.current = rec
    try {
      rec.start()
      setListening(true)
      setError(null)
    } catch {
      // start() throws if the previous instance hasn't fully released yet; the next
      // onend will bring us back here.
      recRef.current = null
    }
  }, [SR, hasMediaRecorder, heardSomething])

  startWebSpeechRef.current = startWebSpeech

  const startFallback = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // MediaRecorder gives us no transcript events, so we listen to the waveform
      // ourselves to know whether anyone is still talking - that is what feeds the
      // same SILENCE_MS auto-stop the Web Speech engine gets for free.
      try {
        const ctx = new AudioContext()
        audioCtxRef.current = ctx
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 512
        ctx.createMediaStreamSource(stream).connect(analyser)
        const buf = new Uint8Array(analyser.frequencyBinCount)
        vadRef.current = setInterval(() => {
          analyser.getByteTimeDomainData(buf)
          // RMS around the 128 midpoint: anything above the floor counts as speech.
          let sum = 0
          for (const v of buf) sum += (v - 128) ** 2
          if (Math.sqrt(sum / buf.length) > 4) heardSomething()
        }, 250)
      } catch {
        // No Web Audio - fall back to a plain timeout from the moment we start.
      }

      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        cleanupStream()
        mediaRef.current = null
        clearSilenceTimer()
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
          else setError('Didn’t catch that - please try speaking again.')
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
      heardSomething() // arm the silence clock
    } catch (err) {
      mediaRef.current = null
      setListening(false)
      clearSilenceTimer()
      setError(mapMediaError(err))
    }
  }, [heardSomething])

  startFallbackRef.current = startFallback

  const toggle = useCallback(async () => {
    setError(null)
    if (busy) return

    // Second press on the red button: this is the ONLY manual way out.
    if (listening) {
      stoppingRef.current = true
      if (recRef.current) recRef.current.stop()
      else if (mediaRef.current) mediaRef.current.stop()
      setListening(false)
      clearSilenceTimer()
      return
    }

    if (!secure) {
      setError('Voice input needs a secure connection. Open the app over https (or localhost).')
      return
    }
    if (!hasWebSpeech && !hasMediaRecorder) {
      setError('Your browser doesn’t support voice input. Try Chrome or Edge.')
      return
    }

    // Ask for the mic BEFORE starting an engine. This is what actually shows the
    // browser prompt; without it SpeechRecognition just reports "not-allowed".
    const granted = await ensureMicPermission()
    if (!granted) return

    // Fresh session.
    stoppingRef.current = false
    finalRef.current = ''

    if (hasWebSpeech) {
      startWebSpeech()
      heardSomething() // arm the silence clock even before the first word
    } else {
      startFallback()
    }
  }, [busy, listening, secure, hasWebSpeech, hasMediaRecorder, ensureMicPermission, startWebSpeech, startFallback, heardSomething])

  // Stop everything on unmount.
  useEffect(() => () => {
    stoppingRef.current = true
    clearSilenceTimer()
    try { recRef.current?.stop() } catch { /* noop */ }
    try { mediaRef.current?.stop() } catch { /* noop */ }
    cleanupStream()
  }, [])

  return { available, listening, busy, error, toggle, clearError: () => setError(null) }
}
