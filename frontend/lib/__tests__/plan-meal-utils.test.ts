import { buildMealCountMismatchReport, computeMealsPerDay, weeksHaveDifferentStructure } from "@/lib/plan-meal-utils"

describe("plan-meal-utils", () => {
  it("computes max meals per specific day", () => {
    const meals = [
      { day_of_week: 1, week_number: 1, order_index: 1 },
      { day_of_week: 1, week_number: 1, order_index: 2 },
      { day_of_week: 1, week_number: 1, order_index: 3 },
      { day_of_week: 1, week_number: 1, order_index: 4 },
      { day_of_week: 2, week_number: 1, order_index: 1 },
      { day_of_week: 2, week_number: 1, order_index: 2 },
      { day_of_week: 2, week_number: 1, order_index: 3 },
      { day_of_week: 2, week_number: 1, order_index: 4 },
      { day_of_week: 2, week_number: 1, order_index: 5 },
    ]

    expect(computeMealsPerDay(meals)).toBe(5)
  })

  it("warns when declared meals do not match configured day", () => {
    const meals = [
      { day_of_week: 1, week_number: 1, order_index: 1, meal_type: "breakfast" },
      { day_of_week: 1, week_number: 1, order_index: 2, meal_type: "lunch" },
      { day_of_week: 1, week_number: 1, order_index: 3, meal_type: "snack" },
      { day_of_week: 1, week_number: 1, order_index: 4, meal_type: "dinner" },
    ]

    const report = buildMealCountMismatchReport(meals, 5)

    expect(report.should_warn).toBe(true)
    expect(report.mismatched_days).toHaveLength(1)
    expect(report.mismatched_days[0].meal_count).toBe(4)
  })

  it("detects different meal counts across weeks", () => {
    const meals = [
      { day_of_week: 1, week_number: 1, order_index: 1 },
      { day_of_week: 1, week_number: 1, order_index: 2 },
      { day_of_week: 1, week_number: 1, order_index: 3 },
      { day_of_week: 1, week_number: 2, order_index: 1 },
      { day_of_week: 1, week_number: 2, order_index: 2 },
      { day_of_week: 1, week_number: 2, order_index: 3 },
      { day_of_week: 1, week_number: 2, order_index: 4 },
    ]

    expect(weeksHaveDifferentStructure(meals, 4)).toBe(true)
  })
})
