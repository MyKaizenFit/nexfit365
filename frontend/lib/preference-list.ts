function looksLikeSerializedSequence(text: string): boolean {
  const stripped = text.trim()
  return stripped.length >= 2 && "[{".includes(stripped[0]) && "]}".includes(stripped[stripped.length - 1])
}

function parseSerializedSequence(text: string): unknown {
  const stripped = text.trim()
  try {
    return JSON.parse(stripped)
  } catch {
    try {
      return JSON.parse(stripped.replace(/'/g, '"'))
    } catch {
      return null
    }
  }
}

function cleanScalar(text: string): string {
  let value = text.trim()
  for (let i = 0; i < 4; i += 1) {
    const previous = value
    if (value.startsWith("[") && !value.endsWith("]")) {
      value = value.slice(1).trim()
    }
    if (value.endsWith("]") && !value.startsWith("[")) {
      value = value.slice(0, -1).trim()
    }
    if (value.length >= 2 && (value.startsWith('"') || value.startsWith("'")) && value[0] === value[value.length - 1]) {
      value = value.slice(1, -1).trim()
    }
    if (value === previous) break
  }
  return value
}

export function unwrapPreferenceList(value: unknown): string[] {
  if (value == null || value === "") return []

  if (Array.isArray(value)) {
    return value.flatMap((item) => unwrapPreferenceList(item)).filter(Boolean)
  }

  if (typeof value !== "string") {
    const text = String(value).trim()
    return text ? [text] : []
  }

  const trimmed = value.trim()
  if (looksLikeSerializedSequence(trimmed)) {
    const parsed = parseSerializedSequence(trimmed)
    if (parsed != null) {
      return unwrapPreferenceList(parsed)
    }
  }

  return trimmed
    .split(/[\n,;]+/)
    .map(cleanScalar)
    .filter(Boolean)
}

export function formatPreferenceValue(value: unknown): string {
  return unwrapPreferenceList(value).join(", ")
}
