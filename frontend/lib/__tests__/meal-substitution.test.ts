import {
  buildMealOptionFromSubstitution,
  overlaySubstitutionsOnIngredients,
} from "../meal-substitution"
import type { MealIngredientSubstitution, Recipe } from "../nutrition-service"

const substitution: MealIngredientSubstitution = {
  ingredient_id: "ing-1",
  original_food_id: "food-1",
  original_food_name: "Arroz blanco",
  original_quantity: 80,
  original_unit: "g",
  replacement_food_id: "food-2",
  replacement_food_name: "Quinoa",
  replacement_quantity: 75,
  replacement_unit: "g",
  target_calories: 110,
}

const recipe = {
  id: "recipe-1",
  name: "Bowl de pollo",
  description: "Bowl",
  calories: 500,
  protein: 40,
  carbs: 45,
  fat: 12,
  image_url: "",
  prep_time_minutes: 15,
} as Recipe

describe("meal substitutions", () => {
  it("keeps substitution_details on the selected option", () => {
    const option = buildMealOptionFromSubstitution(recipe, substitution)
    expect(option.substitution_details).toEqual([substitution])
    expect(option.customDescription).toContain("Arroz blanco por 75g de Quinoa")
    expect(option.calories).toBe(500)
  })

  it("replaces the matching ingredient in the recipe view", () => {
    const overlaid = overlaySubstitutionsOnIngredients(
      [
        { name: "Arroz blanco", amount: 80, unit: "g" },
        { name: "Pollo", amount: 120, unit: "g" },
      ],
      [substitution],
    )
    expect(overlaid[0]).toMatchObject({ name: "Quinoa", amount: 75, unit: "g" })
    expect(overlaid[0].note).toContain("Arroz blanco")
    expect(overlaid[1].name).toBe("Pollo")
  })
})
