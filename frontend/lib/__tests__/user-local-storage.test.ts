import {
  clearUserLocalDataOnLogout,
  getActiveWorkoutStorageKey,
  getMealSelectionsStorageKey,
  getWorkoutSubstitutesStorageKey,
  removeLegacyMealSelectionsKey,
} from '../user-local-storage'
import { coalesceInFlight, inFlightRequestCount } from '../request-coalescer'

describe('getMealSelectionsStorageKey', () => {
  it('requires userId and date and is deterministic', () => {
    expect(getMealSelectionsStorageKey(42, '2026-09-09')).toBe('meal-selections-42-2026-09-09')
    expect(getMealSelectionsStorageKey('42', '2026-09-09')).toBe('meal-selections-42-2026-09-09')
    expect(getMealSelectionsStorageKey(42, '2026-09-09')).toBe(
      getMealSelectionsStorageKey(42, '2026-09-09'),
    )
  })

  it('does not use email or other PII', () => {
    const key = getMealSelectionsStorageKey(7, '2026-09-09')
    expect(key).not.toMatch(/@/)
    expect(key).not.toContain('token')
  })

  it('throws when userId or date is missing', () => {
    expect(() => getMealSelectionsStorageKey('  ', '2026-09-09')).toThrow(/userId/)
    expect(() => getMealSelectionsStorageKey(1, '  ')).toThrow(/date/)
  })
})

describe('removeLegacyMealSelectionsKey', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('removes only the date-only key, not the user-scoped key', () => {
    localStorage.setItem('meal-selections-2026-09-09', '{"legacy":true}')
    localStorage.setItem('meal-selections-1-2026-09-09', '{"user":true}')
    removeLegacyMealSelectionsKey('2026-09-09')
    expect(localStorage.getItem('meal-selections-2026-09-09')).toBeNull()
    expect(localStorage.getItem('meal-selections-1-2026-09-09')).toBe('{"user":true}')
  })
})

