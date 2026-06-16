import { parseJwtPayload, isJwtExpired, isAdminJwtPayload, JwtPayload } from '../jwt'

// Ensure TextDecoder / TextEncoder are available in the jsdom test environment.
// jest-environment-jsdom does not always inject Node.js utility globals.
import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from 'util'
if (typeof globalThis.TextDecoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).TextDecoder = NodeTextDecoder
}
if (typeof globalThis.TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).TextEncoder = NodeTextEncoder
}

// Helper: build a minimal valid JWT with a given payload.
// Uses btoa (available in jsdom) to produce standard base64, then converts to url-safe.
function b64url(obj: object): string {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function makeJwt(payload: object): string {
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.fakesig`
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

// ---------------------------------------------------------------------------
// parseJwtPayload
// ---------------------------------------------------------------------------

describe('parseJwtPayload', () => {
  it('returns null for null input', () => {
    expect(parseJwtPayload(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(parseJwtPayload(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseJwtPayload('')).toBeNull()
  })

  it('returns null for offline token', () => {
    expect(parseJwtPayload('offline_token_12345')).toBeNull()
  })

  it('returns null for token without dots', () => {
    expect(parseJwtPayload('notavalidtoken')).toBeNull()
  })

  it('returns null for token with only one dot', () => {
    expect(parseJwtPayload('header.body')).toBeNull()
  })

  it('parses a valid JWT and returns payload', () => {
    const payload = { user_id: 42, exp: nowSeconds() + 3600 }
    const token = makeJwt(payload)
    const result = parseJwtPayload(token)
    expect(result).not.toBeNull()
    expect(result?.user_id).toBe(42)
  })

  it('parses exp field correctly', () => {
    const exp = nowSeconds() + 900
    const token = makeJwt({ exp })
    const result = parseJwtPayload(token)
    expect(result?.exp).toBe(exp)
  })

  it('parses role field', () => {
    const token = makeJwt({ role: 'admin', is_staff: true })
    const result = parseJwtPayload(token)
    expect(result?.role).toBe('admin')
    expect(result?.is_staff).toBe(true)
  })

  it('returns null for token with invalid base64 in payload', () => {
    const result = parseJwtPayload('header.!!!invalid_base64!!!.sig')
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// isJwtExpired
// ---------------------------------------------------------------------------

describe('isJwtExpired', () => {
  it('returns true for null payload', () => {
    expect(isJwtExpired(null)).toBe(true)
  })

  it('returns true when payload has no exp', () => {
    expect(isJwtExpired({ user_id: 1 })).toBe(true)
  })

  it('returns false when token is valid (exp far future)', () => {
    const payload: JwtPayload = { exp: nowSeconds() + 3600 }
    expect(isJwtExpired(payload)).toBe(false)
  })

  it('returns true when token is expired (exp in past)', () => {
    const payload: JwtPayload = { exp: nowSeconds() - 100 }
    expect(isJwtExpired(payload)).toBe(true)
  })

  it('respects skewSeconds — token expiring within skew is treated as expired', () => {
    // exp is 10 seconds in future but default skew is 30s → treated as expired
    const payload: JwtPayload = { exp: nowSeconds() + 10 }
    expect(isJwtExpired(payload, 30)).toBe(true)
  })

  it('with skew=0, token expiring in 1 second is still valid', () => {
    const payload: JwtPayload = { exp: nowSeconds() + 1 }
    expect(isJwtExpired(payload, 0)).toBe(false)
  })

  it('returns true when exp is exactly now (already expired)', () => {
    const payload: JwtPayload = { exp: nowSeconds() - 1 }
    expect(isJwtExpired(payload, 0)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// isAdminJwtPayload
// ---------------------------------------------------------------------------

describe('isAdminJwtPayload', () => {
  it('returns false for null payload', () => {
    expect(isAdminJwtPayload(null)).toBe(false)
  })

  it('returns true when is_superuser is true', () => {
    expect(isAdminJwtPayload({ is_superuser: true })).toBe(true)
  })

  it('returns true when is_staff is true', () => {
    expect(isAdminJwtPayload({ is_staff: true })).toBe(true)
  })

  it('returns true when role is "admin"', () => {
    expect(isAdminJwtPayload({ role: 'admin' })).toBe(true)
  })

  it('returns true when role is "trainer"', () => {
    expect(isAdminJwtPayload({ role: 'trainer' })).toBe(true)
  })

  it('is case-insensitive for role', () => {
    expect(isAdminJwtPayload({ role: 'ADMIN' })).toBe(true)
    expect(isAdminJwtPayload({ role: 'Trainer' })).toBe(true)
  })

  it('returns false for regular user', () => {
    expect(isAdminJwtPayload({ role: 'basic', is_staff: false, is_superuser: false })).toBe(false)
  })

  it('returns false for empty payload', () => {
    expect(isAdminJwtPayload({})).toBe(false)
  })
})
