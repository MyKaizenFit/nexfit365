import { getActiveLegalDocuments, getLegalStatus } from '@/lib/legal-service'

describe('legal service', () => {
  const fetchMock = jest.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  it('reads active documents without sending a user id', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => '20' },
      text: async () => JSON.stringify([{ code: 'privacy', version: 'test-1' }]),
    })

    const documents = await getActiveLegalDocuments('es-ES')

    expect(documents[0].code).toBe('privacy')
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/legal/documents/active/?locale=es-ES')
    expect(options.method).toBe('GET')
    expect(options.body).toBeUndefined()
  })

  it('reads the authenticated status endpoint', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => '20' },
      text: async () => JSON.stringify({ locale: 'es-ES', pending: [], accepted: [], optional_consents: [] }),
    })

    const status = await getLegalStatus()

    expect(status.pending).toEqual([])
    const urls = fetchMock.mock.calls.map((call) => String(call[0]))
    expect(urls.some((url) => url.includes('/api/legal/status/'))).toBe(true)
  })
})
