import { renderHook, waitFor } from '@testing-library/react'
import { useWorkouts } from '@/hooks/use-workouts'

const fetchedUrls: string[] = []

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: 20 } }),
}))

jest.mock('@/lib/api', () => ({
  buildApiUrl: (path: string) => path,
  authenticatedFetch: jest.fn(async (url: string) => {
    fetchedUrls.push(String(url))
    if (String(url).includes('my_active_program')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          program: {
            id: '8de5bdb6-f46d-499b-927c-eb13bc5f02ab',
            name: 'Laura Power 4 días - Laura Biela Abad',
            duration_weeks: 8,
            days_per_week: 4,
            start_date: '2026-08-17',
            end_date: '2026-10-12',
            loaded_week: 7,
            days: [
              {
                id: 'bf010735-b4dc-4ef2-b912-ff53d8603c8e',
                day_number: 43,
                name: 'Día 1 - Lunes',
                is_rest_day: false,
                exercises: [],
              },
            ],
          },
        }),
      }
    }
    if (String(url).includes('available_templates')) {
      throw new Error('available_templates no debe llamarse en el load de miembro')
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ results: [] }),
    }
  }),
}))

describe('useWorkouts member initial load', () => {
  beforeEach(() => {
    fetchedUrls.length = 0
  })

  it('carga el programa activo sin solicitar available_templates', async () => {
    const { result } = renderHook(() => useWorkouts())

    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 })
    await waitFor(() => expect(result.current.activeProgram?.id).toBe('8de5bdb6-f46d-499b-927c-eb13bc5f02ab'))

    expect(fetchedUrls.some((url) => url.includes('available_templates'))).toBe(false)
    expect(fetchedUrls.some((url) => url.includes('my_active_program'))).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('permite miembro sin programa activo sin llamar available_templates', async () => {
    const { authenticatedFetch } = jest.requireMock('@/lib/api') as {
      authenticatedFetch: jest.Mock
    }
    authenticatedFetch.mockImplementation(async (url: string) => {
      fetchedUrls.push(String(url))
      if (String(url).includes('my_active_program')) {
        return { ok: true, status: 200, json: async () => ({ program: null }) }
      }
      if (String(url).includes('available_templates')) {
        throw new Error('available_templates no debe llamarse en el load de miembro')
      }
      return { ok: true, status: 200, json: async () => ({ results: [] }) }
    })

    const { result } = renderHook(() => useWorkouts())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 })
    expect(result.current.activeProgram).toBeNull()
    expect(fetchedUrls.some((url) => url.includes('available_templates'))).toBe(false)
  })
})
