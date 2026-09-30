import { completedYears, productAgeMessage } from './age'

describe('product age', () => {
  const today = new Date(2026, 8, 30)

  it('accepts the 18th birthday and rejects the day before', () => {
    expect(productAgeMessage('2008-09-30', today)).toBeNull()
    expect(productAgeMessage('2008-10-01', today)).toMatch(/18/)
  })

  it('treats a leap-day birthday as reached on 1 March', () => {
    expect(completedYears('2008-02-29', new Date(2026, 1, 28))).toBe(17)
    expect(completedYears('2008-02-29', new Date(2026, 2, 1))).toBe(18)
  })

  it('rejects future and invalid dates', () => {
    expect(productAgeMessage('2999-01-01', today)).toMatch(/futuro/)
    expect(productAgeMessage('no-es-fecha', today)).toMatch(/válida/)
  })
})
