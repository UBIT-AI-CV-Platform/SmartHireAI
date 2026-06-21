// Shared Gemini helpers with multi-key rotation + model fallback.
//
// Set GEMINI_API_KEYS=key1,key2,key3 in .env.local to pool multiple free-tier
// keys. Falls back to GEMINI_API_KEY if GEMINI_API_KEYS is not set.
//
// geminiGenerate() rotates to the next key immediately on a 429, then tries
// every remaining key before moving on to the next model in the fallback chain.
// pickGeminiKey() is for routes that make their own fetch() calls (streaming,
// structured output); it simply advances the round-robin counter.

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest']
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

let _keys: string[] | null = null
let _robin = 0

function loadKeys(): string[] {
  if (_keys) return _keys
  const multi = process.env.GEMINI_API_KEYS
  if (multi) {
    const parsed = multi.split(',').map((k) => k.trim()).filter(Boolean)
    if (parsed.length) { _keys = parsed; return _keys }
  }
  const single = process.env.GEMINI_API_KEY
  _keys = single ? [single] : []
  return _keys
}

/** Pick the next API key in round-robin order. Returns '' if none configured. */
export function pickGeminiKey(): string {
  const keys = loadKeys()
  if (!keys.length) return ''
  const key = keys[_robin % keys.length]
  _robin = (_robin + 1) % keys.length
  return key
}

/**
 * Generate text from Gemini with automatic key rotation on 429,
 * model fallback, and transient-error retries.
 */
export async function geminiGenerate(body: object, models: string[] = GEMINI_MODELS): Promise<string> {
  const keys = loadKeys()
  if (!keys.length)
    throw new Error('AI is not configured. Add GEMINI_API_KEY or GEMINI_API_KEYS to .env.local.')

  let lastStatus = 0
  let lastErr = ''

  for (const model of models) {
    for (let ki = 0; ki < keys.length; ki++) {
      const key = keys[(_robin + ki) % keys.length]
      for (let attempt = 0; attempt < 2; attempt++) {
        let res: Response
        try {
          res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
              body: JSON.stringify(body),
            }
          )
        } catch (e) {
          lastErr = e instanceof Error ? e.message : 'network error'
          await sleep(800 * (attempt + 1))
          continue
        }
        if (res.ok) {
          _robin = (_robin + ki + 1) % keys.length // advance past the key that worked
          const data = await res.json()
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) return text.trim()
          lastErr = 'The AI returned an empty response.'
          continue
        }
        lastStatus = res.status
        lastErr = (await res.text()).slice(0, 200)
        if (res.status === 429) break // rate-limited on this key → try next key immediately
        if ([500, 503].includes(res.status)) { await sleep(800 * (attempt + 1)); continue }
        throw new Error(lastErr) // hard error (bad key, bad request)
      }
    }
  }

  if ([429, 503].includes(lastStatus))
    throw new Error('The AI is busy right now (free-tier overload). Please try again in a few seconds.')
  throw new Error(lastErr || 'AI request failed.')
}
