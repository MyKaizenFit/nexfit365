/** Utilidades para leer el plan de entrenamiento asignado por el admin (fuente de verdad). */

export const DAY_NAME_TO_NUMBER: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
}

export type WorkoutPlanDay = {
  id?: string
  day_number?: number
  day_of_week?: string
  is_rest_day?: boolean
  name?: string
  day_name?: string
  exercises?: unknown[]
}

export type WorkoutPlanLike = {
  days?: WorkoutPlanDay[]
  training_days?: number
  days_per_week?: number
}

export function getWeekdayNumber(date = new Date()): number {
  const day = date.getDay()
  return day === 0 ? 7 : day
}

export function getPlanDayForWeekday(
  plan: WorkoutPlanLike | null | undefined,
  weekdayNumber: number
): WorkoutPlanDay | null {
  if (!plan?.days?.length) return null

  return (
    plan.days.find((d) => {
      if (d.day_number === weekdayNumber) return true
      if (d.day_of_week) {
        return DAY_NAME_TO_NUMBER[String(d.day_of_week).toLowerCase()] === weekdayNumber
      }
      return false
    }) ?? null
  )
}

export function getPlanTrainingWeekdays(plan: WorkoutPlanLike | null | undefined): number[] {
  if (!plan?.days?.length) return []

  return plan.days
    .filter((d) => !d.is_rest_day)
    .map((d) => {
      if (d.day_of_week) {
        return DAY_NAME_TO_NUMBER[String(d.day_of_week).toLowerCase()]
      }
      return d.day_number
    })
    .filter((n): n is number => typeof n === "number" && n >= 1 && n <= 7)
    .sort((a, b) => a - b)
}

export function getPlanWeeklyGoal(plan: WorkoutPlanLike | null | undefined): number {
  if (!plan) return 0
  const fromDays = getPlanTrainingWeekdays(plan).length
  if (fromDays > 0) return fromDays
  if (typeof plan.training_days === "number" && plan.training_days > 0) {
    return plan.training_days
  }
  if (typeof plan.days_per_week === "number" && plan.days_per_week > 0) {
    return plan.days_per_week
  }
  return 0
}

export function getTodaysPlanDay(plan: WorkoutPlanLike | null | undefined): WorkoutPlanDay | null {
  return getPlanDayForWeekday(plan, getWeekdayNumber())
}

export function isPlanTrainingWeekday(
  plan: WorkoutPlanLike | null | undefined,
  weekdayNumber: number
): boolean {
  const day = getPlanDayForWeekday(plan, weekdayNumber)
  return Boolean(day && !day.is_rest_day)
}

export function weekNumberFromDayNumber(dayNumber: number): number {
  return Math.max(1, Math.ceil(dayNumber / 7))
}

export function slotInWeekFromDayNumber(dayNumber: number): number {
  return ((dayNumber - 1) % 7) + 1
}

export function groupDaysByWeek<T extends { day_number?: number }>(days: T[]): Array<{ weekIndex: number; days: T[] }> {
  const map = new Map<number, T[]>()
  for (const day of days) {
    const weekIndex = weekNumberFromDayNumber(day.day_number || 1) - 1
    const bucket = map.get(weekIndex) || []
    bucket.push(day)
    map.set(weekIndex, bucket)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([weekIndex, weekDays]) => ({
      weekIndex,
      days: [...weekDays].sort((a, b) => (a.day_number || 0) - (b.day_number || 0)),
    }))
}
