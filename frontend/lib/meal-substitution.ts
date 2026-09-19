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
  if (!a || !b) return false
  return a === b || a.includes(b) || b.includes(a)
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

export function buildMealOptionFromSubstitution(
  recipe: Recipe,
  substitution: MealIngredientSubstitution,
): MealOption {
  const note = `${substitution.original_food_name} por ${substitution.replacement_quantity}${substitution.replacement_unit} de ${substitution.replacement_food_name}`
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
    substitution_details: [substitution],
  }
}
