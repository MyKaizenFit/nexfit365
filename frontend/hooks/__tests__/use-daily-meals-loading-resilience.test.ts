import { act, renderHook, waitFor } from '@testing-library/react'
import { useDailyMeals } from '../use-daily-meals'
import { useAuth } from '@/contexts/auth-context'
import { nutritionService, MealOption } from '@/lib/nutrition-service'
import { todayLocalDate } from '@/lib/local-date'
import { getMealSelectionsStorageKey } from '@/lib/user-local-storage'
import {
  buildMealCacheKey,
  clearMealSessionCache,
  dedupeMealSelectionGet,
  getMealSessionSnapshot,
} from '@/lib/meal-session-cache'

jest.mock('@/contexts/auth-context', () => ({
  useAuth: jest.fn(),
}))

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const USER_A = 1
const USER_B = 2
const SLOT_ID = 'slot-breakfast'

jest.mock('@/hooks/use-nutrition', () => ({
  useNutrition: () => ({
    currentPlan: {
      id: (global as unknown as { __mealPlanId: string }).__mealPlanId || 'plan-test',
      daily_calories: 2000,
      target_macros: { protein: 150, carbs: 220, fat: 80 },
    },
  }),
}))

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api')
  return {
    ...actual,
    getAuthHeaders: jest.fn(async () => ({})),
    authenticatedFetch: async (url: string, options: RequestInit = {}) => {
      const resolved = String(url).startsWith('http') ? url : actual.buildApiUrl(url)
      const first = await fetch(resolved, { ...options, credentials: 'include' })
      if (first.status !== 401) return first
      const refresh = await (global as unknown as { __mealRefresh: () => Promise<{ success: boolean; error?: string }> }).__mealRefresh()
      if (!refresh?.success) {
        throw new Error(refresh?.error || 'Token expirado. Por favor, cierra sesión e inicia de nuevo.')
      }
      const retry = await fetch(resolved, { ...options, credentials: 'include' })
      if (retry.status === 401) {
        throw new Error('Token expirado. Por favor, cierra sesión e inicia de nuevo.')
      }
      return retry
    },
  }
})

const mockRefreshAccessToken = jest.fn(async (): Promise<{ success: boolean; error?: string }> => ({ success: true }))

const optionA: MealOption = {
  id: 'recipe-a',
  recipeId: 'rec-a',
  name: 'Plato A',
  calories: 400,
  protein: 30,
  carbs: 40,
  fat: 10,
  category: 'balanced',
  icon: '🥗',
  description: '',
}

const optionB: MealOption = {
  id: 'recipe-b',
  recipeId: 'rec-b',
  name: 'Plato B',
  calories: 500,
  protein: 35,
  carbs: 45,
  fat: 12,
  category: 'balanced',
  icon: '🍗',
  description: '',
}

const planPayload = {
  source: 'user_plan',
  meal_slots: [
    {
      id: SLOT_ID,
      name: 'Desayuno',
      meal_type: 'breakfast',
      time: '08:00',
      order_index: 1,
    },
  ],
  meals_by_type: { breakfast: [optionA, optionB] },
  options_by_meal_id: { [SLOT_ID]: [optionA, optionB] },
  daily_calories_target: 2000,
  daily_macros: { protein: 150, carbs: 220, fat: 80 },
}

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as Response
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function serverSelectionPayload(option: MealOption, completed = false) {
  return {
    selections: [
      {
        id: 'log-1',
        meal_type: 'breakfast',
        plan_meal_id: SLOT_ID,
        recipe: { id: option.recipeId, name: option.name },
        recipe_name: option.name,
        calories: option.calories,
        protein: option.protein,
        carbs: option.carbs,
        fat: option.fat,
        completed,
        is_skipped: false,
      },
    ],
  }
}

function countSelectionGets() {
  return (global.fetch as jest.Mock).mock.calls.filter((call) => {
    const url = String(call[0])
    const method = String(call[1]?.method || 'GET').toUpperCase()
    return url.includes('daily-meal-selections') && method === 'GET'
  }).length
}

function cachedSelectionName(planId: string) {
  const key = buildMealCacheKey(USER_A, todayLocalDate(), planId)
  if (!key) return undefined
  const option = getMealSessionSnapshot(key)?.meals[0]?.selectedOption as { name?: string } | null | undefined
  return option?.name
}

function storedSelectionName() {
  const raw = localStorage.getItem(getMealSelectionsStorageKey(USER_A, todayLocalDate()))
  if (!raw) return null
  const parsed = JSON.parse(raw) as Record<string, { option?: { name?: string } }>
  return parsed[SLOT_ID]?.option?.name ?? null
}

