import { readFileSync } from 'fs'
import { join } from 'path'

describe('next.config trailing slash', () => {
  const src = readFileSync(join(__dirname, '../../next.config.mjs'), 'utf8')

  it('canonicalizes with trailingSlash and does not skip slash redirects', () => {
    expect(src).toMatch(/trailingSlash:\s*true/)
    expect(src).not.toMatch(/skipTrailingSlashRedirect:\s*true/)
  })
})
