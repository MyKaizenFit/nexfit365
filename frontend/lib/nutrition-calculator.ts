// lib/nutrition-calculator.ts
// Utilidad para calcular calorías y macros basándose en datos del usuario

export interface UserProfileData {
  weight?: number | null
  height?: number | null
  age?: number | null
  gender?: 'male' | 'female' | 'other' | null
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null
  main_goal?: 'lose_weight' | 'gain_muscle' | 'body_recomposition' | 'maintain' | 'performance' | null
}

export interface CalculatedMacros {
  calories: number
  protein: number
  carbs: number
  fat: number
  protein_percentage: number
  carbs_percentage: number
  fat_percentage: number
}

/**
 * Calcula el BMR (Tasa Metabólica Basal) usando la fórmula de Harris-Benedict
 */
export function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: 'male' | 'female' | 'other'
): number {
  if (gender === 'male') {
    return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
  } else {
    // female o other
    return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)
  }
}

/**
 * Calcula el TDEE (Gasto Energético Total Diario) multiplicando BMR por factor de actividad
 */
export function calculateTDEE(bmr: number, activityLevel: string): number {
  const activityFactors: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  }

  const factor = activityFactors[activityLevel] || 1.55
  return bmr * factor
}

/**
 * Calcula las calorías diarias objetivo basándose en el objetivo principal
 */
export function calculateTargetCalories(
  tdee: number,
  mainGoal: string | null | undefined
): number {
  if (!mainGoal) {
    return Math.round(tdee)
  }

  const goalAdjustments: Record<string, number> = {
    lose_weight: -500, // Déficit de 500 kcal/día ≈ 0.5kg/semana
    gain_muscle: 300, // Superávit moderado para ganancia muscular
    body_recomposition: 0, // Mantenimiento
    maintain: 0,
    performance: 200, // Ligero superávit para rendimiento
  }

  const adjustment = goalAdjustments[mainGoal] || 0
  return Math.round(tdee + adjustment)
}

/**
 * Calcula la distribución de macronutrientes según el objetivo
 */
export function calculateMacros(
  calories: number,
  mainGoal: string | null | undefined
): CalculatedMacros {
  // Distribuciones por objetivo (porcentajes)
  const macroDistributions: Record<string, { protein: number; carbs: number; fat: number }> = {
    lose_weight: { protein: 30, carbs: 40, fat: 30 },
    gain_muscle: { protein: 25, carbs: 50, fat: 25 },
    body_recomposition: { protein: 30, carbs: 45, fat: 25 },
    maintain: { protein: 30, carbs: 45, fat: 25 },
    performance: { protein: 30, carbs: 45, fat: 25 },
  }

  const defaultDistribution = { protein: 30, carbs: 45, fat: 25 }
  const distribution = mainGoal
    ? macroDistributions[mainGoal] || defaultDistribution
    : defaultDistribution

  // Calcular gramos (proteína y carbohidratos = 4 kcal/g, grasa = 9 kcal/g)
  const protein = Math.round((calories * distribution.protein) / 100 / 4)
  const carbs = Math.round((calories * distribution.carbs) / 100 / 4)
  const fat = Math.round((calories * distribution.fat) / 100 / 9)

  return {
    calories,
    protein,
    carbs,
    fat,
    protein_percentage: distribution.protein,
    carbs_percentage: distribution.carbs,
    fat_percentage: distribution.fat,
  }
}

/**
 * Calcula las calorías y macros completas basándose en el perfil del usuario
 */
export function calculateNutritionPlan(
  profile: UserProfileData
): CalculatedMacros | null {
  const { weight, height, age, gender, activity_level, main_goal } = profile

  // Validar datos mínimos requeridos
  if (!weight || !height || !age || !gender || !activity_level) {
    return null
  }

  // Calcular BMR
  const bmr = calculateBMR(weight, height, age, gender)

  // Calcular TDEE
  const tdee = calculateTDEE(bmr, activity_level)

  // Calcular calorías objetivo
  const targetCalories = calculateTargetCalories(tdee, main_goal)

  // Calcular macros
  return calculateMacros(targetCalories, main_goal)
}

/**
 * Compara dos planes nutricionales y devuelve las diferencias
 */
export function compareNutritionPlans(
  current: CalculatedMacros,
  proposed: CalculatedMacros
): {
  calories: { current: number; proposed: number; difference: number }
  protein: { current: number; proposed: number; difference: number }
  carbs: { current: number; proposed: number; difference: number }
  fat: { current: number; proposed: number; difference: number }
} {
  return {
    calories: {
      current: current.calories,
      proposed: proposed.calories,
      difference: proposed.calories - current.calories,
    },
    protein: {
      current: current.protein,
      proposed: proposed.protein,
      difference: proposed.protein - current.protein,
    },
    carbs: {
      current: current.carbs,
      proposed: proposed.carbs,
      difference: proposed.carbs - current.carbs,
    },
    fat: {
      current: current.fat,
      proposed: proposed.fat,
      difference: proposed.fat - current.fat,
    },
  }
}






