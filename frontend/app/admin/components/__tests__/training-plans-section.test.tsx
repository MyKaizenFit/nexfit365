import { useEffect, useState, type ReactNode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkoutPlanManagement } from '../workout-plan-management'
import { TrainingPlansErrorBoundary } from '../training-plans-error-boundary'
import { buildAdminSectionErrorReport } from '@/lib/admin-section-error'

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    getAuthHeaders: async () => ({ Authorization: 'Bearer test' }),
    user: { role: 'trainer', is_staff: true, email: 'trainer@example.invalid' },
    isAuthenticated: true,
    isLoading: false,
  }),
}))

const plans = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Plantilla normal',
    description: 'Descripción',
    difficulty: 'beginner',
    goal: 'general_fitness',
    location: 'gym',
    duration_weeks: 4,
    days_per_week: 3,
    is_template: true,
    is_system: false,
    is_active: true,
    user: null,
    created_by: null,
    user_email: null,
    created_by_email: null,
    days_count: 7,
    training_days: 3,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
  },
]

let programsStatus = 200

jest.mock('@/lib/api', () => ({
  buildApiUrl: (path: string) => path,
  authenticatedFetch: jest.fn(async (url: string) => {
    const target = String(url)
    if (target.includes('admin/users')) {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ results: [{ id: '9', email: 'member@example.invalid' }] }),
      }
    }
    if (target.includes('programs')) {
      if (programsStatus !== 200) {
        return { ok: false, status: programsStatus, statusText: 'Server Error', json: async () => ({}) }
      }
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ results: plans, count: plans.length }),
      }
    }
    return { ok: true, status: 200, statusText: 'OK', json: async () => ({ results: [], count: 0 }) }
  }),
}))

function Panel({
  children,
  onLeave = () => {},
}: {
  children: ReactNode
  onLeave?: () => void
}) {
  return (
    <div>
      <h1>Panel Admin</h1>
      <TrainingPlansErrorBoundary onLeave={onLeave}>{children}</TrainingPlansErrorBoundary>
    </div>
  )
}

function NestedBomb(): ReactNode {
  throw new Error('nested child boom')
}

function ParentOfBomb() {
  return (
    <div>
      <NestedBomb />
    </div>
  )
}

function FlakyPlans({ requests }: { requests: { count: number } }) {
  const [boom, setBoom] = useState(false)
  useEffect(() => {
    requests.count += 1
  }, [requests])
  if (boom) throw new Error('render boom')
  return <button type="button" onClick={() => setBoom(true)}>romper seccion</button>
}

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  })
  window.HTMLElement.prototype.hasPointerCapture = () => false
  window.HTMLElement.prototype.releasePointerCapture = () => {}
  window.HTMLElement.prototype.scrollIntoView = () => {}
})

beforeEach(() => {
  programsStatus = 200
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ results: [], next: null }),
  })) as unknown as typeof fetch
})

describe('Planes de entrenamiento error boundary', () => {
  it('renders WorkoutPlanManagement inside the admin shell', async () => {
    render(
      <Panel>
        <WorkoutPlanManagement />
      </Panel>,
    )

    expect(screen.getByRole('heading', { name: 'Panel Admin' })).toBeInTheDocument()
    expect(await screen.findAllByText('Plantilla normal')).not.toHaveLength(0)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps the admin shell mounted when the section throws', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <Panel>
        <ParentOfBomb />
      </Panel>,
    )

    expect(screen.getByRole('heading', { name: 'Panel Admin' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('No se ha podido cargar Planes de entrenamiento.')
    expect(screen.queryByText('nested child boom')).not.toBeInTheDocument()
  })

  it('retries by remounting the section and running its requests again', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    const requests = { count: 0 }
    render(
      <Panel>
        <FlakyPlans requests={requests} />
      </Panel>,
    )

    expect(requests.count).toBe(1)
    await user.click(screen.getByRole('button', { name: 'romper seccion' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'romper seccion' })).toBeInTheDocument()
    expect(requests.count).toBe(2)
    expect(screen.getByRole('heading', { name: 'Panel Admin' })).toBeInTheDocument()
  })

  it('returns to the panel home without unmounting the admin shell', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    function AdminPage() {
      const [section, setSection] = useState<'plans' | 'home'>('plans')
      return (
        <div>
          <h1>Panel Admin</h1>
          {section === 'home' ? (
            <h2>Dashboard admin</h2>
          ) : (
            <TrainingPlansErrorBoundary onLeave={() => setSection('home')}>
              <ParentOfBomb />
            </TrainingPlansErrorBoundary>
          )}
        </div>
      )
    }

    render(<AdminPage />)
    await user.click(screen.getByRole('button', { name: 'Volver al inicio del panel' }))

    expect(screen.getByRole('heading', { name: 'Dashboard admin' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Panel Admin' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the existing API error UI and does not open the boundary', async () => {
    programsStatus = 500
    render(
      <Panel>
        <WorkoutPlanManagement />
      </Panel>,
    )

    expect(await screen.findByText(/Error 500/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Panel Admin' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByText('No se ha podido cargar Planes de entrenamiento.')).not.toBeInTheDocument()
    })
  })

  it('captures a nested child exception and classifies chunk load failures', () => {
    const error = new Error('Loading chunk 12 failed Bearer secret-token')
    error.name = 'ChunkLoadError'
    const report = buildAdminSectionErrorReport({
      error,
      componentStack: '\n    at WorkoutPlanManagement',
      section: 'workout-plans',
      pathname: '/nexfit/admin/',
      now: new Date('2026-09-24T15:36:00.000Z'),
    })

    expect(report.kind).toBe('chunk_load')
    expect(report.section).toBe('workout-plans')
    expect(report.pathname).toBe('/nexfit/admin/')
    expect(report.timestamp).toBe('2026-09-24T15:36:00.000Z')
    expect(report.message).not.toMatch(/secret-token|Bearer/i)
    expect(report.componentStack).toContain('WorkoutPlanManagement')

    jest.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <Panel>
        <NestedBomb />
      </Panel>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Panel Admin' })).toBeInTheDocument()
  })
})
