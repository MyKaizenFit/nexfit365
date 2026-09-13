import { notificationService } from '../notification-service'
import { getAuthService } from '../auth-service'
import { clearInFlightRequests } from '../request-coalescer'

jest.mock('../auth-service', () => ({
  getAuthService: jest.fn(),
}))

const mockGetAuthService = getAuthService as jest.MockedFunction<typeof getAuthService>

function jwtFor(userId: number) {
  const b64url = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return `${b64url({ alg: 'none' })}.${b64url({ user_id: userId, exp: 9999999999 })}.x`
}

function mockAuth(userId: number) {
  mockGetAuthService.mockReturnValue({
    isAuthenticated: jest.fn(() => true),
    getAccessToken: jest.fn(() => jwtFor(userId)),
  } as never)
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => body,
    text: async () => JSON.stringify(body),
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function countGets(fragment: string) {
  return (global.fetch as jest.Mock).mock.calls.filter((call) => {
    const url = String(call[0])
    const method = String(call[1]?.method || 'GET').toUpperCase()
    return url.includes(fragment) && method === 'GET'
  }).length
}

describe('notificationService GET coalescing', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    clearInFlightRequests()
    mockAuth(1)
    localStorage.clear()
  })

  afterEach(() => {
    global.fetch = originalFetch
    clearInFlightRequests()
  })

  it('NOTIFICATION_DEDUP: concurrent list loads share one GET', async () => {
    const pending = deferred<ReturnType<typeof jsonResponse>>()
    global.fetch = jest.fn(() => pending.promise) as unknown as typeof fetch
    const first = notificationService.getNotifications()
    const second = notificationService.getNotifications()
    expect(countGets('notifications/?ordering=-created_at')).toBe(1)
    pending.resolve(jsonResponse([{
      id: 'n1',
      type: 'general',
      title: 'Hola',
      message: 'x',
      created_at: '2026-09-13T10:00:00Z',
    }]))
    const [a, b] = await Promise.all([first, second])
    expect(a).toEqual(b)
    expect(a[0].id).toBe('n1')
    expect(countGets('notifications/?ordering=-created_at')).toBe(1)
  })

  it('settings GETs share one me/ request', async () => {
    const pending = deferred<ReturnType<typeof jsonResponse>>()
    global.fetch = jest.fn(() => pending.promise) as unknown as typeof fetch
    const first = notificationService.getSettings()
    const second = notificationService.getSettings()
    expect(countGets('me/')).toBe(1)
    pending.resolve(jsonResponse({ notification_preferences: { email: false } }))
    const [a, b] = await Promise.all([first, second])
    expect(a.email).toBe(false)
    expect(b.email).toBe(false)
    expect(countGets('me/')).toBe(1)
  })

  it('a later notifications GET after success is a new request', async () => {
    global.fetch = jest.fn(async () => jsonResponse([])) as unknown as typeof fetch
    await notificationService.getNotifications()
    await notificationService.getNotifications()
    expect(countGets('notifications/?ordering=-created_at')).toBe(2)
  })
})
