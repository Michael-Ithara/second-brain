import { useState } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { AuthLayout } from '../components/AuthLayout'
import { PasswordField } from '../components/PasswordField'
import { authErrorMessage, fieldClass, primaryButtonClass, safeNext } from '../lib/auth'

type Mode = 'signin' | 'signup' | 'forgot'
type Sent = { kind: 'confirm' | 'reset'; email: string } | null

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

export function LoginPage() {
  const { session, loading } = useAuth()
  const location = useLocation()
  const [params] = useSearchParams()

  // Where to go after signing in: the page ProtectedRoute bounced us from,
  // or ?next= (which survives the round trip through Google).
  const next = safeNext((location.state as { from?: string } | null)?.from ?? params.get('next'))

  const [mode, setMode] = useState<Mode>(params.get('mode') === 'forgot' ? 'forgot' : 'signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState<'google' | 'email' | null>(null)
  const [sent, setSent] = useState<Sent>(null)
  // An OAuth failure comes back as ?error_description=… on this page.
  const oauthError = params.get('error_description')
  const [error, setError] = useState<{ message: string; fromForm: boolean } | null>(
    oauthError ? { message: `Google sign-in didn’t finish (${oauthError}). Try again, or use your email.`, fromForm: false } : null
  )
  // Only email/password problems should mark those fields invalid.
  const formError = error?.fromForm ? error.message : null

  if (loading) return null
  if (session) return <Navigate to={next} replace />

  const switchMode = (m: Mode) => {
    setMode(m)
    setError(null)
  }

  const signInWithGoogle = async () => {
    setBusy('google')
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      // Back to this page, not straight to /app: if Google or Supabase reports
      // an error it lands here where we can show it, and on success the
      // session check above forwards to `next`.
      options: { redirectTo: `${window.location.origin}/login?next=${encodeURIComponent(next)}` },
    })
    // On success the browser is already navigating to Google.
    if (error) {
      setError({ message: authErrorMessage(error), fromForm: false })
      setBusy(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy('email')
    setError(null)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // useAuth picks up the new session and the redirect above runs.
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/login?next=${encodeURIComponent(next)}` },
        })
        if (error) throw error
        // With email confirmation on, there's no session until they click the link.
        if (!data.session) setSent({ kind: 'confirm', email })
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (error) throw error
        setSent({ kind: 'reset', email })
      }
    } catch (err) {
      setError({ message: authErrorMessage(err), fromForm: true })
    } finally {
      setBusy(null)
    }
  }

  if (sent) {
    return (
      <AuthLayout>
        <div role="status" className="text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center bg-tint-2 text-accent-ink mb-5" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" />
            </svg>
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">Check your inbox</h1>
          <p className="text-sm text-ink-2 mt-3 leading-relaxed">
            {sent.kind === 'confirm'
              ? <>We sent a link to <strong className="text-ink">{sent.email}</strong>. Open it to confirm your account and sign in.</>
              : <>If there’s an account for <strong className="text-ink">{sent.email}</strong>, a link to reset the password is on its way.</>}
          </p>
          <button
            onClick={() => { setSent(null); switchMode('signin') }}
            className="mt-8 text-sm font-medium rounded text-accent-ink hover:text-accent-ink-hover hover:underline"
          >
            Back to sign in
          </button>
        </div>
      </AuthLayout>
    )
  }

  const heading = { signin: 'Welcome back', signup: 'Create your account', forgot: 'Reset your password' }[mode]
  const submitLabel = { signin: 'Sign in', signup: 'Create account', forgot: 'Send reset link' }[mode]

  return (
    <AuthLayout>
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">{heading}</h1>
      <p className="text-sm text-ink-2 mt-2">
        {mode === 'forgot'
          ? 'Enter your email and we’ll send you a link to choose a new password.'
          : 'Your notes, ready to answer questions.'}
      </p>

      {mode !== 'forgot' && (
        <>
          {/* Google's own button styling (neutral surface, full-colour mark), per their brand rules */}
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={busy !== null}
            className="mt-8 w-full flex items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-medium border transition-colors bg-white text-[#1f1f1f] border-[#747775] hover:bg-[#f2f2f2] dark:bg-[#131314] dark:text-[#e3e3e3] dark:border-[#8e918f] dark:hover:bg-[#1c1c1e] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <GoogleLogo />
            {busy === 'google' ? 'Opening Google…' : 'Continue with Google'}
          </button>

          <div className="flex items-center gap-3 my-6" aria-hidden="true">
            <span className="flex-1 h-px bg-line" />
            <span className="text-xs text-ink-3">or with email</span>
            <span className="flex-1 h-px bg-line" />
          </div>

          <div role="group" aria-label="Email sign-in mode" className="grid grid-cols-2 p-0.5 mb-5 rounded-xl bg-tint border border-line">
            {(['signin', 'signup'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                aria-pressed={mode === m}
                className={`py-2 rounded-[0.6rem] text-sm font-medium transition-colors ${
                  mode === m ? 'bg-raised text-ink shadow-sm' : 'text-ink-2 hover:text-ink'
                }`}
              >
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className={`space-y-4 ${mode === 'forgot' ? 'mt-8' : ''}`}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ink-2 mb-1.5">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
            placeholder="you@example.com"
            aria-invalid={formError ? true : undefined}
            aria-describedby={formError ? 'auth-error' : undefined}
            className={fieldClass}
          />
        </div>

        {mode !== 'forgot' && (
          <PasswordField
            id="password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            minLength={mode === 'signup' ? 8 : undefined}
            hint={mode === 'signup' ? 'At least 8 characters.' : undefined}
            invalid={!!formError}
            describedBy={formError ? 'auth-error' : undefined}
          />
        )}

        {error && (
          <p id="auth-error" role="alert" className="text-sm text-danger leading-relaxed">{error.message}</p>
        )}

        <button type="submit" disabled={busy !== null} className={primaryButtonClass}>
          {busy === 'email' ? 'One moment…' : submitLabel}
        </button>
      </form>

      <div className="mt-6 text-sm text-center">
        {mode === 'signin' && (
          <button onClick={() => switchMode('forgot')} className="rounded text-ink-2 hover:text-ink hover:underline">
            Forgot your password?
          </button>
        )}
        {mode === 'forgot' && (
          <button onClick={() => switchMode('signin')} className="rounded text-ink-2 hover:text-ink hover:underline">
            Back to sign in
          </button>
        )}
      </div>
    </AuthLayout>
  )
}
