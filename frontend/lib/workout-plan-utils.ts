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
  start_date?: string | null
  duration_weeks?: number
  end_date?: string | null
}

export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00`)
}

export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

export function getWeekdayNumber(date = new Date()): number {
  const day = date.getDay()
  return day === 0 ? 7 : day
}

export function weekNumberFromDayNumber(dayNumber: number): number {
  return Math.max(1, Math.ceil(dayNumber / 7))
}

export function slotInWeekFromDayNumber(dayNumber: number): number {
  return ((dayNumber - 1) % 7) + 1
}

export function globalDayNumberForProgramWeek(programWeek: number, weekdayNumber: number): number {
  const week = Math.max(1, programWeek)
  const weekday = Math.max(1, Math.min(7, weekdayNumber))
  return (week - 1) * 7 + weekday
}

export function planDurationWeeksFromPlan(plan: WorkoutPlanLike | null | undefined): number {
  const days = plan?.days || []
  let fromDays = 1
  if (days.length) {
    const maxDayNumber = Math.max(...days.map((day) => day.day_number || 1))
    fromDays = weekNumberFromDayNumber(maxDayNumber)
  }

  const explicit = plan?.duration_weeks
  if (typeof explicit === "number" && explicit > 0) {
    return Math.max(explicit, fromDays)
  }

  return fromDays
}

export function isMultiWeekPlan(plan: WorkoutPlanLike | null | undefined): boolean {
  if (!plan?.days?.length) return false
  if ((plan.duration_weeks || 0) > 1) return true
  return plan.days.some((day) => (day.day_number || 0) > 7)
}

export function getProgramWeekForAnchor(
  anchorDate: Date | string,
  referenceDate: Date = new Date(),
  durationWeeks?: number,
): number {
  const startMonday = getMondayOfWeek(
    typeof anchorDate === "string" ? parseDateOnly(anchorDate) : anchorDate,
  )
  const refMonday = getMondayOfWeek(referenceDate)
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const weeksElapsed = Math.floor((refMonday.getTime() - startMonday.getTime()) / msPerWeek)

  if (weeksElapsed < 0) return 0

  const programWeek = weeksElapsed + 1
  if (typeof durationWeeks === "number" && durationWeeks > 0 && programWeek > durationWeeks) {
    return durationWeeks + 1
  }

  return programWeek
}

export function getProgramWeekForDate(
  plan: WorkoutPlanLike | null | undefined,
  referenceDate: Date = new Date(),
): number {
  if (!plan?.days?.length) return 1

  if (!isMultiWeekPlan(plan)) {
    return 1
  }

  if (!plan.start_date) {
    return 1
  }

  return getProgramWeekForAnchor(plan.start_date, referenceDate, planDurationWeeksFromPlan(plan))
}

/** Fecha concreta para un día de la semana dentro de una semana del plan (anclada a start_date). */
export function getDateForWeekdayInProgramWeek(
  plan: WorkoutPlanLike | null | undefined,
  weekdayNumber: number,
  programWeek?: number,
  referenceDate: Date = new Date(),
): Date {
  const week = Math.max(1, programWeek ?? getProgramWeekForDate(plan, referenceDate))

  if (plan?.start_date && isMultiWeekPlan(plan)) {
    const startMonday = getMondayOfWeek(parseDateOnly(plan.start_date))
    const date = new Date(startMonday)
    date.setDate(startMonday.getDate() + (week - 1) * 7 + (weekdayNumber - 1))
    return date
  }

  const monday = getMondayOfWeek(referenceDate)
  const date = new Date(monday)
  date.setDate(monday.getDate() + (weekdayNumber - 1))
  return date
}

export function isProgramWeekInRange(
  plan: WorkoutPlanLike | null | undefined,
  referenceDate: Date = new Date(),
): boolean {
  return getProgramLifecycleStatus(plan, referenceDate) === "active"
}

export type ProgramLifecycleStatus = "not_started" | "active" | "completed"

export function getProgramLifecycleStatus(
  plan: WorkoutPlanLike | null | undefined,
  referenceDate: Date = new Date(),
): ProgramLifecycleStatus {
  if (!plan?.days?.length) return "not_started"

  const ref = new Date(referenceDate)
  ref.setHours(0, 0, 0, 0)

  if (plan.end_date) {
    const end = parseDateOnly(plan.end_date)
    if (ref > end) return "completed"
  }

  if (!isMultiWeekPlan(plan)) {
    return "active"
  }

  const programWeek = getProgramWeekForDate(plan, referenceDate)
  const duration = planDurationWeeksFromPlan(plan)

  if (programWeek <= 0) return "not_started"
  if (programWeek > duration) return "completed"
  return "active"
}

export function isProgramCompleted(
  plan: WorkoutPlanLike | null | undefined,
  referenceDate: Date = new Date(),
): boolean {
  return getProgramLifecycleStatus(plan, referenceDate) === "completed"
}

function findPlanDayByGlobalNumber(
  plan: WorkoutPlanLike,
  globalDayNumber: number,
): WorkoutPlanDay | null {
  const exact = plan.days?.find((day) => day.day_number === globalDayNumber)
  if (exact) return exact

  const targetWeek = weekNumberFromDayNumber(globalDayNumber)
  const targetSlot = slotInWeekFromDayNumber(globalDayNumber)

  return (
    plan.days?.find((day) => {
      if (day.day_number === globalDayNumber) return true
      if (day.day_of_week) {
        const weekday = DAY_NAME_TO_NUMBER[String(day.day_of_week).toLowerCase()]
        if (weekday !== targetSlot) return false
        if (typeof day.day_number === "number" && day.day_number > 0) {
          return weekNumberFromDayNumber(day.day_number) === targetWeek
        }
        return false
      }
      return false
    }) ?? null
  )
}

export function getPlanDayForWeekday(
  plan: WorkoutPlanLike | null | undefined,
  weekdayNumber: number,
  referenceDate: Date = new Date(),
): WorkoutPlanDay | null {
  if (!plan?.days?.length) return null

  if (isMultiWeekPlan(plan)) {
    if (!isProgramWeekInRange(plan, referenceDate)) {
      return null
    }

    const programWeek = getProgramWeekForDate(plan, referenceDate)
    const globalDayNumber = globalDayNumberForProgramWeek(programWeek, weekdayNumber)
    return findPlanDayByGlobalNumber(plan, globalDayNumber)
  }

  return (
    plan.days.find((day) => {
      if (day.day_number === weekdayNumber) return true
      if (day.day_of_week) {
        return DAY_NAME_TO_NUMBER[String(day.day_of_week).toLowerCase()] === weekdayNumber
      }
      return false
    }) ?? null
  )
}

export function getPlanDayForDate(
  plan: WorkoutPlanLike | null | undefined,
  referenceDate: Date = new Date(),
): WorkoutPlanDay | null {
  return getPlanDayForWeekday(plan, getWeekdayNumber(referenceDate), referenceDate)
}

export function getPlanTrainingWeekdays(
  plan: WorkoutPlanLike | null | undefined,
  referenceDate: Date = new Date(),
): number[] {
  if (!plan?.days?.length) return []

  if (isMultiWeekPlan(plan)) {
    if (!isProgramWeekInRange(plan, referenceDate)) {
      return []
    }

    const programWeek = getProgramWeekForDate(plan, referenceDate)
    return plan.days
      .filter((day) => !day.is_rest_day && weekNumberFromDayNumber(day.day_number || 1) === programWeek)
      .map((day) => {
        if (day.day_of_week) {
          return DAY_NAME_TO_NUMBER[String(day.day_of_week).toLowerCase()]
        }
        return slotInWeekFromDayNumber(day.day_number || 1)
      })
      .filter((value): value is number => typeof value === "number" && value >= 1 && value <= 7)
      .sort((a, b) => a - b)
  }

  return plan.days
    .filter((day) => !day.is_rest_day)
    .map((day) => {
      if (day.day_of_week) {
        return DAY_NAME_TO_NUMBER[String(day.day_of_week).toLowerCase()]
      }
      return day.day_number
    })
    .filter((value): value is number => typeof value === "number" && value >= 1 && value <= 7)
    .sort((a, b) => a - b)
}

export function getPlanWeeklyGoal(
  plan: WorkoutPlanLike | null | undefined,
  referenceDate: Date = new Date(),
): number {
  if (!plan) return 0

  const fromDays = getPlanTrainingWeekdays(plan, referenceDate).length
  if (fromDays > 0) return fromDays

  if (typeof plan.training_days === "number" && plan.training_days > 0) {
    return plan.training_days
  }
  if (typeof plan.days_per_week === "number" && plan.days_per_week > 0) {
    return plan.days_per_week
  }
  return 0
}

export function getTodaysPlanDay(
  plan: WorkoutPlanLike | null | undefined,
  referenceDate: Date = new Date(),
): WorkoutPlanDay | null {
  return getPlanDayForDate(plan, referenceDate)
}

export function isPlanTrainingWeekday(
  plan: WorkoutPlanLike | null | undefined,
  weekdayNumber: number,
  referenceDate: Date = new Date(),
): boolean {
  const day = getPlanDayForWeekday(plan, weekdayNumber, referenceDate)
  return Boolean(day && !day.is_rest_day)
}

export function groupDaysByWeek<T extends { day_number?: number }>(
  days: T[],
): Array<{ weekIndex: number; days: T[] }> {
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
