/**
 * Contrato mínimo de resolución de slot para la vista mensual.
 * Evita ambigüedad por meal_type cuando hay varios slots el mismo día.
 */

type Slot = {
  id?: string | null
  meal_type?: string
  name?: string
  time?: string | null
  order_index?: number
}

function resolvePlanMealSlotForMonthly(args: {
  mealSlots: Slot[]
  optionsByMealId?: Record<string, Array<{ id: string; name: string }>>
  mealsByType?: Record<string, Array<{ id: string; name: string }>>
  mealType: string
  existingPlanMealId?: string | null
}) {
  const slots = (args.mealSlots || [])
    .filter((slot) => String(slot.meal_type || '') === args.mealType && slot.id)
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))

  const matched =
    (args.existingPlanMealId && slots.find((slot) => String(slot.id) === String(args.existingPlanMealId))) ||
    slots[0] ||
    null

  const planMealId = matched?.id ? String(matched.id) : null
  const optionsFromSlot =
    planMealId && args.optionsByMealId?.[planMealId]?.length
      ? args.optionsByMealId[planMealId]
      : args.mealsByType?.[args.mealType] || []

  return { planMealId, options: optionsFromSlot, mealName: matched?.name || null }
}

describe('monthly plan meal slot resolution', () => {
  it('prefers existing plan_meal_id over first slot of same meal_type', () => {
    const result = resolvePlanMealSlotForMonthly({
      mealType: 'breakfast',
      existingPlanMealId: 'slot-drink',
      mealSlots: [
        { id: 'slot-toast', meal_type: 'breakfast', name: 'Desayuno', order_index: 1 },
        { id: 'slot-drink', meal_type: 'breakfast', name: 'Bebida', order_index: 2 },
      ],
      optionsByMealId: {
        'slot-toast': [{ id: 'a', name: 'Toast' }],
        'slot-drink': [{ id: 'b', name: 'Shake' }],
      },
    })
    expect(result.planMealId).toBe('slot-drink')
    expect(result.options[0].name).toBe('Shake')
  })

  it('falls back to first slot by order_index when no selection', () => {
    const result = resolvePlanMealSlotForMonthly({
      mealType: 'dinner',
      mealSlots: [
        { id: 'd2', meal_type: 'dinner', name: 'Cena 2', order_index: 2 },
        { id: 'd1', meal_type: 'dinner', name: 'Cena 1', order_index: 1 },
      ],
      optionsByMealId: {
        d1: [{ id: 'x', name: 'Ligera' }],
        d2: [{ id: 'y', name: 'Pesada' }],
      },
    })
    expect(result.planMealId).toBe('d1')
    expect(result.options[0].name).toBe('Ligera')
  })

  it('uses meals_by_type when options_by_meal_id missing', () => {
    const result = resolvePlanMealSlotForMonthly({
      mealType: 'lunch',
      mealSlots: [{ id: 'l1', meal_type: 'lunch', order_index: 1 }],
      mealsByType: { lunch: [{ id: 'z', name: 'Bowl' }] },
    })
    expect(result.planMealId).toBe('l1')
    expect(result.options[0].name).toBe('Bowl')
  })
})
