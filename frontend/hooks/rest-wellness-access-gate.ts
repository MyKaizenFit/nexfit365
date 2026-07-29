/** Pure gate used by the hook — keep free of React so the self-check stays runnable. */
export function shouldQueryRestWellnessAccess(
  authLoading: boolean,
  isAuthenticated: boolean,
): boolean {
  return !authLoading && isAuthenticated
}
