/**
 * P0 characterization for useDailyMeals.
 *
 * Isolation / GET-empty / logout: product contract (must PASS after PR2).
 * Race / 401: [characterization] + [expected-until-fix] until later PRs.
 */
import { act, renderHook, waitFor } from '@testing-library/react'
import { useDailyMeals } from '../use-daily-meals'
import { useAuth } from '@/contexts/auth-context'
import { nutritionService, MealOption } from '@/lib/nutrition-service'
import { todayLocalDate } from '@/lib/local-date'
import { clearUserLocalDataOnLogout, getMealSelectionsStorageKey } from '@/lib/user-local-storage'

jest.mock('@/contexts/auth-context', () => ({
  useAuth: jest.fn(),
}))

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const USER_A = 1
const USER_B = 2

jest.mock('@/hooks/use-nutrition', () => ({
  useNutrition: () => ({
    currentPlan: {
      id: 'plan-test',
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
    getMultipartAuthHeaders: jest.fn(async () => ({})),
  }
})

const SLOT_ID = 'slot-breakfast'

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

const optionC: MealOption = {
  id: 'recipe-c',
  recipeId: 'rec-c',
  name: 'Plato C',
  calories: 600,
  protein: 40,
  carbs: 50,
  fat: 14,
  category: 'balanced',
  icon: '🐟',
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
  meals_by_type: { breakfast: [optionA, optionB, optionC] },
  options_by_meal_id: { [SLOT_ID]: [optionA, optionB, optionC] },
  daily_calories_target: 2000,
  daily_macros: { protein: 150, carbs: 220, fat: 80 },
}

type PendingWrite = {
  method: string
  body: Record<string, unknown> | null
  complete: (response?: Response) => void
}

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as Response
}

function mealStorageKey(userId: string | number = USER_B) {
  return getMealSelectionsStorageKey(userId, todayLocalDate())
}

function legacyMealStorageKey() {
  return `meal-selections-${todayLocalDate()}`
}

function seedLocalSelection(userId: string | number, option: MealOption, completed = true) {
  localStorage.setItem(
    mealStorageKey(userId),
    JSON.stringify({
      [SLOT_ID]: {
        mealId: SLOT_ID,
        optionId: option.id,
        option,
        isCompleted: completed,
        isSkipped: false,
      },
    }),
  )
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

function authUser(id: number) {
  return {
    isAuthenticated: true,
    user: { id },
  } as never
}

describe('useDailyMeals P0 characterization', () => {
  let pendingWrites: PendingWrite[]
  let serverSelection: Record<string, unknown> | null
  let getSelectionsImpl: () => { selections: unknown[] }
  let getShouldFail: boolean

  beforeEach(() => {
    pendingWrites = []
    serverSelection = null
    getShouldFail = false
    getSelectionsImpl = () => ({ selections: [] })
    localStorage.clear()
    mockUseAuth.mockReturnValue(authUser(USER_B))

    jest.spyOn(nutritionService, 'getPlanMealsForSelection').mockResolvedValue(planPayload as any)

    global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = (init?.method || 'GET').toUpperCase()

      if (url.includes('daily-meal-selections')) {
        if (method === 'GET') {
          if (getShouldFail) {
            return Promise.reject(new Error('network down'))
          }
          return Promise.resolve(jsonResponse(getSelectionsImpl()))
        }

        if (method === 'POST') {
          const body = JSON.parse(String(init?.body || '{}'))
          return new Promise((resolve) => {
            pendingWrites.push({
              method,
              body,
              complete: (response) => {
                if (!response || response.ok) {
                  serverSelection = body
                }
                resolve(
                  response ||
                    jsonResponse({
                      id: 'log-1',
                      ...body,
                    }),
                )
              },
            })
          })
        }

        if (method === 'DELETE') {
          return new Promise((resolve) => {
            pendingWrites.push({
              method,
              body: null,
              complete: (response) => {
                if (!response || response.ok) {
                  serverSelection = null
                }
                resolve(response || jsonResponse({}))
              },
            })
          })
        }
      }

      return Promise.resolve(jsonResponse({}))
    }) as typeof fetch
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  async function mountHook() {
    jest.useRealTimers()
    const hook = renderHook(() => useDailyMeals())
    await waitFor(() => {
      expect(hook.result.current.loading).toBe(false)
    })
    expect(hook.result.current.meals).toHaveLength(1)
    return hook
  }

  async function flushSelectTimeouts() {
    await act(async () => {
      jest.advanceTimersByTime(150)
    })
  }

  function lastPersistedName() {
    return serverSelection?.custom_description || serverSelection?.recipe_id || null
  }

  describe('last user action vs last completion', () => {
    it('[characterization] A then B: if A completes last, server keeps A while UI shows B', async () => {
      const hook = await mountHook()
      jest.useFakeTimers()

      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionA)
      })
      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionB)
      })
      await flushSelectTimeouts()

      expect(pendingWrites).toHaveLength(2)
      expect(hook.result.current.meals[0].selectedOption?.name).toBe('Plato B')

      await act(async () => {
        pendingWrites[1].complete()
      })
      await act(async () => {
        pendingWrites[0].complete()
      })

      expect(lastPersistedName()).toBe('Plato A')
      expect(hook.result.current.meals[0].selectedOption?.name).toBe('Plato B')
    })

    it.failing('[expected-until-fix] A then B out of order: last user action B must persist', async () => {
      const hook = await mountHook()
      jest.useFakeTimers()

      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionA)
      })
      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionB)
      })
      await flushSelectTimeouts()

      await act(async () => {
        pendingWrites[1].complete()
      })
      await act(async () => {
        pendingWrites[0].complete()
      })

      expect(lastPersistedName()).toBe('Plato B')
    })

    it('[characterization] A→B→C completing C,B,A leaves server on A', async () => {
      const hook = await mountHook()
      jest.useFakeTimers()

      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionA)
      })
      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionB)
      })
      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionC)
      })
      await flushSelectTimeouts()

      expect(pendingWrites).toHaveLength(3)
      await act(async () => {
        pendingWrites[2].complete()
      })
      await act(async () => {
        pendingWrites[1].complete()
      })
      await act(async () => {
        pendingWrites[0].complete()
      })

      expect(lastPersistedName()).toBe('Plato A')
      expect(hook.result.current.meals[0].selectedOption?.name).toBe('Plato C')
    })

    it.failing('[expected-until-fix] A→B→C out of order: last user action C must persist', async () => {
      const hook = await mountHook()
      jest.useFakeTimers()

      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionA)
      })
      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionB)
      })
      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionC)
      })
      await flushSelectTimeouts()

      await act(async () => {
        pendingWrites[2].complete()
      })
      await act(async () => {
        pendingWrites[1].complete()
      })
      await act(async () => {
        pendingWrites[0].complete()
      })

      expect(lastPersistedName()).toBe('Plato C')
    })

    it('[characterization] select then deselect: POST after DELETE resurrects A on the server', async () => {
      const hook = await mountHook()
      jest.useFakeTimers()

      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionA)
      })
      let deselectPromise: Promise<void>
      await act(async () => {
        deselectPromise = hook.result.current.deselectMealOption(SLOT_ID)
      })
      await flushSelectTimeouts()

      const del = pendingWrites.find((item) => item.method === 'DELETE')
      const post = pendingWrites.find((item) => item.method === 'POST')
      expect(del).toBeTruthy()
      expect(post).toBeTruthy()

      await act(async () => {
        del!.complete()
      })
      expect(serverSelection).toBeNull()

      await act(async () => {
        post!.complete()
      })
      await act(async () => {
        await deselectPromise
      })

      expect(lastPersistedName()).toBe('Plato A')
      expect(hook.result.current.meals[0].selectedOption).toBeNull()
    })

    it.failing('[expected-until-fix] select then deselect: late POST must not resurrect the selection', async () => {
      const hook = await mountHook()
      jest.useFakeTimers()

      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionA)
      })
      let deselectPromise: Promise<void>
      await act(async () => {
        deselectPromise = hook.result.current.deselectMealOption(SLOT_ID)
      })
      await flushSelectTimeouts()

      const del = pendingWrites.find((item) => item.method === 'DELETE')
      const post = pendingWrites.find((item) => item.method === 'POST')
      await act(async () => {
        del!.complete()
      })
      await act(async () => {
        post!.complete()
      })
      await act(async () => {
        await deselectPromise
      })

      expect(serverSelection).toBeNull()
    })

    it('[characterization] completed then change option: late complete-A POST can replace B on the server', async () => {
      const hook = await mountHook()
      jest.useFakeTimers()

      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionA)
      })
      await flushSelectTimeouts()
      await act(async () => {
        pendingWrites[0].complete()
      })

      const completeIndex = pendingWrites.length
      let markPromise: Promise<void>
      await act(async () => {
        markPromise = hook.result.current.markMealCompleted(SLOT_ID)
      })
      expect(pendingWrites.length).toBeGreaterThan(completeIndex)
      const completeWrite = pendingWrites[completeIndex]

      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionB)
      })
      await flushSelectTimeouts()
      const changeWrite = pendingWrites[pendingWrites.length - 1]

      await act(async () => {
        changeWrite.complete()
      })
      await act(async () => {
        completeWrite.complete()
      })
      await act(async () => {
        await markPromise
      })

      expect(serverSelection?.recipe_id).toBe('rec-a')
      expect(serverSelection?.completed).toBe(true)
      expect(hook.result.current.meals[0].selectedOption?.name).toBe('Plato B')
      expect(hook.result.current.meals[0].isCompleted).toBe(true)
      expect(hook.result.current.macros.caloriesConsumed).toBe(500)
    })

    it.failing('[expected-until-fix] completed then change to B: server must keep B completed', async () => {
      const hook = await mountHook()
      jest.useFakeTimers()

      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionA)
      })
      await flushSelectTimeouts()
      await act(async () => {
        pendingWrites[0].complete()
      })

      const completeIndex = pendingWrites.length
      let markPromise: Promise<void>
      await act(async () => {
        markPromise = hook.result.current.markMealCompleted(SLOT_ID)
      })
      const completeWrite = pendingWrites[completeIndex]

      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionB)
      })
      await flushSelectTimeouts()
      const changeWrite = pendingWrites[pendingWrites.length - 1]

      await act(async () => {
        changeWrite.complete()
      })
      await act(async () => {
        completeWrite.complete()
      })
      await act(async () => {
        await markPromise
      })

      expect(serverSelection?.recipe_id).toBe('rec-b')
      expect(serverSelection?.completed).toBe(true)
    })
  })

  describe('user isolation and GET empty vs failure', () => {
    it('USER A select → logout → USER B GET 200 [] sees zero selections', async () => {
      mockUseAuth.mockReturnValue(authUser(USER_A))
      const hookA = await mountHook()
      jest.useFakeTimers()

      await act(async () => {
        await hookA.result.current.selectMealOption(SLOT_ID, optionA)
      })
      await flushSelectTimeouts()

      expect(JSON.parse(localStorage.getItem(mealStorageKey(USER_A)) || '{}')[SLOT_ID].option.name).toBe('Plato A')

      hookA.unmount()
      clearUserLocalDataOnLogout(USER_A)
      expect(localStorage.getItem(mealStorageKey(USER_A))).toBeNull()

      mockUseAuth.mockReturnValue(authUser(USER_B))
      getSelectionsImpl = () => ({ selections: [] })
      const hookB = await mountHook()

      expect(hookB.result.current.meals[0].selectedOption).toBeNull()
      expect(hookB.result.current.meals[0].isCompleted).toBe(false)
      expect(localStorage.getItem(mealStorageKey(USER_B))).toBeNull()
    })

    it('GET 200 [] is authoritative: same-user snapshot does not resurrect', async () => {
      mockUseAuth.mockReturnValue(authUser(USER_A))
      seedLocalSelection(USER_A, optionA)
      getSelectionsImpl = () => ({ selections: [] })

      const hook = await mountHook()

      expect(hook.result.current.meals[0].selectedOption).toBeNull()
      expect(hook.result.current.meals[0].isCompleted).toBe(false)
      expect(localStorage.getItem(mealStorageKey(USER_A))).toBeNull()
    })

    it('GET 200 with data: server wins over local snapshot', async () => {
      mockUseAuth.mockReturnValue(authUser(USER_A))
      seedLocalSelection(USER_A, optionA)
      getSelectionsImpl = () => serverSelectionPayload(optionB)

      const hook = await mountHook()

      expect(hook.result.current.meals[0].selectedOption?.name).toBe('Plato B')
      const stored = JSON.parse(localStorage.getItem(mealStorageKey(USER_A)) || '{}')
      expect(stored[SLOT_ID].option.name).toBe('Plato B')
      expect(localStorage.getItem(legacyMealStorageKey())).toBeNull()
    })

    it('network failure same user restores that user snapshot', async () => {
      mockUseAuth.mockReturnValue(authUser(USER_A))
      seedLocalSelection(USER_A, optionA)
      getShouldFail = true

      const hook = await mountHook()

      expect(hook.result.current.meals[0].selectedOption?.name).toBe('Plato A')
    })

    it('network failure does not restore another user snapshot', async () => {
      mockUseAuth.mockReturnValue(authUser(USER_A))
      seedLocalSelection(USER_B, optionA)
      getShouldFail = true

      const hook = await mountHook()

      expect(hook.result.current.meals[0].selectedOption).toBeNull()
    })

    it('legacy date-only key is not migrated on GET 200 []', async () => {
      mockUseAuth.mockReturnValue(authUser(USER_A))
      localStorage.setItem(
        legacyMealStorageKey(),
        JSON.stringify({
          [SLOT_ID]: {
            mealId: SLOT_ID,
            optionId: optionA.id,
            option: optionA,
            isCompleted: true,
            isSkipped: false,
          },
        }),
      )
      getSelectionsImpl = () => ({ selections: [] })

      const hook = await mountHook()

      expect(hook.result.current.meals[0].selectedOption).toBeNull()
      expect(localStorage.getItem(mealStorageKey(USER_A))).toBeNull()
      expect(localStorage.getItem(legacyMealStorageKey())).toBeNull()
    })

    it('legacy date-only key is not used on network error', async () => {
      mockUseAuth.mockReturnValue(authUser(USER_A))
      localStorage.setItem(
        legacyMealStorageKey(),
        JSON.stringify({
          [SLOT_ID]: {
            mealId: SLOT_ID,
            optionId: optionA.id,
            option: optionA,
            isCompleted: true,
            isSkipped: false,
          },
        }),
      )
      getShouldFail = true

      const hook = await mountHook()

      expect(hook.result.current.meals[0].selectedOption).toBeNull()
      expect(localStorage.getItem(mealStorageKey(USER_A))).toBeNull()
      expect(localStorage.getItem(legacyMealStorageKey())).toBeTruthy()
    })
  })

  describe('401 during select sync', () => {
    it('[characterization] 401 leaves optimistic UI + localStorage and reports idle sync (no error)', async () => {
      const hook = await mountHook()
      jest.useFakeTimers()

      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionA)
      })
      await flushSelectTimeouts()

      expect(pendingWrites).toHaveLength(1)
      await act(async () => {
        pendingWrites[0].complete({
          ok: false,
          status: 401,
          json: async () => ({ detail: 'Unauthorized' }),
        } as Response)
      })

      expect(serverSelection).toBeNull()
      expect(hook.result.current.meals[0].selectedOption?.name).toBe('Plato A')
      expect(hook.result.current.syncing).toBe(false)
      expect(hook.result.current.error).toBeNull()

      const stored = JSON.parse(localStorage.getItem(mealStorageKey()) || '{}')
      expect(stored[SLOT_ID].option.name).toBe('Plato A')
    })
  })
})
