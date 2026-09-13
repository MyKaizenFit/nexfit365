import { act, renderHook, waitFor } from '@testing-library/react'
import { useUserData } from '../use-user-data'
import { useAuth } from '@/contexts/auth-context'
import { userService } from '@/lib/user-service'
import { apiCache } from '@/lib/api-cache'
import { clearInFlightRequests } from '@/lib/request-coalescer'
import { getAuthService } from '@/lib/auth-service'

jest.mock('@/contexts/auth-context', () => ({
  useAuth: jest.fn(),
}))

jest.mock('@/lib/auth-service', () => ({
  getAuthService: jest.fn(),
}))

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockGetAuthService = getAuthService as jest.MockedFunction<typeof getAuthService>

function jwtFor(userId: number) {
  const b64url = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return `${b64url({ alg: 'none' })}.${b64url({ user_id: userId, exp: 9999999999 })}.x`
}

function statsResponse() {
  const body = {
    caloriesToday: 400,
    caloriesGoal: 2000,
    currentWeight: 70,
    targetWeight: 65,
    weightChange: -1,
    workoutsThisWeek: 2,
    workoutsGoal: 5,
    nextReview: 'Próximamente',
    daysInTransformation: 3,
    proteinToday: 30,
    proteinGoal: 150,
    carbsToday: 40,
    carbsGoal: 220,
    fatToday: 10,
    fatGoal: 80,
  }
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
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

describe('useUserData concurrent consumers', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    apiCache.clear()
    clearInFlightRequests()
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 1 },
    } as never)
    mockGetAuthService.mockReturnValue({
      isAuthenticated: () => true,
      getAccessToken: () => jwtFor(1),
    } as never)
  })

  afterEach(() => {
    global.fetch = originalFetch
    apiCache.clear()
    clearInFlightRequests()
  })

  it('two mounted hooks share one user-stats GET', async () => {
    const pending = deferred<ReturnType<typeof statsResponse>>()
    global.fetch = jest.fn(() => pending.promise) as unknown as typeof fetch

    const a = renderHook(() => useUserData())
    const b = renderHook(() => useUserData())
    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls.length).toBe(1)
    })

    await act(async () => {
      pending.resolve(statsResponse())
    })
    await waitFor(() => {
      expect(a.result.current.loading).toBe(false)
      expect(b.result.current.loading).toBe(false)
    })
    expect(a.result.current.userStats?.daysInTransformation).toBe(3)
    expect(b.result.current.userStats?.daysInTransformation).toBe(3)
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(1)
  })

  it('unmounting one consumer does not drop the shared result', async () => {
    const pending = deferred<ReturnType<typeof statsResponse>>()
    global.fetch = jest.fn(() => pending.promise) as unknown as typeof fetch
    const a = renderHook(() => useUserData())
    const b = renderHook(() => useUserData())
    a.unmount()
    await act(async () => {
      pending.resolve(statsResponse())
    })
    await waitFor(() => {
      expect(b.result.current.userStats?.daysInTransformation).toBe(3)
    })
  })

  it('refresh after completion uses the existing userService path', async () => {
    global.fetch = jest.fn(async () => statsResponse()) as unknown as typeof fetch
    const hook = renderHook(() => useUserData())
    await waitFor(() => {
      expect(hook.result.current.loading).toBe(false)
    })
    await act(async () => {
      await hook.result.current.refreshStats()
    })
    expect(typeof userService.getUserStats).toBe('function')
  })
})
