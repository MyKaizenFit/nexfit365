// lib/__tests__/api.test.ts
import { buildApiUrl, getAuthHeaders, API_CONFIG } from '../api'
import { getAuthService } from '../auth-service'

jest.mock('../auth-service', () => ({
  getAuthService: jest.fn(),
  authService: {
    getAccessToken: jest.fn(),
  },
}))

const mockGetAuthService = getAuthService as jest.MockedFunction<typeof getAuthService>

describe('API utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000'
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    })
  })

  describe('buildApiUrl', () => {
    it('builds correct API URL with endpoint', () => {
      const url = buildApiUrl('profile/')
      expect(url).toBe('http://localhost:8000/api/profile/')
    })

    it('handles endpoint without trailing slash', () => {
      const url = buildApiUrl('profile')
      expect(url).toBe('http://localhost:8000/api/profile')
    })

    it('handles endpoint with leading slash', () => {
      const url = buildApiUrl('/profile')
      expect(url).toBe('http://localhost:8000/api/profile')
    })
  })

  describe('getAuthHeaders', () => {
    it('returns headers with Bearer when memory token is available', () => {
      mockGetAuthService.mockReturnValue({
        getAccessToken: jest.fn().mockReturnValue('test-token'),
      } as any)

      const headers = getAuthHeaders()

      expect(headers).toEqual({
        ...API_CONFIG.DEFAULT_HEADERS,
        Authorization: 'Bearer test-token',
      })
    })

    it('returns default headers without Bearer for cookie-only sessions', () => {
      mockGetAuthService.mockReturnValue({
        getAccessToken: jest.fn().mockReturnValue(null),
      } as any)

      const headers = getAuthHeaders()

      expect(headers).toEqual({
        ...API_CONFIG.DEFAULT_HEADERS,
      })
      expect(headers.Authorization).toBeUndefined()
    })

    it('includes CSRF header when csrfToken cookie is present', () => {
      mockGetAuthService.mockReturnValue({
        getAccessToken: jest.fn().mockReturnValue(null),
      } as any)
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'csrfToken=abc123',
      })

      const headers = getAuthHeaders()

      expect(headers['X-CSRFToken']).toBe('abc123')
    })
  })
})
