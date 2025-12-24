// lib/__tests__/api.test.ts
import { buildApiUrl, getAuthHeaders } from '../api'
import { authService } from '../auth-service'

jest.mock('../auth-service')

const mockAuthService = authService as jest.Mocked<typeof authService>

describe('API utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8001'
  })

  describe('buildApiUrl', () => {
    it('builds correct API URL with endpoint', () => {
      const url = buildApiUrl('profile/')
      expect(url).toBe('http://localhost:8001/api/profile/')
    })

    it('handles endpoint without trailing slash', () => {
      const url = buildApiUrl('profile')
      expect(url).toBe('http://localhost:8001/api/profile')
    })

    it('handles endpoint with leading slash', () => {
      const url = buildApiUrl('/profile')
      expect(url).toBe('http://localhost:8001/api/profile')
    })
  })

  describe('getAuthHeaders', () => {
    it('returns headers with token when authenticated', async () => {
      mockAuthService.getAccessToken = jest.fn().mockResolvedValue('test-token')

      const headers = await getAuthHeaders()

      expect(headers).toEqual({
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json',
      })
    })

    it('returns headers without token when not authenticated', async () => {
      mockAuthService.getAccessToken = jest.fn().mockResolvedValue(null)

      const headers = await getAuthHeaders()

      expect(headers).toEqual({
        'Content-Type': 'application/json',
      })
    })
  })
})





