import { getProgramWeekForAnchor } from "@/lib/workout-plan-utils"

export const WORKOUT_DAY_NAMES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const

export type WorkoutDayName = (typeof WORKOUT_DAY_NAMES)[number]

export function planDurationWeeks(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return Math.floor(parsed)
}

export function weekNumberFromDayNumber(dayNumber: number): number {
  return Math.max(1, Math.floor((dayNumber - 1) / 7) + 1)
}

export function slotInWeekFromDayNumber(dayNumber: number): number {
  return ((dayNumber - 1) % 7) + 1
}

export function dayNumberForWeekSlot(weekNumber: number, slotInWeek: number): number {
  const week = Math.max(1, weekNumber)
  const slot = Math.max(1, Math.min(7, slotInWeek))
  return (week - 1) * 7 + slot
}

export function dayNameToSlot(dayName: string): number {
  const index = WORKOUT_DAY_NAMES.indexOf(dayName as WorkoutDayName)
  return index >= 0 ? index + 1 : 1
}

export function dayNumberForWeekDay(weekNumber: number, dayName: string): number {
  return dayNumberForWeekSlot(weekNumber, dayNameToSlot(dayName))
}

export function dayNumbersForWeek(weekNumber: number): number[] {
  const start = dayNumberForWeekSlot(weekNumber, 1)
  return Array.from({ length: 7 }, (_, index) => start + index)
}

export function programWeekFromCalendarGridWeek(gridWeek: number, durationWeeks: number): number {
  const duration = planDurationWeeks(durationWeeks)
  const normalizedGridWeek = Math.max(1, gridWeek)
  return ((normalizedGridWeek - 1) % duration) + 1
}

/** Semana del plan anclada a una fecha de inicio fija (sin reiniciar cada mes). */
export function programWeekFromAnchorDate(
  date: Date,
  anchorDate: Date | string,
  durationWeeks: number,
): number {
  return getProgramWeekForAnchor(anchorDate, date, durationWeeks)
}

export function workoutDayHasSlot(day: { dayNumber?: number | null }): day is { dayNumber: number } {
  return typeof day.dayNumber === "number" && day.dayNumber > 0
}

export function getWorkoutWeekFromDay(day: { dayNumber?: number | null }): number | null {
  if (!workoutDayHasSlot(day)) return null
  return weekNumberFromDayNumber(day.dayNumber)
}

export function getWorkoutSlotIndexFromDay(day: { dayNumber?: number | null; day?: string }): number {
  if (workoutDayHasSlot(day)) {
    return slotInWeekFromDayNumber(day.dayNumber) - 1
  }
  const nameIndex = WORKOUT_DAY_NAMES.indexOf(day.day as WorkoutDayName)
  return nameIndex >= 0 ? nameIndex : 0
}

export function workoutDayMatchesSlot(
  day: { day?: string; dayNumber?: number | null },
  weekNumber: number,
  dayName: string,
): boolean {
  const targetDayNumber = dayNumberForWeekDay(weekNumber, dayName)
  if (workoutDayHasSlot(day)) {
    return day.dayNumber === targetDayNumber
  }
  return false
}

export function workoutDayInWeek(day: { dayNumber?: number | null }, weekNumber: number): boolean {
  if (!workoutDayHasSlot(day)) return false
  return weekNumberFromDayNumber(day.dayNumber) === weekNumber
}

export function normalizeWorkoutDayNumbers<T extends { day?: string; dayNumber?: number | null }>(
  days: T[],
): Array<T & { dayNumber: number }> {
  return days.map((day, index) => {
    if (workoutDayHasSlot(day)) {
      return day as T & { dayNumber: number }
    }

    const slot = dayNameToSlot(day.day || WORKOUT_DAY_NAMES[index % WORKOUT_DAY_NAMES.length])
    const guessedWeek = Math.max(1, Math.ceil((index + 1) / 7))
    return {
      ...day,
      dayNumber: dayNumberForWeekSlot(guessedWeek, slot),
    }
  })
}
