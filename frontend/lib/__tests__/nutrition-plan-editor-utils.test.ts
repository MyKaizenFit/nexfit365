import {
  assertNoSharedMealReferences,
  hydratePlanMealsFromApi,
  serializePlanMealsForApi,
} from "@/lib/nutrition-plan-editor-utils"

describe("nutrition-plan-editor-utils", () => {
  it("hydrate preserves id, order_index, meal_type", () => {
    const hydrated = hydratePlanMealsFromApi([
      {
        id: 42,
        day_of_week: 3,
        week_number: 2,
        name: "Merienda",
        meal_type: "snack",
        time: "17:00",
        order_index: 4,
        meal_recipes: [{ recipe_id: "r1", display_order: 0 }],
      },
    ])

    expect(hydrated).toHaveLength(1)
    expect(hydrated[0].id).toBe("42")
    expect(hydrated[0].order_index).toBe(4)
    expect(hydrated[0].meal_type).toBe("snack")
  })

  it("hydrate two snacks same meal_type stay independent", () => {
    const hydrated = hydratePlanMealsFromApi([
      {
        id: "snack-a",
        meal_type: "snack",
        day_of_week: 1,
        week_number: 1,
        order_index: 1,
        meal_recipes: [{ recipe_id: "r1", display_order: 0 }],
      },
      {
        id: "snack-b",
        meal_type: "snack",
        day_of_week: 1,
        week_number: 1,
        order_index: 2,
        meal_recipes: [{ recipe_id: "r2", display_order: 0 }],
      },
    ])

    hydrated[0].meal_recipes.push({ recipe_id: "r3", display_order: 1 })

    expect(hydrated[0].meal_recipes).toHaveLength(2)
    expect(hydrated[1].meal_recipes).toHaveLength(1)
    expect(hydrated[0].meal_recipes).not.toBe(hydrated[1].meal_recipes)
    expect(assertNoSharedMealReferences(hydrated)).toBe(true)
  })

  it("hydrate different weeks stay independent (no shared refs)", () => {
    const hydrated = hydratePlanMealsFromApi([
      {
        id: "w1-meal",
        week_number: 1,
        day_of_week: 1,
        meal_type: "lunch",
        order_index: 1,
        meal_recipes: [{ recipe_id: "r1", display_order: 0 }],
      },
      {
        id: "w2-meal",
        week_number: 2,
        day_of_week: 1,
        meal_type: "lunch",
        order_index: 1,
        meal_recipes: [{ recipe_id: "r1", display_order: 0 }],
      },
    ])

    hydrated[0].meal_recipes[0].servings = 3

    expect(hydrated[1].meal_recipes[0].servings).toBe(1)
    expect(hydrated[0].meal_recipes).not.toBe(hydrated[1].meal_recipes)
    expect(assertNoSharedMealReferences(hydrated)).toBe(true)
  })

  it("serialize includes id for existing, omits for new", () => {
    const serialized = serializePlanMealsForApi([
      {
        id: "persisted-1",
        day_of_week: 1,
        week_number: 1,
        name: "Desayuno",
        meal_type: "breakfast",
        time: "08:00",
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        description: "",
        order_index: 1,
        meal_recipes: [],
      },
      {
        day_of_week: 1,
        week_number: 1,
        name: "Nuevo",
        meal_type: "lunch",
        time: "13:00",
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        description: "",
        order_index: 2,
        meal_recipes: [],
      },
    ])

    expect(serialized[0]).toMatchObject({ id: "persisted-1" })
    expect(serialized[1]).not.toHaveProperty("id")
    expect(serialized[0]).not.toHaveProperty("calories")
    expect(serialized[0]).not.toHaveProperty("protein")
  })

  it("serialize recipe change roundtrip fields", () => {
    const hydrated = hydratePlanMealsFromApi([
      {
        id: "meal-1",
        day_of_week: 2,
        week_number: 1,
        name: "Comida",
        meal_type: "lunch",
        time: "14:00",
        description: "Notas",
        order_index: 2,
        meal_recipes: [
          {
            recipe_id: "rec-a",
            display_order: 0,
            servings: 2,
            custom_protein: 30,
          },
          {
            recipe_id: "rec-b",
            display_order: 1,
            servings: 1,
          },
        ],
      },
    ])

    hydrated[0].meal_recipes[0].custom_calories = 450

    const serialized = serializePlanMealsForApi(hydrated)

    expect(serialized[0]).toEqual({
      id: "meal-1",
      day_of_week: 2,
      week_number: 1,
      name: "Comida",
      meal_type: "lunch",
      time: "14:00",
      description: "Notas",
      order_index: 2,
      suggested_recipes_ids: ["rec-a", "rec-b"],
      meal_recipes: [
        {
          recipe_id: "rec-a",
          servings: 2,
          custom_calories: 450,
          custom_protein: 30,
          custom_carbs: undefined,
          custom_fat: undefined,
          display_order: 0,
        },
        {
          recipe_id: "rec-b",
          servings: 1,
          custom_calories: undefined,
          custom_protein: undefined,
          custom_carbs: undefined,
          custom_fat: undefined,
          display_order: 1,
        },
      ],
    })
  })

  it("double serialize same input yields equal payloads (deterministic)", () => {
    const meals = hydratePlanMealsFromApi([
      {
        id: "m1",
        day_of_week: 1,
        week_number: 1,
        name: "Cena",
        meal_type: "dinner",
        time: "21:00",
        order_index: 1,
        suggested_recipes_ids: ["r1", "r1", "r2"],
      },
    ])

    const first = serializePlanMealsForApi(meals)
    const second = serializePlanMealsForApi(meals)

    expect(first).toEqual(second)
    expect(first[0]).toMatchObject({
      suggested_recipes_ids: ["r1", "r2"],
      meal_recipes: [
        { recipe_id: "r1", display_order: 0, servings: 1 },
        { recipe_id: "r2", display_order: 1, servings: 1 },
      ],
    })
  })
})
