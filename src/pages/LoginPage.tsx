import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const { session, loading } = useAuth()

  // Already logged in — send to app
  if (loading) return null
  if (session) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-white">Second Brain</h1>
          <p className="text-gray-500 text-sm mt-2">Your personal knowledge base</p>
        </div>

        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          theme="dark"
          providers={[]}
          redirectTo={window.location.origin}
        />
      </div>
    </div>
  )
}