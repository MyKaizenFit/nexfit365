export function planDurationWeeks(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return Math.floor(parsed)
}

/** Semana del mes en calendario admin (1-based), ciclando según duración del plan. */
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
