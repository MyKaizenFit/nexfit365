import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserProgressPanel } from '../user-progress-panel'
import { useAdminUserProgress } from '@/hooks/use-admin-user-progress'
import { useAdminUserWellness } from '@/hooks/use-admin-user-wellness'

jest.mock('@/hooks/use-admin-user-progress')
jest.mock('@/hooks/use-admin-user-wellness')
jest.mock('../user-weight-history', () => ({
  UserWeightHistory: ({ userId }: { userId: string }) => <div>historial-peso-{userId}</div>,
}))
jest.mock('../user-wellness-panel', () => ({
  UserWellnessPanel: ({ userId }: { userId: string }) => <div>bienestar-{userId}</div>,
}))
jest.mock('../user-sleep-performance-panel', () => ({
  UserSleepPerformancePanel: ({ userId }: { userId: string }) => <div>sueno-{userId}</div>,
}))
jest.mock('../user-measurements-history', () => ({
  UserMeasurementsHistory: ({ userId }: { userId: string }) => <div>medidas-{userId}</div>,
}))

const mockProgress = useAdminUserProgress as jest.MockedFunction<typeof useAdminUserProgress>
const mockWellness = useAdminUserWellness as jest.MockedFunction<typeof useAdminUserWellness>

describe('UserProgressPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockProgress.mockReturnValue({
      entries: [{ id: 'w1', weight: 70, date: '2026-01-01' }],
      summary: { current: { weight: 70 }, change: -1, count: 1 },
      loading: false,
      error: null,
      refetch: jest.fn(),
    } as any)
    mockWellness.mockReturnValue({
      entries: [],
      summary: { last: { motivation_score: 8 }, avg_sleep: 7.5, avg_motivation: 8, count: 4 },
      loading: false,
      error: null,
      refetch: jest.fn(),
    } as any)
  })

  it('keeps weight and wellness sections and adds measurements for the same user', async () => {
    const user = userEvent.setup()
    render(<UserProgressPanel userId="88" />)

    expect(screen.getByText('Peso')).toBeInTheDocument()
    expect(screen.getByText('Medidas')).toBeInTheDocument()
    expect(screen.getByText('Bienestar')).toBeInTheDocument()
    expect(screen.getByText(/70 kg/)).toBeInTheDocument()
    expect(screen.getByText(/historial-peso-88/)).toBeInTheDocument()
    expect(screen.queryByText(/historial-peso-99/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Medidas' }))
    expect(screen.getByText(/medidas-88/)).toBeInTheDocument()
    expect(screen.queryByText(/medidas-99/)).not.toBeInTheDocument()
    expect(screen.getByText(/70 kg/)).toBeInTheDocument()
  })
})
