export function remainingSecondsFromEndsAt(endsAt: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((endsAt - now) / 1000))
}