describe('useDailyMeals loading resilience', () => {
  let getSelections: () => Promise<Response> | Response
  let pendingWrites: Array<{ complete: (response?: Response) => void; body: Record<string, unknown> | null }>

  beforeEach(() => {
    clearMealSessionCache()
    pendingWrites = []
    ;(global as unknown as { __mealPlanId: string }).__mealPlanId = 'plan-test'
    mockRefreshAccessToken.mockResolvedValue({ success: true })
    ;(global as unknown as { __mealRefresh: typeof mockRefreshAccessToken }).__mealRefresh = mockRefreshAccessToken
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { id: USER_A } } as never)
    localStorage.clear()
    getSelections = () => jsonResponse(serverSelectionPayload(optionA))
    jest.spyOn(nutritionService, 'getPlanMealsForSelection').mockResolvedValue(planPayload as any)

    global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = (init?.method || 'GET').toUpperCase()
      if (url.includes('daily-meal-selections')) {
        if (method === 'GET') {
          return Promise.resolve(getSelections())
        }
        if (method === 'POST' || method === 'DELETE') {
          const body = init?.body instanceof FormData
            ? { photo: true }
            : JSON.parse(String(init?.body || '{}'))
          return new Promise((resolve) => {
            pendingWrites.push({
              body,
              complete: (response) => resolve(response || jsonResponse({ id: 'log-1', ...body })),
            })
          })
        }
      }
      return Promise.resolve(jsonResponse({}))
    }) as typeof fetch
  })

  afterEach(() => {
    jest.restoreAllMocks()
    clearMealSessionCache()
  })

  async function mountReady() {
    const hook = renderHook(() => useDailyMeals())
    await waitFor(() => {
      expect(hook.result.current.loading).toBe(false)
    })
    return hook
  }

  it('ONE_LOAD fetches daily selections once', async () => {
    await mountReady()
    expect(countSelectionGets()).toBe(1)
  })

  it('CACHE_HIT_IMMEDIATE and UNMOUNT_REMOUNT show meals without waiting for the next GET', async () => {
    const first = await mountReady()
    expect(first.result.current.meals[0].selectedOption?.name).toBe('Plato A')
    first.unmount()

    const pending = deferred<Response>()
    getSelections = () => pending.promise
    const second = renderHook(() => useDailyMeals())
    expect(second.result.current.loading).toBe(false)
    expect(second.result.current.meals[0].selectedOption?.name).toBe('Plato A')

    await act(async () => {
      pending.resolve(jsonResponse(serverSelectionPayload(optionA)))
    })
  })

  it('CACHE_REVALIDATE replaces the snapshot when the server returns a newer selection', async () => {
    const first = await mountReady()
    first.unmount()

    const pending = deferred<Response>()
    getSelections = () => pending.promise
    const second = renderHook(() => useDailyMeals())
    expect(second.result.current.meals[0].selectedOption?.name).toBe('Plato A')

    await act(async () => {
      pending.resolve(jsonResponse(serverSelectionPayload(optionB)))
    })
    await waitFor(() => {
      expect(second.result.current.meals[0].selectedOption?.name).toBe('Plato B')
    })
  })

  it('SERVER_EMPTY_CLEARS_CACHE so a later remount stays empty', async () => {
    const first = await mountReady()
    first.unmount()
    getSelections = () => jsonResponse({ selections: [] })

    const second = renderHook(() => useDailyMeals())
    await waitFor(() => {
      expect(second.result.current.meals[0].selectedOption).toBeNull()
    })
    second.unmount()

    const pending = deferred<Response>()
    getSelections = () => pending.promise
    const third = renderHook(() => useDailyMeals())
    expect(third.result.current.meals[0].selectedOption).toBeNull()
    await act(async () => {
      pending.resolve(jsonResponse({ selections: [] }))
    })
  })

  it('NETWORK_FAILURE_KEEPS_CACHE instead of emptying the UI', async () => {
    const first = await mountReady()
    first.unmount()
    getSelections = () => Promise.reject(new Error('network down'))

    const second = renderHook(() => useDailyMeals())
    await waitFor(() => {
      expect(second.result.current.loading).toBe(false)
    })
    expect(second.result.current.meals[0].selectedOption?.name).toBe('Plato A')
    expect(second.result.current.syncError).toBeNull()
  })

  it('USER_ISOLATION does not show user A meals to user B', async () => {
    await mountReady()
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { id: USER_B } } as never)
    getSelections = () => jsonResponse({ selections: [] })
    const hookB = await mountReady()
    expect(hookB.result.current.meals[0].selectedOption).toBeNull()
  })

  it('PLAN_ISOLATION does not reuse another plan snapshot', async () => {
    await mountReady()
    ;(global as unknown as { __mealPlanId: string }).__mealPlanId = 'plan-other'
    getSelections = () => jsonResponse({ selections: [] })
    const other = await mountReady()
    expect(other.result.current.meals[0].selectedOption).toBeNull()
    expect(cachedSelectionName('plan-test')).toBe('Plato A')
    expect(cachedSelectionName('plan-other')).toBeUndefined()
  })

  it('STALE_GET_AFTER_SELECT keeps B', async () => {
    const pending = deferred<Response>()
    getSelections = () => pending.promise
    const hook = renderHook(() => useDailyMeals())
    await waitFor(() => {
      expect(nutritionService.getPlanMealsForSelection).toHaveBeenCalled()
    })

    await act(async () => {
      pending.resolve(jsonResponse(serverSelectionPayload(optionA)))
    })
    await waitFor(() => {
      expect(hook.result.current.loading).toBe(false)
    })

    const stale = deferred<Response>()
    getSelections = () => stale.promise
    await act(async () => {
      void hook.result.current.refreshData()
    })
    await act(async () => {
      await hook.result.current.selectMealOption(SLOT_ID, optionB)
    })
    expect(hook.result.current.meals[0].selectedOption?.name).toBe('Plato B')

    await act(async () => {
      stale.resolve(jsonResponse(serverSelectionPayload(optionA)))
    })
    await waitFor(() => {
      expect(hook.result.current.meals[0].selectedOption?.name).toBe('Plato B')
    })
  })

  it('STALE_GET_AFTER_DESELECT does not resurrect A', async () => {
    const hook = await mountReady()
    const stale = deferred<Response>()
    getSelections = () => stale.promise
    await act(async () => {
      void hook.result.current.refreshData()
    })
    await act(async () => {
      await hook.result.current.deselectMealOption(SLOT_ID)
    })
    expect(hook.result.current.meals[0].selectedOption).toBeNull()

    await act(async () => {
      stale.resolve(jsonResponse(serverSelectionPayload(optionA)))
    })
    await waitFor(() => {
      expect(hook.result.current.meals[0].selectedOption).toBeNull()
    })
    const cacheKey = buildMealCacheKey(USER_A, todayLocalDate(), 'plan-test')
    expect(getMealSessionSnapshot(cacheKey!)?.meals[0]?.selectedOption).toBeNull()
    expect(storedSelectionName()).toBeNull()
  })

  it('STALE_GET_AFTER_COMPLETE keeps completed=true', async () => {
    const hook = await mountReady()
    const stale = deferred<Response>()
    getSelections = () => stale.promise
    await act(async () => {
      void hook.result.current.refreshData()
    })
    await act(async () => {
      await hook.result.current.markMealCompleted(SLOT_ID)
    })
    expect(hook.result.current.meals[0].isCompleted).toBe(true)
    expect(hook.result.current.macros.caloriesConsumed).toBe(400)

    await act(async () => {
      stale.resolve(jsonResponse(serverSelectionPayload(optionA, false)))
    })
    await waitFor(() => {
      expect(hook.result.current.meals[0].isCompleted).toBe(true)
      expect(hook.result.current.macros.caloriesConsumed).toBe(400)
    })
  })

  it('MUTATION_UPDATES_CACHE so remount shows the optimistic selection', async () => {
    const hook = await mountReady()
    await act(async () => {
      await hook.result.current.selectMealOption(SLOT_ID, optionB)
    })
    hook.unmount()

    const pending = deferred<Response>()
    getSelections = () => pending.promise
    const remounted = renderHook(() => useDailyMeals())
    expect(remounted.result.current.meals[0].selectedOption?.name).toBe('Plato B')
    await act(async () => {
      pending.resolve(jsonResponse(serverSelectionPayload(optionB)))
    })
  })

  it('LOAD_401 refreshes and then loads the selection', async () => {
    let getCount = 0
    getSelections = () => {
      getCount += 1
      if (getCount === 1) return jsonResponse({ detail: 'Unauthorized' }, 401)
      return jsonResponse(serverSelectionPayload(optionB))
    }
    const hook = await mountReady()
    expect(hook.result.current.meals[0].selectedOption?.name).toBe('Plato B')
    expect(mockRefreshAccessToken).toHaveBeenCalled()
  })

  it('STALE_EMPTY_AFTER_SELECT keeps B in UI, memory cache and local snapshot', async () => {
    const hook = await mountReady()
    const stale = deferred<Response>()
    getSelections = () => stale.promise
    await act(async () => {
      void hook.result.current.refreshData()
    })
    await act(async () => {
      await hook.result.current.selectMealOption(SLOT_ID, optionB)
    })
    expect(hook.result.current.meals[0].selectedOption?.name).toBe('Plato B')

    await act(async () => {
      stale.resolve(jsonResponse({ selections: [] }))
    })
    await waitFor(() => {
      expect(hook.result.current.meals[0].selectedOption?.name).toBe('Plato B')
    })
    expect(cachedSelectionName('plan-test')).toBe('Plato B')
    expect(storedSelectionName()).toBe('Plato B')

    await act(async () => {
      pendingWrites[0].complete()
    })
    await waitFor(() => {
      expect(hook.result.current.syncError).toBeNull()
    })
    expect(pendingWrites[0].body?.recipe_id).toBe('rec-b')
  })

  it('STALE_EMPTY_AFTER_COMPLETE keeps the completed meal', async () => {
    const hook = await mountReady()
    const stale = deferred<Response>()
    getSelections = () => stale.promise
    await act(async () => {
      void hook.result.current.refreshData()
    })
    await act(async () => {
      await hook.result.current.markMealCompleted(SLOT_ID)
    })
    expect(hook.result.current.meals[0].isCompleted).toBe(true)

    await act(async () => {
      stale.resolve(jsonResponse({ selections: [] }))
    })
    await waitFor(() => {
      expect(hook.result.current.meals[0].selectedOption?.name).toBe('Plato A')
      expect(hook.result.current.meals[0].isCompleted).toBe(true)
    })
    const cacheKey = buildMealCacheKey(USER_A, todayLocalDate(), 'plan-test')
    expect(getMealSessionSnapshot(cacheKey!)?.meals[0]?.isCompleted).toBe(true)
  })

  it('IN_FLIGHT_PLAN_SWITCH does not reuse another plan GET', async () => {
    const pendingA = deferred<Response>()
    const pendingB = deferred<Response>()
    let getIndex = 0
    getSelections = () => {
      getIndex += 1
      return getIndex === 1 ? pendingA.promise : pendingB.promise
    }
    jest.spyOn(nutritionService, 'getPlanMealsForSelection').mockImplementation(async () => {
      const id = (global as unknown as { __mealPlanId: string }).__mealPlanId
      if (id === 'plan-b') {
        return {
          ...planPayload,
          meal_slots: [{ ...planPayload.meal_slots[0], id: 'slot-b', name: 'Desayuno B' }],
          meals_by_type: { breakfast: [optionB] },
          options_by_meal_id: { 'slot-b': [optionB] },
        } as any
      }
      return {
        ...planPayload,
        meal_slots: [{ ...planPayload.meal_slots[0], id: 'slot-a', name: 'Desayuno A' }],
        meals_by_type: { breakfast: [optionA] },
        options_by_meal_id: { 'slot-a': [optionA] },
      } as any
    })

    ;(global as unknown as { __mealPlanId: string }).__mealPlanId = 'plan-a'
    const hook = renderHook(() => useDailyMeals())
    await waitFor(() => {
      expect(countSelectionGets()).toBe(1)
    })

    ;(global as unknown as { __mealPlanId: string }).__mealPlanId = 'plan-b'
    hook.rerender()
    await waitFor(() => {
      expect(countSelectionGets()).toBe(2)
    })

    await act(async () => {
      pendingA.resolve(jsonResponse(serverSelectionPayload(optionA)))
    })
    await act(async () => {
      pendingB.resolve(jsonResponse({
        selections: [{
          ...serverSelectionPayload(optionB).selections[0],
          plan_meal_id: 'slot-b',
        }],
      }))
    })
    await waitFor(() => {
      expect(hook.result.current.loading).toBe(false)
      expect(hook.result.current.meals[0].name).toBe('Desayuno B')
      expect(hook.result.current.meals[0].selectedOption?.name).toBe('Plato B')
    })

    const date = todayLocalDate()
    expect(getMealSessionSnapshot(buildMealCacheKey(USER_A, date, 'plan-b')!)?.meals[0]?.name).toBe('Desayuno B')
    const cacheA = getMealSessionSnapshot(buildMealCacheKey(USER_A, date, 'plan-a')!)
    expect(cacheA?.meals[0]?.name === 'Desayuno B').toBe(false)
  })

  it('PLAN_A_LATE_AFTER_B does not overwrite plan B', async () => {
    const pendingA = deferred<Response>()
    const pendingB = deferred<Response>()
    let getIndex = 0
    getSelections = () => {
      getIndex += 1
      return getIndex === 1 ? pendingA.promise : pendingB.promise
    }
    jest.spyOn(nutritionService, 'getPlanMealsForSelection').mockImplementation(async () => {
      const id = (global as unknown as { __mealPlanId: string }).__mealPlanId
      if (id === 'plan-b') {
        return {
          ...planPayload,
          meal_slots: [{ ...planPayload.meal_slots[0], id: 'slot-b', name: 'Desayuno B' }],
          meals_by_type: { breakfast: [optionB] },
          options_by_meal_id: { 'slot-b': [optionB] },
        } as any
      }
      return {
        ...planPayload,
        meal_slots: [{ ...planPayload.meal_slots[0], id: 'slot-a', name: 'Desayuno A' }],
        meals_by_type: { breakfast: [optionA] },
        options_by_meal_id: { 'slot-a': [optionA] },
      } as any
    })

    ;(global as unknown as { __mealPlanId: string }).__mealPlanId = 'plan-a'
    const hook = renderHook(() => useDailyMeals())
    await waitFor(() => {
      expect(countSelectionGets()).toBe(1)
    })
    ;(global as unknown as { __mealPlanId: string }).__mealPlanId = 'plan-b'
    hook.rerender()
    await waitFor(() => {
      expect(countSelectionGets()).toBe(2)
    })

    await act(async () => {
      pendingB.resolve(jsonResponse({
        selections: [{
          ...serverSelectionPayload(optionB).selections[0],
          plan_meal_id: 'slot-b',
        }],
      }))
    })
    await waitFor(() => {
      expect(hook.result.current.meals[0].name).toBe('Desayuno B')
    })

    await act(async () => {
      pendingA.resolve(jsonResponse(serverSelectionPayload(optionA)))
    })
    await waitFor(() => {
      expect(hook.result.current.meals[0].name).toBe('Desayuno B')
      expect(hook.result.current.meals[0].selectedOption?.name).toBe('Plato B')
    })
  })

  it('IN_FLIGHT_DEDUP reuses the same GET promise', async () => {
    const pending = deferred<Response>()
    getSelections = () => pending.promise
    const a = renderHook(() => useDailyMeals())
    const b = renderHook(() => useDailyMeals())
    await waitFor(() => {
      expect(countSelectionGets()).toBe(1)
    })
    await act(async () => {
      pending.resolve(jsonResponse(serverSelectionPayload(optionA)))
    })
    await waitFor(() => {
      expect(a.result.current.loading).toBe(false)
      expect(b.result.current.loading).toBe(false)
    })
    expect(a.result.current.meals[0].selectedOption?.name).toBe('Plato A')
    expect(b.result.current.meals[0].selectedOption?.name).toBe('Plato A')
  })
})

