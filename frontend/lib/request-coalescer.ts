import { parseJwtPayload } from './jwt'

const inFlight = new Map<string, Promise<unknown>>()

export function coalesceUserScope(
  userId?: string | number | null,
  token?: string | null,
): string {
  if (userId != null && String(userId) !== '') return String(userId)
  if (token) {
    const payload = parseJwtPayload(token)
    const id = payload?.user_id ?? payload?.id
    if (id != null && String(id) !== '') return String(id)
  }
  return 'session'
}

export function buildGetCoalesceKey(
  userId: string | number | null | undefined,
  method: string,
  url: string,
): string {
  return `${coalesceUserScope(userId)}:${method.toUpperCase()}:${url}`
}

export function coalesceInFlight<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key)
  if (existing) return existing as Promise<T>

  const pending = factory().finally(() => {
    if (inFlight.get(key) === pending) {
      inFlight.delete(key)
    }
  })
  inFlight.set(key, pending)
  return pending
}

export function clearInFlightRequests(): void {
  inFlight.clear()
}

export function inFlightRequestCount(): number {
  return inFlight.size
}
