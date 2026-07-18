import { formatLocalDate, todayLocalDate } from "../local-date"

describe("local-date", () => {
  it("formats a local calendar date without UTC shift", () => {
    // 18 Jul 2026 01:30 local — must stay 2026-07-18 even in UTC+ timezones
    const d = new Date(2026, 6, 18, 1, 30, 0)
    expect(formatLocalDate(d)).toBe("2026-07-18")
  })

  it("todayLocalDate matches formatLocalDate(new Date())", () => {
    expect(todayLocalDate()).toBe(formatLocalDate(new Date()))
  })
})
