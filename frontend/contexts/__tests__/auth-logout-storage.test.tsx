import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '../auth-context'
import { getAuthService } from '@/lib/auth-service'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}))

jest.mock('@/lib/auth-service', () => ({
  getAuthService: jest.fn(),
}))

jest.mock('@/hooks/use-auth-notifications', () => ({
  useAuthNotifications: () => ({
    showLoginSuccess: jest.fn(),
    showLoginError: jest.fn(),
    showRegisterSuccess: jest.fn(),
    showRegisterError: jest.fn(),
  }),
}))

const mockGetAuthService = getAuthService as jest.MockedFunction<typeof getAuthService>

function LogoutProbe() {
  const { logout, isLoading } = useAuth()
  if (isLoading) return <p>loading</p>
  return <button type="button" onClick={() => void logout()}>Salir</button>
}

describe('AuthProvider logout storage', () => {
  beforeEach(() => {
    localStorage.clear()
    mockGetAuthService.mockReturnValue({
      hasValidTokens: () => false,
      hasRefreshToken: () => false,
      hasSessionMarker: () => false,
      getAccessToken: () => null,
      getRefreshToken: () => null,
      getOfflineMode: () => true,
      clearTokens: jest.fn(),
      forceClearBrowserSession: jest.fn().mockResolvedValue(undefined),
    } as any)
  })

  it('removes the stored profile and completion flags on logout', async () => {
    localStorage.setItem('user_profile', JSON.stringify({ email: 'old@example.com', weight: 80 }))
    localStorage.setItem('initial_form_completed', 'true')
    localStorage.setItem('form_version', '2')

    const user = userEvent.setup()
    render(
      <AuthProvider>
        <LogoutProbe />
      </AuthProvider>,
    )

    await user.click(await screen.findByRole('button', { name: 'Salir' }))

    await waitFor(() => {
      expect(localStorage.getItem('user_profile')).toBeNull()
    })
    expect(localStorage.getItem('initial_form_completed')).toBeNull()
    expect(localStorage.getItem('form_version')).toBeNull()
  })
})
