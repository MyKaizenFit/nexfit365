export interface PlanMealLike {
  day_of_week?: number | null
  week_number?: number | null
  order_index?: number
  name?: string
  meal_type?: string
}

export interface MealCountMismatchDay {
  week_number: number
  day_of_week: number | null
  day_label: string
  meal_count: number
  expected_count: number
}

export interface DuplicateMealTypeWarning {
  week_number: number
  day_of_week: number
  day_label: string
  meal_type: string
  meal_type_label: string
  count: number
}

export interface MealCountMismatchReport {
  declared_meals_per_day: number
  configured_max_per_day: number
  configured_min_per_day: number
  has_mismatch: boolean
  has_inconsistent_days: boolean
  has_duplicate_meal_types: boolean
  should_warn: boolean
  mismatched_days: MealCountMismatchDay[]
  duplicate_meal_types: DuplicateMealTypeWarning[]
}

const DAY_LABELS_ES: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
}

const MEAL_TYPE_LABELS_ES: Record<string, string> = {
  breakfast: "Desayuno",
  morning_snack: "Snack mañana",
  lunch: "Almuerzo",
  afternoon_snack: "Snack tarde",
  dinner: "Cena",
  evening_snack: "Snack noche",
  snack: "Snack",
  pre_workout: "Pre-entreno",
  post_workout: "Post-entreno",
  other: "Otra",
}

type DayKey = `${number}:${number | "generic"}`

function groupMealsByDayKey(meals: PlanMealLike[]): Map<DayKey, PlanMealLike[]> {
  const groups = new Map<DayKey, PlanMealLike[]>()

  for (const meal of meals) {
    const week = Math.max(1, Number(meal.week_number || 1))
    const day = meal.day_of_week ?? null
    const key = `${week}:${day ?? "generic"}` as DayKey
    const current = groups.get(key) || []
    current.push(meal)
    groups.set(key, current)
  }

  for (const [key, group] of groups) {
    groups.set(
      key,
      [...group].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)),
    )
  }

  return groups
}

export function computeMealsPerDay(meals: PlanMealLike[]): number {
  if (!meals.length) return 0

  const groups = groupMealsByDayKey(meals)
  const specificCounts: number[] = []
  const genericCounts: number[] = []

  for (const [key, group] of groups) {
    if (key.endsWith(":generic")) {
      genericCounts.push(group.length)
    } else {
      specificCounts.push(group.length)
    }
  }

  if (specificCounts.length) {
    return Math.max(...specificCounts)
  }

  return genericCounts.length ? Math.max(...genericCounts) : 0
}

export function buildMealCountMismatchReport(
  meals: PlanMealLike[],
  declaredMealsPerDay?: number | null,
): MealCountMismatchReport {
  const declared = Math.max(0, Number(declaredMealsPerDay || 0))
  const groups = groupMealsByDayKey(meals)

  const perDayCounts: number[] = []
  const mismatchedDays: MealCountMismatchDay[] = []
  const duplicateMealTypes: DuplicateMealTypeWarning[] = []

  const sortedKeys = [...groups.keys()].sort((a, b) => {
    const [weekA, dayA] = a.split(":")
    const [weekB, dayB] = b.split(":")
    const weekDiff = Number(weekA) - Number(weekB)
    if (weekDiff !== 0) return weekDiff
    if (dayA === "generic") return 1
    if (dayB === "generic") return -1
    return Number(dayA) - Number(dayB)
  })

  for (const key of sortedKeys) {
    const group = groups.get(key) || []
    const [weekRaw, dayRaw] = key.split(":")
    const week = Number(weekRaw)
    const day = dayRaw === "generic" ? null : Number(dayRaw)
    const count = group.length
    perDayCounts.push(count)

    if (declared > 0 && count !== declared) {
      const dayLabel = day === null ? "Genérico (todos los días)" : DAY_LABELS_ES[day] || `Día ${day}`
      mismatchedDays.push({
        week_number: week,
        day_of_week: day,
        day_label: dayLabel,
        meal_count: count,
        expected_count: declared,
      })
    }

    if (day !== null) {
      const typeCounts = new Map<string, number>()
      for (const meal of group) {
        const mealType = String(meal.meal_type || "other")
        typeCounts.set(mealType, (typeCounts.get(mealType) || 0) + 1)
      }
      for (const [mealType, typeCount] of typeCounts) {
        if (typeCount > 1) {
          duplicateMealTypes.push({
            week_number: week,
            day_of_week: day,
            day_label: DAY_LABELS_ES[day] || `Día ${day}`,
            meal_type: mealType,
            meal_type_label: MEAL_TYPE_LABELS_ES[mealType] || mealType,
            count: typeCount,
          })
        }
      }
    }
  }

  const configuredMax = perDayCounts.length ? Math.max(...perDayCounts) : 0
  const configuredMin = perDayCounts.length ? Math.min(...perDayCounts) : 0
  const hasInconsistentDays = perDayCounts.length > 0 && configuredMax !== configuredMin

  return {
    declared_meals_per_day: declared,
    configured_max_per_day: configuredMax,
    configured_min_per_day: configuredMin,
    has_mismatch: mismatchedDays.length > 0,
    has_inconsistent_days: hasInconsistentDays,
    has_duplicate_meal_types: duplicateMealTypes.length > 0,
    should_warn: mismatchedDays.length > 0 || duplicateMealTypes.length > 0 || hasInconsistentDays,
    mismatched_days: mismatchedDays,
    duplicate_meal_types: duplicateMealTypes,
  }
}
