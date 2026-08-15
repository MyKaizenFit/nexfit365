describe('appPath', () => {
  const originalBasePath = process.env.NEXT_PUBLIC_BASE_PATH

  afterEach(() => {
    if (originalBasePath === undefined) {
      delete process.env.NEXT_PUBLIC_BASE_PATH
    } else {
      process.env.NEXT_PUBLIC_BASE_PATH = originalBasePath
    }
    jest.resetModules()
  })

  it('leaves internal routes unchanged without basePath', async () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH
    jest.resetModules()
    const { appPath, isAppPath } = await import('../app-path')

    expect(appPath('/dashboard')).toBe('/dashboard')
    expect(appPath('/auth?stale=1')).toBe('/auth?stale=1')
    expect(appPath('/icono.png')).toBe('/icono.png')
    expect(appPath('/NexFit.png')).toBe('/NexFit.png')
    expect(isAppPath('/dashboard', '/dashboard')).toBe(true)
  })

  it('prefixes routes with NEXT_PUBLIC_BASE_PATH=/nexfit', async () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/nexfit'
    jest.resetModules()
    const { appPath, isAppPath } = await import('../app-path')

    expect(appPath('/')).toBe('/nexfit/')
    expect(appPath('/dashboard')).toBe('/nexfit/dashboard')
    expect(appPath('/auth?stale=1')).toBe('/nexfit/auth?stale=1')
    expect(appPath('/nexfit/dashboard')).toBe('/nexfit/dashboard')
    expect(appPath('https://nexfit365.dpdns.org/dashboard')).toBe(
      'https://nexfit365.dpdns.org/dashboard'
    )
    expect(appPath('/favicon.ico')).toBe('/nexfit/favicon.ico')
    expect(appPath('/icono.png')).toBe('/nexfit/icono.png')
    expect(appPath('/NexFit.png')).toBe('/nexfit/NexFit.png')
    expect(appPath('/icono.png?v=3')).toBe('/nexfit/icono.png?v=3')
    expect(appPath('/apple-touch-icon.png?v=3')).toBe(
      '/nexfit/apple-touch-icon.png?v=3'
    )
    expect(isAppPath('/nexfit/dashboard', '/dashboard')).toBe(true)
    expect(isAppPath('/dashboard', '/dashboard')).toBe(false)
    expect(isAppPath('/nexfit/', '/')).toBe(true)
  })

  it('builds Location URLs under /nexfit and strips trailing slash for matching', async () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/nexfit'
    jest.resetModules()
    const { appHref, routePathname } = await import('../app-path')

    expect(routePathname('/')).toBe('/')
    expect(routePathname('/nexfit/')).toBe('/nexfit')
    expect(routePathname('/auth/')).toBe('/auth')
    expect(routePathname('/dashboard/')).toBe('/dashboard')

    expect(appHref('https://metodosk.com/nexfit/dashboard/', '/auth').pathname).toBe(
      '/nexfit/auth'
    )
    expect(appHref('https://metodosk.com/nexfit/', '/').pathname).toBe('/nexfit/')
  })
})
