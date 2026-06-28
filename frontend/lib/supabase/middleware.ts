import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './database.types'

const SESSION_MAX_AGE = 60 * 60 * 24 * 10 // 10 days — matches client.ts

/**
 * Refreshes the Supabase auth session on every request and keeps the
 * auth cookies in sync. Called from the root middleware.ts.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            // Always stamp maxAge so refreshed tokens stay persistent across restarts
            supabaseResponse.cookies.set(name, value, { ...options, maxAge: SESSION_MAX_AGE })
          )
        },
      },
    }
  )

  // IMPORTANT: do not run code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // ── Redirect already-logged-in users away from /auth ─────────────
  // Only the exact /auth page — not /auth/callback, /auth/reset-password, etc.
  if (user && path === '/auth') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, role_selected')
      .eq('id', user.id)
      .single()

    let dest = '/candidate'
    if (!profile || !profile.role_selected) dest = '/auth/select-role'
    else if (profile.role === 'recruiter') dest = '/recruiter'

    const url = request.nextUrl.clone()
    url.pathname = dest
    const redirectRes = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((c) =>
      redirectRes.cookies.set(c.name, c.value, { maxAge: SESSION_MAX_AGE })
    )
    return redirectRes
  }

  // ── Route protection ──────────────────────────────────────────────
  // Signed-out users cannot access the candidate or recruiter portals.
  const isProtected = path.startsWith('/candidate') || path.startsWith('/recruiter') || path.startsWith('/interview') || path.startsWith('/u/') || path.startsWith('/post/')
  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    return NextResponse.redirect(url)
  }
  // ──────────────────────────────────────────────────────────────────

  return supabaseResponse
}
