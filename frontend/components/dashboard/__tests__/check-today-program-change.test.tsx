import { render, screen, waitFor } from '@testing-library/react'

const mockCheckTodayUrls: string[] = []
const mockState = {
  program: {
  id: 'prog-a',
  name: 'Plan A',
  duration_weeks: 8,
  days_per_week: 2,
  start_date: '2026-08-31',
  days: [
    {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      day_number: 22,
      name: 'Fuerza A',
      is_rest_day: false,
      exercises: [],
    },
  ],
  },
}
const mockWorkoutLogs: never[] = []

jest.mock('@/hooks/use-workouts', () => ({
  useWorkouts: () => ({
    workoutPrograms: [],
    activeProgram: mockState.program,
    workoutLogs: mockWorkoutLogs,
    workoutStatistics: null,
    loading: false,
    error: null,
    hasAuthError: false,
    logWorkout: jest.fn(),
    saveWorkoutProgress: jest.fn(),
    getWorkoutDraft: jest.fn(),
    fetchWorkoutLogs: jest.fn(),
    fetchWorkoutStatistics: jest.fn(),
    // Nueva referencia en cada render: no debe rearmar el efecto.
    getTodaysWorkout: () => mockState.program.days[0],
    getWeeklyProgress: () => ({ totalWorkouts: 0, completedWorkouts: 0, totalMinutes: 0 }),
  }),
}))

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: true }),
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
  authenticatedFetch: jest.fn(async (url: string) => {
    mockCheckTodayUrls.push(String(url))
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ results: {} }),
      json: async () => ({ results: {} }),
    }
  }),
  buildApiUrl: (path: string) => path,
}))

import { WorkoutDashboardEnhanced } from '../workout-dashboard-enhanced'

describe('cambio de programa activo', () => {
  beforeEach(() => {
    mockCheckTodayUrls.length = 0
    mockState.program = {
      id: 'prog-a',
      name: 'Plan A',
      duration_weeks: 8,
      days_per_week: 2,
      start_date: '2026-08-31',
      days: [
        {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          day_number: 22,
          name: 'Fuerza A',
          is_rest_day: false,
          exercises: [],
        },
      ],
    }
  })

  it('actualiza el plan visible y pide check_today una vez, sin bucle', async () => {
    const { rerender } = render(<WorkoutDashboardEnhanced />)
    await screen.findByText('Plan A')
    await waitFor(() => expect(mockCheckTodayUrls.length).toBe(1))

    for (let i = 0; i < 10; i += 1) rerender(<WorkoutDashboardEnhanced />)
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(mockCheckTodayUrls.length).toBe(1)

    mockState.program = {
      ...mockState.program,
      id: 'prog-b',
      name: 'Plan B',
      days: [
        {
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          day_number: 1,
          name: 'Fuerza B',
          is_rest_day: false,
          exercises: [],
        },
      ],
    }
    rerender(<WorkoutDashboardEnhanced />)
    await screen.findByText('Plan B')
    await waitFor(() => expect(mockCheckTodayUrls.length).toBe(2))

    for (let i = 0; i < 10; i += 1) rerender(<WorkoutDashboardEnhanced />)
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(mockCheckTodayUrls.length).toBe(2)
  })
})
