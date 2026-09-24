"use client"

export function safeJsonParse<T>(
  value: string | null | undefined,
  fallback: T,
  context?: string
): T {
  if (!value) return fallback

  try {
    return JSON.parse(value) as T
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `[safeJsonParse] Failed to parse JSON${context ? ` in ${context}` : ''}:`,
        error instanceof Error ? error.message : 'Unknown error',
        '\nValue preview:', String(value).slice(0, 100)
      )
    }
    return fallback
  }
}
