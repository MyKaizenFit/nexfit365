/**
 * Fail-closed Premium CTA visibility.
 *
 * Show hire/trial/upgrade CTAs only when membership is loaded and confirmed free.
 * Trial and paid Premium both have Premium access — never advertise Premium to them.
 */

const PREMIUM_ACCESS_STATUSES = new Set(["trial", "active"])
const CONFIRMED_FREE_STATUSES = new Set(["none", "expired", "cancelled"])

export type PremiumCtaMembershipInput = {
  loaded?: boolean | null
  error?: boolean | null
  status?: string | null
  isActive?: boolean | null
  hasActiveMembership?: boolean | null
  role?: string | null
}

function normalizeStatus(status?: string | null): string {
  return (status || "").trim().toLowerCase()
}

export function hasPremiumAccess(input: {
  status?: string | null
  subscription_status?: string | null
  isActive?: boolean | null
  hasActiveMembership?: boolean | null
  has_active_membership?: boolean | null
  role?: string | null
} | null | undefined): boolean {
  if (!input) return false
  if (input.hasActiveMembership === true || input.has_active_membership === true || input.isActive === true) {
    return true
  }
  const status = normalizeStatus(input.status ?? input.subscription_status)
  if (PREMIUM_ACCESS_STATUSES.has(status)) return true
  return (input.role || "").toLowerCase() === "premium"
}

export function canShowPremiumCTA(input: PremiumCtaMembershipInput | null | undefined): boolean {
  if (!input || input.loaded !== true || input.error) return false
  if (input.status == null || String(input.status).trim() === "") return false
  if (hasPremiumAccess(input)) return false
  return CONFIRMED_FREE_STATUSES.has(normalizeStatus(input.status))
}

export function canShowPremiumCTAForUser(
  user: {
    subscription_status?: string | null
    has_active_membership?: boolean | null
    role?: string | null
  } | null | undefined,
  authLoaded = true,
): boolean {
  if (!authLoaded || !user) return false
  return canShowPremiumCTA({
    loaded: true,
    status: user.subscription_status,
    hasActiveMembership: user.has_active_membership,
    role: user.role,
  })
}
