import fs from 'fs'
import path from 'path'
import {
  dashboardSectionHref,
  filterUserNavItems,
  isUserNavItemVisible,
  navigateToDashboardSection,
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

  it('hides Bienestar and Mi Perfil while keeping Descanso visible', () => {
    expect(isUserNavItemVisible('wellness')).toBe(false)
    expect(isUserNavItemVisible('rest-wellness')).toBe(true)
    expect(isUserNavItemVisible('profile')).toBe(false)
    expect(isUserNavItemVisible('dashboard')).toBe(true)
    expect(isUserNavItemVisible('settings')).toBe(true)
    expect(shouldRedirectHiddenDashboardSection(WELLNESS_SECTION)).toBe(true)
    expect(shouldRedirectHiddenDashboardSection(REST_WELLNESS_SECTION)).toBe(false)
    expect(shouldRedirectHiddenDashboardSection('profile')).toBe(false)

    const visible = filterUserNavItems([
      { title: 'Inicio', url: 'dashboard' },
      { title: 'Bienestar', url: 'wellness' },
      { title: 'Descanso', url: 'rest-wellness' },
      { title: 'Mi Perfil', url: 'profile' },
      { title: 'Configuración', url: 'settings' },
    ])
    expect(visible.map((item) => item.url)).toEqual(['dashboard', 'rest-wellness', 'settings'])
  })

  it('keeps Descanso in the desktop sidebar menu and the mobile more menu', () => {
    const desktopMenu = [
      { title: 'Inicio', url: 'dashboard' },
      { title: 'Bienestar', url: 'wellness' },
      { title: 'Descanso', url: 'rest-wellness' },
      { title: 'Entrenamientos', url: 'workouts-3' },
      { title: 'Configuración', url: 'settings' },
    ]
    const mobileMoreMenu = [
      { title: 'Bienestar', url: 'wellness' },
      { title: 'Descanso', url: 'rest-wellness' },
      { title: 'Logros', url: 'achievements' },
      { title: 'Configuración', url: 'settings' },
    ]
    expect(filterUserNavItems(desktopMenu).map((item) => item.url)).toEqual([
      'dashboard',
      'rest-wellness',
      'workouts-3',
      'settings',
    ])
    expect(filterUserNavItems(mobileMoreMenu).map((item) => item.url)).toEqual([
      'rest-wellness',
      'achievements',
      'settings',
    ])
    expect(filterUserNavItems(desktopMenu).some((item) => item.title === 'Descanso')).toBe(true)
    expect(filterUserNavItems(mobileMoreMenu).some((item) => item.title === 'Descanso')).toBe(true)
  })

  it('redirects direct Bienestar URLs without redirecting Descanso', () => {
    const nextConfig = fs.readFileSync(path.join(process.cwd(), 'next.config.mjs'), 'utf8')
    expect(nextConfig).toContain("source: '/bienestar'")
    expect(nextConfig).toContain("source: '/wellness'")
    expect(nextConfig).not.toContain("source: '/descanso'")
    expect(nextConfig).not.toContain("source: '/rest-wellness'")
    expect(nextConfig).toContain("destination: '/dashboard'")
  })

  it('keeps the dashboard greeting without a waving hand icon', () => {
    const dashboardPage = fs.readFileSync(path.join(process.cwd(), 'app/dashboard/page.tsx'), 'utf8')
    expect(dashboardPage).toContain("¡Hola, {user?.first_name || 'Usuario'}!")
    expect(dashboardPage).not.toContain("¡Hola, {user?.first_name || 'Usuario'}! 👋")
  })
})
