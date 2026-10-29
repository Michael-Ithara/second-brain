import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { AuthLayout } from '../components/AuthLayout'
import { PasswordField } from '../components/PasswordField'
import { authErrorMessage, primaryButtonClass } from '../lib/auth'

// Where the "reset your password" email lands. supabase-js reads the token
// from the URL and signs the user in for this one purpose; we then let them
// set a new password with updateUser().
export function ResetPasswordPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) return null

  if (!session) {
    return (
      <AuthLayout>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">This link has expired</h1>
        <p className="text-sm text-ink-2 mt-3 leading-relaxed">
          Reset links work once and only for a short time. Ask for a new one and use it straight away.
        </p>
        <Link to="/login?mode=forgot" className={`${primaryButtonClass} mt-8 inline-block text-center`}>
          Send a new link
        </Link>
      </AuthLayout>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('The two passwords don’t match.')
      return
    }
    setSaving(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) {
      setError(authErrorMessage(error))
      return
    }
    navigate('/app', { replace: true })
  }

  return (
    <AuthLayout>
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">Choose a new password</h1>
      <p className="text-sm text-ink-2 mt-2">
        For <strong className="text-ink">{session.user.email}</strong>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 mt-8">
        <PasswordField
          id="new-password"
          label="New password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={8}
          hint="At least 8 characters."
          invalid={!!error}
          describedBy={error ? 'reset-error' : undefined}
        />
        <PasswordField
          id="confirm-password"
          label="Confirm new password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          minLength={8}
          invalid={!!error}
          describedBy={error ? 'reset-error' : undefined}
        />
        {error && <p id="reset-error" role="alert" className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={saving} className={primaryButtonClass}>
          {saving ? 'Saving…' : 'Save and continue'}
        </button>
      </form>
    </AuthLayout>
  )
}
