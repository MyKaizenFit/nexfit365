import {
  addLocalDays,
  formatLocalDate,
  isIsoDateInLocalWeek,
  mondayOfLocalWeek,
  parseLocalDate,
  shiftLocalWeekSelection,
  todayLocalDate,
} from "../local-date"

describe("local-date", () => {
  it("formats a local calendar date without UTC shift", () => {
    // 18 Jul 2026 01:30 local — must stay 2026-07-18 even in UTC+ timezones
    const d = new Date(2026, 6, 18, 1, 30, 0)
    expect(formatLocalDate(d)).toBe("2026-07-18")
  })

  it("todayLocalDate matches formatLocalDate(new Date())", () => {
    expect(todayLocalDate()).toBe(formatLocalDate(new Date()))
  })

  it("parses YYYY-MM-DD as local midnight, not UTC", () => {
    const parsed = parseLocalDate("2026-09-18")
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(8)
    expect(parsed.getDate()).toBe(18)
  })
})

describe("shiftLocalWeekSelection", () => {
  it("moves Monday, Friday and Sunday to the same weekday next week", () => {
    expect(shiftLocalWeekSelection("2026-09-14", 1)).toBe("2026-09-21")
    expect(shiftLocalWeekSelection("2026-09-18", 1)).toBe("2026-09-25")
    expect(shiftLocalWeekSelection("2026-09-20", 1)).toBe("2026-09-27")
  })

  it("next then previous returns the original date", () => {
    const original = "2026-09-18"
    expect(shiftLocalWeekSelection(shiftLocalWeekSelection(original, 1), -1)).toBe(original)
  })

  it("crosses months and years on the same weekday", () => {
    expect(shiftLocalWeekSelection("2026-09-29", 1)).toBe("2026-10-06")
    expect(shiftLocalWeekSelection("2025-12-29", 1)).toBe("2026-01-05")
  })

  it("does not keep a previous-week Friday selected after shifting", () => {
    const nextFriday = shiftLocalWeekSelection("2026-09-18", 1)
    const nextMonday = mondayOfLocalWeek(parseLocalDate(nextFriday))
    expect(isIsoDateInLocalWeek(nextFriday, nextMonday)).toBe(true)
    expect(isIsoDateInLocalWeek("2026-09-18", nextMonday)).toBe(false)
  })

  it("keeps today inside the week that contains today", () => {
    const today = todayLocalDate()
    const monday = mondayOfLocalWeek(parseLocalDate(today))
    expect(isIsoDateInLocalWeek(today, monday)).toBe(true)
    expect(addLocalDays(formatLocalDate(monday), 7) > today).toBe(true)
  })
})
