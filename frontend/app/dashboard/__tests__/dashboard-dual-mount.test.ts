import fs from 'fs'
import path from 'path'

/**
 * Source-level characterization of the dashboard dual mount.
 * Rendering the full dashboard tree is too coupled to auth/layout to be a
 * reliable unit test; this asserts the actual JSX call sites instead.
 */
describe('dashboard dual mount', () => {
  const pageSource = fs.readFileSync(
    path.join(process.cwd(), 'app/dashboard/page.tsx'),
    'utf8',
  )

  it('[characterization] renderContent() is invoked twice (desktop + mobile trees both mount)', () => {
    const calls = pageSource.match(/\{renderContent\(\)\}/g) || []
    expect(calls).toHaveLength(2)
  })

  it.failing('[expected-until-fix] a logical section must mount only one content tree', () => {
    const calls = pageSource.match(/\{renderContent\(\)\}/g) || []
    expect(calls).toHaveLength(1)
  })
})
