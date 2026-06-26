import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPortalPath } from '@/lib/auth-helpers'

/**
 * Handles the redirect from email-confirmation links and OAuth providers.
 * Exchanges the `code` for a session, then sends the user to their portal.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Password reset — send to the reset form (session is already in cookies)
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/reset-password`)
      }
      const path = await getPortalPath(supabase)
      return NextResponse.redirect(`${origin}${path}`)
    }
  }

  // Something went wrong — back to the auth page
  return NextResponse.redirect(`${origin}/auth`)
}
