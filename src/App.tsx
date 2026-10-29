import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { LandingPage } from './pages/LandingPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ToastProvider } from './components/Toaster'

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          {/* One route with optional segments, so /app → /app/:space → /app/:space/:note
              keeps the same Dashboard instance (no refetch, no flash). */}
          <Route
            path="/app/:spaceId?/:noteId?"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App