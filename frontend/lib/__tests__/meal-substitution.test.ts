import {
  buildMealOptionFromSubstitution,
  mergeSubstitutionDetails,
  overlaySubstitutionsOnIngredients,
  shouldPersistMealOptionSelection,
} from "../meal-substitution"
import type { MealIngredientSubstitution, Recipe } from "../nutrition-service"

const chickenSub: MealIngredientSubstitution = {
  ingredient_id: "ing-chicken",
  original_food_id: "food-chicken",
  original_food_name: "Contramuslo de pollo",
  original_quantity: 180,
  original_unit: "g",
  replacement_food_id: "food-beef",
  replacement_food_name: "Carne picada de ternera",
  replacement_quantity: 160,
  replacement_unit: "g",
  target_calories: 220,
}

const tomatoSub: MealIngredientSubstitution = {
  ingredient_id: "ing-tomato",
  original_food_id: "food-tomato",
  original_food_name: "Tomate cherry Bowl",
  original_quantity: 80,
  original_unit: "g",
  replacement_food_id: "food-corn",
  replacement_food_name: "Maíz dulce Bowl",
  replacement_quantity: 70,
  replacement_unit: "g",
  target_calories: 60,
}

const oilSub: MealIngredientSubstitution = {
  ingredient_id: "ing-oil",
  original_food_id: "food-oil",
  original_food_name: "Aceite de oliva",
  original_quantity: 10,
  original_unit: "g",
  replacement_food_id: "food-avocado",
  replacement_food_name: "Aguacate",
  replacement_quantity: 25,
  replacement_unit: "g",
  target_calories: 90,
}

const chickenToTurkey: MealIngredientSubstitution = {
  ...chickenSub,
  replacement_food_id: "food-turkey",
  replacement_food_name: "Pavo picado",
  replacement_quantity: 170,
  target_calories: 210,
}

const recipe = {
  id: "recipe-bowl",
  name: "Crea tu bowl",
  description: "Bowl",
  calories: 500,
  protein: 40,
  carbs: 45,
  fat: 12,
  image_url: "",
  prep_time_minutes: 15,
} as Recipe

const ingredients = [
  { name: "Contramuslo de pollo", amount: 180, unit: "g" },
  { name: "Tomate cherry Bowl", amount: 80, unit: "g" },
  { name: "Aceite de oliva", amount: 10, unit: "g" },
]

describe("meal substitutions", () => {
  it("keeps a single substitution on the selected option", () => {
    const option = buildMealOptionFromSubstitution(recipe, chickenSub)
    expect(option.substitution_details).toEqual([chickenSub])
    expect(option.customDescription).toContain("Contramuslo de pollo por 160g de Carne picada de ternera")
    expect(option.calories).toBe(500)
  })

  it("replaces only the matching ingredient in the recipe view", () => {
    const overlaid = overlaySubstitutionsOnIngredients(ingredients, [chickenSub])
    expect(overlaid[0]).toMatchObject({ name: "Carne picada de ternera", amount: 160, unit: "g" })
    expect(overlaid[0].note).toContain("Contramuslo de pollo")
    expect(overlaid[1].name).toBe("Tomate cherry Bowl")
    expect(overlaid[2].name).toBe("Aceite de oliva")
  })

  it("merges a second substitution without dropping the first", () => {
    const withChicken = buildMealOptionFromSubstitution(recipe, chickenSub)
    const withBoth = buildMealOptionFromSubstitution(
      recipe,
      tomatoSub,
      withChicken.substitution_details,
    )
    expect(withBoth.substitution_details).toEqual([chickenSub, tomatoSub])
    expect(withBoth.customDescription).toContain("Carne picada de ternera")
    expect(withBoth.customDescription).toContain("Maíz dulce Bowl")
  })

  it("keeps three substitutions", () => {
    const details = mergeSubstitutionDetails(
      mergeSubstitutionDetails([chickenSub], tomatoSub),
      oilSub,
    )
    expect(details).toEqual([chickenSub, tomatoSub, oilSub])
    const overlaid = overlaySubstitutionsOnIngredients(ingredients, details)
    expect(overlaid.map((item) => item.name)).toEqual([
      "Carne picada de ternera",
      "Maíz dulce Bowl",
      "Aguacate",
    ])
  })

  it("updates an existing substitution without duplicating or dropping others", () => {
    const updated = mergeSubstitutionDetails([chickenSub, tomatoSub], chickenToTurkey)
    expect(updated).toEqual([chickenToTurkey, tomatoSub])
  })

  it("rehydrates every overlay after serialize", () => {
    const details = mergeSubstitutionDetails([chickenSub], tomatoSub)
    const serialized = JSON.parse(JSON.stringify(details)) as MealIngredientSubstitution[]
    const overlaid = overlaySubstitutionsOnIngredients(ingredients, serialized)
    expect(overlaid[0].name).toBe("Carne picada de ternera")
    expect(overlaid[1].name).toBe("Maíz dulce Bowl")
    expect(overlaid[2].name).toBe("Aceite de oliva")
  })

  it("does not replace a similar ingredient name via includes matching", () => {
    const tomatoOnly: MealIngredientSubstitution = {
      ingredient_id: "ing-plain-tomato",
      original_food_id: "food-plain-tomato",
      original_food_name: "Tomate",
      original_quantity: 50,
      original_unit: "g",
      replacement_food_id: "food-pepper",
      replacement_food_name: "Pimiento",
      replacement_quantity: 50,
      replacement_unit: "g",
      target_calories: 20,
    }
    const overlaid = overlaySubstitutionsOnIngredients(
      [
        { name: "Tomate", amount: 50, unit: "g" },
        { name: "Tomate cherry Bowl", amount: 80, unit: "g" },
      ],
      [tomatoOnly],
    )
    expect(overlaid[0].name).toBe("Pimiento")
    expect(overlaid[1].name).toBe("Tomate cherry Bowl")
  })

  it("matches folded names without treating Bowl suffix as a different ingredient", () => {
    const overlaid = overlaySubstitutionsOnIngredients(
      [{ name: "tomate cherry bowl", amount: 80, unit: "g" }],
      [tomatoSub],
    )
    expect(overlaid[0].name).toBe("Maíz dulce Bowl")
  })

  it("persists a substitution even when the same recipe is already selected", () => {
    const option = buildMealOptionFromSubstitution(recipe, tomatoSub, [chickenSub])
    expect(
      shouldPersistMealOptionSelection(option, {
        recipeId: String(recipe.id),
        optionId: String(recipe.id),
      }),
    ).toBe(true)
  })

  it("does not persist a same-recipe card tap without substitutions", () => {
    expect(
      shouldPersistMealOptionSelection(
        {
          id: `recipe-${recipe.id}`,
          name: recipe.name,
          calories: 500,
          protein: 40,
          carbs: 45,
          fat: 12,
          description: "Bowl",
          recipeId: recipe.id,
        },
        { recipeId: String(recipe.id), optionId: `recipe-${recipe.id}` },
      ),
    ).toBe(false)
  })
})
