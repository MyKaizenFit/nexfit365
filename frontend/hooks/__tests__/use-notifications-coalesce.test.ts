import { act, renderHook, waitFor } from '@testing-library/react'
import { useNotificationsEnhanced } from '../use-notifications-enhanced'
import { useAuth } from '@/contexts/auth-context'
import { getAuthService } from '@/lib/auth-service'
import { clearInFlightRequests } from '@/lib/request-coalescer'

jest.mock('@/contexts/auth-context', () => ({
  useAuth: jest.fn(),
}))

jest.mock('@/lib/auth-service', () => ({
  getAuthService: jest.fn(),
}))

jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}))

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockGetAuthService = getAuthService as jest.MockedFunction<typeof getAuthService>

function jwtFor(userId: number) {
  const b64url = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return `${b64url({ alg: 'none' })}.${b64url({ user_id: userId, exp: 9999999999 })}.x`
}

function jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => body,
    text: async () => JSON.stringify(body),
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function countGets(fragment: string) {
  return (global.fetch as jest.Mock).mock.calls.filter((call) => String(call[0]).includes(fragment)).length
}

describe('useNotificationsEnhanced concurrent chrome consumers', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    clearInFlightRequests()
    localStorage.clear()
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 1 },
      getAuthHeaders: jest.fn(async () => ({})),
    } as never)
    mockGetAuthService.mockReturnValue({
      isAuthenticated: () => true,
      getAccessToken: () => jwtFor(1),
    } as never)
  })

  afterEach(() => {
    global.fetch = originalFetch
    clearInFlightRequests()
  })

  it('desktop + mobile consumers share notification list and settings GETs', async () => {
    const pendingNotifications = deferred<ReturnType<typeof jsonResponse>>()
    const pendingSettings = deferred<ReturnType<typeof jsonResponse>>()
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('notifications/')) return pendingNotifications.promise
      return pendingSettings.promise
    }) as unknown as typeof fetch

    const desktop = renderHook(() => useNotificationsEnhanced())
    const mobile = renderHook(() => useNotificationsEnhanced())
    await waitFor(() => {
      expect(countGets('notifications/?ordering=-created_at')).toBe(1)
    })

    await act(async () => {
      pendingNotifications.resolve(jsonResponse([{
        id: 'n1',
        type: 'general',
        title: 'Hola',
        message: 'x',
        created_at: '2026-09-13T10:00:00Z',
      }]))
      pendingSettings.resolve(jsonResponse({ notification_preferences: { email: true } }))
    })
    await waitFor(() => {
      expect(desktop.result.current.notifications[0]?.id).toBe('n1')
      expect(mobile.result.current.notifications[0]?.id).toBe('n1')
    })
    expect(countGets('notifications/?ordering=-created_at')).toBe(1)
    const meCalls = (global.fetch as jest.Mock).mock.calls.filter((call) => String(call[0]).includes('me')).length
    expect(meCalls).toBe(1)
  })
})
