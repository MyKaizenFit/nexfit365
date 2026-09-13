import { remainingSecondsFromEndsAt } from '../rest-timer'

describe('remainingSecondsFromEndsAt', () => {
  it('subtracts elapsed background time', () => {
    const endsAt = 1_000_000
    expect(remainingSecondsFromEndsAt(endsAt, 1_000_000 - 30_000)).toBe(30)
  })

  it('clamps at zero after the rest window', () => {
    expect(remainingSecondsFromEndsAt(1_000_000, 1_090_000)).toBe(0)
  })
})
