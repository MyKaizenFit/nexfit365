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
