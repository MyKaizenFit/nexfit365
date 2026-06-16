/**
 * Formatea errores de la API Django REST (detail, non_field_errors, campos).
 */
export function formatApiError(data: unknown, fallback = "Error en la solicitud"): string {
  if (data == null) {
    return fallback
  }

  if (typeof data === "string") {
    const trimmed = data.trim()
    return trimmed || fallback
  }

  if (typeof data !== "object") {
    return fallback
  }

  const record = data as Record<string, unknown>

  if (record.detail != null && String(record.detail).trim()) {
    return String(record.detail)
  }

  if (Array.isArray(record.non_field_errors) && record.non_field_errors.length > 0) {
    return record.non_field_errors.map(String).join("\n")
  }

  const fieldLabels: Record<string, string> = {
    default_nutrition_plan_id: "Plan nutricional",
    default_workout_program_id: "Programa de entrenamiento",
    name: "Nombre",
    priority: "Prioridad",
  }

  const parts: string[] = []
  for (const [key, value] of Object.entries(record)) {
    if (key === "detail" || key === "non_field_errors") {
      continue
    }
    const label = fieldLabels[key] ?? key
    if (Array.isArray(value)) {
      parts.push(`${label}: ${value.map(String).join(", ")}`)
    } else if (typeof value === "string" && value.trim()) {
      parts.push(`${label}: ${value}`)
    }
  }

  return parts.length > 0 ? parts.join("\n") : fallback
}
