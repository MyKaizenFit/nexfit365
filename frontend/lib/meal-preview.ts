import { MealOption } from '@/lib/nutrition-service'

/**
 * Fuente canónica de una opción de comida (dashboard, Cambiar, receta):
 * kcal/protein/carbs/fat → option del slot (PlanMealRecipe custom/servings, ya escalado)
 * recipeId → option.recipeId
 * optionId → option.id
 *
 * Si hay selección persistida (MealLog / selectedOption), esa gana.
 * Si no, la preview es la marcada is_recommended por el backend (mismo motor que Cambiar).
 */
export function pickPreviewMealOption(options: MealOption[]): MealOption | null {
  if (!Array.isArray(options) || options.length === 0) return null
  return options.find((option) => option.is_recommended) || options[0] || null
}

export function resolveDisplayedMealOption(
  selectedOption: MealOption | null | undefined,
  options: MealOption[],
): { displayOption: MealOption | null; isPreview: boolean } {
  if (selectedOption) {
    return { displayOption: selectedOption, isPreview: false }
  }
  const preview = pickPreviewMealOption(options)
  return { displayOption: preview, isPreview: !!preview }
}

export function pickCanonicalMacro(
  persisted: unknown,
  slotOption: unknown,
  recipeBase: unknown,
): number {
  const persistedNum = Number(persisted)
  if (persisted !== null && persisted !== undefined && persisted !== '' && Number.isFinite(persistedNum)) {
    return persistedNum
  }
  const slotNum = Number(slotOption)
  if (slotOption !== null && slotOption !== undefined && slotOption !== '' && Number.isFinite(slotNum)) {
    return slotNum
  }
  const recipeNum = Number(recipeBase)
  return Number.isFinite(recipeNum) ? recipeNum : 0
}

export function lookupMealOptionsById(
  mealId: string,
  optionsByMealId: Record<string, MealOption[]>,
): MealOption[] | null {
  const key = String(mealId)
  const exact = optionsByMealId[key]
  if (Array.isArray(exact) && exact.length > 0) return exact
  const matchedKey = Object.keys(optionsByMealId).find((candidate) => String(candidate) === key)
  if (!matchedKey) return null
  const matched = optionsByMealId[matchedKey]
  return Array.isArray(matched) && matched.length > 0 ? matched : null
}
