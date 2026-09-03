import { adminMeasurementsService, parseMeasurementList } from '../admin-measurements-service'
import { buildApiUrl } from '../api'

jest.mock('../api', () => ({
  buildApiUrl: jest.fn((endpoint: string) => `http://localhost:8000/api/${endpoint}`),
}))

const mockBuildApiUrl = buildApiUrl as jest.MockedFunction<typeof buildApiUrl>

const mockResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn(async () => body),
})

describe('parseMeasurementList', () => {
  it('unwraps paginated results and count', () => {
    const parsed = parseMeasurementList({
      count: 3,
      next: 'http://localhost:8000/api/admin/progress/users/7/measurements/?page=2',
      results: [{ id: 'a', date: '2026-03-01', waist: '70.00' }],
    })
    expect(parsed.count).toBe(3)
    expect(parsed.results).toHaveLength(1)
    expect(parsed.results[0].id).toBe('a')
  })

  it('accepts a bare array', () => {
    const parsed = parseMeasurementList([{ id: 'b', date: '2026-01-01', chest: '90.00' }])
    expect(parsed.count).toBe(1)
    expect(parsed.results[0].date).toBe('2026-01-01')
  })

  it('returns an empty list for unexpected payloads', () => {
    expect(parseMeasurementList(null)).toEqual({ results: [], count: 0 })
    expect(parseMeasurementList({})).toEqual({ results: [], count: 0 })
  })
})

describe('adminMeasurementsService.list', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000'
  })

  it('requests the measurements of the given user only', async () => {
    const fetchMock = jest.fn().mockResolvedValue(mockResponse({
      count: 1,
      results: [{ id: 'm1', date: '2026-04-01', waist: '68.50' }],
    }))
    global.fetch = fetchMock as any

    const payload = await adminMeasurementsService.list('42', { Authorization: 'Bearer t' })

    expect(mockBuildApiUrl).toHaveBeenCalledWith(
      'admin/progress/users/42/measurements/?ordering=-date',
    )
    expect(fetchMock.mock.calls[0][0]).toContain('/users/42/measurements/')
    expect(fetchMock.mock.calls[0][0]).not.toContain('/users/99/')
    expect(payload.results).toHaveLength(1)
    expect(payload.results[0].waist).toBe('68.50')
    expect(payload.results[0].date).toBe('2026-04-01')
  })

  it('throws on HTTP errors without treating them as an empty history', async () => {
    global.fetch = jest.fn().mockResolvedValue(mockResponse({ detail: 'forbidden' }, 403)) as any
    await expect(adminMeasurementsService.list('42', {})).rejects.toThrow(/403/)
  })
})
