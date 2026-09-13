/**
 * P0 meal tests: isolation (PR2) + last user action wins (PR3).
 */
import fs from 'fs'
import path from 'path'
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
    mockRefreshAccessToken.mockResolvedValue({ success: true })
    ;(global as unknown as { __mealRefresh: typeof mockRefreshAccessToken }).__mealRefresh = mockRefreshAccessToken
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
          let body: Record<string, unknown>
          if (typeof FormData !== 'undefined' && init?.body instanceof FormData) {
            body = { photo: true }
          } else {
            body = JSON.parse(String(init?.body || '{}'))
          }
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

  async function waitForWrites(count: number) {
    await waitFor(() => {
      expect(pendingWrites).toHaveLength(count)
    })
  }

  function lastPersistedName() {
    return serverSelection?.custom_description || serverSelection?.recipe_id || null
  }

  describe('last user action wins', () => {
    it('A then B: last user action B is persisted even if A is still in flight', async () => {
      const hook = await mountHook()

      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionA)
      })
      await waitForWrites(1)
      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionB)
      })

      expect(pendingWrites).toHaveLength(1)
      expect(hook.result.current.meals[0].selectedOption?.name).toBe('Plato B')
      expect(hook.result.current.syncing).toBe(true)

      await act(async () => {
        pendingWrites[0].complete()
      })
      await waitForWrites(2)
      await act(async () => {
        pendingWrites[1].complete()
      })
      await waitFor(() => {
        expect(hook.result.current.syncing).toBe(false)
      })

      expect(lastPersistedName()).toBe('Plato B')
      expect(hook.result.current.meals[0].selectedOption?.name).toBe('Plato B')
      expect(JSON.parse(localStorage.getItem(mealStorageKey()) || '{}')[SLOT_ID].option.name).toBe('Plato B')
    })

    it('A→B→C: last user action C is persisted', async () => {
      const hook = await mountHook()

      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionA)
      })
      await waitForWrites(1)
      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionB)
      })
      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionC)
      })

      expect(hook.result.current.meals[0].selectedOption?.name).toBe('Plato C')
      expect(pendingWrites).toHaveLength(1)

      await act(async () => {
        pendingWrites[0].complete()
      })
      await waitForWrites(2)
      await act(async () => {
        pendingWrites[1].complete()
      })
      await waitForWrites(3)
      await act(async () => {
        pendingWrites[2].complete()
      })
      await waitFor(() => {
        expect(hook.result.current.syncing).toBe(false)
      })

      expect(lastPersistedName()).toBe('Plato C')
      expect(hook.result.current.meals[0].selectedOption?.name).toBe('Plato C')
    })

    it('select then deselect: later DELETE wins and A does not resurrect', async () => {
      const hook = await mountHook()

      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionA)
      })
      await waitForWrites(1)
      await act(async () => {
        await hook.result.current.deselectMealOption(SLOT_ID)
      })

      expect(hook.result.current.meals[0].selectedOption).toBeNull()
      expect(pendingWrites).toHaveLength(1)
      expect(pendingWrites[0].method).toBe('POST')

      await act(async () => {
        pendingWrites[0].complete()
      })
      await waitForWrites(2)
      expect(pendingWrites[1].method).toBe('DELETE')
      await act(async () => {
        pendingWrites[1].complete()
      })
      await waitFor(() => {
        expect(hook.result.current.syncing).toBe(false)
      })

      expect(serverSelection).toBeNull()
      expect(hook.result.current.meals[0].selectedOption).toBeNull()
    })

    it('completed then change to B: server keeps B completed', async () => {
      const hook = await mountHook()

      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionA)
      })
      await waitForWrites(1)
      await act(async () => {
        pendingWrites[0].complete()
      })
      await waitFor(() => {
        expect(hook.result.current.syncing).toBe(false)
      })

      await act(async () => {
        await hook.result.current.markMealCompleted(SLOT_ID)
      })
      await waitForWrites(2)
      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionB)
      })

      expect(hook.result.current.meals[0].selectedOption?.name).toBe('Plato B')
      expect(hook.result.current.meals[0].isCompleted).toBe(true)
      expect(hook.result.current.macros.caloriesConsumed).toBe(500)

      await act(async () => {
        pendingWrites[1].complete()
      })
      await waitForWrites(3)
      await act(async () => {
        pendingWrites[2].complete()
      })
      await waitFor(() => {
        expect(hook.result.current.syncing).toBe(false)
      })

      expect(serverSelection?.recipe_id).toBe('rec-b')
      expect(serverSelection?.completed).toBe(true)
      expect(JSON.parse(localStorage.getItem(mealStorageKey()) || '{}')[SLOT_ID].option.name).toBe('Plato B')
    })

    it('double tap A stays A', async () => {
      const hook = await mountHook()

      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionA)
      })
      await waitForWrites(1)
      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionA)
      })

      await act(async () => {
        pendingWrites[0].complete()
      })
      await waitForWrites(2)
      await act(async () => {
        pendingWrites[1].complete()
      })
      await waitFor(() => {
        expect(hook.result.current.syncing).toBe(false)
      })

      expect(lastPersistedName()).toBe('Plato A')
      expect(hook.result.current.meals[0].selectedOption?.name).toBe('Plato A')
    })

    it('network failure keeps optimistic UI and reports sync error', async () => {
      const hook = await mountHook()

      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionA)
      })
      await waitForWrites(1)
      await act(async () => {
        pendingWrites[0].complete({
          ok: false,
          status: 500,
          json: async () => ({ detail: 'server error' }),
        } as Response)
      })
      await waitFor(() => {
        expect(hook.result.current.syncing).toBe(false)
      })

      expect(hook.result.current.meals[0].selectedOption?.name).toBe('Plato A')
      expect(hook.result.current.syncError).toBeTruthy()
      expect(JSON.parse(localStorage.getItem(mealStorageKey()) || '{}')[SLOT_ID].option.name).toBe('Plato A')
    })

    it('queue continues after a failed write', async () => {
      const hook = await mountHook()

      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionA)
      })
      await waitForWrites(1)
      await act(async () => {
        pendingWrites[0].complete({
          ok: false,
          status: 500,
          json: async () => ({ detail: 'server error' }),
        } as Response)
      })
      await waitFor(() => {
        expect(hook.result.current.syncError).toBeTruthy()
      })

      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionB)
      })
      await waitForWrites(2)
      await act(async () => {
        pendingWrites[1].complete()
      })
      await waitFor(() => {
        expect(hook.result.current.syncing).toBe(false)
      })

      expect(lastPersistedName()).toBe('Plato B')
      expect(hook.result.current.syncError).toBeNull()
      expect(hook.result.current.meals[0].selectedOption?.name).toBe('Plato B')
    })

    it('pending sync stays true until later queued write finishes', async () => {
      const hook = await mountHook()

      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionA)
      })
      await waitForWrites(1)
      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionB)
      })
      expect(hook.result.current.syncing).toBe(true)

      await act(async () => {
        pendingWrites[0].complete()
      })
      await waitForWrites(2)
      expect(hook.result.current.syncing).toBe(true)

      await act(async () => {
        pendingWrites[1].complete()
      })
      await waitFor(() => {
        expect(hook.result.current.syncing).toBe(false)
      })
    })

    it('unmount does not abort an already queued write', async () => {
      const hook = await mountHook()

      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionB)
      })
      await waitForWrites(1)
      hook.unmount()

      await act(async () => {
        pendingWrites[0].complete()
      })

      expect(lastPersistedName()).toBe('Plato B')
    })

    it('different slots persist in parallel', async () => {
      const dinnerId = 'slot-dinner'
      jest.spyOn(nutritionService, 'getPlanMealsForSelection').mockResolvedValue({
        ...planPayload,
        meal_slots: [
          ...planPayload.meal_slots,
          { id: dinnerId, name: 'Cena', meal_type: 'dinner', time: '21:00', order_index: 2 },
        ],
        meals_by_type: { ...planPayload.meals_by_type, dinner: [optionA, optionB] },
        options_by_meal_id: { ...planPayload.options_by_meal_id, [dinnerId]: [optionA, optionB] },
      } as any)

      const hook = renderHook(() => useDailyMeals())
      await waitFor(() => {
        expect(hook.result.current.loading).toBe(false)
      })
      expect(hook.result.current.meals).toHaveLength(2)

      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionA)
      })
      await waitForWrites(1)
      await act(async () => {
        await hook.result.current.selectMealOption(dinnerId, optionB)
      })
      await waitForWrites(2)

      expect(pendingWrites.map((item) => item.body?.plan_meal_id)).toEqual(
        expect.arrayContaining([SLOT_ID, dinnerId]),
      )

      await act(async () => {
        pendingWrites[0].complete()
        pendingWrites[1].complete()
      })
      await waitFor(() => {
        expect(hook.result.current.syncing).toBe(false)
      })
    })

    it('breakfast failure keeps sync error after dinner succeeds', async () => {
      const dinnerId = 'slot-dinner'
      jest.spyOn(nutritionService, 'getPlanMealsForSelection').mockResolvedValue({
        ...planPayload,
        meal_slots: [
          ...planPayload.meal_slots,
          { id: dinnerId, name: 'Cena', meal_type: 'dinner', time: '21:00', order_index: 2 },
        ],
        meals_by_type: { ...planPayload.meals_by_type, dinner: [optionA, optionB] },
        options_by_meal_id: { ...planPayload.options_by_meal_id, [dinnerId]: [optionA, optionB] },
      } as any)

      const hook = renderHook(() => useDailyMeals())
      await waitFor(() => {
        expect(hook.result.current.loading).toBe(false)
      })

      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionA)
      })
      await waitForWrites(1)
      await act(async () => {
        await hook.result.current.selectMealOption(dinnerId, optionB)
      })
      await waitForWrites(2)

      const breakfastWrite = pendingWrites.find((item) => item.body?.plan_meal_id === SLOT_ID)
      const dinnerWrite = pendingWrites.find((item) => item.body?.plan_meal_id === dinnerId)
      expect(breakfastWrite).toBeTruthy()
      expect(dinnerWrite).toBeTruthy()

      await act(async () => {
        breakfastWrite!.complete({
          ok: false,
          status: 500,
          json: async () => ({ detail: 'server error' }),
        } as Response)
        dinnerWrite!.complete()
      })
      await waitFor(() => {
        expect(hook.result.current.syncing).toBe(false)
      })

      expect(hook.result.current.syncError).toBeTruthy()

      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionB)
      })
      await waitForWrites(3)
      await act(async () => {
        pendingWrites[2].complete()
      })
      await waitFor(() => {
        expect(hook.result.current.syncing).toBe(false)
      })

      expect(hook.result.current.syncError).toBeNull()
      expect(hook.result.current.meals.find((meal) => meal.id === SLOT_ID)?.selectedOption?.name).toBe('Plato B')
    })

    it('photo upload uses FormData without a manual multipart Content-Type', async () => {
      const hook = await mountHook()

      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionA)
      })
      await waitForWrites(1)
      await act(async () => {
        pendingWrites[0].complete()
      })
      await waitFor(() => {
        expect(hook.result.current.syncing).toBe(false)
      })

      const photo = new File(['meal-photo'], 'meal.jpg', { type: 'image/jpeg' })
      let uploadResult = false
      await act(async () => {
        const pending = hook.result.current.uploadMealPhoto(SLOT_ID, photo)
        await waitForWrites(2)
        expect(pendingWrites[1].body).toEqual({ photo: true })
        const photoCall = (global.fetch as jest.Mock).mock.calls.find(
          (call) => call[1]?.body instanceof FormData,
        )
        expect(photoCall).toBeTruthy()
        expect(JSON.stringify(photoCall?.[1]?.headers || {})).not.toMatch(/multipart/i)
        expect(JSON.stringify(photoCall?.[1]?.headers || {})).not.toMatch(/Content-Type/i)
        pendingWrites[1].complete()
        uploadResult = await pending
      })

      expect(uploadResult).toBe(true)
      await waitFor(() => {
        expect(hook.result.current.syncing).toBe(false)
      })
    })
  })

  describe('slot write queue source contract', () => {
    it('deletes a finished slot promise only when it is still the current chain head', () => {
      const src = fs.readFileSync(
        path.join(process.cwd(), 'hooks/use-daily-meals.ts'),
        'utf8',
      )
      expect(src).toContain('previous.catch(() => undefined)')
      expect(src).toContain('slotWriteChainRef.current.get(slotId) === next')
      expect(src).toContain('slotWriteChainRef.current.delete(slotId)')
      expect(src).toContain('void next.catch(() => undefined)')
    })
  })

  describe('user isolation and GET empty vs failure', () => {
    it('USER A select → logout → USER B GET 200 [] sees zero selections', async () => {
      mockUseAuth.mockReturnValue(authUser(USER_A))
      const hookA = await mountHook()

      await act(async () => {
        await hookA.result.current.selectMealOption(SLOT_ID, optionA)
      })
      await waitForWrites(1)

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
    it('401 with successful refresh retries and keeps the selection', async () => {
      const hook = await mountHook()

      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionA)
      })
      await waitForWrites(1)
      await act(async () => {
        pendingWrites[0].complete({
          ok: false,
          status: 401,
          json: async () => ({ detail: 'Unauthorized' }),
        } as Response)
      })
      await waitForWrites(2)
      await act(async () => {
        pendingWrites[1].complete()
      })
      await waitFor(() => {
        expect(hook.result.current.syncing).toBe(false)
      })

      expect(lastPersistedName()).toBe('Plato A')
      expect(hook.result.current.meals[0].selectedOption?.name).toBe('Plato A')
      expect(hook.result.current.syncError).toBeNull()
      expect(JSON.parse(localStorage.getItem(mealStorageKey()) || '{}')[SLOT_ID].option.name).toBe('Plato A')
    })

    it('401 with failed refresh keeps local selection and reports sync error', async () => {
      mockRefreshAccessToken.mockResolvedValue({ success: false, error: 'expired' })
      const hook = await mountHook()

      await act(async () => {
        await hook.result.current.selectMealOption(SLOT_ID, optionA)
      })
      await waitForWrites(1)
      await act(async () => {
        pendingWrites[0].complete({
          ok: false,
          status: 401,
          json: async () => ({ detail: 'Unauthorized' }),
        } as Response)
      })
      await waitFor(() => {
        expect(hook.result.current.syncing).toBe(false)
      })

      expect(serverSelection).toBeNull()
      expect(hook.result.current.meals[0].selectedOption?.name).toBe('Plato A')
      expect(hook.result.current.syncError).toBeTruthy()
      expect(JSON.parse(localStorage.getItem(mealStorageKey()) || '{}')[SLOT_ID].option.name).toBe('Plato A')
    })
  })
})
