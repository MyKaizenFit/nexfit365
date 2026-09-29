import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from '@/hooks/use-toast'
import { WorkoutProgramEditor } from '../workout-program-editor'

jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}))

jest.mock('@/lib/api', () => ({
  buildApiUrl: (path: string) => path,
  getAuthHeaders: async () => ({ Authorization: 'Bearer test' }),
}))

const PROGRAM_ID = '972bd29c-eb3d-48e8-bfb7-f71276937fb4'

type DayFixture = {
  day_number: number
  name: string
  exerciseName?: string
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }
}

function day(dayNumber: number, name: string, exerciseName = 'Sentadilla'): DayFixture {
  return { day_number: dayNumber, name, exerciseName }
}

function programBody(
  week: number,
  days: DayFixture[],
  durationWeeks: number,
  startDate: string,
  currentWeek: number,
) {
  return {
    user_id: 21,
    current_week: currentWeek,
    program: {
      id: PROGRAM_ID,
      name: 'Plan test',
      description: '',
      difficulty: 'beginner',
      goal: 'general_fitness',
      days_per_week: 2,
      duration_weeks: durationWeeks,
      start_date: startDate,
      is_active: true,
      loaded_week: week,
      current_week: currentWeek,
      days: days.map((item) => ({
        id: `day-${item.day_number}`,
        day_number: item.day_number,
        name: item.name,
        is_rest_day: false,
        exercises: [{
          id: `ex-${item.day_number}`,
          exercise_id: 'ex-1',
          name: item.exerciseName || 'Sentadilla',
          sets: 3,
          reps: '10',
        }],
      })),
    },
    reference_program: null,
    summary: { current_week: currentWeek, loaded_week: week },
  }
}

function installFetch(options: {
  durationWeeks: number
  startDate: string
  daysByWeek: Record<number, DayFixture[]>
  currentWeek?: number
  referenceProgram?: {
    name: string
    days: Array<{ day_number: number; name: string; exerciseName: string }>
  } | null
}) {
  const currentWeek = options.currentWeek ?? 1
  const requests: { url: string; method: string }[] = []
  global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = (init?.method || 'GET').toUpperCase()
    requests.push({ url, method })
    if (url.includes('workout-logs')) {
      return jsonResponse({ logs: [] })
    }
    if (method === 'PATCH') {
      return jsonResponse({ id: PROGRAM_ID, days: [] })
    }
    const weekParam = new URLSearchParams(url.split('?')[1] || '').get('week')
    const week = weekParam != null ? Number(weekParam) : currentWeek
    const days = options.daysByWeek[week] || []
    const body = programBody(week, days, options.durationWeeks, options.startDate, currentWeek)
    if (options.referenceProgram) {
      body.reference_program = {
        id: 'ref-template-id',
        name: options.referenceProgram.name,
        days: options.referenceProgram.days.map((item) => ({
          id: `ref-day-${item.day_number}`,
          day_number: item.day_number,
          name: item.name,
          is_rest_day: false,
          exercises: [{
            id: `ref-ex-${item.day_number}`,
            exercise_id: 'ref-ex',
            name: item.exerciseName,
            sets: 3,
            reps: '12',
          }],
        })),
      } as any
      ;(body as any).reference_program_source = 'assigned_template'
    }
    return jsonResponse(body)
  }) as jest.Mock
  return requests
}

function weekRequests(requests: { url: string; method: string }[], method = 'GET') {
  return requests.filter((request) => request.method === method && request.url.includes('program'))
}

function requestedWeeks(requests: { url: string; method: string }[], method = 'GET') {
  return weekRequests(requests, method).map((request) => new URLSearchParams(request.url.split('?')[1] || '').get('week'))
}

function hasFullMacrocycleRequest(requests: { url: string; method: string }[]) {
  return requests.some((request) => {
    const isProgramDetail = /admin\/workouts\/programs\/[0-9a-f-]{36}\/?(\?|$)/.test(request.url)
    return isProgramDetail && !request.url.includes('week=')
  })
}

