export function planDurationWeeks(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return Math.floor(parsed)
}

/**
 * Semana del ciclo del plan (igual que el backend resolve_plan_week_number).
 * Sin startDate → siempre semana 1 (menú base que se repite en la app).
 */
export function resolvePlanWeekNumber(
  targetDate: Date,
  durationWeeks = 4,
  startDate?: Date | string | null,
): number {
  const duration = planDurationWeeks(durationWeeks)
  if (!startDate) return 1

  const start = typeof startDate === "string"
    ? new Date(`${startDate.slice(0, 10)}T00:00:00`)
    : new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  if (Number.isNaN(start.getTime())) return 1

  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
  const days = Math.floor((target.getTime() - start.getTime()) / 86400000)
  if (days < 0) return 1
  return (Math.floor(days / 7) % duration) + 1
}

/** Semana del mes en calendario (solo plantillas sin start_date). */
export function weekNumberFromCalendarDate(date: Date, durationWeeks = 4): number {
  const duration = planDurationWeeks(durationWeeks)
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
  const leading = (firstOfMonth.getDay() + 6) % 7 // lunes=0
  const weekIndex = Math.floor((date.getDate() - 1 + leading) / 7) + 1
  return ((weekIndex - 1) % duration) + 1
}

export function mealMatchesDayAndWeek(
  meal: { day_of_week?: number | null; week_number?: number | null },
  dayOfWeek: number,
  weekNumber: number,
): boolean {
  const mealDay = meal.day_of_week ?? 1
  const mealWeek = meal.week_number ?? 1
  return mealDay === dayOfWeek && mealWeek === weekNumber
}
