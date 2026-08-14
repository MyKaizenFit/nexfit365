// lib/__tests__/api.test.ts
import {
  buildApiUrl,
  buildMediaUrl,
  buildUploadApiUrl,
  getApiBaseUrl,
  getAuthHeaders,
  getMultipartAuthHeaders,
  getUploadApiBaseUrl,
  API_CONFIG,
} from '../api'
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
    delete process.env.NEXT_PUBLIC_UPLOAD_API_URL
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

    it('builds metodosk.com/nexfit/api URLs', () => {
      process.env.NEXT_PUBLIC_API_URL = 'https://metodosk.com/nexfit/api'
      expect(buildApiUrl('users/')).toBe('https://metodosk.com/nexfit/api/users/')
    })
  })

  describe('getApiBaseUrl', () => {
    it('falls back to localhost in development when env is missing', () => {
      delete process.env.NEXT_PUBLIC_API_URL
      expect(getApiBaseUrl()).toBe('http://localhost:8000')
    })

    it('throws in production when NEXT_PUBLIC_API_URL is missing', () => {
      const previousNodeEnv = process.env.NODE_ENV
      delete process.env.NEXT_PUBLIC_API_URL
      Object.defineProperty(process.env, 'NODE_ENV', {
        configurable: true,
        writable: true,
        value: 'production',
      })
      try {
        expect(() => getApiBaseUrl()).toThrow(/NEXT_PUBLIC_API_URL/)
      } finally {
        Object.defineProperty(process.env, 'NODE_ENV', {
          configurable: true,
          writable: true,
          value: previousNodeEnv,
        })
      }
    })
  })

  describe('upload API helpers', () => {
    it('uses NEXT_PUBLIC_UPLOAD_API_URL when set', () => {
      process.env.NEXT_PUBLIC_API_URL = 'https://metodosk.com/nexfit/api'
      process.env.NEXT_PUBLIC_UPLOAD_API_URL = 'https://uploads.metodosk.com/nexfit/api'
      expect(getUploadApiBaseUrl()).toBe('https://uploads.metodosk.com/nexfit')
      expect(buildUploadApiUrl('admin/exercises/1/upload-video/')).toBe(
        'https://uploads.metodosk.com/nexfit/api/admin/exercises/1/upload-video/'
      )
    })

    it('falls back to the normal API when upload URL is missing', () => {
      process.env.NEXT_PUBLIC_API_URL = 'https://metodosk.com/nexfit/api'
      expect(buildUploadApiUrl('admin/exercises/1/upload-video/')).toBe(
        'https://metodosk.com/nexfit/api/admin/exercises/1/upload-video/'
      )
    })
  })

  describe('buildMediaUrl', () => {
    it('keeps historical absolute media URLs', () => {
      const historical = 'https://api.nexfit365.dpdns.org/media/exercises/videos/demo.mp4'
      expect(buildMediaUrl(historical)).toBe(historical)
    })

    it('builds media URLs under the API origin including /nexfit', () => {
      process.env.NEXT_PUBLIC_API_URL = 'https://metodosk.com/nexfit/api'
      expect(buildMediaUrl('/media/exercises/videos/demo.mp4')).toBe(
        'https://metodosk.com/nexfit/media/exercises/videos/demo.mp4'
      )
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

    it('prefers the last csrfToken when duplicates exist', () => {
      mockGetAuthService.mockReturnValue({
        getAccessToken: jest.fn().mockReturnValue(null),
      } as any)
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'csrfToken=stale-host-only; other=1; csrfToken=fresh-shared',
      })

      const headers = getAuthHeaders()

      expect(headers['X-CSRFToken']).toBe('fresh-shared')
    })
  })

  describe('getMultipartAuthHeaders', () => {
    it('keeps CSRF and Bearer but omits Content-Type for FormData', () => {
      mockGetAuthService.mockReturnValue({
        getAccessToken: jest.fn().mockReturnValue('tok'),
      } as any)
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'csrfToken=csrf-xyz',
      })

      const headers = getMultipartAuthHeaders()

      expect(headers.Authorization).toBe('Bearer tok')
      expect(headers['X-CSRFToken']).toBe('csrf-xyz')
      expect(headers['Content-Type']).toBeUndefined()
      expect(headers.Accept).toBe(API_CONFIG.DEFAULT_HEADERS.Accept)
    })
  })
})
