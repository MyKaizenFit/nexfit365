export const WELLNESS_SECTION = "wellness"
export const REST_WELLNESS_SECTION = "rest-wellness"
export const RECOMMENDATIONS_SECTION = "recommendations"
export const PROFILE_SECTION = "profile"

// ponytail: Bienestar and Recomendaciones are temporarily hidden from users; flip to false to restore sidebar + direct URL access.
export const WELLNESS_TEMPORARILY_HIDDEN = true
export const RECOMMENDATIONS_TEMPORARILY_HIDDEN = true

const SIDEBAR_ONLY_HIDDEN_SECTIONS = new Set([PROFILE_SECTION])

export function shouldRedirectHiddenDashboardSection(section: string): boolean {
  if (WELLNESS_TEMPORARILY_HIDDEN && section === WELLNESS_SECTION) return true
  if (RECOMMENDATIONS_TEMPORARILY_HIDDEN && section === RECOMMENDATIONS_SECTION) return true
  return false
}

export function isUserNavItemVisible(url: string): boolean {
  if (SIDEBAR_ONLY_HIDDEN_SECTIONS.has(url)) return false
  if (shouldRedirectHiddenDashboardSection(url)) return false
  return true
}

export function filterUserNavItems<T extends { url: string }>(items: T[]): T[] {
  return items.filter((item) => isUserNavItemVisible(item.url))
}

export function dashboardSectionHref(section: string): string {
  if (!section || section === "dashboard") {
    return "/dashboard"
  }

  return `/dashboard?section=${encodeURIComponent(section)}`
}

export function navigateToDashboardSection(
  router: { push: (href: string, options?: { scroll?: boolean }) => void },
  section: string
) {
  router.push(dashboardSectionHref(section), { scroll: false })
}