describe('meal session cache keys', () => {
  afterEach(() => {
    clearMealSessionCache()
  })

  it('requires user, date and plan', () => {
    expect(buildMealCacheKey(1, '2026-09-13', 'plan-test')).toBe('1:2026-09-13:plan-test')
    expect(buildMealCacheKey(null, '2026-09-13', 'plan-test')).toBeNull()
    expect(buildMealCacheKey(1, '', 'plan-test')).toBeNull()
    expect(buildMealCacheKey(1, '2026-09-13', '')).toBeNull()
  })

  it('DATE_ISOLATION uses different keys', () => {
    expect(buildMealCacheKey(1, '2026-09-13', 'p')).not.toBe(buildMealCacheKey(1, '2026-09-14', 'p'))
  })

  it('dedupes in-flight factories until the same promise settles', async () => {
    let calls = 0
    const pending = deferred<string>()
    const first = dedupeMealSelectionGet('k', () => {
      calls += 1
      return pending.promise
    })
    const second = dedupeMealSelectionGet('k', () => {
      calls += 1
      return Promise.resolve('nope')
    })
    expect(calls).toBe(1)
    pending.resolve('ok')
    await expect(first).resolves.toBe('ok')
    await expect(second).resolves.toBe('ok')
  })

  it('does not share in-flight promises across plan keys', async () => {
    let calls = 0
    const pendingA = deferred<string>()
    const pendingB = deferred<string>()
    const first = dedupeMealSelectionGet('1:2026-09-13:plan-a', () => {
      calls += 1
      return pendingA.promise
    })
    const second = dedupeMealSelectionGet('1:2026-09-13:plan-b', () => {
      calls += 1
      return pendingB.promise
    })
    expect(calls).toBe(2)
    pendingA.resolve('a')
    pendingB.resolve('b')
    await expect(first).resolves.toBe('a')
    await expect(second).resolves.toBe('b')
  })
})
