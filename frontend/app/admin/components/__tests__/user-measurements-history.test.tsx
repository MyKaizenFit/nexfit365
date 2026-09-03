import { render, screen } from '@testing-library/react'
import { UserMeasurementsHistory } from '../user-measurements-history'
import { useAdminUserMeasurements } from '@/hooks/use-admin-user-measurements'

jest.mock('@/hooks/use-admin-user-measurements')

const mockUseAdminUserMeasurements = useAdminUserMeasurements as jest.MockedFunction<
  typeof useAdminUserMeasurements
>

describe('UserMeasurementsHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows loading state', () => {
    mockUseAdminUserMeasurements.mockReturnValue({
      entries: [],
      count: 0,
      loading: true,
      error: null,
      refetch: jest.fn(),
    })

    render(<UserMeasurementsHistory userId="11" />)
    expect(mockUseAdminUserMeasurements).toHaveBeenCalledWith('11')
    expect(screen.getByText(/cargando medidas/i)).toBeInTheDocument()
  })

  it('shows an empty state when the user has no measurements', () => {
    mockUseAdminUserMeasurements.mockReturnValue({
      entries: [],
      count: 0,
      loading: false,
      error: null,
      refetch: jest.fn(),
    })

    render(<UserMeasurementsHistory userId="11" />)
    expect(screen.getByText(/todavía no tiene medidas corporales registradas/i)).toBeInTheDocument()
  })

  it('renders several historical records for the requested user', () => {
    mockUseAdminUserMeasurements.mockReturnValue({
      entries: [
        { id: 'new', date: '2026-06-01', waist: '70.00', chest: '91.00' },
        { id: 'old', date: '2025-01-01', waist: '74.00', notes: 'inicio' },
      ],
      count: 2,
      loading: false,
      error: null,
      refetch: jest.fn(),
    })

    render(<UserMeasurementsHistory userId="11" />)
    expect(mockUseAdminUserMeasurements).toHaveBeenCalledWith('11')
    expect(screen.getByText('2026-06-01')).toBeInTheDocument()
    expect(screen.getByText('2025-01-01')).toBeInTheDocument()
    expect(screen.getByText('70.00 cm')).toBeInTheDocument()
    expect(screen.getByText('74.00 cm')).toBeInTheDocument()
    expect(screen.getByText('91.00 cm')).toBeInTheDocument()
    expect(screen.getByText('inicio')).toBeInTheDocument()
    expect(screen.queryByText('99.00 cm')).not.toBeInTheDocument()
  })

  it('shows the error state', () => {
    mockUseAdminUserMeasurements.mockReturnValue({
      entries: [],
      count: 0,
      loading: false,
      error: 'Error 500 al cargar medidas corporales',
      refetch: jest.fn(),
    })

    render(<UserMeasurementsHistory userId="11" />)
    expect(screen.getByText(/error 500 al cargar medidas corporales/i)).toBeInTheDocument()
  })
})
