import fs from 'fs'
import path from 'path'
import {
  dashboardSectionHref,
  filterUserNavItems,
  isUserNavItemVisible,
  navigateToDashboardSection,
  RECOMMENDATIONS_SECTION,
  REST_WELLNESS_SECTION,
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

  it('hides Recomendaciones, Bienestar, Descanso and Mi Perfil from user navigation without blocking Perfil', () => {
    expect(isUserNavItemVisible('recommendations')).toBe(false)
    expect(isUserNavItemVisible('wellness')).toBe(false)
    expect(isUserNavItemVisible('rest-wellness')).toBe(false)
    expect(isUserNavItemVisible('profile')).toBe(false)
    expect(isUserNavItemVisible('dashboard')).toBe(true)
    expect(isUserNavItemVisible('settings')).toBe(true)
    expect(shouldRedirectHiddenDashboardSection(RECOMMENDATIONS_SECTION)).toBe(true)
    expect(shouldRedirectHiddenDashboardSection(WELLNESS_SECTION)).toBe(true)
    expect(shouldRedirectHiddenDashboardSection(REST_WELLNESS_SECTION)).toBe(true)
    expect(shouldRedirectHiddenDashboardSection('profile')).toBe(false)

    const visible = filterUserNavItems([
      { title: 'Inicio', url: 'dashboard' },
      { title: 'Recomendaciones', url: 'recommendations' },
      { title: 'Bienestar', url: 'wellness' },
      { title: 'Descanso', url: 'rest-wellness' },
      { title: 'Mi Perfil', url: 'profile' },
      { title: 'Configuración', url: 'settings' },
    ])
    expect(visible.map((item) => item.url)).toEqual(['dashboard', 'settings'])
  })

  it('hides Recomendaciones and Descanso from the desktop sidebar menu and the mobile more menu', () => {
    const desktopMenu = [
      { title: 'Inicio', url: 'dashboard' },
      { title: 'Recomendaciones', url: 'recommendations' },
      { title: 'Bienestar', url: 'wellness' },
      { title: 'Descanso', url: 'rest-wellness' },
      { title: 'Entrenamientos', url: 'workouts-3' },
      { title: 'Configuración', url: 'settings' },
    ]
    const mobileMoreMenu = [
      { title: 'Recomendaciones', url: 'recommendations' },
      { title: 'Bienestar', url: 'wellness' },
      { title: 'Descanso', url: 'rest-wellness' },
      { title: 'Logros', url: 'achievements' },
      { title: 'Configuración', url: 'settings' },
    ]
    expect(filterUserNavItems(desktopMenu).map((item) => item.url)).toEqual([
      'dashboard',
      'workouts-3',
      'settings',
    ])
    expect(filterUserNavItems(mobileMoreMenu).map((item) => item.url)).toEqual([
      'achievements',
      'settings',
    ])
    expect(filterUserNavItems(desktopMenu).some((item) => item.title === 'Recomendaciones')).toBe(false)
    expect(filterUserNavItems(mobileMoreMenu).some((item) => item.title === 'Recomendaciones')).toBe(false)
    expect(filterUserNavItems(desktopMenu).some((item) => item.title === 'Descanso')).toBe(false)
    expect(filterUserNavItems(mobileMoreMenu).some((item) => item.title === 'Descanso')).toBe(false)
  })

  it('redirects direct Recomendaciones, Bienestar and Descanso URLs to the dashboard', () => {
    const nextConfig = fs.readFileSync(path.join(process.cwd(), 'next.config.mjs'), 'utf8')
    expect(nextConfig).toContain("source: '/recommendations'")
    expect(nextConfig).toContain("source: '/recomendaciones'")
    expect(nextConfig).toContain("source: '/bienestar'")
    expect(nextConfig).toContain("source: '/wellness'")
    expect(nextConfig).toContain("source: '/descanso'")
    expect(nextConfig).toContain("source: '/rest-wellness'")
    expect(nextConfig).toContain("destination: '/dashboard'")
  })
})
