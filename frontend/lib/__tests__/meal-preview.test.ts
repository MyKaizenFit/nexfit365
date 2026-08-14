import { MealOption } from '@/lib/nutrition-service'
import {
  lookupMealOptionsById,
  pickCanonicalMacro,
  pickPreviewMealOption,
  resolveDisplayedMealOption,
} from '@/lib/meal-preview'

const heavy: MealOption = {
  id: 'meal-b-recipe-h',
  name: 'Desayuno pesado',
  calories: 700,
  protein: 40,
  carbs: 70,
  fat: 25,
  description: '',
  recipeId: 'heavy',
}

const light: MealOption = {
  id: 'meal-b-recipe-l',
  name: 'Desayuno ligero',
  calories: 350,
  protein: 30,
  carbs: 30,
  fat: 10,
  description: '',
  recipeId: 'light',
  is_recommended: true,
}

describe('meal preview selection', () => {
  it('uses backend recommended option when there is no persisted selection', () => {
    const { displayOption, isPreview } = resolveDisplayedMealOption(null, [heavy, light])
    expect(displayOption?.recipeId).toBe('light')
    expect(displayOption?.calories).toBe(350)
    expect(isPreview).toBe(true)
  })

  it('keeps persisted selection over a better recommendation', () => {
    const selected = { ...heavy, calories: 680 }
    const { displayOption, isPreview } = resolveDisplayedMealOption(selected, [light, heavy])
    expect(displayOption?.calories).toBe(680)
    expect(displayOption?.recipeId).toBe('heavy')
    expect(isPreview).toBe(false)
  })

  it('does not mark preview as a selection', () => {
    const preview = pickPreviewMealOption([heavy, light])
    expect(preview?.is_recommended).toBe(true)
    expect(resolveDisplayedMealOption(null, [heavy, light]).isPreview).toBe(true)
  })

  it('looks up options by string slot id without mixing slots', () => {
    const breakfast = [heavy, light]
    const lunch: MealOption[] = [
      { id: 'meal-l-recipe-x', name: 'Comida', calories: 500, protein: 40, carbs: 50, fat: 15, description: '', recipeId: 'lunch' },
    ]
    const byId = {
      'slot-breakfast': breakfast,
      'slot-lunch': lunch,
    }
    expect(lookupMealOptionsById('slot-breakfast', byId)?.[0].name).toBe('Desayuno pesado')
    expect(lookupMealOptionsById('slot-lunch', byId)?.[0].name).toBe('Comida')
    expect(lookupMealOptionsById('missing', byId)).toBeNull()
  })

  it('uses persisted macros over recipe base for the same recipe', () => {
    expect(pickCanonicalMacro(350, 700, 700)).toBe(350)
    expect(pickCanonicalMacro(null, 350, 700)).toBe(350)
    expect(pickCanonicalMacro(undefined, 350, 700)).toBe(350)
    expect(pickCanonicalMacro('', 350, 700)).toBe(350)
    expect(pickCanonicalMacro(undefined, undefined, 700)).toBe(700)
  })

  it('treats explicit zero in MealLog as persisted and null as missing slot fallback', () => {
    expect(pickCanonicalMacro(0, 350, 700)).toBe(0)
    expect(pickCanonicalMacro(null, 350, 700)).toBe(350)
  })

  it('does not replace a persisted selection after a refresh-like recompute', () => {
    const persisted: MealOption = { ...heavy, calories: 680, recipeId: 'heavy' }
    const rankedAfterRefresh: MealOption[] = [
      { ...light, is_recommended: true },
      { ...heavy, calories: 700 },
    ]
    const first = resolveDisplayedMealOption(persisted, rankedAfterRefresh)
    const second = resolveDisplayedMealOption(persisted, rankedAfterRefresh)
    expect(first.displayOption?.recipeId).toBe('heavy')
    expect(second.displayOption?.recipeId).toBe('heavy')
    expect(first.displayOption?.calories).toBe(680)
    expect(second.isPreview).toBe(false)
  })

  it('keeps the same recipe calories between dashboard preview and Cambiar list', () => {
    const preview = pickPreviewMealOption([
      { ...heavy, is_recommended: true, calories: 350, protein: 30, carbs: 30, fat: 10 },
      { ...heavy, id: 'other', calories: 700 },
    ])
    const cambiarTop = { ...heavy, is_recommended: true, calories: 350, protein: 30, carbs: 30, fat: 10 }
    expect(preview?.recipeId).toBe(cambiarTop.recipeId)
    expect(preview?.calories).toBe(cambiarTop.calories)
    expect(preview?.protein).toBe(cambiarTop.protein)
  })
})
