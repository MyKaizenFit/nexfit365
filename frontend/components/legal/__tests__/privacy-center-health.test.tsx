import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PrivacyCenter } from '../privacy-center'
import { getLegalStatus, recordLegalEvent } from '@/lib/legal-service'

jest.mock('@/lib/legal-service', () => ({
  getLegalStatus: jest.fn(),
  recordLegalEvent: jest.fn(),
}))

jest.mock('@/lib/api', () => ({
  buildApiUrl: (path: string) => `/api/${path}`,
  getAuthHeaders: () => ({ Accept: 'application/json' }),
  handleApiResponse: jest.fn(async () => ({ data: { notification_preferences: {} }, error: null })),
}))

const mockedStatus = getLegalStatus as jest.Mock
const mockedRecord = recordLegalEvent as jest.Mock

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch
  mockedRecord.mockReset()
  mockedStatus.mockResolvedValue({
    locale: 'es-ES',
    pending: [],
    accepted: [],
    optional_consents: [],
    health: {
      enforcement_active: true,
      document: { code: 'health_notice', version: 'h1', title: 'Aviso' },
      groups: [
        {
          id: 'core',
          purposes: ['health_profile', 'nutrition', 'workouts'],
          items: [
            { purpose: 'health_profile', state: 'not_granted', version: null, changed_at: null },
            { purpose: 'nutrition', state: 'not_granted', version: null, changed_at: null },
            { purpose: 'workouts', state: 'not_granted', version: null, changed_at: null },
          ],
        },
      ],
    },
  })
})

it('does not preselect health consent and does not grant without the checkbox', async () => {
  render(<PrivacyCenter />)
  const checkbox = await screen.findByRole('checkbox', { name: /quiero conceder este uso/i })
  expect(checkbox).not.toBeChecked()
  await userEvent.click(screen.getByRole('button', { name: 'Conceder' }))
  expect(screen.getByText(/no se concede sola/i)).toBeInTheDocument()
  expect(mockedRecord).not.toHaveBeenCalled()
})
