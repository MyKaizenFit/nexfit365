import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }
}

function day(dayNumber: number, name: string): DayFixture {
  return { day_number: dayNumber, name }
}

function programBody(week: number, days: DayFixture[], durationWeeks: number, startDate: string) {
  return {
    user_id: 21,
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
      days: days.map((item) => ({
        id: `day-${item.day_number}`,
        day_number: item.day_number,
        name: item.name,
        is_rest_day: false,
        exercises: [{ id: `ex-${item.day_number}`, exercise_id: 'ex-1', name: 'Sentadilla', sets: 3, reps: '10' }],
      })),
    },
    reference_program: null,
  }
}

function installFetch(options: {
  durationWeeks: number
  startDate: string
  daysByWeek: Record<number, DayFixture[]>
}) {
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
    const week = Number(new URLSearchParams(url.split('?')[1] || '').get('week') || '1')
    const days = options.daysByWeek[week] || []
    return jsonResponse(programBody(week, days, options.durationWeeks, options.startDate))
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

  it('carga solo la semana 1, distingue no cargada de vacía, y al guardar conserva las semanas ya pedidas', async () => {
    const user = userEvent.setup()
    const requests = installFetch({
      durationWeeks: 8,
      startDate: '2026-08-31',
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
    expect(initialGets.some((url) => url.includes('week=1'))).toBe(true)
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
    expect(weeks).toEqual(['1', '20', '52'])
    expect(hasFullMacrocycleRequest(requests)).toBe(false)
  }, 30000)
})
