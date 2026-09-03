import { renderHook, waitFor } from '@testing-library/react'
import { useAdminUserMeasurements } from '../use-admin-user-measurements'
import { useAuth } from '@/contexts/auth-context'
import { adminMeasurementsService } from '@/lib/admin-measurements-service'

jest.mock('@/contexts/auth-context')
jest.mock('@/lib/admin-measurements-service', () => ({
  adminMeasurementsService: {
    list: jest.fn(),
  },
}))

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockList = adminMeasurementsService.list as jest.Mock

describe('useAdminUserMeasurements', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      getAuthHeaders: jest.fn(async () => ({ Authorization: 'Bearer t' })),
    } as any)
  })

  it('starts in a loading state', () => {
    mockList.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useAdminUserMeasurements('7'))
    expect(result.current.loading).toBe(true)
  })

  it('loads measurements for the requested user', async () => {
    mockList.mockResolvedValue({
      results: [
        { id: '1', date: '2026-06-01', waist: '70.00' },
        { id: '2', date: '2026-01-01', waist: '74.00' },
      ],
      count: 2,
    })

    const { result } = renderHook(() => useAdminUserMeasurements('7'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockList).toHaveBeenCalledWith('7', { Authorization: 'Bearer t' })
    expect(result.current.entries).toHaveLength(2)
    expect(result.current.error).toBeNull()
  })

  it('exposes an empty list when the user has no measurements', async () => {
    mockList.mockResolvedValue({ results: [], count: 0 })
    const { result } = renderHook(() => useAdminUserMeasurements('7'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.entries).toEqual([])
    expect(result.current.count).toBe(0)
    expect(result.current.error).toBeNull()
  })

  it('surfaces fetch errors', async () => {
    mockList.mockRejectedValue(new Error('Error 500 al cargar medidas corporales'))
    const { result } = renderHook(() => useAdminUserMeasurements('7'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toMatch(/500/)
  })
})
