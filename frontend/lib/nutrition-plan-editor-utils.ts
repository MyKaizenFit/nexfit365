export interface MealRecipeOptionLike {
  recipe_id: string
  display_order: number
  servings?: number
  custom_calories?: number
  custom_protein?: number
  custom_carbs?: number
  custom_fat?: number
}

export interface PlanMealDraftLike {
  id?: string
  day_of_week: number
  week_number: number
  name: string
  meal_type: string
  time: string
  calories: number
  protein: number
  carbs: number
  fat: number
  description: string
  order_index: number
  meal_recipes: MealRecipeOptionLike[]
}

function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN
  return Number.isFinite(n) ? n : fallback
}

function getRecipeId(value: unknown): string {
  if (value == null) return ""
  const record = value as Record<string, unknown>
  const nestedRecipe = record.recipe as Record<string, unknown> | undefined
  return String(nestedRecipe?.id || record.recipe_id || record.id || "").trim()
}

function mapMealRecipeOption(value: unknown, index: number): MealRecipeOptionLike | null {
  const recipeId = getRecipeId(value)
  if (!recipeId) return null

  const record = value as Record<string, unknown>
  return {
    recipe_id: recipeId,
    display_order: toNumber(record.display_order, index),
    servings: record.servings != null ? toNumber(record.servings, 1) : 1,
    custom_calories: record.custom_calories != null ? toNumber(record.custom_calories) : undefined,
    custom_protein: record.custom_protein != null ? toNumber(record.custom_protein) : undefined,
    custom_carbs: record.custom_carbs != null ? toNumber(record.custom_carbs) : undefined,
    custom_fat: record.custom_fat != null ? toNumber(record.custom_fat) : undefined,
  }
}

function mapMealRecipeOptions(meal: unknown): MealRecipeOptionLike[] {
  const record = meal as Record<string, unknown>
  const detailedOptions = Array.isArray(record?.meal_recipes) ? record.meal_recipes : []
  const fallbackOptions = Array.isArray(record?.suggested_recipes)
    ? record.suggested_recipes
    : Array.isArray(record?.suggested_recipes_ids)
      ? record.suggested_recipes_ids.map((id: string | number) => ({ recipe_id: id }))
      : []

  const source = detailedOptions.length > 0 ? detailedOptions : fallbackOptions
  const seen = new Set<string>()

  return source
    .map((option: unknown, index: number) => mapMealRecipeOption(option, index))
    .filter((option: MealRecipeOptionLike | null): option is MealRecipeOptionLike => {
      if (!option || seen.has(option.recipe_id)) return false
      seen.add(option.recipe_id)
      return true
    })
    .map((option, index) => ({ ...option, display_order: index }))
}

function cloneMealRecipeOptions(options: MealRecipeOptionLike[]): MealRecipeOptionLike[] {
  return options.map((option) => ({ ...option }))
}

export function hydratePlanMealsFromApi(meals: unknown[]): PlanMealDraftLike[] {
  return meals.map((meal, idx) => {
    const record = meal as Record<string, unknown>
    const weekRaw = record.week_number
    const weekNumber = Math.max(1, toNumber(weekRaw, weekRaw == null ? 1 : 0) || 1)
    const dayRaw = record.day_of_week
    const dayOfWeek =
      typeof dayRaw === "number" && Number.isFinite(dayRaw)
        ? dayRaw
        : dayRaw != null && dayRaw !== ""
          ? toNumber(dayRaw, 1)
          : 1

    return {
      id: record.id != null && String(record.id).trim() ? String(record.id) : undefined,
      day_of_week: dayOfWeek,
      week_number: weekNumber,
      name: String(record.name || `Comida ${idx + 1}`),
      meal_type: String(record.meal_type || "lunch"),
      time: String(record.time || "12:00"),
      calories: toNumber(record.calories),
      protein: toNumber(record.protein),
      carbs: toNumber(record.carbs),
      fat: toNumber(record.fat),
      description: String(record.description || ""),
      order_index: toNumber(record.order_index, idx + 1),
      meal_recipes: cloneMealRecipeOptions(mapMealRecipeOptions(meal)),
    }
  })
}

export function serializePlanMealsForApi(meals: PlanMealDraftLike[]): object[] {
  return meals.map((meal) => {
    const payload: Record<string, unknown> = {
      day_of_week: meal.day_of_week,
      week_number: meal.week_number ?? 1,
      name: meal.name,
      meal_type: meal.meal_type,
      time: meal.time,
      description: meal.description,
      order_index: toNumber(meal.order_index, 1),
      suggested_recipes_ids: meal.meal_recipes.map((recipe) => recipe.recipe_id),
      meal_recipes: meal.meal_recipes.map((recipe) => ({
        recipe_id: recipe.recipe_id,
        servings: recipe.servings ?? 1,
        custom_calories: recipe.custom_calories,
        custom_protein: recipe.custom_protein,
        custom_carbs: recipe.custom_carbs,
        custom_fat: recipe.custom_fat,
        display_order: recipe.display_order ?? 0,
      })),
    }

    if (typeof meal.id === "string" && meal.id.trim()) {
      payload.id = meal.id
    }

    return payload
  })
}

export function assertNoSharedMealReferences(meals: PlanMealDraftLike[]): boolean {
  for (let i = 0; i < meals.length; i += 1) {
    for (let j = i + 1; j < meals.length; j += 1) {
      if (meals[i] === meals[j]) return false
    }
  }

  for (let i = 0; i < meals.length; i += 1) {
    for (let j = i + 1; j < meals.length; j += 1) {
      if (meals[i].meal_recipes === meals[j].meal_recipes) return false
    }
  }

  return true
}
