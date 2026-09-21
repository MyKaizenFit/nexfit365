import type {
  MealIngredientSubstitution,
  MealOption,
  PersonalizedRecipeQuantities,
  Recipe,
} from "@/lib/nutrition-service"

function foldName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function namesMatch(left: string, right: string): boolean {
  const a = foldName(left)
  const b = foldName(right)
  return Boolean(a) && a === b
}

function substitutionIdentity(item: MealIngredientSubstitution): string {
  if (item.ingredient_id) return `ingredient:${item.ingredient_id}`
  if (item.original_food_id) return `food:${item.original_food_id}`
  return `name:${foldName(item.original_food_name)}`
}

export function formatSubstitutionNote(item: MealIngredientSubstitution): string {
  return `${item.original_food_name} por ${item.replacement_quantity}${item.replacement_unit} de ${item.replacement_food_name}`
}

export function mergeSubstitutionDetails(
  existing: MealIngredientSubstitution[] | null | undefined,
  next: MealIngredientSubstitution,
): MealIngredientSubstitution[] {
  const current = Array.isArray(existing) ? existing.filter(Boolean) : []
  const nextKey = substitutionIdentity(next)
  const index = current.findIndex((item) => substitutionIdentity(item) === nextKey)
  if (index >= 0) {
    const merged = [...current]
    merged[index] = next
    return merged
  }
  return [...current, next]
}

export function overlaySubstitutionsOnIngredients(
  ingredients: PersonalizedRecipeQuantities["ingredients"],
  substitutions?: MealIngredientSubstitution[] | null,
): PersonalizedRecipeQuantities["ingredients"] {
  if (!substitutions?.length) return ingredients

  return ingredients.map((ingredient) => {
    const match = substitutions.find((item) => namesMatch(ingredient.name, item.original_food_name))
    if (!match) return ingredient
    return {
      ...ingredient,
      name: match.replacement_food_name,
      amount: match.replacement_quantity,
      unit: match.replacement_unit,
      note: `Antes: ${match.original_quantity}${match.original_unit} de ${match.original_food_name}`,
    }
  })
}

export function isSameMealOption(
  option: Pick<MealOption, "id" | "recipeId">,
  currentSelection?: { optionId?: string | null; recipeId?: string | null } | null,
): boolean {
  if (!currentSelection) return false
  if (currentSelection.recipeId && option.recipeId && String(currentSelection.recipeId) === String(option.recipeId)) {
    return true
  }
  if (currentSelection.optionId && String(currentSelection.optionId) === String(option.id)) {
    return true
  }
  return false
}

export function shouldPersistMealOptionSelection(
  option: MealOption,
  currentSelection?: { optionId?: string | null; recipeId?: string | null } | null,
): boolean {
  if (!isSameMealOption(option, currentSelection)) return true
  return Array.isArray(option.substitution_details) && option.substitution_details.length > 0
}

export function buildMealOptionFromSubstitution(
  recipe: Recipe,
  substitution: MealIngredientSubstitution,
  existingSubstitutions?: MealIngredientSubstitution[] | null,
): MealOption {
  const substitutionDetails = mergeSubstitutionDetails(existingSubstitutions, substitution)
  const note = substitutionDetails.map(formatSubstitutionNote).join(", ")
  return {
    id: `recipe-${recipe.id}`,
    name: recipe.name,
    calories: recipe.calories || 0,
    protein: Number(recipe.protein) || 0,
    carbs: Number(recipe.carbs) || 0,
    fat: Number(recipe.fat) || 0,
    imageUrl: recipe.image_url || "",
    category: "balanced",
    icon: "🍽️",
    description: `${recipe.description || "Receta seleccionada"} · Cambio: ${note}`,
    cookTime: recipe.prep_time_minutes ? `${recipe.prep_time_minutes} min` : undefined,
    recipeId: recipe.id,
    customDescription: `${recipe.name} (${note})`,
    substitution_details: substitutionDetails,
  }
}
