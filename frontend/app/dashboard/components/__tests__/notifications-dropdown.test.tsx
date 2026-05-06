import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotificationsDropdown } from '../notifications-dropdown'
import { useNotificationsEnhanced } from '@/hooks/use-notifications-enhanced'

jest.mock('@/hooks/use-notifications-enhanced')
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}))

const mockUseNotificationsEnhanced = useNotificationsEnhanced as jest.MockedFunction<typeof useNotificationsEnhanced>

describe('NotificationsDropdown', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseNotificationsEnhanced.mockReturnValue({
      notifications: [],
      unreadCount: 12,
      markAsRead: jest.fn(),
      markAsUnread: jest.fn(),
      trackClick: jest.fn(),
      deleteNotification: jest.fn(),
      markAllAsRead: jest.fn(),
      clearAll: jest.fn(),
    } as any)
  })

  it('shows a capped unread counter on the bell trigger', () => {
    render(<NotificationsDropdown />)

    expect(screen.getByText('9+')).toBeInTheDocument()
  })

  it('opens the notification panel from the bell trigger', async () => {
    const user = userEvent.setup()
    render(<NotificationsDropdown />)

    await user.click(screen.getByRole('button'))

    expect(screen.getByText('Notificaciones')).toBeInTheDocument()
    expect(document.body).toHaveTextContent(/12\s+notificaciónes\s+sin leer/)
  })
})
