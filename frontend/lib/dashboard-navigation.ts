export const WELLNESS_SECTION = "wellness"
export const PROFILE_SECTION = "profile"

// ponytail: Bienestar is temporarily hidden from users; flip to false to restore sidebar + direct URL access.
export const WELLNESS_TEMPORARILY_HIDDEN = true

const SIDEBAR_ONLY_HIDDEN_SECTIONS = new Set([PROFILE_SECTION])

export function shouldRedirectHiddenDashboardSection(section: string): boolean {
  return WELLNESS_TEMPORARILY_HIDDEN && section === WELLNESS_SECTION
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
