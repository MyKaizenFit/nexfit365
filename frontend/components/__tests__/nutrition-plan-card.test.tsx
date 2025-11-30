import { render, screen } from '@testing-library/react'
import { NutritionPlanCard } from '../nutrition-plan-card'
import * as useNutrition from '@/hooks/use-nutrition'

// Mock del hook
jest.mock('@/hooks/use-nutrition')

// Mock de toast
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}))

describe('NutritionPlanCard', () => {
  const mockPlan = {
    id: '123',
    name: 'Plan Pérdida de Peso',
    daily_calories: 1800,
    target_macros: {
      protein: 135,
      carbs: 180,
      fat: 60,
      protein_percentage: 30,
      carbs_percentage: 40,
      fat_percentage: 30,
    },
    is_active: true,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state', () => {
    ;(useNutrition.useNutrition as jest.Mock).mockReturnValue({
      currentPlan: null,
      isLoading: true,
      changePlan: jest.fn(),
      getAvailablePlans: jest.fn(),
      refreshPlan: jest.fn(),
    })

    render(<NutritionPlanCard />)
    expect(screen.getByText(/Cargando plan nutricional/i)).toBeInTheDocument()
  })

  it('renders empty state when no plan', () => {
    ;(useNutrition.useNutrition as jest.Mock).mockReturnValue({
      currentPlan: null,
      isLoading: false,
      changePlan: jest.fn(),
      getAvailablePlans: jest.fn(),
      refreshPlan: jest.fn(),
    })

    render(<NutritionPlanCard />)
    expect(screen.getByText(/No tienes un plan nutricional activo/i)).toBeInTheDocument()
    expect(screen.getByText(/Seleccionar Plan/i)).toBeInTheDocument()
  })

  it('renders current plan information', () => {
    ;(useNutrition.useNutrition as jest.Mock).mockReturnValue({
      currentPlan: mockPlan,
      isLoading: false,
      changePlan: jest.fn(),
      getAvailablePlans: jest.fn(),
      refreshPlan: jest.fn(),
    })

    render(<NutritionPlanCard />)
    expect(screen.getByText(mockPlan.name)).toBeInTheDocument()
    expect(screen.getByText(String(mockPlan.daily_calories))).toBeInTheDocument()
  })

  it('displays macro information', () => {
    ;(useNutrition.useNutrition as jest.Mock).mockReturnValue({
      currentPlan: mockPlan,
      isLoading: false,
      changePlan: jest.fn(),
      getAvailablePlans: jest.fn(),
      refreshPlan: jest.fn(),
    })

    render(<NutritionPlanCard />)
    // Los macros deben estar presentes en el render
    expect(screen.getByText(mockPlan.name)).toBeInTheDocument()
  })

  it('handles plan without macros gracefully', () => {
    const planNoMacros = {
      ...mockPlan,
      target_macros: null,
    }

    ;(useNutrition.useNutrition as jest.Mock).mockReturnValue({
      currentPlan: planNoMacros,
      isLoading: false,
      changePlan: jest.fn(),
      getAvailablePlans: jest.fn(),
      refreshPlan: jest.fn(),
    })

    render(<NutritionPlanCard />)
    expect(screen.getByText(planNoMacros.name)).toBeInTheDocument()
  })
})

