/**
 * Formatea errores de la API Django REST (detail, non_field_errors, campos).
 */

const FIELD_LABELS: Record<string, string> = {
  default_nutrition_plan_id: "Plan nutricional",
  default_workout_program_id: "Programa de entrenamiento",
  name: "Nombre",
  priority: "Prioridad",
  time: "Hora",
  meal_type: "Tipo de comida",
  week_number: "Semana",
  day_of_week: "Día",
  order_index: "Orden",
  meals: "Comidas",
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value)
}

function formatFieldValue(value: unknown): string {
  if (value == null) {
    return ""
  }
  if (typeof value === "string") {
    return value.trim()
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  if (Array.isArray(value)) {
    return value.map(formatFieldValue).filter(Boolean).join(", ")
  }
  if (isPlainObject(value)) {
    return formatApiError(value, "")
  }
  return ""
}

export function formatApiError(data: unknown, fallback = "Error en la solicitud"): string {
  if (data == null) {
    return fallback
  }

  if (typeof data === "string") {
    const trimmed = data.trim()
    return trimmed || fallback
  }

  if (Array.isArray(data)) {
    const joined = data.map((item) => formatApiError(item, "")).filter(Boolean).join("\n")
    return joined || fallback
  }

  if (typeof data !== "object") {
    return fallback
  }

  const record = data as Record<string, unknown>

  if (record.detail != null) {
    if (typeof record.detail === "string" && record.detail.trim()) {
      return record.detail.trim()
    }
    const nestedDetail = formatApiError(record.detail, "")
    if (nestedDetail) {
      return nestedDetail
    }
  }

  if (Array.isArray(record.non_field_errors) && record.non_field_errors.length > 0) {
    return record.non_field_errors.map(String).join("\n")
  }

  const parts: string[] = []
  for (const [key, value] of Object.entries(record)) {
    if (key === "detail" || key === "non_field_errors" || key === "errors") {
      continue
    }
    const formatted = formatFieldValue(value)
    if (!formatted) {
      continue
    }
    const label = FIELD_LABELS[key] ?? key
    parts.push(key === "message" || key === "error" ? formatted : `${label}: ${formatted}`)
  }

  if (parts.length === 0 && record.errors != null) {
    const nestedErrors = formatApiError(record.errors, "")
    if (nestedErrors) {
      return nestedErrors
    }
  }

  return parts.length > 0 ? parts.join("\n") : fallback
}

export function formatHttpError(
  status: number,
  data: unknown,
  options?: {
    validationMessage?: string
    serverMessage?: string
    fallback?: string
  },
): string {
  const validationMessage =
    options?.validationMessage ?? "Hay datos incorrectos en el formulario. Revisa los campos indicados."
  const serverMessage =
    options?.serverMessage ?? "Ha ocurrido un error interno. Inténtalo de nuevo."
  const fallback = options?.fallback ?? "Error en la solicitud"

  if (status >= 500) {
    return serverMessage
  }

  const specific = formatApiError(data, "")
  if (specific) {
    return specific
  }
  if (status === 400) {
    return validationMessage
  }
  return fallback
}
