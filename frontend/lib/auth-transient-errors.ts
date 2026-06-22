export function isTransientAuthFailure(message?: string | null): boolean {
  if (!message) {
    return false
  }

  const normalized = message.toLowerCase()

  return (
    normalized.includes('error de red') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('timeout') ||
    normalized.includes('temporarily') ||
    normalized.includes('temporal') ||
    normalized.includes('renovación en progreso') ||
    normalized.includes('renovacion en progreso') ||
    normalized.includes('500') ||
    normalized.includes('502') ||
    normalized.includes('503') ||
    normalized.includes('504')
  )
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
