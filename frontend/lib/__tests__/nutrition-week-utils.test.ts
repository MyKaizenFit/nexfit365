import {
  planDurationWeeks,
  resolvePlanWeekNumber,
  weekNumberFromCalendarDate,
} from "@/lib/nutrition-week-utils"

describe("resolvePlanWeekNumber", () => {
  it("returns week 1 without start date", () => {
    expect(resolvePlanWeekNumber(new Date(2026, 6, 16), 4, null)).toBe(1)
  })

  it("cycles from start_date like the backend", () => {
    const start = "2026-06-15"
    expect(resolvePlanWeekNumber(new Date(2026, 5, 15), 4, start)).toBe(1)
    expect(resolvePlanWeekNumber(new Date(2026, 5, 22), 4, start)).toBe(2)
    expect(resolvePlanWeekNumber(new Date(2026, 6, 16), 4, start)).toBe(1)
  })

  it("differs from calendar-month week when start_date is set", () => {
    const date = new Date(2026, 6, 16) // 16 Jul 2026
    expect(weekNumberFromCalendarDate(date, 4)).toBe(3)
    expect(resolvePlanWeekNumber(date, 4, null)).toBe(1)
  })
})

describe("planDurationWeeks", () => {
  it("floors and clamps to at least 1", () => {
    expect(planDurationWeeks(4.9)).toBe(4)
    expect(planDurationWeeks(0)).toBe(1)
    expect(planDurationWeeks(null)).toBe(1)
  })
})
