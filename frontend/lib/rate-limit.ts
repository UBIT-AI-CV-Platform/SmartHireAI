import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Per-user rate limiting, backed by the `check_rate_limit` Postgres function
 * (see backend/performance.sql).
 *
 * Why the database and not an in-memory counter: on Vercel every request can hit
 * a different serverless instance, and instances are recycled constantly. An
 * in-process Map would reset on cold start and would not be shared, so a caller
 * could sail past any limit. Postgres is the one thing all instances agree on,
 * and the check is a single atomic upsert.
 *
 * The bucket key is derived from auth.uid() inside the SQL function, so a caller
 * cannot spoof another user's bucket or reset their own.
 */

/** Limits are tuned per route: AI calls are metered, cheap reads are generous. */
export const LIMITS = {
  // Gemini-backed routes - these cost money and take seconds, so keep them tight.
  'generate-cv': { limit: 10, windowSeconds: 60 * 10 },
  'upload-cv': { limit: 10, windowSeconds: 60 * 10 },
  'generate-cover-letter': { limit: 10, windowSeconds: 60 * 10 },
  'screen-applicants': { limit: 10, windowSeconds: 60 * 10 },
  'interview-kit': { limit: 15, windowSeconds: 60 * 10 },
  'job-description': { limit: 20, windowSeconds: 60 * 10 },
  'outreach': { limit: 20, windowSeconds: 60 * 10 },
  'interview-coach': { limit: 40, windowSeconds: 60 * 5 },
  'copilot': { limit: 40, windowSeconds: 60 * 5 },
  'transcribe': { limit: 60, windowSeconds: 60 * 5 },

  // Non-AI routes - protect against spam/abuse rather than cost.
  'apply': { limit: 30, windowSeconds: 60 * 10 },
  'inbox': { limit: 120, windowSeconds: 60 },
  'external-jobs': { limit: 90, windowSeconds: 60 },
} as const

export type Bucket = keyof typeof LIMITS

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; response: NextResponse }

/**
 * Consume one unit from `bucket` for the signed-in caller.
 *
 * On success returns { ok: true }. On refusal returns { ok: false, response },
 * where `response` is a ready-to-return 429 carrying standard rate-limit headers.
 * Call this *before* doing any expensive work.
 *
 * If the check itself errors (e.g. the migration has not been run yet) we fail
 * open and allow the request - a broken limiter must not take the product down.
 */
export async function rateLimit(
  supabase: SupabaseClient<Database>,
  bucket: Bucket
): Promise<RateLimitResult> {
  const { limit, windowSeconds } = LIMITS[bucket]

  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })

  if (error) {
    console.error(`[rate-limit] "${bucket}" check failed, allowing request:`, error.message)
    return { ok: true, remaining: limit }
  }

  const row = Array.isArray(data) ? data[0] : data

  if (!row || row.allowed) {
    return { ok: true, remaining: row?.remaining ?? limit }
  }

  const resetAt = new Date(row.reset_at)
  const retryAfter = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000))
  const minutes = Math.ceil(retryAfter / 60)

  return {
    ok: false,
    response: NextResponse.json(
      {
        error: `You've hit the limit for this action. Please try again in ${
          minutes <= 1 ? 'a minute' : `${minutes} minutes`
        }.`,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'RateLimit-Limit': String(limit),
          'RateLimit-Remaining': '0',
          'RateLimit-Reset': String(retryAfter),
        },
      }
    ),
  }
}
