import { isTransientAuthFailure } from '@/lib/auth-transient-errors'

describe('isTransientAuthFailure', () => {
  it('detects network and server-side transient failures', () => {
    expect(isTransientAuthFailure('Error de red. El token se refrescará automáticamente')).toBe(true)
    expect(isTransientAuthFailure('Failed to fetch')).toBe(true)
    expect(isTransientAuthFailure('Timeout del servidor')).toBe(true)
    expect(isTransientAuthFailure('Renovación en progreso')).toBe(true)
  })

  it('ignores permanent auth failures', () => {
    expect(isTransientAuthFailure('Sesión expirada. Por favor, inicia sesión nuevamente.')).toBe(false)
    expect(isTransientAuthFailure('Credenciales inválidas')).toBe(false)
    expect(isTransientAuthFailure(undefined)).toBe(false)
  })
})
