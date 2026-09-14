import {
  buildGetCoalesceKey,
  clearInFlightRequests,
  coalesceInFlight,
  coalesceUserScope,
  inFlightRequestCount,
} from '../request-coalescer'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('request coalescer', () => {
  beforeEach(() => {
    clearInFlightRequests()
  })

  afterEach(() => {
    clearInFlightRequests()
  })

  it('SAME_KEY shares one factory and one result', async () => {
    let calls = 0
    const pending = deferred<string>()
    const first = coalesceInFlight('1:GET:/stats', () => {
      calls += 1
      return pending.promise
    })
    const second = coalesceInFlight('1:GET:/stats', () => {
      calls += 1
      return Promise.resolve('nope')
    })
    expect(calls).toBe(1)
    expect(inFlightRequestCount()).toBe(1)
    pending.resolve('ok')
    await expect(first).resolves.toBe('ok')
    await expect(second).resolves.toBe('ok')
    expect(inFlightRequestCount()).toBe(0)
  })

  it('DIFFERENT_QUERY does not share', async () => {
    let calls = 0
    const keyA = buildGetCoalesceKey(1, 'GET', '/stats?date=A')
    const keyB = buildGetCoalesceKey(1, 'GET', '/stats?date=B')
    expect(keyA).not.toBe(keyB)
    await Promise.all([
      coalesceInFlight(keyA, async () => {
        calls += 1
        return 'a'
      }),
      coalesceInFlight(keyB, async () => {
        calls += 1
        return 'b'
      }),
    ])
    expect(calls).toBe(2)
  })

  it('DIFFERENT_USER does not share the same endpoint', async () => {
    let calls = 0
    const keyA = buildGetCoalesceKey(10, 'GET', '/user-stats/')
    const keyB = buildGetCoalesceKey(20, 'GET', '/user-stats/')
    expect(keyA).not.toBe(keyB)
    const pendingA = deferred<string>()
    const first = coalesceInFlight(keyA, () => {
      calls += 1
      return pendingA.promise
    })
    const second = coalesceInFlight(keyB, async () => {
      calls += 1
      return 'b'
    })
    expect(calls).toBe(2)
    pendingA.resolve('a')
    await expect(first).resolves.toBe('a')
    await expect(second).resolves.toBe('b')
  })

  it('SHARED_ERROR clears the entry so RETRY_AFTER_ERROR starts a new request', async () => {
    let calls = 0
    const pending = deferred<string>()
    const first = coalesceInFlight('k', () => {
      calls += 1
      return pending.promise
    })
    const second = coalesceInFlight('k', () => {
      calls += 1
      return Promise.resolve('nope')
    })
    pending.reject(new Error('down'))
    await expect(first).rejects.toThrow('down')
    await expect(second).rejects.toThrow('down')
    expect(inFlightRequestCount()).toBe(0)

    const third = await coalesceInFlight('k', async () => {
      calls += 1
      return 'ok'
    })
    expect(third).toBe('ok')
    expect(calls).toBe(2)
  })

  it('SUCCESS_CLEANUP does not keep a stale cache entry', async () => {
    await coalesceInFlight('k', async () => 'first')
    expect(inFlightRequestCount()).toBe(0)
    const later = await coalesceInFlight('k', async () => 'second')
    expect(later).toBe('second')
  })

  it('UNMOUNT_SHARED_REQUEST does not cancel the in-flight work', async () => {
    const pending = deferred<string>()
    let cancelled = false
    const shared = coalesceInFlight('k', () => pending.promise)
    const ignored = shared.then((value) => {
      if (cancelled) return 'dropped'
      return value
    })
    cancelled = true
    const stillNeeded = coalesceInFlight('k', async () => 'new')
    pending.resolve('kept')
    await expect(stillNeeded).resolves.toBe('kept')
    await expect(ignored).resolves.toBe('dropped')
  })

  it('scopes keys by user and method+url', () => {
    expect(buildGetCoalesceKey(1, 'get', '/user-stats/')).toBe('1:GET:/user-stats/')
    expect(coalesceUserScope(null, null)).toBe('session')
  })
})
