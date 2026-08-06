import { act, renderHook, waitFor } from '@testing-library/react'
import { useAdminExercises } from '../use-admin-exercises'
import { handle401AndRefresh } from '@/lib/fetch-with-auth'

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    getAuthHeaders: jest.fn(async () => ({ Authorization: 'Bearer old-token' })),
  }),
}))

jest.mock('@/lib/fetch-with-auth', () => ({
  handle401AndRefresh: jest.fn(),
}))

const mockResponse = (body: unknown, status: number) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: {
    get: jest.fn(() => 'application/json'),
  },
  json: jest.fn(async () => body),
  text: jest.fn(async () => JSON.stringify(body)),
})

const getHeader = (headers: HeadersInit, name: string) => new Headers(headers).get(name)

describe('useAdminExercises uploads', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000'
    Object.defineProperty(global, 'crypto', {
      configurable: true,
      value: { randomUUID: jest.fn(() => 'upload-id-1') },
    })
  })

  it('rebuilds video FormData and keeps upload id when retrying after 401', async () => {
    ;(handle401AndRefresh as jest.Mock).mockResolvedValue({ Authorization: 'Bearer new-token' })
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(mockResponse([], 200))
      .mockResolvedValueOnce(mockResponse([], 200))
      .mockResolvedValueOnce(mockResponse({ total_exercises: 0 }, 200))
      .mockResolvedValueOnce(mockResponse({ detail: 'expired' }, 401))
      .mockResolvedValueOnce(mockResponse({
        id: 1,
        name: 'Exercise',
        category: 'strength',
        muscle_groups: [],
        instructions: '',
        video_file_url: '/media/exercises/videos/test.mp4',
        has_video: true,
      }, 200))

    global.fetch = fetchMock as any

    const { result } = renderHook(() => useAdminExercises())
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))

    const file = new File([new Uint8Array([1, 2, 3])], 'exercise.mp4', { type: 'video/mp4' })
    await act(async () => {
      await result.current.uploadExerciseVideo(1, file)
    })

    expect(fetchMock).toHaveBeenCalledTimes(5)
    const firstUpload = fetchMock.mock.calls[3][1]
    const retryUpload = fetchMock.mock.calls[4][1]

    expect(firstUpload.body).toBeInstanceOf(FormData)
    expect(retryUpload.body).toBeInstanceOf(FormData)
    expect(retryUpload.body).not.toBe(firstUpload.body)
    expect(getHeader(firstUpload.headers, 'Content-Type')).toBeNull()
    expect(getHeader(retryUpload.headers, 'Content-Type')).toBeNull()
    expect(getHeader(firstUpload.headers, 'X-Upload-ID')).toBe('upload-id-1')
    expect(getHeader(retryUpload.headers, 'X-Upload-ID')).toBe('upload-id-1')
    expect((retryUpload.body as FormData).get('video_file')).toBe(file)
  })
})
