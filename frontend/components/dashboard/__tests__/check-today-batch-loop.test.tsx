import { render, screen, waitFor } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { WorkoutDashboardEnhanced } from '../workout-dashboard-enhanced'
import { useWorkouts } from '@/hooks/use-workouts'

const mockCheckTodayUrls: string[] = []
const mockTodayDay = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  day_number: 1,
  name: 'Fuerza',
  is_rest_day: false,
  exercises: [] as [],
}

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: 21 } }),
}))

jest.mock('@/hooks/use-user-profile', () => ({
  useUserProfile: () => ({ profile: { first_name: 'Nuria' } }),
}))

jest.mock('@/hooks/use-user-data', () => ({
  useUserData: () => ({ userStats: { daysInTransformation: 3 }, refreshStats: jest.fn() }),
}))

jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}))

jest.mock('@/lib/api', () => ({
  buildApiUrl: (path: string) => path,
  authenticatedFetch: jest.fn(async (url: string) => {
    if (String(url).includes('check_today_batch')) {
      mockCheckTodayUrls.push(String(url))
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ results: {} }),
        json: async () => ({ results: {} }),
      }
    }
    if (String(url).includes('my_active_program')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          program: {
            id: 'prog-1',
            name: 'Plan Nuria',
            duration_weeks: 8,
            days_per_week: 2,
            start_date: '2026-08-31',
            loaded_week: 4,
            days: [mockTodayDay],
          },
        }),
      }
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ results: [] }),
    }
  }),
}))

function checkTodayCount() {
  return mockCheckTodayUrls.length
}

describe('check_today_batch', () => {
  beforeEach(() => {
    mockCheckTodayUrls.length = 0
    const start = new Date('2026-08-31T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    mockTodayDay.day_number = Math.round((today.getTime() - start.getTime()) / 86400000) + 1
  })

  it('mantiene estable getTodaysWorkout entre renders', async () => {
    const { result, rerender } = renderHook(() => useWorkouts())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 })
    const first = result.current.getTodaysWorkout
    for (let i = 0; i < 10; i += 1) rerender()
    expect(result.current.getTodaysWorkout).toBe(first)
    expect(result.current.activeProgram?.id).toBe('prog-1')
  })

  it('no entra en bucle al montar ni al rerender, y el dashboard sigue mostrando el plan', async () => {
    const { rerender } = render(<WorkoutDashboardEnhanced />)
    await screen.findByText(/Plan Nuria/, {}, { timeout: 5000 })
    await waitFor(() => expect(checkTodayCount()).toBeGreaterThan(0), { timeout: 5000 })
    const afterLoad = checkTodayCount()
    // 1 en load único; 2 si React Strict Mode monta dos veces. Lo crítico: no crecer en rerender.
    expect(afterLoad).toBeGreaterThanOrEqual(1)
    expect(afterLoad).toBeLessThanOrEqual(2)

    for (let i = 0; i < 10; i += 1) rerender(<WorkoutDashboardEnhanced />)
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(checkTodayCount()).toBe(afterLoad)
    expect(screen.getByText(/Plan Nuria/)).toBeInTheDocument()
  })
})
