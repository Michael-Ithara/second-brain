import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { BrandMark } from '../components/BrandMark'

// The Auth UI takes plain values, so point it at our tokens; they switch with
// the system appearance on their own.
const tokens = {
  colors: {
    brand: 'var(--accent)',
    brandAccent: 'var(--accent-hover)',
    brandButtonText: 'var(--on-accent)',
    inputBackground: 'var(--surface)',
    inputBorder: 'var(--field)',
    inputBorderFocus: 'var(--ring)',
    inputBorderHover: 'var(--ring)',
    inputText: 'var(--ink)',
    inputLabelText: 'var(--ink-2)',
    inputPlaceholder: 'var(--ink-3)',
    anchorTextColor: 'var(--ink-2)',
    anchorTextHoverColor: 'var(--accent-ink)',
    messageTextDanger: 'var(--danger)',
  },
  fonts: {
    bodyFontFamily: 'var(--font-sans)',
    buttonFontFamily: 'var(--font-display)',
    inputFontFamily: 'var(--font-sans)',
    labelFontFamily: 'var(--font-sans)',
  },
  radii: {
    buttonBorderRadius: '0.75rem',
    inputBorderRadius: '0.75rem',
  },
}

const authAppearance = {
  theme: ThemeSupa,
  // Same mapping for both: ThemeSupa's dark variant would otherwise override it.
  variables: { default: tokens, dark: tokens },
}

export function LoginPage() {
  const { session, loading } = useAuth()
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')

  // Already logged in — send to app
  if (loading) return null
  if (session) return <Navigate to="/app" replace />

  return (
    <div className="min-h-dvh bg-canvas flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark size="md" />
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink mt-4">Second Brain</h1>
          <p className="text-ink-2 text-sm mt-2">Your personal knowledge base</p>
        </div>

        <Auth
          supabaseClient={supabase}
          appearance={authAppearance}
          theme={prefersDark ? 'dark' : 'default'}
          providers={[]}
          redirectTo={window.location.origin}
        />
      </div>
    </div>
  )
}
