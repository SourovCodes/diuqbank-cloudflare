import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../ui/Spinner'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  if (loading) {
    return <div className="flex justify-center py-24"><Spinner /></div>
  }

  return <>{children}</>
}
