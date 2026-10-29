import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface Props {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: Props) {
  const { session, loading } = useAuth()

  // Don't redirect while we're still checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <p role="status" className="text-ink-2 text-sm">Loading...</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}