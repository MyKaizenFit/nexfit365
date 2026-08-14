import fs from 'fs'
import path from 'path'
import {
  dashboardSectionHref,
  filterUserNavItems,
  isUserNavItemVisible,
  navigateToDashboardSection,
  shouldRedirectHiddenDashboardSection,
  WELLNESS_SECTION,
} from '../dashboard-navigation'

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

  it('hides Bienestar and Mi Perfil from user navigation without blocking Perfil', () => {
    expect(isUserNavItemVisible('wellness')).toBe(false)
    expect(isUserNavItemVisible('profile')).toBe(false)
    expect(isUserNavItemVisible('dashboard')).toBe(true)
    expect(isUserNavItemVisible('settings')).toBe(true)
    expect(shouldRedirectHiddenDashboardSection(WELLNESS_SECTION)).toBe(true)
    expect(shouldRedirectHiddenDashboardSection('profile')).toBe(false)

    const visible = filterUserNavItems([
      { title: 'Inicio', url: 'dashboard' },
      { title: 'Bienestar', url: 'wellness' },
      { title: 'Mi Perfil', url: 'profile' },
      { title: 'Configuración', url: 'settings' },
    ])
    expect(visible.map((item) => item.url)).toEqual(['dashboard', 'settings'])
  })

  it('redirects direct Bienestar URLs to the dashboard', () => {
    const nextConfig = fs.readFileSync(path.join(process.cwd(), 'next.config.mjs'), 'utf8')
    expect(nextConfig).toContain("source: '/bienestar'")
    expect(nextConfig).toContain("source: '/wellness'")
    expect(nextConfig).toContain("destination: '/dashboard'")
  })
})
