// hooks/__tests__/use-notifications-enhanced.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useNotificationsEnhanced } from '../use-notifications-enhanced'
import { useAuth } from '@/contexts/auth-context'
import { notificationService } from '@/lib/notification-service'

// Mock dependencies
jest.mock('@/contexts/auth-context')
jest.mock('@/lib/notification-service')

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockNotificationService = notificationService as jest.Mocked<typeof notificationService>

describe('useNotificationsEnhanced', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return initial state', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, email: 'test@example.com' },
      refreshUser: jest.fn(),
      logout: jest.fn(),
    } as any)

    mockNotificationService.getNotifications = jest.fn().mockResolvedValue([])
    mockNotificationService.getSettings = jest.fn().mockResolvedValue({
      email: true,
      push: true,
      meals: true,
      workouts: true,
      achievements: true,
      reminders: true,
      marketing: false,
      admin: true,
    })

    const { result } = renderHook(() => useNotificationsEnhanced())

    expect(result.current.loading).toBe(false)
    expect(result.current.notifications).toEqual([])
    expect(result.current.unreadCount).toBe(0)
  })

  it('should load notifications on mount', async () => {
    const mockNotifications = [
      {
        id: '1',
        type: 'general',
        title: 'Test Notification',
        message: 'Test message',
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ]

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, email: 'test@example.com' },
      refreshUser: jest.fn(),
      logout: jest.fn(),
    } as any)

    mockNotificationService.getNotifications = jest.fn().mockResolvedValue(mockNotifications)
    mockNotificationService.getSettings = jest.fn().mockResolvedValue({
      email: true,
      push: true,
      meals: true,
      workouts: true,
      achievements: true,
      reminders: true,
      marketing: false,
      admin: true,
    })

    const { result } = renderHook(() => useNotificationsEnhanced())

    await waitFor(() => {
      expect(result.current.notifications.length).toBeGreaterThan(0)
    })

    expect(result.current.notifications).toEqual(mockNotifications)
  })

  it('should calculate unread count correctly', async () => {
    const mockNotifications = [
      {
        id: '1',
        type: 'general',
        title: 'Unread 1',
        message: 'Message 1',
        is_read: false,
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        type: 'general',
        title: 'Unread 2',
        message: 'Message 2',
        is_read: false,
        created_at: new Date().toISOString(),
      },
      {
        id: '3',
        type: 'general',
        title: 'Read 1',
        message: 'Message 3',
        is_read: true,
        created_at: new Date().toISOString(),
      },
    ]

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, email: 'test@example.com' },
      refreshUser: jest.fn(),
      logout: jest.fn(),
    } as any)

    mockNotificationService.getNotifications = jest.fn().mockResolvedValue(mockNotifications)
    mockNotificationService.getSettings = jest.fn().mockResolvedValue({
      email: true,
      push: true,
      meals: true,
      workouts: true,
      achievements: true,
      reminders: true,
      marketing: false,
      admin: true,
    })

    const { result } = renderHook(() => useNotificationsEnhanced())

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(2)
    })
  })

  it('should mark notification as read', async () => {
    const mockNotification = {
      id: '1',
      type: 'general',
      title: 'Test',
      message: 'Test message',
      is_read: false,
      created_at: new Date().toISOString(),
    }

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, email: 'test@example.com' },
      refreshUser: jest.fn(),
      logout: jest.fn(),
    } as any)

    mockNotificationService.getNotifications = jest.fn().mockResolvedValue([mockNotification])
    mockNotificationService.getSettings = jest.fn().mockResolvedValue({
      email: true,
      push: true,
      meals: true,
      workouts: true,
      achievements: true,
      reminders: true,
      marketing: false,
      admin: true,
    })
    mockNotificationService.markAsRead = jest.fn().mockResolvedValue({
      ...mockNotification,
      is_read: true,
    })

    const { result } = renderHook(() => useNotificationsEnhanced())

    await waitFor(() => {
      expect(result.current.notifications.length).toBeGreaterThan(0)
    })

    await result.current.markAsRead('1')

    expect(mockNotificationService.markAsRead).toHaveBeenCalledWith('1')
  })
})






