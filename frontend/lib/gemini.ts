// Shared Gemini helpers with multi-key rotation + model fallback.
//
// Set GEMINI_API_KEYS=key1,key2,key3 in .env.local to pool multiple free-tier
// keys. Falls back to GEMINI_API_KEY if GEMINI_API_KEYS is not set.
//
// Model chain: override with GEMINI_MODELS=a,b,c (full chain) or GEMINI_MODEL=a
// (primary only, defaults stay as fallbacks). A Gemini API key is not tied to a
// model - every key reaches every model the account can see - so switching
// versions is purely an env/model-name change, never a new key.
//
// Timeouts matter more than they look: gemini-3.x models think before they
// answer and can take 15-35s under free-tier load, while a Vercel Hobby
// function is killed at 60s. So each attempt gets its own abort timeout and the
// chain shares a total budget - a slow primary is cut off and the next model in
// the chain answers, instead of the whole request dying at the function limit.

// Gemini 3 only, on purpose. gemini-2.5-flash and gemini-2.0-flash now 404 with
// "no longer available to new users" on any key issued recently - an older key
// is grandfathered in, a fresh one is not, which is exactly the kind of split
// that works locally and dies on a redeploy.
//
// gemini-3.1-flash-lite leads rather than the nominally stronger
// gemini-3.6-flash because on the free tier 3.6 is queue-starved: measured over
// repeated structured-CV generations, 3.1-flash-lite returned valid JSON 4/4
// times at a ~5s median while 3.6-flash managed 1/4 at ~20s, and the lite
// output was no thinner (it kept more experience entries, not fewer). 3.6 stays
// in the chain so a lite failure still has a stronger model behind it.
// gemini-flash-lite-latest is deliberately absent - it measured an 82s median on
// the same structured workload, which is no use as a safety net.
const DEFAULT_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.6-flash', 'gemini-3.5-flash']

/** Abort a single upstream call after this long and try the next model/key. */
const ATTEMPT_TIMEOUT_MS = Number(process.env.GEMINI_ATTEMPT_TIMEOUT_MS || 20_000)
/**
 * Ceiling on generated tokens when a caller does not set one. Structured-output
 * calls can send the model into a loop that repeats the JSON: one measured run
 * emitted 65k tokens over 238s before the API stopped it, which on Vercel is
 * just a dead request plus a burnt free-tier quota. A real CV lands around
 * 900-2200 tokens, so this is headroom, not a limit. Note that on Gemini 3 the
 * thinking tokens share this budget with the answer.
 */
const MAX_OUTPUT_TOKENS = Number(process.env.GEMINI_MAX_OUTPUT_TOKENS || 8_192)
/** Never spend more than this across the whole fallback chain (Hobby cap is 60s). */
const TOTAL_BUDGET_MS = Number(process.env.GEMINI_TOTAL_BUDGET_MS || 50_000)
/** 'low' keeps gemini-3.x responsive. 'high' is slower but reasons harder. */
const THINKING_LEVEL = process.env.GEMINI_THINKING_LEVEL || 'low'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

let _keys: string[] | null = null
let _models: string[] | null = null
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

/** The model fallback chain, primary first. */
export function geminiModels(): string[] {
  if (_models) return _models
  const chain = process.env.GEMINI_MODELS
  if (chain) {
    const parsed = chain.split(',').map((m) => m.trim()).filter(Boolean)
    if (parsed.length) { _models = parsed; return _models }
  }
  const primary = process.env.GEMINI_MODEL?.trim()
  _models = primary ? [primary, ...DEFAULT_MODELS.filter((m) => m !== primary)] : DEFAULT_MODELS
  return _models
}

/** The model routes should reach for first. */
export function primaryGeminiModel(): string {
  return geminiModels()[0]
}

/**
 * Add the thinking budget a Gemini 3.x model needs to stay fast.
 * Gemini 3 rejects `thinkingBudget: 0` (400), so the level knob is the only
 * lever; Gemini 2.x ignores the field, so it is left untouched there.
 */
export function withThinking(model: string, generationConfig: Record<string, unknown>) {
  if (!/^gemini-3/.test(model)) return generationConfig
  return { ...generationConfig, thinkingConfig: { thinkingLevel: THINKING_LEVEL } }
}

/** Pick the next API key in round-robin order. Returns '' if none configured. */
export function pickGeminiKey(): string {
  const keys = loadKeys()
  if (!keys.length) return ''
  const key = keys[_robin % keys.length]
  _robin = (_robin + 1) % keys.length
  return key
}

/** True when at least one key is configured - for early "AI is off" responses. */
export function hasGeminiKeys(): boolean {
  return loadKeys().length > 0
}

function noKeysError(): Error {
  return new Error('AI is not configured. Add GEMINI_API_KEY or GEMINI_API_KEYS to .env.local.')
}

