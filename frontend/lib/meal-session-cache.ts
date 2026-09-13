export type MealSessionMeal = {
  id: string
  name: string
  time: string
  description: string
  icon: string
  mealType: string
  selectedOption: unknown
  isCompleted: boolean
  isSkipped?: boolean
  skipReason?: string | null
  mealLogId?: string | null
  photo?: string | null
}

export type MealSessionSnapshot = {
  userId: string
  date: string
  planId: string
  meals: MealSessionMeal[]
  macros: {
    caloriesConsumed: number
    caloriesGoal: number
    proteinConsumed: number
    proteinGoal: number
    carbsConsumed: number
    carbsGoal: number
    fatConsumed: number
    fatGoal: number
  }
  hasUserPlan: boolean
  planMealSlots: Array<{
    id: string
    name: string
    time: string | null
    description?: string
    meal_type: string
    order_index?: number
  }>
  planMealOptions: Record<string, unknown[]>
  planOptionsByMealId: Record<string, unknown[]>
  fetchedAt: number
}

const snapshots = new Map<string, MealSessionSnapshot>()
const selectionGets = new Map<string, Promise<unknown>>()

export function buildMealCacheKey(
  userId: string | number | null | undefined,
  date: string,
  planId: string | number | null | undefined,
): string | null {
  if (userId == null || userId === '' || !date || planId == null || planId === '') {
    return null
  }
  return `${String(userId)}:${date}:${String(planId)}`
}

export function getMealSessionSnapshot(key: string): MealSessionSnapshot | undefined {
  return snapshots.get(key)
}

export function setMealSessionSnapshot(key: string, snapshot: MealSessionSnapshot): void {
  snapshots.set(key, snapshot)
}

export function deleteMealSessionSnapshot(key: string): void {
  snapshots.delete(key)
}

export function clearMealSessionCache(): void {
  snapshots.clear()
  selectionGets.clear()
}

export function dedupeMealSelectionGet<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const existing = selectionGets.get(key)
  if (existing) return existing as Promise<T>

  const pending = factory().finally(() => {
    if (selectionGets.get(key) === pending) {
      selectionGets.delete(key)
    }
  })
  selectionGets.set(key, pending)
  return pending
}
