// Shared Gemini caller with retry-on-overload + model fallback.
// The free tier frequently returns 503 ("model is currently experiencing high
// demand") and 429 (rate limit); a single fetch surfaces those as hard errors.
// This retries transient failures and falls back across models, throwing a
// friendly message only after every option is exhausted.

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest']
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Generate text from Gemini, returning the first candidate's text.
 * @param body the full generateContent request body (system_instruction, contents, generationConfig, …)
 * @param models optional override of the model fallback chain
 */
export async function geminiGenerate(apiKey: string, body: object, models: string[] = GEMINI_MODELS): Promise<string> {
  let lastStatus = 0
  let lastErr = ''
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      let res: Response
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify(body),
        })
      } catch (e) {
        // network/TLS hiccup — treat as transient
        lastErr = e instanceof Error ? e.message : 'network error'
        await sleep(800 * (attempt + 1))
        continue
      }
      if (res.ok) {
        const data = await res.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) return text.trim()
        lastErr = 'The AI returned an empty response.'
        continue
      }
      lastStatus = res.status
      lastErr = (await res.text()).slice(0, 200)
      // Transient: overloaded / rate-limited / server error → back off, retry, then next model.
      if ([429, 500, 503].includes(res.status)) { await sleep(800 * (attempt + 1)); continue }
      // Non-transient (bad key / bad request) — no point retrying.
      throw new Error(lastErr)
    }
  }
  if ([429, 503].includes(lastStatus)) throw new Error('The AI is busy right now (free-tier overload). Please try again in a few seconds.')
  throw new Error(lastErr || 'AI request failed.')
}
