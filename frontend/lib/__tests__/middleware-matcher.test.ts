/** @jest-environment node */

import { config } from '../../middleware'

/**
 * Next 15 compiles middleware matchers with basePath as:
 *   ^/nexfit(?:/_next/data/...)?(?:<originalSource>)(?:.json|.rsc|...)?[/#?]?$
 * originalSource already starts with `/`.
 */
function compiledMatcher(originalSource: string, basePath = '/nexfit') {
  const inner = originalSource.replace(/^\//, '').replace(/\//g, '\\/')
  return new RegExp(
    `^${basePath.replace(/\//g, '\\/')}(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/${inner})(\\.json|\\.rsc|\\.segments\\/.+\\.segment\\.rsc)?[\\/#\\?]?$`
  )
}

describe('middleware matcher excludes nexfit root', () => {
  const source = String(config.matcher[0])
  const rx = compiledMatcher(source)

  it('uses .+ so /nexfit/ is not matched', () => {
    expect(source).toMatch(/public\)\.\+\)$/)
    expect(rx.test('/nexfit/')).toBe(false)
  })

  it('still matches nested app routes', () => {
    expect(rx.test('/nexfit/auth/')).toBe(true)
    expect(rx.test('/nexfit/dashboard/')).toBe(true)
  })
})
