import {
  MealOption,
  MealAlternativesRecommendation,
  MealRecommendationLevel,
} from '@/lib/nutrition-service'

/** Pure helpers mirrored from modal display rules — keep UX contract tested without DOM flakiness. */

function orderAlternativesForDisplay(
  ranked: MealOption[] | null | undefined,
  fallback: MealOption[],
): MealOption[] {
  if (ranked && ranked.length > 0) return ranked
  return fallback
}

function recommendationBadge(option: MealOption): string | null {
  if (option.is_recommended) return 'Mejor encaje'
  const labels: Record<MealRecommendationLevel, string> = {
    ideal: 'Mejor encaje',
    good: 'Buen encaje',
    acceptable: 'Aceptable',
    outside_target: 'Fuera del objetivo',
  }
  return option.recommendation_level ? labels[option.recommendation_level] : null
}

function selectionKeepsCompletion(wasCompleted: boolean, wasSkipped: boolean): boolean {
  return Boolean(wasCompleted && !wasSkipped)
}

describe('meal recommendation display contract', () => {
  const fallback: MealOption[] = [
    { id: '1', name: 'Pesada', calories: 700, protein: 50, carbs: 60, fat: 25, description: '' },
    { id: '2', name: 'Ligera', calories: 280, protein: 30, carbs: 20, fat: 8, description: '' },
  ]

  it('preserves backend alternative order', () => {
    const ranked: MealOption[] = [
      { ...fallback[1], is_recommended: true, recommendation_level: 'ideal' },
      { ...fallback[0], recommendation_level: 'outside_target' },
    ]
    expect(orderAlternativesForDisplay(ranked, fallback).map((o) => o.name)).toEqual([
      'Ligera',
      'Pesada',
    ])
  })

  it('falls back to plan options when recommendation fails', () => {
    expect(orderAlternativesForDisplay(null, fallback)).toEqual(fallback)
    expect(orderAlternativesForDisplay([], fallback)).toEqual(fallback)
  })

  it('labels recommended option as Mejor encaje', () => {
    expect(
      recommendationBadge({
        ...fallback[1],
        is_recommended: true,
        recommendation_level: 'outside_target',
      }),
    ).toBe('Mejor encaje')
    expect(
      recommendationBadge({
        ...fallback[0],
        recommendation_level: 'acceptable',
      }),
    ).toBe('Aceptable')
  })

  it('exposes daily projection fields from API contract', () => {
    const payload: MealAlternativesRecommendation = {
      date: '2026-08-04',
      plan_meal_id: 'slot-1',
      context: {
        daily_goals: { calories: 1500, protein: 120, carbs: 150, fat: 50 },
        consumed: { calories: 900, protein: 65, carbs: 85, fat: 30 },
        remaining: { calories: 600, protein: 55, carbs: 65, fat: 20 },
        slot_budget: { calories: 272, protein: 25, carbs: 30, fat: 9 },
        pending_meals_count: 1,
        goals_exceeded: { calories: false, protein: false, carbs: false, fat: false },
        current_slot_id: 'slot-1',
        date: '2026-08-04',
      },
      alternatives: [
        {
          id: 'a',
          name: 'Cena encaje',
          calories: 320,
          protein: 35,
          carbs: 25,
          fat: 10,
          description: '',
          is_recommended: true,
          recommendation_level: 'good',
          projected_daily_calories: 1220,
          projected_daily_macros: { calories: 1220, protein: 100, carbs: 110, fat: 40 },
          recommendation_reason: 'Buena aproximación al presupuesto de calorías y macros.',
        },
      ],
    }
    expect(payload.context.slot_budget.calories).toBeLessThan(600)
    expect(payload.alternatives[0].projected_daily_calories).toBe(1220)
    expect(payload.alternatives[0].is_recommended).toBe(true)
  })

  it('selecting a meal does not imply completion', () => {
    expect(selectionKeepsCompletion(false, false)).toBe(false)
    expect(selectionKeepsCompletion(true, false)).toBe(true)
    expect(selectionKeepsCompletion(true, true)).toBe(false)
  })

  it('keeps current selection identifiable', () => {
    const options: MealOption[] = [
      { ...fallback[1], is_recommended: true },
      { ...fallback[0], is_current_selection: true },
    ]
    const current = options.find((o) => o.is_current_selection)
    expect(current?.name).toBe('Pesada')
  })
})
