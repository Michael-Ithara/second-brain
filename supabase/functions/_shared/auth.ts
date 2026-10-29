import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

// Service-role client: bypasses RLS, so every query made with it must be
// scoped to the caller's user id (see requireUser).
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
}

// Resolves the caller from their JWT. verify_jwt only proves the token is valid;
// this gives us *which* user, so we can check they own what they ask for.
export async function requireUser(req: Request, admin: SupabaseClient): Promise<string | null> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null

  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return null
  return data.user.id
}
