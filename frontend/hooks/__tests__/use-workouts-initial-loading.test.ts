import { act, renderHook, waitFor } from '@testing-library/react'
import fs from 'fs'
import path from 'path'
import { useWorkouts } from '../use-workouts'
import { useAuth } from '@/contexts/auth-context'
import { authenticatedFetch } from '@/lib/api'

jest.mock('@/contexts/auth-context', () => ({
  useAuth: jest.fn(),
}))

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api')
  return {
    ...actual,
    authenticatedFetch: jest.fn(),
  }
})

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockAuthenticatedFetch = authenticatedFetch as jest.MockedFunction<typeof authenticatedFetch>

type RequestKind = 'active' | 'templates' | 'stats' | 'logs' | 'exercises' | 'programs' | 'other'

function classifyRequest(url: string): RequestKind {
  if (url.includes('my_active_program')) return 'active'
  if (url.includes('available_templates')) return 'templates'
  if (url.includes('workout-logs/statistics')) return 'stats'
  if (url.includes('workout-logs')) return 'logs'
  if (url.startsWith('exercises')) return 'exercises'
  if (url.startsWith('workout-programs')) return 'programs'
  return 'other'
}

function jsonResponse(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: { get: () => 'application/json' },
  } as unknown as Response)
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

const ACTIVE_PROGRAM = {
  program: {
    id: 'program-1',
    name: 'Fuerza',
    description: '',
    level: 'beginner',
    goal: 'strength_building',
    days_per_week: 3,
    duration_weeks: 4,
    start_date: '2026-09-01',
    is_active: true,
    days: [
      {
        id: 'day-1',
        day_name: 'Push',
        day_number: 1,
        is_rest_day: false,
        order_index: 0,
        exercises: [],
      },
    ],
  },
}

describe('useWorkouts initial loading', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 1 },
    } as any)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('does not keep artificial 100/200ms delays in the initial load path', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'hooks/use-workouts.ts'), 'utf8')
    expect(source).not.toMatch(/setTimeout\(resolve,\s*200\)/)
    expect(source).not.toMatch(/loadWorkoutData\(\)[\s\S]{0,80}100/)
    expect(source).not.toMatch(/Pequeño delay/)
  })

  it('starts the critical active-program fetch without advancing timers', () => {
    jest.useFakeTimers()
    const pending = deferred<Response>()
    mockAuthenticatedFetch.mockImplementation((url: string) => {
      if (classifyRequest(url) === 'active') return pending.promise
      return pending.promise
    })

    renderHook(() => useWorkouts())

    const urls = mockAuthenticatedFetch.mock.calls.map((call) => String(call[0]))
    expect(urls.some((url) => classifyRequest(url) === 'active')).toBe(true)
    expect(urls.some((url) => classifyRequest(url) === 'templates')).toBe(false)
  })

  it('makes the workout usable when secondary requests are still pending', async () => {
    const active = deferred<Response>()
    const templates = deferred<Response>()
    mockAuthenticatedFetch.mockImplementation((url: string) => {
      const kind = classifyRequest(url)
      if (kind === 'active') return active.promise
      if (kind === 'templates') return templates.promise
      return jsonResponse([])
    })

    const { result } = renderHook(() => useWorkouts())
    expect(result.current.loading).toBe(true)

    await act(async () => {
      active.resolve(await jsonResponse(ACTIVE_PROGRAM))
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.activeProgram?.id).toBe('program-1')
    expect(result.current.activeProgram?.name).toBe('Fuerza')
    expect(result.current.templates).toEqual([])
    expect(result.current.error).toBeNull()
    expect(
      mockAuthenticatedFetch.mock.calls.some((call) => classifyRequest(String(call[0])) === 'templates'),
    ).toBe(true)
  })

  it('keeps the critical workout usable if secondary fetches fail', async () => {
    mockAuthenticatedFetch.mockImplementation((url: string) => {
      const kind = classifyRequest(url)
      if (kind === 'active') return jsonResponse(ACTIVE_PROGRAM)
      if (kind === 'templates') return jsonResponse({ detail: 'boom' }, 500)
      if (kind === 'stats') return jsonResponse({ detail: 'stats down' }, 500)
      return jsonResponse([])
    })

    const { result } = renderHook(() => useWorkouts())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.activeProgram?.id).toBe('program-1')
    expect(result.current.error).toBeNull()
  })

  it('surfaces a critical failure when the active program cannot load', async () => {
    mockAuthenticatedFetch.mockImplementation((url: string) => {
      if (classifyRequest(url) === 'active') {
        return jsonResponse({ detail: 'Error al obtener programa activo' }, 500)
      }
      return jsonResponse([])
    })

    const { result } = renderHook(() => useWorkouts())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.activeProgram).toBeNull()
    expect(result.current.error).toMatch(/programa activo/)
  })

  it('fills deferred data after the critical workout is already usable', async () => {
    const templates = deferred<Response>()
    mockAuthenticatedFetch.mockImplementation((url: string) => {
      const kind = classifyRequest(url)
      if (kind === 'active') return jsonResponse(ACTIVE_PROGRAM)
      if (kind === 'templates') return templates.promise
      return jsonResponse([])
    })

    const { result } = renderHook(() => useWorkouts())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.activeProgram?.id).toBe('program-1')
    })
    expect(result.current.templates).toEqual([])

    await act(async () => {
      templates.resolve(await jsonResponse([{ id: 'tpl-1', name: 'Plantilla' }]))
    })

    await waitFor(() => {
      expect(result.current.templates).toEqual([{ id: 'tpl-1', name: 'Plantilla' }])
    })
    expect(result.current.loading).toBe(false)
  })

  it('does not throw if the hook unmounts while a request is in flight', async () => {
    const active = deferred<Response>()
    mockAuthenticatedFetch.mockImplementation((url: string) => {
      if (classifyRequest(url) === 'active') return active.promise
      return jsonResponse([])
    })

    const { unmount } = renderHook(() => useWorkouts())
    unmount()

    await act(async () => {
      active.resolve(await jsonResponse(ACTIVE_PROGRAM))
    })
  })
})
