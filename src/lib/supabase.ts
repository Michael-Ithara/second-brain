import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
})

export async function invokeFunction<T>(
  name: string,
  body: Record<string, unknown>
): Promise<T> {
  // Get the current session token
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError || !session) {
    throw new Error('No active session')
  }

  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (error) throw error
  return data as T
}
// For edge functions that stream (chat): returns the raw Response so the
// caller can read its body as it arrives. functions.invoke() waits for the
// whole body, which defeats streaming.
export async function streamFunction(
  name: string,
  body: Record<string, unknown>,
  signal?: AbortSignal
): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No active session')

  const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok || !res.body) {
    const detail = await res.json().catch(() => null) as { error?: string } | null
    throw new Error(detail?.error ?? `Request failed (${res.status})`)
  }
  return res
}