/** fetch() with its own abort timeout, capped by whatever budget is left. */
async function fetchWithTimeout(url: string, init: RequestInit, budgetLeftMs: number): Promise<Response> {
  const ms = Math.max(1_000, Math.min(ATTEMPT_TIMEOUT_MS, budgetLeftMs))
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

/** Merge the caller's generationConfig with the per-model thinking + output caps. */
function payloadFor(body: Record<string, unknown>, model: string): string {
  const caller = (body.generationConfig ?? {}) as Record<string, unknown>
  return JSON.stringify({
    ...body,
    generationConfig: {
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      ...withThinking(model, caller), // a caller's own maxOutputTokens still wins
    },
  })
}

/**
 * Generate text from Gemini with automatic key rotation on 429,
 * model fallback, per-attempt timeouts and transient-error retries.
 *
 * Callers pass their own temperature/maxOutputTokens in `generationConfig`;
 * the version-specific thinking settings are injected per model.
 */
export async function geminiGenerate(
  body: Record<string, unknown>,
  models: string[] = geminiModels()
): Promise<string> {
  const keys = loadKeys()
  if (!keys.length) throw noKeysError()

  const deadline = Date.now() + TOTAL_BUDGET_MS
  let lastStatus = 0
  let lastErr = ''

  modelLoop:
  for (const model of models) {
    const payload = payloadFor(body, model)

    for (let ki = 0; ki < keys.length; ki++) {
      const key = keys[(_robin + ki) % keys.length]
      for (let attempt = 0; attempt < 2; attempt++) {
        const budgetLeft = deadline - Date.now()
        if (budgetLeft <= 1_000) break

        let res: Response
        try {
          res = await fetchWithTimeout(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
              body: payload,
            },
            budgetLeft
          )
        } catch (e) {
          const aborted = e instanceof Error && e.name === 'AbortError'
          lastErr = aborted ? `${model} timed out` : e instanceof Error ? e.message : 'network error'
          // A timeout is the model being slow, not the key being bad, so a
          // different key would just burn the same budget again.
          if (aborted) continue modelLoop
          await sleep(800 * (attempt + 1))
          continue
        }

        if (res.ok) {
          const data = await res.json()
          const candidate = data?.candidates?.[0]
          const parts = candidate?.content?.parts
          const text = Array.isArray(parts)
            ? parts.map((p: { text?: string }) => p?.text).filter(Boolean).join('')
            : undefined

          // MAX_TOKENS means the answer was cut mid-sentence. Handing that back
          // gives routes half a JSON document to parse, so retry instead - the
          // caller should never have to guess whether a result is complete.
          if (candidate?.finishReason === 'MAX_TOKENS') {
            lastErr = `${model} hit the output limit before finishing.`
            console.error(`Gemini truncated response (${model}): ${data?.usageMetadata?.candidatesTokenCount ?? '?'} output tokens`)
            continue
          }
          if (text) {
            _robin = (_robin + ki + 1) % keys.length // advance past the key that worked
            return text.trim()
          }
          lastErr = 'The AI returned an empty response.'
          continue
        }

        lastStatus = res.status
        lastErr = (await res.text()).slice(0, 200)
        // 404 = this model is retired or misspelled; no key will bring it back,
        // so abandon it and let the next model in the chain answer.
        if (res.status === 404) {
          console.error(`Gemini model unavailable (${model}):`, lastErr)
          continue modelLoop
        }
        // 429 = this key is rate-limited, 403 = this key is dead/denied.
        // Either way a different key may still work, so rotate instead of failing.
        if (res.status === 429 || res.status === 403) break
        if ([500, 503].includes(res.status)) { await sleep(800 * (attempt + 1)); continue }
        console.error(`Gemini API error (${model}, status ${res.status}):`, lastErr)
        throw new Error('Something went wrong with the AI service. Please try again.') // hard error (bad request)
      }
    }
  }

  throw exhaustedError(lastStatus, lastErr)
}

/** The message to surface once every model/key in the chain has failed. */
function exhaustedError(lastStatus: number, lastErr: string): Error {
  if (lastStatus === 404)
    return new Error('No configured Gemini model is available. Check GEMINI_MODEL / GEMINI_MODELS - the requested model may have been retired.')
  if (lastStatus === 403)
    return new Error('AI access was denied for every configured Gemini key. Check GEMINI_API_KEYS and remove any invalid keys.')
  if ([429, 503].includes(lastStatus))
    return new Error('The AI is busy right now (free-tier overload). Please try again in a few seconds.')
  return new Error(lastErr || 'AI request failed.')
}

/**
 * Open an SSE streaming call, walking the model chain until one accepts the
 * request. Only the connect step is guarded here - once Gemini starts emitting,
 * the caller owns the stream. Returns the live Response plus the model that
 * answered, or throws with a user-safe message.
 */
export async function geminiStream(
  body: Record<string, unknown>,
  models: string[] = geminiModels()
): Promise<{ res: Response; model: string }> {
  const keys = loadKeys()
  if (!keys.length) throw noKeysError()

  const deadline = Date.now() + TOTAL_BUDGET_MS
  let lastStatus = 0
  let lastErr = ''

  for (const model of models) {
    const payload = payloadFor(body, model)

    for (let ki = 0; ki < keys.length; ki++) {
      const budgetLeft = deadline - Date.now()
      if (budgetLeft <= 1_000) break
      const key = keys[(_robin + ki) % keys.length]

      let res: Response
      try {
        res = await fetchWithTimeout(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body: payload,
          },
          budgetLeft
        )
      } catch (e) {
        lastErr = e instanceof Error && e.name === 'AbortError'
          ? `${model} timed out`
          : e instanceof Error ? e.message : 'network error'
        continue
      }

      if (res.ok && res.body) {
        _robin = (_robin + ki + 1) % keys.length
        return { res, model }
      }

      lastStatus = res.status
      lastErr = (await res.text().catch(() => '')).slice(0, 200)
      console.error(`Gemini stream error (${model}, status ${res.status}):`, lastErr)
      if ([403, 429, 500, 503].includes(res.status)) continue // next key, then next model
      break // 404 (retired model) or 400 (bad request) - no key fixes it, so try the next model
    }
  }

  throw exhaustedError(lastStatus, lastErr)
}
