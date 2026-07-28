import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { geminiGenerate } from '@/lib/gemini'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

/** ~10 MB of base64 - far more than the short clips the recorder produces. */
const MAX_AUDIO_CHARS = 10 * 1024 * 1024

/**
 * Speech-to-text for browsers without the Web Speech API (e.g. Firefox).
 * The client records a short audio clip with MediaRecorder and posts it here as
 * base64; we hand it to Gemini (free key, reused) and return the transcript.
 */
export async function POST(req: NextRequest) {
  try {
    // Sign-in + rate limit before touching Gemini: this route bills our API keys,
    // so it must never be callable by an anonymous caller in a loop.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

    const limited = await rateLimit(supabase, 'transcribe')
    if (!limited.ok) return limited.response

    const { audio, mimeType } = await req.json()
    if (!audio || typeof audio !== 'string') {
      return NextResponse.json({ error: 'No audio provided.' }, { status: 400 })
    }
    if (audio.length > MAX_AUDIO_CHARS) {
      return NextResponse.json({ error: 'Audio clip is too large.' }, { status: 413 })
    }

    // Gemini accepts common audio containers; default to webm/opus (MediaRecorder default).
    const mime = (typeof mimeType === 'string' && mimeType.split(';')[0]) || 'audio/webm'

    const body = {
      contents: [
        {
          parts: [
            { inlineData: { mimeType: mime, data: audio } },
            {
              text:
                'Transcribe the spoken words in this audio to plain text. ' +
                'Return ONLY the transcript - no quotes, labels, timestamps, or commentary. ' +
                'If there is no clear speech, return an empty string.',
            },
          ],
        },
      ],
      generationConfig: { temperature: 0 },
    }

    const text = await geminiGenerate(body)
    return NextResponse.json({ text: (text || '').trim() })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Transcription failed.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
