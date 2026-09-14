import fs from 'fs'
import path from 'path'

/**
 * Source inventory of dashboard HOME GETs after PR5 single-mount.
 * Counts callers, not live network. Coalescing is asserted in service tests.
 */
describe('dashboard home request fan-out (source)', () => {
  const page = fs.readFileSync(path.join(process.cwd(), 'app/dashboard/page.tsx'), 'utf8')
  const enhanced = fs.readFileSync(
    path.join(process.cwd(), 'components/dashboard/dashboard-enhanced.tsx'),
    'utf8',
  )
  const mobileHeader = fs.readFileSync(
    path.join(process.cwd(), 'app/dashboard/components/mobile-header.tsx'),
    'utf8',
  )
  const dropdown = fs.readFileSync(
    path.join(process.cwd(), 'app/dashboard/components/notifications-dropdown.tsx'),
    'utf8',
  )

  it('keeps a single renderContent tree', () => {
    expect(page.match(/\{renderContent\(\)\}/g) || []).toHaveLength(1)
  })

  it('documents home useUserData callers: page + DashboardEnhanced', () => {
    const pageCalls = page.match(/useUserData\(\)/g) || []
    const enhancedCalls = enhanced.match(/useUserData\(\)/g) || []
    expect(pageCalls).toHaveLength(1)
    expect(enhancedCalls).toHaveLength(1)
  })

  it('documents notification chrome: page hook + desktop dropdown + mobile dropdown', () => {
    expect(page).toContain('useNotificationsEnhanced()')
    expect(page).toContain('<NotificationsDropdown />')
    expect(page).toContain('<MobileHeader')
    expect(mobileHeader).toContain('<NotificationsDropdown')
    expect(dropdown).toContain('useNotificationsEnhanced()')
  })

  it('does not restore a second CSS-hidden content tree', () => {
    expect(page).not.toMatch(/Desktop Main Content/)
    expect(page).not.toMatch(/Mobile Main Content/)
  })
})
