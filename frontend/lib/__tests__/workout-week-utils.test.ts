import {
  dayNumberForWeekDay,
  dayNumberForWeekSlot,
  programWeekFromCalendarGridWeek,
  weekNumberFromDayNumber,
  workoutDayInWeek,
  workoutDayMatchesSlot,
} from "@/lib/workout-week-utils"

describe("workout-week-utils", () => {
  it("maps day numbers to program weeks and slots", () => {
    expect(weekNumberFromDayNumber(1)).toBe(1)
    expect(weekNumberFromDayNumber(8)).toBe(2)
    expect(dayNumberForWeekSlot(2, 3)).toBe(10)
    expect(dayNumberForWeekDay(2, "Miércoles")).toBe(10)
  })

  it("matches only the exact week/day slot", () => {
    expect(workoutDayMatchesSlot({ dayNumber: 8, day: "Lunes" }, 2, "Lunes")).toBe(true)
    expect(workoutDayMatchesSlot({ dayNumber: 10, day: "Miércoles" }, 2, "Lunes")).toBe(false)
    expect(workoutDayMatchesSlot({ dayNumber: 10, day: "Miércoles" }, 2, "Miércoles")).toBe(true)
  })

  it("does not treat array index as slot when dayNumber is missing", () => {
    expect(workoutDayMatchesSlot({ day: "Miércoles" }, 2, "Lunes")).toBe(false)
    expect(workoutDayInWeek({}, 2)).toBe(false)
  })

  it("cycles calendar grid weeks by program duration", () => {
    expect(programWeekFromCalendarGridWeek(1, 4)).toBe(1)
    expect(programWeekFromCalendarGridWeek(4, 4)).toBe(4)
    expect(programWeekFromCalendarGridWeek(5, 4)).toBe(1)
  })
})
