import { computeExercisePrStats } from "../workout-pr-stats"

describe("computeExercisePrStats", () => {
  it("counts RM from weight-only sets (RPE sessions without reps)", () => {
    const stats = computeExercisePrStats([
      {
        date: "2026-07-24",
        completed: true,
        exercises_data: [
          {
            exercise_id: "press",
            exercise_name: "Press banca con mancuernas",
            sets: [
              { completed: true, weight: 7.5, reps: null },
              { completed: true, weight: 10, reps: null },
            ],
          },
        ],
      },
    ])

    expect(stats).toHaveLength(1)
    expect(stats[0].rm).toBe(10)
    expect(stats[0].pr_estimated_1rm).toBe(0)
    expect(stats[0].exercise_name).toBe("Press banca con mancuernas")
  })

  it("still computes PR 1RM when reps are present", () => {
    const stats = computeExercisePrStats([
      {
        date: "2026-07-24",
        completed: true,
        exercises_data: [
          {
            exercise_id: "squat",
            exercise_name: "Sentadilla",
            sets: [{ completed: true, weight: 60, reps: 5 }],
          },
        ],
      },
    ])

    expect(stats[0].rm).toBe(60)
    expect(stats[0].pr_estimated_1rm).toBeCloseTo(60 * (1 + 5 / 30))
    expect(stats[0].pr_weight).toBe(60)
    expect(stats[0].pr_reps).toBe(5)
  })

  it("ignores incomplete logs and does not invent meal-like entries", () => {
    const stats = computeExercisePrStats([
      {
        date: "2026-07-24",
        completed: false,
        exercises_data: [
          {
            exercise_id: "x",
            exercise_name: "Huevos Revueltos",
            sets: [{ completed: true, weight: 100, reps: 10 }],
          },
        ],
      },
    ])
    expect(stats).toEqual([])
  })
})
