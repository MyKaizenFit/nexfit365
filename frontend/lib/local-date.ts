/** Calendar YYYY-MM-DD in the user's local timezone (not UTC). */
export function formatLocalDate(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function todayLocalDate(): string {
  return formatLocalDate(new Date())
}

/** Parse YYYY-MM-DD as a local calendar date. `new Date('YYYY-MM-DD')` is UTC and shifts the day. */
export function parseLocalDate(iso: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "").trim())
  if (!match) return new Date(NaN)
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

export function addLocalDays(iso: string, days: number): string {
  const date = parseLocalDate(iso)
  date.setDate(date.getDate() + days)
  return formatLocalDate(date)
}

/** Keep the same weekday when moving between weeks (Mon→Mon, Fri→Fri). */
export function shiftLocalWeekSelection(iso: string, deltaWeeks: number): string {
  return addLocalDays(iso, deltaWeeks * 7)
}

export function mondayOfLocalWeek(date: Date = new Date()): Date {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const weekday = monday.getDay()
  const diff = weekday === 0 ? -6 : 1 - weekday
  monday.setDate(monday.getDate() + diff)
  return monday
}

export function isIsoDateInLocalWeek(iso: string, weekStart: Date): boolean {
  const start = formatLocalDate(weekStart)
  const end = addLocalDays(start, 6)
  return iso >= start && iso <= end
}
