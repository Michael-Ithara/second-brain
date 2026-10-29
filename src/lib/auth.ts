import { AuthError } from '@supabase/supabase-js'

// Where to send someone after they sign in. Only same-site paths are allowed,
// so a crafted ?next= can't bounce people to another site.
export function safeNext(path: string | null | undefined): string {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return '/app'
  return path
}

// Supabase's messages are written for developers ("Invalid login credentials").
// Map the common ones to plain language; keep the original for anything else.
export function authErrorMessage(err: unknown): string {
  if (!(err instanceof AuthError)) return 'Something went wrong. Please try again.'
  switch (err.code) {
    case 'invalid_credentials':
      return 'That email and password don’t match. Check them, or reset your password.'
    case 'email_not_confirmed':
      return 'Confirm your email first — the link is in your inbox.'
    case 'user_already_exists':
    case 'email_exists':
      return 'There’s already an account with that email. Sign in instead.'
    case 'weak_password':
      return 'Choose a longer password — at least 8 characters.'
    case 'same_password':
      return 'That’s your current password. Choose a new one.'
    case 'email_address_invalid':
    case 'validation_failed':
      return 'Check the email address — it doesn’t look right.'
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Too many attempts. Wait a minute, then try again.'
    default:
      return err.message
  }
}

// Shared styles for the auth forms (kept out of AuthLayout so that file only exports components).
export const fieldClass =
  'w-full rounded-xl px-3.5 py-3 text-sm bg-surface border border-field text-ink placeholder:text-ink-3 transition-colors focus:border-ring focus-visible:outline-none aria-invalid:border-danger'

export const primaryButtonClass =
  'w-full font-display text-sm font-bold px-4 py-3 rounded-xl bg-accent text-on-accent shadow-edge transition-colors hover:bg-accent-hover disabled:opacity-60 disabled:cursor-not-allowed'
