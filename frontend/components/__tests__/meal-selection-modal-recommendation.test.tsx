import { render, screen, waitFor } from '@testing-library/react'
import { MealSelectionModal } from '@/components/dashboard/meal-selection-modal'
import { nutritionService, MealOption } from '@/lib/nutrition-service'

jest.mock('@/lib/nutrition-service', () => {
  const actual = jest.requireActual('@/lib/nutrition-service')
  return {
    ...actual,
    nutritionService: {
      ...actual.nutritionService,
      getMealAlternativesRecommendation: jest.fn(),
      getRecipeExclusions: jest.fn().mockResolvedValue([]),
      listRecipes: jest.fn().mockResolvedValue([]),
    },
  }
})

jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}))

const mockGetReco = nutritionService.getMealAlternativesRecommendation as jest.Mock

const fallbackOptions: MealOption[] = [
  {
    id: 'meal-1-recipe-heavy',
    name: 'Cena pesada',
    calories: 700,
    protein: 50,
    carbs: 60,
    fat: 25,
    description: 'Pesada',
    recipeId: 'heavy',
  },
  {
    id: 'meal-1-recipe-light',
    name: 'Cena ligera',
    calories: 280,
    protein: 30,
    carbs: 20,
    fat: 8,
    description: 'Ligera',
    recipeId: 'light',
  },
]

describe('MealSelectionModal recommendations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders ranked alternatives with Mejor encaje and daily projection', async () => {
    mockGetReco.mockResolvedValue({
      date: '2026-08-04',
      plan_meal_id: 'slot-dinner',
      context: {
        daily_goals: { calories: 1500, protein: 120, carbs: 150, fat: 50 },
        consumed: { calories: 900, protein: 65, carbs: 85, fat: 30 },
        remaining: { calories: 600, protein: 55, carbs: 65, fat: 20 },
        slot_budget: { calories: 272, protein: 25, carbs: 30, fat: 9 },
        pending_meals_count: 1,
        goals_exceeded: { calories: false, protein: false, carbs: false, fat: false },
        current_slot_id: 'slot-dinner',
        date: '2026-08-04',
      },
      alternatives: [
        {
          ...fallbackOptions[1],
          is_recommended: true,
          recommendation_level: 'ideal',
          recommendation_reason: 'Encaja muy bien con el presupuesto de esta comida.',
          projected_daily_calories: 1180,
          projected_daily_macros: { calories: 1180, protein: 95, carbs: 105, fat: 38 },
        },
        {
          ...fallbackOptions[0],
          is_current_selection: true,
          recommendation_level: 'outside_target',
          recommendation_reason: 'Fuera del margen ideal.',
          projected_daily_calories: 1600,
        },
      ],
    })

    render(
      <MealSelectionModal
        isOpen
        onClose={jest.fn()}
        mealName="Cena"
        mealTime="20:00"
        mealType="dinner"
        planMealId="slot-dinner"
        date="2026-08-04"
        options={fallbackOptions}
        currentSelection={{ recipeId: 'heavy', optionId: fallbackOptions[0].id }}
        onSelectOption={jest.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getAllByText('Mejor encaje').length).toBeGreaterThan(0)
    })
    expect(screen.getByText(/Presupuesto orientativo/i)).toBeInTheDocument()
    expect(screen.getByText(/Día proyectado: 1180 kcal/i)).toBeInTheDocument()
    expect(screen.getByText('Seleccionada')).toBeInTheDocument()

    const names = screen.getAllByRole('heading', { level: 4 }).map((el) => el.textContent)
    expect(names[0]).toContain('Cena ligera')
  })

  it('falls back to plan options when recommendation endpoint fails', async () => {
    mockGetReco.mockResolvedValue(null)

    render(
      <MealSelectionModal
        isOpen
        onClose={jest.fn()}
        mealName="Cena"
        mealTime="20:00"
        mealType="dinner"
        planMealId="slot-dinner"
        options={fallbackOptions}
        onSelectOption={jest.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText(/No se pudieron cargar las recomendaciones/i)).toBeInTheDocument()
    })
    expect(screen.getByText('Cena pesada')).toBeInTheDocument()
    expect(screen.getByText('Cena ligera')).toBeInTheDocument()
  })
})
