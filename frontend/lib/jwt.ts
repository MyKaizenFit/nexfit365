export interface JwtPayload {
  exp?: number
  user_id?: string | number
  id?: string | number
  role?: string
  is_staff?: boolean
  is_superuser?: boolean
  [key: string]: unknown
}

const decodeBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)

  if (typeof atob === 'function') {
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(padded, 'base64').toString('utf-8')
  }

  throw new Error('No base64 decoder available')
}

export const isJwtExpired = (payload: JwtPayload | null, skewSeconds = 30): boolean => {
  if (!payload?.exp) {
    return true
  }

  return payload.exp <= Math.floor(Date.now() / 1000) + skewSeconds
}

export const parseJwtPayload = (token?: string | null): JwtPayload | null => {
  if (!token || token.startsWith('offline_token_')) {
    return null
  }

  const parts = token.split('.')
  if (parts.length < 2 || !parts[1]) {
    return null
  }

  try {
    const decoded = decodeBase64Url(parts[1])
    return JSON.parse(decoded) as JwtPayload
  } catch {
    return null
  }
}

export const isAdminJwtPayload = (payload: JwtPayload | null): boolean => {
  if (!payload) {
    return false
  }

  const userRole = String(payload.role || '').toLowerCase()
  return Boolean(payload.is_superuser || payload.is_staff || userRole === 'admin' || userRole === 'trainer')
}
