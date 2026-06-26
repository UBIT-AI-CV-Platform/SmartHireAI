import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

/**
 * Supabase client for use in Client Components (browser).
 * Usage:  const supabase = createClient()
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        // Persist session across browser restarts; expires after 10 days of inactivity
        maxAge: 60 * 60 * 24 * 10,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    }
  )
}
