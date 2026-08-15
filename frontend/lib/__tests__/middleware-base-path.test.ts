/** @jest-environment node */

import { NextRequest } from 'next/server'

describe('middleware auth redirects include basePath', () => {
  const originalBasePath = process.env.NEXT_PUBLIC_BASE_PATH

  afterEach(() => {
    if (originalBasePath === undefined) {
      delete process.env.NEXT_PUBLIC_BASE_PATH
    } else {
      process.env.NEXT_PUBLIC_BASE_PATH = originalBasePath
    }
    jest.resetModules()
  })

  const request = (pathname: string) =>
    new NextRequest(`https://metodosk.com${pathname}`)

  it('sends unauthenticated /dashboard to /nexfit/auth', async () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/nexfit'
    jest.resetModules()
    const { middleware } = await import('../../middleware')

    const res = middleware(request('/dashboard'))
    const location = res.headers.get('location') || ''

    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)
    expect(location).toContain('/nexfit/auth')
    expect(location).not.toMatch(/https:\/\/metodosk\.com\/auth(?:\?|$)/)
  })

  it('matches trailing-slash dashboard the same way', async () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/nexfit'
    jest.resetModules()
    const { middleware } = await import('../../middleware')

    const res = middleware(request('/dashboard/'))
    const location = res.headers.get('location') || ''

    expect(location).toContain('/nexfit/auth')
    expect(location).toContain('redirect=%2Fdashboard')
  })

  it('leaves /auth without basePath when NEXT_PUBLIC_BASE_PATH is empty', async () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH
    jest.resetModules()
    const { middleware } = await import('../../middleware')

    const res = middleware(request('/dashboard'))
    const location = res.headers.get('location') || ''

    expect(location).toMatch(/https:\/\/metodosk\.com\/auth\?/)
    expect(location).not.toContain('/nexfit/auth')
  })
})
