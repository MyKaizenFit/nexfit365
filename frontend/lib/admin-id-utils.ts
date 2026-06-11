const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const INVALID_ID_STRINGS = new Set(["", "undefined", "null", "nan", "new", "none"])

export function parsePositiveIntId(value: unknown): number | null {
  if (value == null || value === "") return null
  const raw = String(value).trim().toLowerCase()
  if (INVALID_ID_STRINGS.has(raw)) return null
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

export function isValidUserId(value: unknown): value is string | number {
  return parsePositiveIntId(value) != null
}

export function isValidWorkoutPlanId(value: unknown): boolean {
  if (value == null) return false
  const raw = String(value).trim()
  if (!raw || INVALID_ID_STRINGS.has(raw.toLowerCase())) return false
  return UUID_RE.test(raw)
}

export function formatInvalidIdMessage(label: string): string {
  return `${label} no válido. Recarga la página o vuelve al listado e inténtalo de nuevo.`
}
