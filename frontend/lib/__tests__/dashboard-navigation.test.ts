import { dashboardSectionHref, navigateToDashboardSection } from '../dashboard-navigation'

describe('dashboard navigation helpers', () => {
  it('builds dashboard URLs for root and named sections', () => {
    expect(dashboardSectionHref('dashboard')).toBe('/dashboard')
    expect(dashboardSectionHref('')).toBe('/dashboard')
    expect(dashboardSectionHref('meals')).toBe('/dashboard?section=meals')
    expect(dashboardSectionHref('workouts 3')).toBe('/dashboard?section=workouts%203')
  })

  it('navigates with scroll disabled', () => {
    const router = { push: jest.fn() }

    navigateToDashboardSection(router, 'meals')

    expect(router.push).toHaveBeenCalledWith('/dashboard?section=meals', { scroll: false })
  })
})
