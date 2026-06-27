import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User } from '@diuqbank/shared/types'
import { api, setUnauthorizedHandler } from '../lib/api'
import { isTokenExpired } from '../lib/jwt'

type AuthState = {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  login: (token: string, user: User) => void
  logout: () => void
  updateUser: (user: User) => void
}

const STORAGE_KEY = 'diuqbank_auth'

const AuthContext = createContext<AuthState | null>(null)

function readToken(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const token = raw ? (JSON.parse(raw) as { token?: string }).token ?? null : null
    // Drop an obviously-expired token up front so we never start the app in a
    // doomed signed-in state (the API would 401 the first request anyway).
    if (token && isTokenExpired(token)) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return token
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
  return null
}

function persistToken(token: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token }))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readToken())
  const [user, setUser] = useState<User | null>(null)
  // True while we have a token but haven't resolved the user yet.
  const [loading, setLoading] = useState<boolean>(() => !!readToken())

  function login(t: string, u: User) {
    persistToken(t)
    setToken(t)
    setUser(u)
    setLoading(false)
  }

  function logout() {
    setToken(null)
    setUser(null)
    setLoading(false)
    localStorage.removeItem(STORAGE_KEY)
  }

  function updateUser(u: User) {
    setUser(u)
  }

  // Any authenticated request that comes back 401 means the token is expired or
  // revoked — clear the session so route guards bounce to /auth. Registered once;
  // it only calls stable state setters, so no dependency churn.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null)
      setUser(null)
      setLoading(false)
      localStorage.removeItem(STORAGE_KEY)
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  // Fetch the user from the API whenever we have a token but no user loaded.
  useEffect(() => {
    if (!token || user) return
    let cancelled = false
    setLoading(true)
    api.me(token)
      .then(({ user: u }) => {
        if (!cancelled) {
          setUser(u)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) logout()
      })
    return () => { cancelled = true }
  }, [token, user])

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated: !!token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
