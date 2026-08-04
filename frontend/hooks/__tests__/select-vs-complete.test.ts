/**
 * Contrato: seleccionar/cambiar plato ≠ marcarlo consumido.
 * Espeja la semántica de use-daily-meals.selectMealOption / markMealCompleted.
 */

function selectionKeepsCompletion(wasCompleted: boolean, wasSkipped: boolean): boolean {
  return Boolean(wasCompleted && !wasSkipped)
}

function macrosFromMeals(
  meals: Array<{ isCompleted?: boolean; isSkipped?: boolean; calories: number }>,
): number {
  return meals
    .filter((m) => m.isCompleted === true && !m.isSkipped)
    .reduce((sum, m) => sum + (m.calories || 0), 0)
}

describe('select vs complete semantics', () => {
  it('selecting a new meal does not mark it completed', () => {
    expect(selectionKeepsCompletion(false, false)).toBe(false)
  })

  it('changing a completed meal keeps completed so contribution can be recalculated', () => {
    expect(selectionKeepsCompletion(true, false)).toBe(true)
  })

  it('skipped meals never keep completed on select', () => {
    expect(selectionKeepsCompletion(true, true)).toBe(false)
  })

  it('only explicit completion counts toward macros', () => {
    const planned = [
      { isCompleted: false, calories: 400 },
      { isCompleted: false, calories: 500 },
    ]
    expect(macrosFromMeals(planned)).toBe(0)

    const oneCompleted = [
      { isCompleted: true, calories: 400 },
      { isCompleted: false, calories: 500 },
    ]
    expect(macrosFromMeals(oneCompleted)).toBe(400)

    const skipped = [{ isCompleted: true, isSkipped: true, calories: 0 }]
    expect(macrosFromMeals(skipped)).toBe(0)
  })
})
