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
    expect(isAppPath('/nexfit/dashboard', '/dashboard')).toBe(true)
    expect(isAppPath('/dashboard', '/dashboard')).toBe(false)
  })
})
