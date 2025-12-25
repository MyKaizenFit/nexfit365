// hooks/__tests__/use-user-profile.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useUserProfile } from '../use-user-profile'
import { useAuth } from '@/contexts/auth-context'
import { userService } from '@/lib/user-service'

// Mock dependencies
jest.mock('@/contexts/auth-context')
jest.mock('@/lib/user-service')

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockUserService = userService as jest.Mocked<typeof userService>

describe('useUserProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return loading state initially', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, email: 'test@example.com' },
      refreshUser: jest.fn(),
      logout: jest.fn(),
    } as any)

    mockUserService.getUserProfile = jest.fn().mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
    })

    const { result } = renderHook(() => useUserProfile())

    expect(result.current.loading).toBe(true)
  })

  it('should fetch user profile when authenticated', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      weight: 70,
      height: 175,
    }

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, email: 'test@example.com' },
      refreshUser: jest.fn(),
      logout: jest.fn(),
    } as any)

    mockUserService.getUserProfile = jest.fn().mockResolvedValue(mockUser)

    const { result } = renderHook(() => useUserProfile())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.profile).toEqual(mockUser)
    expect(result.current.error).toBeNull()
  })

  it('should handle fetch error gracefully', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, email: 'test@example.com' },
      refreshUser: jest.fn(),
      logout: jest.fn(),
    } as any)

    mockUserService.getUserProfile = jest.fn().mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useUserProfile())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.profile).toBeNull()
  })

  it('should update profile successfully', async () => {
    const initialProfile = {
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      weight: 70,
    }

    const updatedProfile = {
      ...initialProfile,
      weight: 75,
      first_name: 'Updated',
    }

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, email: 'test@example.com' },
      refreshUser: jest.fn(),
      logout: jest.fn(),
    } as any)

    mockUserService.getUserProfile = jest.fn().mockResolvedValue(initialProfile)
    mockUserService.updateUserProfile = jest.fn().mockResolvedValue(updatedProfile)

    const { result } = renderHook(() => useUserProfile())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await result.current.updateProfile({ weight: 75, first_name: 'Updated' })

    await waitFor(() => {
      expect(result.current.profile?.weight).toBe(75)
      expect(result.current.profile?.first_name).toBe('Updated')
    })
  })
})






