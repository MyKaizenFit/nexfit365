// components/__tests__/nutrition-plan-card.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { NutritionPlanCard } from '../nutrition-plan-card'
import { useNutrition } from '@/hooks/use-nutrition'

jest.mock('@/hooks/use-nutrition')

const mockUseNutrition = useNutrition as jest.MockedFunction<typeof useNutrition>

describe('NutritionPlanCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state', () => {
    mockUseNutrition.mockReturnValue({
      currentPlan: null,
      suggestedMeals: [],
      dailyStats: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      isLoading: true,
      error: null,
      markMealCompleted: jest.fn(),
      createMealLog: jest.fn(),
      refreshPlan: jest.fn(),
    } as any)

    render(<NutritionPlanCard />)
    expect(screen.getByText(/cargando/i)).toBeInTheDocument()
  })

  it('renders plan information when loaded', async () => {
    const mockPlan = {
      id: '1',
      name: 'Plan de Pérdida de Peso',
      daily_calories: 2000,
      target_macros: {
        protein: 150,
        carbs: 200,
        fat: 65,
      },
      meals: [],
    }

    mockUseNutrition.mockReturnValue({
      currentPlan: mockPlan,
      suggestedMeals: [],
      dailyStats: { calories: 1200, protein: 100, carbs: 150, fat: 40 },
      isLoading: false,
      error: null,
      markMealCompleted: jest.fn(),
      createMealLog: jest.fn(),
      refreshPlan: jest.fn(),
    } as any)

    render(<NutritionPlanCard />)

    await waitFor(() => {
      expect(screen.getByText(/plan de pérdida de peso/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/2000/i)).toBeInTheDocument()
  })

  it('displays error message when there is an error', () => {
    mockUseNutrition.mockReturnValue({
      currentPlan: null,
      suggestedMeals: [],
      dailyStats: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      isLoading: false,
      error: 'Error cargando plan',
      markMealCompleted: jest.fn(),
      createMealLog: jest.fn(),
      refreshPlan: jest.fn(),
    } as any)

    render(<NutritionPlanCard />)
    expect(screen.getByText(/error/i)).toBeInTheDocument()
  })

  it('displays no plan message when no plan exists', () => {
    mockUseNutrition.mockReturnValue({
      currentPlan: null,
      suggestedMeals: [],
      dailyStats: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      isLoading: false,
      error: null,
      markMealCompleted: jest.fn(),
      createMealLog: jest.fn(),
      refreshPlan: jest.fn(),
    } as any)

    render(<NutritionPlanCard />)
    expect(screen.getByText(/no tienes un plan/i)).toBeInTheDocument()
  })
})
