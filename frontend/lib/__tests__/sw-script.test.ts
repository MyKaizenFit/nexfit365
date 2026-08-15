import { execFileSync } from 'child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { readFileSync } from 'fs'
import {
  SW_CACHE_VERSION,
  buildServiceWorkerScript,
  swScope,
} from '../sw-script'

const checkSyntax = (source: string) => {
  const dir = mkdtempSync(join(tmpdir(), 'nexfit-sw-'))
  const file = join(dir, 'sw.js')
  writeFileSync(file, source)
  try {
    execFileSync('node', ['--check', file], { stdio: 'pipe' })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe('service worker script', () => {
  it('is valid JavaScript for /nexfit and empty basePath', () => {
    checkSyntax(buildServiceWorkerScript({ pwaEnabled: true, rawBasePath: '/nexfit' }))
    checkSyntax(buildServiceWorkerScript({ pwaEnabled: true, rawBasePath: '' }))
    checkSyntax(buildServiceWorkerScript({ pwaEnabled: false, rawBasePath: '/nexfit' }))
  })

  it('uses cache v1.9 and only deletes nexfit365-* caches', () => {
    const src = buildServiceWorkerScript({ pwaEnabled: true, rawBasePath: '/nexfit' })
    expect(SW_CACHE_VERSION).toBe('1.9')
    expect(src).toContain("const CACHE_NAME = 'nexfit365-v1.9'")
    expect(src).toContain("name.startsWith('nexfit365-')")
    expect(src).toContain('self.skipWaiting()')
    expect(src).toContain('self.clients.claim()')
    expect(src).not.toContain('nexfit365-v1.8')
  })

  it('does not control the landing origin root', () => {
    const src = buildServiceWorkerScript({ pwaEnabled: true, rawBasePath: '/nexfit' })
    expect(src).toContain('const APP_SCOPE = "/nexfit/"')
    expect(src).toContain('const APP_BASE_PATH = "/nexfit"')
    expect(src).toContain('url.pathname.startsWith(APP_BASE_PATH + \'/\')')
  })

  it('avoids template-literal comment corruption', () => {
    const src = buildServiceWorkerScript({ pwaEnabled: true, rawBasePath: '/nexfit' })
    expect(src).not.toContain('/^https?:///')
    expect(src).toContain("path.startsWith('http://')")
    expect(src).toContain("path.startsWith('https://')")
  })

  it('scopes registration helpers to /nexfit/', () => {
    expect(swScope('/nexfit')).toBe('/nexfit/')
    expect(swScope('')).toBe('/')
  })
})

describe('RegisterServiceWorker', () => {
  it('registers /nexfit/sw.js with scope /nexfit/ via appPath', () => {
    const src = readFileSync(join(__dirname, '../../app/register-sw.tsx'), 'utf8')
    expect(src).toContain("appPath('/sw.js')")
    expect(src).toContain('scope: appScope')
    expect(src).toContain("const appScope = appPath('/')")
    expect(src).toContain('.catch(() => {')
  })
})
