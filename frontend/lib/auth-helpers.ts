import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './supabase/database.types'

/**
 * Where to send a signed-in user next:
 *  - not signed in            -> /auth
 *  - role not chosen yet       -> /auth/select-role  (e.g. fresh Google sign-up)
 *  - recruiter                 -> /recruiter
 *  - candidate (default)       -> /candidate
 */
export async function getPortalPath(
  supabase: SupabaseClient<Database>
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return '/auth'

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, role_selected')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.role_selected) return '/auth/select-role'
  return profile.role === 'recruiter' ? '/recruiter' : '/candidate'
}
