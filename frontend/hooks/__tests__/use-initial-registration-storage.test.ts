import { renderHook, waitFor, act } from '@testing-library/react'
import { useInitialRegistration } from '../use-initial-registration'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/hooks/use-toast'
import { USER_ENDPOINTS } from '@/lib/api'

jest.mock('@/contexts/auth-context')
jest.mock('@/hooks/use-toast')

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>

const profileFor = (id: string) => ({
  id,
  email: `${id}@example.com`,
  first_name: 'Ana',
  weight: 70,
  height: 165,
  allergies: ['nuts'],
  medical_conditions: ['asthma'],
})

describe('useInitialRegistration profile storage', () => {
  beforeEach(() => {
    localStorage.clear()
    mockUseToast.mockReturnValue({ toast: jest.fn() } as any)
  })

  it('keeps the API profile in memory and does not persist user_profile', async () => {
    localStorage.setItem(
      'user_profile',
      JSON.stringify({ id: 'old-user', email: 'old@example.com', weight: 99 }),
    )
    mockUseAuth.mockReturnValue({
      user: { id: 'user-a', first_name: 'Ana', last_name: 'López', email: 'user-a@example.com', phone: '' },
    } as any)

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        is_complete: true,
        completion_percentage: 100,
        completed_fields: ['weight'],
        missing_fields: [],
        form_version: 2,
        profile: profileFor('user-a'),
      }),
    }) as jest.Mock

    const { result } = renderHook(() => useInitialRegistration())

    await waitFor(() => {
      expect(result.current.status?.is_complete).toBe(true)
    })

    expect(result.current.status?.profile).toEqual(profileFor('user-a'))
    expect(localStorage.getItem('user_profile')).toBeNull()
    expect(localStorage.getItem('initial_form_completed')).toBe('true')
  })

  it('does not write user_profile when registration completes', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-b', first_name: 'Ana', last_name: 'López', email: 'user-b@example.com', phone: '' },
    } as any)

    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes(USER_ENDPOINTS.INITIAL_REGISTRATION_STATUS) && (!init || init.method === 'GET')) {
        return {
          ok: true,
          json: async () => ({
            is_complete: false,
            completion_percentage: 0,
            completed_fields: [],
            missing_fields: ['weight'],
            profile: null,
          }),
        }
      }
      return {
        ok: true,
        json: async () => ({
          profile: profileFor('user-b'),
          form_version: 2,
        }),
      }
    }) as jest.Mock

    const { result } = renderHook(() => useInitialRegistration())

    await waitFor(() => {
      expect(result.current.status?.is_complete).toBe(false)
    })

    await act(async () => {
      await result.current.completeRegistration({
        first_name: 'Ana',
        last_name: 'López',
        email: 'user-b@example.com',
        birth_date: '1990-01-01',
        gender: 'female',
        height: 165,
        weight: 70,
        activity_level: 'moderate',
        training_days: [1, 3, 5],
        training_location: 'gym',
        main_goal: 'lose_weight',
      })
    })

    expect(result.current.status?.profile).toEqual(profileFor('user-b'))
    expect(localStorage.getItem('user_profile')).toBeNull()
    expect(localStorage.getItem('initial_form_completed')).toBe('true')
  })
})
