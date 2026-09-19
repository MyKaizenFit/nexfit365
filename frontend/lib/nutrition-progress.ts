/** Percent of a daily nutrition goal. Can exceed 100 when intake is over target. */
export function nutritionGoalPercent(consumed: number, goal: number): number {
  if (!Number.isFinite(consumed) || !Number.isFinite(goal) || goal <= 0) return 0
  return (consumed / goal) * 100
}

/** Width/value for a fill bar. Bars stay in 0–100 so layout does not overflow. */
export function nutritionBarPercent(percent: number): number {
  if (!Number.isFinite(percent)) return 0
  return Math.max(0, Math.min(100, percent))
}