describe('clearUserLocalDataOnLogout', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('removes user-specific and session keys and preserves global-safe and unknown keys', () => {
    localStorage.setItem('meal-selections-1-2026-09-09', '{"option":"Plato A"}')
    localStorage.setItem('meal-selections-2026-09-09', '{"legacy":true}')
    localStorage.setItem('active_workout_day-1_2026-09-09', '{"started":true}')
    localStorage.setItem('workout_substitutes_day-1_2026-09-09', '{}')
    localStorage.setItem('workout_completed_day-1_2026-09-09', '[]')
    localStorage.setItem('user_profile', '{"userId":1}')
    localStorage.setItem('userProfile', '{}')
    localStorage.setItem('initial_form_completed', 'true')
    localStorage.setItem('form_version', '3')
    localStorage.setItem('nexfit_notification_settings', '{"email":true}')
    localStorage.setItem('nexfit_energy_score_2026-09-09', '4')
    localStorage.setItem('last_workout_1', '2026-09-09')
    localStorage.setItem('coaching-cta-hidden-until:global', '999')
    localStorage.setItem('nexfit365_cookie_consent', 'accepted')
    localStorage.setItem('remember_session', 'true')
    localStorage.setItem('remembered_email', 'keep@example.com')
    localStorage.setItem('nexfit365_app_version', '1.2.3')
    localStorage.setItem('auth_logout_in_progress', 'true')
    localStorage.setItem('user_id', '1')
    localStorage.setItem('rule_9_last_triggered', '2026-09-09T00:00:00.000Z')
    localStorage.setItem('notifications', '[]')
    localStorage.setItem('userSettings', '{}')

    sessionStorage.setItem('birthday-toast-1-2026-09-09', 'shown')
    sessionStorage.setItem('dashboard_error_auto_recovered', '1')

    clearUserLocalDataOnLogout()

    expect(localStorage.getItem('meal-selections-1-2026-09-09')).toBeNull()
    expect(localStorage.getItem('meal-selections-2026-09-09')).toBeNull()
    expect(localStorage.getItem('active_workout_day-1_2026-09-09')).toBeNull()
    expect(localStorage.getItem('workout_substitutes_day-1_2026-09-09')).toBeNull()
    expect(localStorage.getItem('workout_completed_day-1_2026-09-09')).toBeNull()
    expect(localStorage.getItem('user_profile')).toBeNull()
    expect(localStorage.getItem('userProfile')).toBeNull()
    expect(localStorage.getItem('initial_form_completed')).toBeNull()
    expect(localStorage.getItem('form_version')).toBeNull()
    expect(localStorage.getItem('nexfit_notification_settings')).toBeNull()
    expect(localStorage.getItem('nexfit_energy_score_2026-09-09')).toBeNull()
    expect(localStorage.getItem('last_workout_1')).toBeNull()
    expect(localStorage.getItem('coaching-cta-hidden-until:global')).toBeNull()
    expect(sessionStorage.getItem('birthday-toast-1-2026-09-09')).toBeNull()
    expect(sessionStorage.getItem('dashboard_error_auto_recovered')).toBeNull()

    expect(localStorage.getItem('nexfit365_cookie_consent')).toBe('accepted')
    expect(localStorage.getItem('remember_session')).toBe('true')
    expect(localStorage.getItem('remembered_email')).toBe('keep@example.com')
    expect(localStorage.getItem('nexfit365_app_version')).toBe('1.2.3')
    expect(localStorage.getItem('auth_logout_in_progress')).toBe('true')
    expect(localStorage.getItem('user_id')).toBeNull()
    expect(localStorage.getItem('rule_9_last_triggered')).toBe('2026-09-09T00:00:00.000Z')
    expect(localStorage.getItem('notifications')).toBe('[]')
    expect(localStorage.getItem('userSettings')).toBe('{}')
  })

  it('with current user id removes that user meal cache and legacy, not another user cache', () => {
    localStorage.setItem('meal-selections-1-2026-09-09', '{"option":"Plato A"}')
    localStorage.setItem('meal-selections-2-2026-09-09', '{"option":"Plato B"}')
    localStorage.setItem('meal-selections-12-2026-09-09', '{"option":"Plato C"}')
    localStorage.setItem('meal-selections-2026-09-09', '{"legacy":true}')
    localStorage.setItem('active_workout_day-1_2026-09-09', '{"started":true}')
    localStorage.setItem('nexfit365_cookie_consent', 'accepted')

    clearUserLocalDataOnLogout(1)

    expect(localStorage.getItem('meal-selections-1-2026-09-09')).toBeNull()
    expect(localStorage.getItem('meal-selections-2-2026-09-09')).toBe('{"option":"Plato B"}')
    expect(localStorage.getItem('meal-selections-12-2026-09-09')).toBe('{"option":"Plato C"}')
    expect(localStorage.getItem('meal-selections-2026-09-09')).toBeNull()
    expect(localStorage.getItem('active_workout_day-1_2026-09-09')).toBeNull()
    expect(localStorage.getItem('nexfit365_cookie_consent')).toBe('accepted')
  })

  it('clears in-flight GET coalescing so the next user cannot reuse them', () => {
    void coalesceInFlight('1:GET:/user-stats/', () => new Promise(() => {}))
    expect(inFlightRequestCount()).toBe(1)
    clearUserLocalDataOnLogout(1)
    expect(inFlightRequestCount()).toBe(0)
  })
})

describe('workout storage keys', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('scopes active workout and substitutes by user id, day and date', () => {
    expect(getActiveWorkoutStorageKey(1, 'day-1', '2026-09-09')).toBe('active_workout:1:day-1:2026-09-09')
    expect(getWorkoutSubstitutesStorageKey(1, 'day-1', '2026-09-09')).toBe(
      'workout_substitutes:1:day-1:2026-09-09',
    )
  })

  it('logout removes current user workout keys and legacy keys, not another user', () => {
    localStorage.setItem('active_workout:1:day-1:2026-09-09', '{"user":1}')
    localStorage.setItem('active_workout:2:day-1:2026-09-09', '{"user":2}')
    localStorage.setItem('active_workout_day-1_2026-09-09', '{"legacy":true}')
    localStorage.setItem('workout_substitutes:1:day-1:2026-09-09', '{}')
    clearUserLocalDataOnLogout(1)
    expect(localStorage.getItem('active_workout:1:day-1:2026-09-09')).toBeNull()
    expect(localStorage.getItem('workout_substitutes:1:day-1:2026-09-09')).toBeNull()
    expect(localStorage.getItem('active_workout_day-1_2026-09-09')).toBeNull()
    expect(localStorage.getItem('active_workout:2:day-1:2026-09-09')).toBe('{"user":2}')
  })
})
