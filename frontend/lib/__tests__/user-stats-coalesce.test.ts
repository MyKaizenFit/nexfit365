import { userService } from '../user-service'
import { getAuthService } from '../auth-service'
import { apiCache } from '../api-cache'
import { clearInFlightRequests, coalesceUserScope } from '../request-coalescer'
import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from 'util'

if (typeof globalThis.TextDecoder === 'undefined') {
  ;(globalThis as unknown as { TextDecoder: typeof NodeTextDecoder }).TextDecoder = NodeTextDecoder
}
if (typeof globalThis.TextEncoder === 'undefined') {
  ;(globalThis as unknown as { TextEncoder: typeof NodeTextEncoder }).TextEncoder = NodeTextEncoder
}

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

function statsResponse(label: string) {
  const body = { caloriesToday: 1, caloriesGoal: 2000, label }
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: { get: () => null },
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

describe('userService.getUserStats coalescing', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    apiCache.clear()
    clearInFlightRequests()
    mockAuth(1)
  })

  afterEach(() => {
    global.fetch = originalFetch
    apiCache.clear()
    clearInFlightRequests()
  })

  it('USER_DATA_DEDUP: concurrent consumers share one network GET', async () => {
    const pending = deferred<ReturnType<typeof statsResponse>>()
    global.fetch = jest.fn(() => pending.promise) as unknown as typeof fetch

    const first = userService.getUserStats()
    const second = userService.getUserStats()
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(1)

    pending.resolve(statsResponse('shared'))
    const [a, b] = await Promise.all([first, second])
    expect(a).toEqual(b)
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(1)
    expect(String((global.fetch as jest.Mock).mock.calls[0][0])).toContain('user-stats')
  })

  it('does not share in-flight stats across users', async () => {
    const pendingA = deferred<ReturnType<typeof statsResponse>>()
    const pendingB = deferred<ReturnType<typeof statsResponse>>()
    let calls = 0
    global.fetch = jest.fn(() => {
      calls += 1
      return calls === 1 ? pendingA.promise : pendingB.promise
    }) as unknown as typeof fetch

    mockAuth(10)
    expect(coalesceUserScope(null, jwtFor(10))).toBe('10')
    const first = userService.getUserStats()
    mockAuth(20)
    expect(coalesceUserScope(null, jwtFor(20))).toBe('20')
    const second = userService.getUserStats()

    pendingA.resolve(statsResponse('a'))
    pendingB.resolve(statsResponse('b'))
    const [a, b] = await Promise.all([first, second])
    expect((a as { label?: string }).label).toBe('a')
    expect((b as { label?: string }).label).toBe('b')
    expect(calls).toBe(2)
  })

  it('after success, a later call can hit cache instead of a stale in-flight entry', async () => {
    global.fetch = jest.fn(async () => statsResponse('cached')) as unknown as typeof fetch
    await userService.getUserStats()
    await userService.getUserStats()
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(1)
  })
})
