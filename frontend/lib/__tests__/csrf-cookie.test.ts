import { readFileSync } from 'fs'
import { join } from 'path'
import {
  expireLegacyRootCsrfCookie,
  getCsrfToken,
  legacyRootCsrfExpireSetCookieLines,
  readCsrfTokenFromCookieHeader,
  storeCsrfFromResponse,
} from '../csrf-cookie'
import { getAuthHeaders } from '../api'

const originalBasePath = process.env.NEXT_PUBLIC_BASE_PATH

afterEach(() => {
  if (originalBasePath === undefined) {
    delete process.env.NEXT_PUBLIC_BASE_PATH
  } else {
    process.env.NEXT_PUBLIC_BASE_PATH = originalBasePath
  }
})

const captureCookieWrites = () => {
  const writes: string[] = []
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: () => '',
    set: (value: string) => {
      writes.push(String(value))
    },
  })
  return writes
}

describe('csrf cookie (Django is the writer)', () => {
  it('does not write a new csrfToken Path=/ cookie', () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/nexfit'
    const writes = captureCookieWrites()

    storeCsrfFromResponse('should-not-be-written')

    expect(writes.some((line) => /max-age=/i.test(line))).toBe(false)
    expect(writes.some((line) => line.includes('csrfToken=should-not-be-written'))).toBe(false)
    expect(writes.every((line) => /path=\/(;|$)/.test(line))).toBe(true)
    expect(writes.some((line) => /path=\/nexfit/i.test(line))).toBe(false)
  })

  it('expires host-only Path=/ leftovers on metodosk without touching /nexfit', () => {
    const lines = legacyRootCsrfExpireSetCookieLines('metodosk.com', true)
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.every((line) => /path=\/(;|$)/.test(line))).toBe(true)
    expect(lines.some((line) => /path=\/nexfit/i.test(line))).toBe(false)
    expect(lines.every((line) => /expires=/i.test(line))).toBe(true)
    expect(lines.some((line) => !line.includes('domain='))).toBe(true)
    expect(lines.some((line) => line.includes('domain=metodosk.com'))).toBe(true)
    expect(lines.some((line) => line.includes('domain=.metodosk.com'))).toBe(false)
  })

  it('reads the backend csrfToken from document.cookie', () => {
    expect(readCsrfTokenFromCookieHeader('csrfToken=from-django')).toBe('from-django')
  })

  it('uses one helper for duplicates (last pair)', () => {
    expect(
      readCsrfTokenFromCookieHeader('csrfToken=stale-root; other=1; csrfToken=django-nexfit')
    ).toBe('django-nexfit')
  })

  it('getAuthHeaders uses the same CSRF helper', () => {
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      writable: true,
      value: 'csrfToken=stale-root; csrfToken=django-nexfit',
    })
    expect(getCsrfToken()).toBe('django-nexfit')
    expect(getAuthHeaders()['X-CSRFToken']).toBe(getCsrfToken())
  })

  it('refresh keeps credentials include', () => {
    const src = readFileSync(join(__dirname, '../auth-service.ts'), 'utf8')
    expect(src).toMatch(
      /postAuthWithTransientRetry\(\s*buildApiUrl\(AUTH_ENDPOINTS\.REFRESH\)[\s\S]*?\)/
    )
    expect(src).toMatch(/private async postAuthWithTransientRetry[\s\S]*credentials: 'include'/)
  })
})

describe('expireLegacyRootCsrfCookie', () => {
  it('writes Path=/ expirations when the app is under a base path', () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/nexfit'
    const writes = captureCookieWrites()

    expireLegacyRootCsrfCookie()

    expect(writes.some((line) => line.startsWith('csrfToken=;') && /path=\/(;|$)/.test(line))).toBe(true)
    expect(writes.some((line) => /path=\/nexfit/i.test(line))).toBe(false)
  })

  it('does not expire Path=/ when NEXT_PUBLIC_BASE_PATH is empty', () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH
    const writes = captureCookieWrites()

    expireLegacyRootCsrfCookie()

    expect(writes).toEqual([])
  })
})
