import { nutritionBarPercent, nutritionGoalPercent } from "../nutrition-progress"

describe("nutritionGoalPercent", () => {
  it("reports 110% when 2200 kcal are logged against a 2000 kcal goal", () => {
    expect(nutritionGoalPercent(2200, 2000)).toBeCloseTo(110)
  })

  it("returns 0 when the goal is missing", () => {
    expect(nutritionGoalPercent(500, 0)).toBe(0)
  })
})

describe("nutritionBarPercent", () => {
  it("keeps an over-goal fill at 100 so the bar does not overflow", () => {
    expect(nutritionBarPercent(110)).toBe(100)
  })

  it("does not invert over-goal values into an under-goal bar", () => {
    expect(nutritionBarPercent(110)).toBeGreaterThan(nutritionBarPercent(90))
  })
})