function dayButton(dayNumber: number) {
  const matches = screen.getAllByRole('button').filter((button) => {
    return button.querySelector('span')?.textContent === String(dayNumber)
  })
  return matches.find((button) => button.className.includes('bg-white')) || matches[0]
}

async function expectWorkoutVisible(name: string) {
  await waitFor(() => {
    expect(screen.getAllByText(new RegExp(name)).length).toBeGreaterThan(0)
  })
}

// The detail panel follows today's weekday. These fixtures live on Monday,
// so select that chip instead of assuming CI runs on a Monday.
async function selectAssignedDay(user: ReturnType<typeof userEvent.setup>, dayLabel: string) {
  await user.click(await screen.findByRole('button', { name: new RegExp(dayLabel) }))
}

async function openCalendar(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Calendario' }))
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function visibleMonth() {
  const label = screen.getByText(/de 20\d{2}/i).textContent || ''
  const lower = label.toLowerCase()
  const month = MONTHS.findIndex((name) => lower.includes(name))
  const year = Number(lower.match(/20\d{2}/)?.[0])
  return new Date(year, month, 1)
}

async function showMonth(user: ReturnType<typeof userEvent.setup>, year: number, monthIndex: number) {
  const target = new Date(year, monthIndex, 1)
  const label = target.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  for (let step = 0; step < 24; step += 1) {
    if (screen.queryByText(new RegExp(`^${label}$`, 'i'))) return
    const current = visibleMonth()
    const forward = target.getTime() >= current.getTime()
    await user.click(screen.getByRole('button', { name: forward ? 'Mes siguiente' : 'Mes anterior' }))
  }
  throw new Error(`No se encontró el mes ${label}`)
}

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

describe('editor de semanas del programa de usuario', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('abre por defecto la semana actual del cliente (sin ?week=) y muestra el indicador', async () => {
    installFetch({
      durationWeeks: 12,
      startDate: '2026-08-31',
      currentWeek: 2,
      daysByWeek: {
        2: [day(8, 'Lunes W2', 'Hip thrust')],
        9: [day(57, 'Lunes W9', 'Elevación lateral')],
      },
    })

    const user = userEvent.setup()
    render(<WorkoutProgramEditor userId="21" onSave={jest.fn()} />)
    await selectAssignedDay(user, 'Lunes W2')

    await expectWorkoutVisible('Hip thrust')
    expect(screen.queryByText('Elevación lateral')).not.toBeInTheDocument()
    expect(screen.getByTestId('client-current-week-indicator')).toHaveTextContent(/Semana 2.*Actual del cliente/)

    const initialGets = (global.fetch as jest.Mock).mock.calls
      .map(([input, init]: [RequestInfo, RequestInit?]) => ({
        url: String(input),
        method: ((init?.method as string) || 'GET').toUpperCase(),
      }))
      .filter((r) => r.method === 'GET' && r.url.includes('/program'))
    expect(initialGets.some((r) => r.url.includes('users/21/program/') && !r.url.includes('week='))).toBe(true)
    expect(initialGets.some((r) => r.url.includes('week=9'))).toBe(false)
  })

  it('respeta initialWeek explícita frente a la semana actual del cliente', async () => {
    installFetch({
      durationWeeks: 12,
      startDate: '2026-08-31',
      currentWeek: 2,
      daysByWeek: {
        2: [day(8, 'Lunes W2', 'Hip thrust')],
        9: [day(57, 'Lunes W9', 'Elevación lateral')],
      },
    })

    const user = userEvent.setup()
    render(<WorkoutProgramEditor userId="21" initialWeek={9} onSave={jest.fn()} />)
    await selectAssignedDay(user, 'Lunes W9')

    await expectWorkoutVisible('Elevación lateral')
    expect(screen.getByTestId('client-current-week-indicator')).toHaveTextContent(/Editando semana 9/)
    expect(screen.getByTestId('client-current-week-indicator')).toHaveTextContent(/Actual del cliente: 2/)
  })

  it('al guardar muestra toast con la semana del PATCH y no descarga el macrociclo', async () => {
    const user = userEvent.setup()
    const requests = installFetch({
      durationWeeks: 12,
      startDate: '2026-08-31',
      currentWeek: 2,
      daysByWeek: {
        2: [day(8, 'Lunes W2', 'Hip thrust')],
      },
    })

    render(<WorkoutProgramEditor userId="21" onSave={jest.fn()} />)
    await selectAssignedDay(user, 'Lunes W2')
    await expectWorkoutVisible('Hip thrust')

    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => {
      const patches = weekRequests(requests, 'PATCH')
      expect(patches.some((request) => request.url.includes('week=2'))).toBe(true)
    })
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringMatching(/Semana 2 guardada/),
      }),
    )
    expect(hasFullMacrocycleRequest(requests)).toBe(false)
  })

  it('no pinta ejercicios de la plantilla como si fueran del programa asignado', async () => {
    installFetch({
      durationWeeks: 4,
      startDate: '2026-08-31',
      currentWeek: 1,
      daysByWeek: {
        1: [day(1, 'Lunes asignado', 'Hip thrust')],
      },
      referenceProgram: {
        name: 'Plantilla Base',
        days: [{ day_number: 1, name: 'Lunes plantilla', exerciseName: 'Elevación lateral' }],
      },
    })

    const user = userEvent.setup()
    render(<WorkoutProgramEditor userId="21" onSave={jest.fn()} />)
    await selectAssignedDay(user, 'Lunes asignado')
    await expectWorkoutVisible('Hip thrust')
    expect(screen.queryByText('Elevación lateral')).not.toBeInTheDocument()
    expect(screen.getByTestId('reference-template-badge')).toHaveTextContent(/Referencia \(plantilla\)/)
  })

  it('carga solo la semana pedida, marca vacías y al guardar conserva las semanas ya pedidas', async () => {
    const user = userEvent.setup()
    const requests = installFetch({
      durationWeeks: 8,
      startDate: '2026-08-31',
      currentWeek: 1,
      daysByWeek: {
        1: [day(1, 'Lunes W1')],
        4: [day(22, 'Lunes W4')],
        5: [day(29, 'Lunes W5')],
        6: [],
      },
    })

    render(<WorkoutProgramEditor userId="21" onSave={jest.fn()} />)

    await expectWorkoutVisible('Lunes W1')
    const initialGets = weekRequests(requests).map((request) => request.url)
    expect(initialGets.some((url) => url.includes('users/21/program/') && !url.includes('week='))).toBe(true)
    expect(initialGets.some((url) => url.includes('week=4'))).toBe(false)
    expect(hasFullMacrocycleRequest(requests)).toBe(false)

    await openCalendar(user)
    await showMonth(user, 2026, 8)
    const unloaded = dayButton(21)
    expect(unloaded).toBeTruthy()
    expect(unloaded?.textContent).toContain('…')
    expect(unloaded?.textContent).not.toContain('Sin rutina')

    const emptyLoaded = dayButton(1)
    expect(emptyLoaded?.textContent).toContain('Sin rutina')

    await user.click(unloaded!)
    await expectWorkoutVisible('Lunes W4')
    expect(weekRequests(requests).some((request) => request.url.includes('week=4'))).toBe(true)
    expect(hasFullMacrocycleRequest(requests)).toBe(false)

    const week5 = dayButton(28)
    await user.click(week5!)
    await expectWorkoutVisible('Lunes W5')
    expect(weekRequests(requests).some((request) => request.url.includes('week=5'))).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => {
      const patches = weekRequests(requests, 'PATCH')
      expect(patches.some((request) => request.url.includes('week=5'))).toBe(true)
    })
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringMatching(/Semana 5 guardada/),
      }),
    )
    const getsAfterSave = weekRequests(requests).map((request) => request.url)
    expect(getsAfterSave.filter((url) => url.includes('week=5')).length).toBeGreaterThanOrEqual(2)
    expect(hasFullMacrocycleRequest(requests)).toBe(false)

    await showMonth(user, 2026, 7)
    expect(dayButton(31)?.textContent).toContain('Lunes W1')
    await showMonth(user, 2026, 8)
    expect(dayButton(21)?.textContent).toContain('Lunes W4')
    expect(dayButton(28)?.textContent).toContain('Lunes W5')

    const week6 = await (async () => {
      await showMonth(user, 2026, 9)
      return dayButton(5)
    })()
    expect(week6?.textContent).not.toContain('Sin rutina')
    await user.click(week6!)
    await waitFor(() => {
      expect(dayButton(5)?.textContent).toContain('Sin rutina')
    })
    expect(weekRequests(requests).some((request) => request.url.includes('week=6'))).toBe(true)
    expect(hasFullMacrocycleRequest(requests)).toBe(false)
  }, 30000)

  it('un plan de 52 semanas solo descarga las semanas que se visitan en el calendario', async () => {
    const user = userEvent.setup()
    const requests = installFetch({
      durationWeeks: 52,
      startDate: '2026-09-21',
      currentWeek: 1,
      daysByWeek: {
        1: [day(1, 'Anual W1')],
        20: [day(134, 'Anual W20')],
        52: [day(358, 'Anual W52')],
      },
    })

    render(<WorkoutProgramEditor userId="21" onSave={jest.fn()} />)
    await expectWorkoutVisible('Anual W1')
    await openCalendar(user)

    const week20Monday = new Date(2026, 8, 21)
    week20Monday.setDate(week20Monday.getDate() + 19 * 7)
    await showMonth(user, week20Monday.getFullYear(), week20Monday.getMonth())
    await user.click(dayButton(week20Monday.getDate())!)
    await expectWorkoutVisible('Anual W20')

    const week52Monday = new Date(2026, 8, 21)
    week52Monday.setDate(week52Monday.getDate() + 51 * 7)
    await showMonth(user, week52Monday.getFullYear(), week52Monday.getMonth())
    await user.click(dayButton(week52Monday.getDate())!)
    await expectWorkoutVisible('Anual W52')

    const weeks = requestedWeeks(requests)
    expect(weeks).toEqual([null, '20', '52'])
    expect(hasFullMacrocycleRequest(requests)).toBe(false)
  }, 30000)

  it('ignora una respuesta merge de otra semana si el admin ya cambió de semana', async () => {
    let resolveWeek3: (value: unknown) => void = () => {}
    const slowWeek3 = new Promise<unknown>((resolve) => {
      resolveWeek3 = resolve
    })

    const requests: { url: string; method: string }[] = []
    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = (init?.method || 'GET').toUpperCase()
      requests.push({ url, method })
      if (url.includes('workout-logs')) return jsonResponse({ logs: [] })
      if (method === 'PATCH') return jsonResponse({ id: PROGRAM_ID, days: [] })

      const weekParam = new URLSearchParams(url.split('?')[1] || '').get('week')
      const week = weekParam != null ? Number(weekParam) : 2
      if (week === 3) {
        await slowWeek3
        return jsonResponse(programBody(3, [day(15, 'Lunes W3', 'Press banca')], 8, '2026-08-31', 2))
      }
      if (week === 2) {
        return jsonResponse(programBody(2, [day(8, 'Lunes W2', 'Hip thrust')], 8, '2026-08-31', 2))
      }
      return jsonResponse(programBody(week, [day((week - 1) * 7 + 1, `Lunes W${week}`)], 8, '2026-08-31', 2))
    }) as jest.Mock

    const user = userEvent.setup()
    render(<WorkoutProgramEditor userId="21" onSave={jest.fn()} />)
    await selectAssignedDay(user, 'Lunes W2')
    await expectWorkoutVisible('Hip thrust')

    // Navegar a semana 3 (fetch lento) y luego volver a 2 antes de que responda.
    await user.click(screen.getByRole('button', { name: 'Semana siguiente' }))
    expect(requests.some((r) => r.url.includes('week=3'))).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Semana anterior' }))

    resolveWeek3(true)

    await waitFor(() => {
      expect(screen.getAllByText(/Hip thrust/).length).toBeGreaterThan(0)
    })
    // La respuesta tardía de semana 3 no debe pisar la semana 2 seleccionada.
    expect(screen.queryByText('Press banca')).not.toBeInTheDocument()
    expect(screen.getByTestId('client-current-week-indicator')).toHaveTextContent(/Semana 2/)
  })
})
