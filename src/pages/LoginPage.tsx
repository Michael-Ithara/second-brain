import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const { session } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (session) navigate('/app', { replace: true })
  }, [session, navigate])

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: '#080c14',
        backgroundImage: [
          'linear-gradient(rgba(91,156,246,0.025) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(91,156,246,0.025) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: '40px 40px',
      }}
    >
      {/* Radial glow behind card */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(91,156,246,0.07) 0%, transparent 65%)',
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo + heading */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: 'rgba(91,156,246,0.15)',
                border: '1px solid rgba(91,156,246,0.3)',
                boxShadow: '0 0 20px rgba(91,156,246,0.2)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5b9cf6" strokeWidth="2">
                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44l-3.5-13A2.5 2.5 0 0 1 5.97 2H9.5z"/>
                <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44l3.5-13A2.5 2.5 0 0 0 18.03 2H14.5z"/>
              </svg>
            </div>
            <span
              style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '-0.02em',
                fontFamily: 'inherit',
              }}
            >
              Second Brain
            </span>
          </div>

          <h1
            style={{
              fontSize: '1.6rem',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              marginBottom: '0.5rem',
              fontFamily: 'inherit',
            }}
          >
            Welcome back
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#475569', fontFamily: 'inherit' }}>
            Sign in to access your knowledge base
          </p>
        </div>

        {/* Auth card */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'linear-gradient(160deg, #0d1a2e 0%, #080c14 100%)',
            border: '1px solid rgba(91,156,246,0.15)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(91,156,246,0.05)',
          }}
        >
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#5b9cf6',
                    brandAccent: '#7ab3f8',
                    brandButtonText: '#080c14',
                    defaultButtonBackground: 'rgba(91,156,246,0.06)',
                    defaultButtonBackgroundHover: 'rgba(91,156,246,0.12)',
                    defaultButtonBorder: 'rgba(91,156,246,0.15)',
                    defaultButtonText: '#94a3b8',
                    dividerBackground: 'rgba(91,156,246,0.08)',
                    inputBackground: 'rgba(91,156,246,0.04)',
                    inputBorder: 'rgba(91,156,246,0.15)',
                    inputBorderHover: 'rgba(91,156,246,0.35)',
                    inputBorderFocus: 'rgba(91,156,246,0.5)',
                    inputText: '#ffffff',
                    inputLabelText: '#64748b',
                    inputPlaceholder: '#334155',
                    messageText: '#94a3b8',
                    messageTextDanger: '#f87171',
                    anchorTextColor: '#5b9cf6',
                    anchorTextHoverColor: '#7ab3f8',
                  },
                  space: {
                    spaceSmall: '4px',
                    spaceMedium: '8px',
                    spaceLarge: '16px',
                    labelBottomMargin: '6px',
                    anchorBottomMargin: '4px',
                    emailInputSpacing: '4px',
                    socialAuthSpacing: '4px',
                    buttonPadding: '10px 16px',
                    inputPadding: '10px 14px',
                  },
                  fontSizes: {
                    baseBodySize: '14px',
                    baseInputSize: '14px',
                    baseLabelSize: '12px',
                    baseButtonSize: '14px',
                  },
                  borderWidths: {
                    buttonBorderWidth: '1px',
                    inputBorderWidth: '1px',
                  },
                  radii: {
                    borderRadiusButton: '10px',
                    buttonBorderRadius: '10px',
                    inputBorderRadius: '10px',
                  },
                },
              },
              style: {
                button: {
                  fontFamily: 'Outfit, system-ui, sans-serif',
                  fontWeight: '600',
                  letterSpacing: '-0.01em',
                },
                input: {
                  fontFamily: 'Outfit, system-ui, sans-serif',
                },
                label: {
                  fontFamily: 'Outfit, system-ui, sans-serif',
                  color: '#64748b',
                },
                anchor: {
                  fontFamily: 'Outfit, system-ui, sans-serif',
                },
                message: {
                  fontFamily: 'Outfit, system-ui, sans-serif',
                },
              },
            }}
            providers={[]}
          />
        </div>

        {/* Footer */}
        <p
          className="text-center text-xs mt-6"
          style={{ color: '#1e3a5f', fontFamily: 'inherit' }}
        >
          Your knowledge base is private and secure.
        </p>
      </div>
    </div>
  )
}