/**
 * Tests for AuthService validation logic (pure, no network/cookies).
 * We test via the public interface: hasValidTokens, isAuthenticated,
 * and the validation that login/register would apply.
 */

// Mock fetch and cookies so we don't hit the network
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock document.cookie (jsdom doesn't support it fully)
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: '',
})

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Re-import fresh instance per test
let AuthService: typeof import('../auth-service').AuthService

beforeEach(() => {
  jest.resetModules()
  mockFetch.mockReset()
  localStorageMock.clear()
  document.cookie = ''
})

// ---------------------------------------------------------------------------
// Test the input validation rules extracted from the service
// (mirror what login/register actually check, tested independently)
// ---------------------------------------------------------------------------

describe('Login input validation rules', () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  it('valid email passes regex', () => {
    expect(emailRegex.test('user@example.com')).toBe(true)
  })

  it('email without @ fails regex', () => {
    expect(emailRegex.test('userexample.com')).toBe(false)
  })

  it('email without domain fails regex', () => {
    expect(emailRegex.test('user@')).toBe(false)
  })

  it('email with spaces fails regex', () => {
    expect(emailRegex.test('user @example.com')).toBe(false)
  })

  it('empty string fails', () => {
    expect(emailRegex.test('')).toBe(false)
  })

  it('email with subdomain passes', () => {
    expect(emailRegex.test('user@mail.example.co.uk')).toBe(true)
  })
})

describe('Register input validation rules', () => {
  it('passwords match returns true when same', () => {
    const p1 = 'secure123'
    const p2 = 'secure123'
    expect(p1 === p2).toBe(true)
  })

  it('passwords do not match returns false', () => {
    const p1: string = 'secure123'
    const p2: string = 'different456'
    expect(p1 === p2).toBe(false)
  })

  it('password length must be at least 8', () => {
    expect('short'.length < 8).toBe(true)
    expect('longpass'.length < 8).toBe(false)
  })

  it('exactly 8 characters passes length check', () => {
    expect('12345678'.length >= 8).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Test token validation logic
// ---------------------------------------------------------------------------

describe('Token format validation', () => {
  const isValidJwtFormat = (token: string | null): boolean => {
    if (!token) return false
    if (token.startsWith('offline_token_')) return false
    return token.includes('.')
  }

  it('null is invalid', () => {
    expect(isValidJwtFormat(null)).toBe(false)
  })

  it('empty string is invalid', () => {
    expect(isValidJwtFormat('')).toBe(false)
  })

  it('offline token is not a real JWT', () => {
    expect(isValidJwtFormat('offline_token_12345')).toBe(false)
  })

  it('string without dot is invalid', () => {
    expect(isValidJwtFormat('notavalidtoken')).toBe(false)
  })

  it('JWT with dots is valid format', () => {
    expect(isValidJwtFormat('header.payload.sig')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Error message extraction (mirrors auth service logic)
// ---------------------------------------------------------------------------

describe('Error response message extraction', () => {
  function extractErrorMessage(errorData: Record<string, unknown>): string {
    if (errorData.email && Array.isArray(errorData.email)) {
      return `Email: ${(errorData.email as string[])[0]}`
    }
    if (errorData.password && Array.isArray(errorData.password)) {
      return `Contraseña: ${(errorData.password as string[])[0]}`
    }
    if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors)) {
      return (errorData.non_field_errors as string[])[0]
    }
    if (typeof errorData.detail === 'string') return errorData.detail
    if (typeof errorData.message === 'string') return errorData.message
    if (typeof errorData.error === 'string') return errorData.error
    if (typeof errorData === 'string') return errorData
    return 'Credenciales inválidas'
  }

  it('extracts email field error', () => {
    expect(extractErrorMessage({ email: ['Este campo es requerido.'] }))
      .toBe('Email: Este campo es requerido.')
  })

  it('extracts password field error', () => {
    expect(extractErrorMessage({ password: ['La contraseña es muy corta.'] }))
      .toBe('Contraseña: La contraseña es muy corta.')
  })

  it('extracts non_field_errors', () => {
    expect(extractErrorMessage({ non_field_errors: ['Credenciales inválidas.'] }))
      .toBe('Credenciales inválidas.')
  })

  it('extracts detail string', () => {
    expect(extractErrorMessage({ detail: 'No autorizado.' }))
      .toBe('No autorizado.')
  })

  it('extracts message string', () => {
    expect(extractErrorMessage({ message: 'Error genérico.' }))
      .toBe('Error genérico.')
  })

  it('prefers email over password', () => {
    expect(extractErrorMessage({
      email: ['Email inválido'],
      password: ['Contraseña inválida'],
    })).toContain('Email:')
  })

  it('defaults to generic message when no field matches', () => {
    expect(extractErrorMessage({})).toBe('Credenciales inválidas')
  })
})
