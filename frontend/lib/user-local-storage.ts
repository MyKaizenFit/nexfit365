/**
 * User-scoped browser storage helpers.
 *
 * Meal snapshots are keyed by internal user id + date. Logout removes
 * account-specific keys without localStorage.clear().
 */

const GLOBAL_SAFE_KEYS = new Set([
  'nexfit365_cookie_consent',
  'remember_session',
  'remembered_email',
  'nexfit365_app_version',
  'auth_logout_in_progress',
])

const USER_SPECIFIC_EXACT_KEYS = [
  'user_profile',
  'userProfile',
  'initial_form_completed',
  'form_version',
  'nexfit_notification_settings',
  'user_id',
] as const

const USER_SPECIFIC_PREFIXES = [
  'active_workout_',
  'active_workout:',
  'workout_substitutes_',
  'workout_substitutes:',
  'workout_completed_',
  'last_workout_',
  'last_meal_log_',
  'last_weight_entry_',
  'last_achievement_check_',
  'current_streak_',
  'nexfit_energy_score_',
  'coaching-cta-hidden-until:',
] as const

const USER_WORKOUT_KEY = /^(active_workout|workout_substitutes):(.+):(.+):(\d{4}-\d{2}-\d{2})$/

const SESSION_ONLY_EXACT_KEYS = ['dashboard_error_auto_recovered'] as const
const SESSION_ONLY_PREFIXES = ['birthday-toast-'] as const

const LEGACY_MEAL_SELECTIONS_KEY = /^meal-selections-\d{4}-\d{2}-\d{2}$/
const USER_MEAL_SELECTIONS_KEY = /^meal-selections-(.+)-(\d{4}-\d{2}-\d{2})$/

export function getMealSelectionsStorageKey(userId: string | number, date: string): string {
  const id = String(userId).trim()
  const day = String(date).trim()
  if (id === '') {
    throw new Error('getMealSelectionsStorageKey requires userId')
  }
  if (day === '') {
    throw new Error('getMealSelectionsStorageKey requires date')
  }
  return `meal-selections-${id}-${day}`
}

export function getActiveWorkoutStorageKey(
  userId: string | number,
  dayId: string,
  date: string,
): string {
  return workoutScopedKey('active_workout', userId, dayId, date)
}

export function getWorkoutSubstitutesStorageKey(
  userId: string | number,
  dayId: string,
  date: string,
): string {
  return workoutScopedKey('workout_substitutes', userId, dayId, date)
}

function workoutScopedKey(
  prefix: 'active_workout' | 'workout_substitutes',
  userId: string | number,
  dayId: string,
  date: string,
): string {
  const id = String(userId).trim()
  const day = String(dayId).trim()
  const when = String(date).trim()
  if (id === '') throw new Error(`${prefix} key requires userId`)
  if (day === '') throw new Error(`${prefix} key requires dayId`)
  if (when === '') throw new Error(`${prefix} key requires date`)
  return `${prefix}:${id}:${day}:${when}`
}

export function removeLegacyMealSelectionsKey(date: string): void {
  if (typeof window === 'undefined') return
  const day = String(date).trim()
  if (!day) return
  localStorage.removeItem(`meal-selections-${day}`)
}

function isLegacyMealSelectionsKey(key: string): boolean {
  return LEGACY_MEAL_SELECTIONS_KEY.test(key)
}

function mealSelectionsOwnerId(key: string): string | null {
  if (isLegacyMealSelectionsKey(key)) return null
  const match = key.match(USER_MEAL_SELECTIONS_KEY)
  return match ? match[1] : null
}

function normalizedUserId(userId: string | number | null | undefined): string | null {
  if (userId == null) return null
  const id = String(userId).trim()
  return id === '' ? null : id
}

function shouldRemoveMealSelectionsKey(key: string, currentUserId: string | null): boolean {
  if (!key.startsWith('meal-selections-')) return false
  if (isLegacyMealSelectionsKey(key)) return true
  const ownerId = mealSelectionsOwnerId(key)
  if (ownerId == null || currentUserId == null) return true
  return ownerId === currentUserId
}

function workoutKeyOwnerId(key: string): string | null {
  const match = key.match(USER_WORKOUT_KEY)
  return match ? match[2] : null
}

function shouldRemoveWorkoutKey(key: string, currentUserId: string | null): boolean {
  if (key.startsWith('active_workout_') || key.startsWith('workout_substitutes_')) return true
  const ownerId = workoutKeyOwnerId(key)
  if (ownerId == null) return false
  if (currentUserId == null) return true
  return ownerId === currentUserId
}

function shouldRemoveLocalStorageKey(key: string, currentUserId: string | null): boolean {
  if (GLOBAL_SAFE_KEYS.has(key)) return false
  if (shouldRemoveMealSelectionsKey(key, currentUserId)) return true
  if (shouldRemoveWorkoutKey(key, currentUserId)) return true
  if ((USER_SPECIFIC_EXACT_KEYS as readonly string[]).includes(key)) return true
  return USER_SPECIFIC_PREFIXES.some((prefix) => {
    if (prefix === 'active_workout_' || prefix === 'active_workout:') return false
    if (prefix === 'workout_substitutes_' || prefix === 'workout_substitutes:') return false
    return key.startsWith(prefix)
  })
}

function shouldRemoveSessionStorageKey(key: string): boolean {
  if ((SESSION_ONLY_EXACT_KEYS as readonly string[]).includes(key)) return true
  return SESSION_ONLY_PREFIXES.some((prefix) => key.startsWith(prefix))
}

function removeMatchingKeys(storage: Storage, shouldRemove: (key: string) => boolean): void {
  const keys: string[] = []
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i)
    if (key) keys.push(key)
  }
  for (const key of keys) {
    if (shouldRemove(key)) storage.removeItem(key)
  }
}

export function clearUserLocalDataOnLogout(currentUserId?: string | number | null): void {
  if (typeof window === 'undefined') return
  const userId = normalizedUserId(currentUserId)
  removeMatchingKeys(localStorage, (key) => shouldRemoveLocalStorageKey(key, userId))
  removeMatchingKeys(sessionStorage, shouldRemoveSessionStorageKey)
}
