import { userService } from '../user-service'
import { getAuthService } from '../auth-service'

jest.mock('../auth-service', () => ({
  getAuthService: jest.fn(),
}))

jest.mock('../image-upload', () => ({
  assertPhotoWithinUploadLimit: jest.fn(),
  normalizePhotoFile: jest.fn(async (file: File) => file),
}))

const mockGetAuthService = getAuthService as jest.MockedFunction<typeof getAuthService>

const mockResponse = (body: unknown, status: number) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: status === 201 ? 'Created' : 'Error',
  headers: {
    get: jest.fn(() => null),
  },
  json: jest.fn(async () => body),
  text: jest.fn(async () => JSON.stringify(body)),
})

describe('userService.uploadProgressPhoto', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000'
    mockGetAuthService.mockReturnValue({
      isAuthenticated: jest.fn(() => true),
      refreshAccessTokenDeduped: jest.fn(async () => true),
      getAccessToken: jest.fn(() => null),
    } as any)
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: 'csrfToken=csrf-1',
    })
  })

  it('rebuilds multipart FormData when retrying after an expired token', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(mockResponse({ detail: 'expired' }, 401))
      .mockResolvedValueOnce(mockResponse({
        id: 'photo-1',
        photo_url: '/media/progress_photos/a.jpg',
        thumbnail_url: null,
        photo_type: 'front',
        date: '2026-08-05',
        weight: '70.00',
        notes: '',
        created_at: '2026-08-05T10:00:00Z',
      }, 201))

    global.fetch = fetchMock as any

    const file = new File([new Uint8Array([1, 2, 3])], 'photo.jpg', { type: 'image/jpeg' })
    const result = await userService.uploadProgressPhoto(
      file,
      70,
      'check-in',
      'front',
      '2026-08-05',
      'idem-1',
    )

    expect(result.id).toBe('photo-1')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const firstBody = fetchMock.mock.calls[0][1].body
    const retryBody = fetchMock.mock.calls[1][1].body
    expect(firstBody).toBeInstanceOf(FormData)
    expect(retryBody).toBeInstanceOf(FormData)
    expect(retryBody).not.toBe(firstBody)
    expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBeUndefined()
    expect(fetchMock.mock.calls[1][1].headers['Content-Type']).toBeUndefined()
    expect(fetchMock.mock.calls[1][1].headers['Idempotency-Key']).toBe('idem-1')
    expect(retryBody.has('photo')).toBe(true)
    expect(retryBody.get('photo_type')).toBe('front')
    expect(retryBody.get('date')).toBe('2026-08-05')
    expect(retryBody.get('weight')).toBe('70')
    expect(retryBody.get('notes')).toBe('check-in')
  })
})
