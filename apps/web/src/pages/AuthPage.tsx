import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

export function AuthPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true })
  }, [isAuthenticated, navigate, from])

  async function handleSuccess(credentialResponse: { credential?: string }) {
    if (!credentialResponse.credential) return
    setLoading(true)
    setError(null)
    try {
      const { token, user } = await api.authGoogle(credentialResponse.credential)
      login(token, user)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mb-3 text-4xl">📚</div>
          <h1 className="text-xl font-bold text-gray-900">Sign in to DIU Question Bank</h1>
          <p className="mt-1 text-sm text-gray-500">
            Use your <span className="font-medium text-blue-700">@diu.edu.bd</span> Google account
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg className="h-4 w-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Signing in…
            </div>
          ) : (
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => setError('Google sign-in failed. Please try again.')}
              useOneTap={false}
              theme="outline"
              size="large"
              text="signin_with"
              shape="rectangular"
            />
          )}

          {error && (
            <div className="w-full rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Only Daffodil International University email accounts are accepted.
        </p>
      </div>
    </div>
  )
}
