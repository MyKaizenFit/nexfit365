import { shouldUseOfflineAuthFallback } from '@/lib/auth-offline'

describe('shouldUseOfflineAuthFallback', () => {
  it('allows offline only when both flags are true', () => {
    expect(shouldUseOfflineAuthFallback(true, true)).toBe(true)
  })

  it('blocks offline when production disallows it even if flagged offline', () => {
    expect(shouldUseOfflineAuthFallback(false, true)).toBe(false)
  })

  it('blocks offline when not in offline mode', () => {
    expect(shouldUseOfflineAuthFallback(true, false)).toBe(false)
    expect(shouldUseOfflineAuthFallback(false, false)).toBe(false)
  })
})
