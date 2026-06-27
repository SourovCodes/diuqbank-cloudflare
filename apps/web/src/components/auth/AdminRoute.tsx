import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../ui/Spinner'

export function AdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  // The user (and therefore the role) loads asynchronously after a refresh;
  // wait for it before deciding, otherwise an admin would be wrongly bounced.
  if (loading || !user) {
    return <div className="flex justify-center py-24"><Spinner /></div>
  }

  if (user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
