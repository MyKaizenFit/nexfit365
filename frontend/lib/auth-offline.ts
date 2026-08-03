/** Offline mock auth gate — kept separate so unit tests avoid AuthService side effects. */
export function shouldUseOfflineAuthFallback(
  allowOfflineMode: boolean,
  isOfflineMode: boolean,
): boolean {
  return allowOfflineMode && isOfflineMode
}
