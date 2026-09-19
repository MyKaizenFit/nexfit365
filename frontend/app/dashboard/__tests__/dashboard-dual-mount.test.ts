import fs from 'fs'
import path from 'path'

/**
 * Source-level mount contract for the dashboard page.
 * Rendering the full tree is too coupled to auth/layout for a reliable unit
 * test; JSX call sites are the actual dual-mount bug.
 */
describe('dashboard single mount', () => {
  const pageSource = fs.readFileSync(
    path.join(process.cwd(), 'app/dashboard/page.tsx'),
    'utf8',
  )
  const contentCalls = pageSource.match(/\{renderContent\(\)\}/g) || []

  it('invokes renderContent() exactly once (single functional tree)', () => {
    expect(contentCalls).toHaveLength(1)
  })

  it('does not keep a second CSS-hidden content tree', () => {
    expect(pageSource).not.toMatch(/Desktop Main Content/)
    expect(pageSource).not.toMatch(/Mobile Main Content/)
    expect(contentCalls).toHaveLength(1)
  })

  it('DESKTOP_LAYOUT_SINGLE_CONTENT: desktop chrome is CSS-hidden, content is shared', () => {
    expect(pageSource).toContain('hidden md:flex h-16 shrink-0')
    expect(pageSource).toContain('{renderContent()}')
    expect(contentCalls).toHaveLength(1)
  })

  it('MOBILE_LAYOUT_SINGLE_CONTENT: mobile chrome stays, content is shared', () => {
    expect(pageSource).toContain('<MobileHeader')
    expect(pageSource).toContain('<MobileNavigation')
    expect(pageSource).toContain('id="mobile-scroll-content"')
    expect(contentCalls).toHaveLength(1)
  })

  it('does not branch the content tree on window size', () => {
    expect(pageSource).not.toMatch(/window\.innerWidth/)
    expect(pageSource).not.toMatch(/matchMedia/)
  })
})
