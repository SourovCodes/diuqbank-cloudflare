// Lightweight, *unverified* JWT payload decoding. The signature is verified by
// the API on every request — the client only peeks at `exp` so it can drop a
// token that has obviously expired instead of making a doomed round-trip.

type JwtPayload = {
  sub: number
  username: string
  role: 'admin' | 'user'
  iat: number
  exp: number
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json) as JwtPayload
  } catch {
    return null
  }
}

/** True when the token is missing, malformed, or past its `exp` (epoch seconds). */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwt(token)
  if (!payload || typeof payload.exp !== 'number') return true
  return payload.exp * 1000 <= Date.now()
}
