import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface Props {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: Props) {
  const { session, loading } = useAuth()
  const location = useLocation()

  // Don't redirect while we're still checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <p role="status" className="text-ink-2 text-sm">Loading...</p>
      </div>
    )
  }

  if (!session) {
    // Remember where they were headed so login can send them back there.
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return <>{children}</>
}