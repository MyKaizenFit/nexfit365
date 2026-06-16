import {
  calculateBMR,
  calculateTDEE,
  calculateTargetCalories,
  calculateMacros,
  calculateNutritionPlan,
  compareNutritionPlans,
  CalculatedMacros,
  UserProfileData,
} from '../nutrition-calculator'

// ---------------------------------------------------------------------------
// calculateBMR
// ---------------------------------------------------------------------------

describe('calculateBMR', () => {
  it('calculates male BMR using Harris-Benedict', () => {
    // weight=80kg, height=180cm, age=30, gender=male
    const expected = 88.362 + (13.397 * 80) + (4.799 * 180) - (5.677 * 30)
    expect(calculateBMR(80, 180, 30, 'male')).toBeCloseTo(expected, 2)
  })

  it('calculates female BMR using Harris-Benedict', () => {
    const expected = 447.593 + (9.247 * 65) + (3.098 * 165) - (4.330 * 25)
    expect(calculateBMR(65, 165, 25, 'female')).toBeCloseTo(expected, 2)
  })

  it('treats "other" gender same as female formula', () => {
    const female = calculateBMR(65, 165, 25, 'female')
    const other = calculateBMR(65, 165, 25, 'other')
    expect(other).toBeCloseTo(female, 2)
  })

  it('male BMR is higher than female for same stats', () => {
    const maleBMR = calculateBMR(70, 170, 30, 'male')
    const femaleBMR = calculateBMR(70, 170, 30, 'female')
    expect(maleBMR).toBeGreaterThan(femaleBMR)
  })

  it('returns a positive value for typical inputs', () => {
    expect(calculateBMR(70, 170, 30, 'male')).toBeGreaterThan(0)
    expect(calculateBMR(60, 160, 25, 'female')).toBeGreaterThan(0)
  })

  it('higher weight increases BMR', () => {
    const bmrLight = calculateBMR(60, 170, 30, 'male')
    const bmrHeavy = calculateBMR(100, 170, 30, 'male')
    expect(bmrHeavy).toBeGreaterThan(bmrLight)
  })

  it('older age decreases BMR', () => {
    const bmrYoung = calculateBMR(70, 170, 20, 'male')
    const bmrOld = calculateBMR(70, 170, 60, 'male')
    expect(bmrOld).toBeLessThan(bmrYoung)
  })
})

// ---------------------------------------------------------------------------
// calculateTDEE
// ---------------------------------------------------------------------------

describe('calculateTDEE', () => {
  const baseBMR = 1800

  it('applies sedentary factor (1.2)', () => {
    expect(calculateTDEE(baseBMR, 'sedentary')).toBeCloseTo(baseBMR * 1.2, 2)
  })

  it('applies light factor (1.375)', () => {
    expect(calculateTDEE(baseBMR, 'light')).toBeCloseTo(baseBMR * 1.375, 2)
  })

  it('applies moderate factor (1.55)', () => {
    expect(calculateTDEE(baseBMR, 'moderate')).toBeCloseTo(baseBMR * 1.55, 2)
  })

  it('applies active factor (1.725)', () => {
    expect(calculateTDEE(baseBMR, 'active')).toBeCloseTo(baseBMR * 1.725, 2)
  })

  it('applies very_active factor (1.9)', () => {
    expect(calculateTDEE(baseBMR, 'very_active')).toBeCloseTo(baseBMR * 1.9, 2)
  })

  it('defaults to moderate (1.55) for unknown activity level', () => {
    expect(calculateTDEE(baseBMR, 'unknown')).toBeCloseTo(baseBMR * 1.55, 2)
  })

  it('TDEE is always greater than BMR', () => {
    const tdee = calculateTDEE(baseBMR, 'sedentary')
    expect(tdee).toBeGreaterThan(baseBMR)
  })
})

// ---------------------------------------------------------------------------
// calculateTargetCalories
// ---------------------------------------------------------------------------

describe('calculateTargetCalories', () => {
  const tdee = 2000

  it('reduces calories for lose_weight (-500)', () => {
    expect(calculateTargetCalories(tdee, 'lose_weight')).toBe(1500)
  })

  it('increases calories for gain_muscle (+300)', () => {
    expect(calculateTargetCalories(tdee, 'gain_muscle')).toBe(2300)
  })

  it('keeps calories for body_recomposition (0)', () => {
    expect(calculateTargetCalories(tdee, 'body_recomposition')).toBe(2000)
  })

  it('keeps calories for maintain (0)', () => {
    expect(calculateTargetCalories(tdee, 'maintain')).toBe(2000)
  })

  it('slight surplus for performance (+200)', () => {
    expect(calculateTargetCalories(tdee, 'performance')).toBe(2200)
  })

  it('rounds to nearest integer', () => {
    const result = calculateTargetCalories(2000.7, 'maintain')
    expect(Number.isInteger(result)).toBe(true)
  })

  it('returns TDEE when goal is null', () => {
    expect(calculateTargetCalories(2000, null)).toBe(2000)
  })

  it('returns TDEE when goal is undefined', () => {
    expect(calculateTargetCalories(2000, undefined)).toBe(2000)
  })

  it('handles unknown goal by defaulting to 0 adjustment', () => {
    expect(calculateTargetCalories(2000, 'unknown_goal')).toBe(2000)
  })
})

// ---------------------------------------------------------------------------
// calculateMacros
// ---------------------------------------------------------------------------

describe('calculateMacros', () => {
  const calories = 2000

  it('returns CalculatedMacros object with all fields', () => {
    const result = calculateMacros(calories, 'maintain')
    expect(result).toHaveProperty('calories', calories)
    expect(result).toHaveProperty('protein')
    expect(result).toHaveProperty('carbs')
    expect(result).toHaveProperty('fat')
    expect(result).toHaveProperty('protein_percentage')
    expect(result).toHaveProperty('carbs_percentage')
    expect(result).toHaveProperty('fat_percentage')
  })

  it('percentages add up to 100', () => {
    const result = calculateMacros(calories, 'maintain')
    const total = result.protein_percentage + result.carbs_percentage + result.fat_percentage
    expect(total).toBe(100)
  })

  it('macros are positive integers', () => {
    const result = calculateMacros(calories, 'gain_muscle')
    expect(result.protein).toBeGreaterThan(0)
    expect(result.carbs).toBeGreaterThan(0)
    expect(result.fat).toBeGreaterThan(0)
    expect(Number.isInteger(result.protein)).toBe(true)
    expect(Number.isInteger(result.carbs)).toBe(true)
    expect(Number.isInteger(result.fat)).toBe(true)
  })

  it('lose_weight has higher protein percentage (30%)', () => {
    const result = calculateMacros(calories, 'lose_weight')
    expect(result.protein_percentage).toBe(30)
    expect(result.fat_percentage).toBe(30)
  })

  it('gain_muscle has higher carbs percentage (50%)', () => {
    const result = calculateMacros(calories, 'gain_muscle')
    expect(result.carbs_percentage).toBe(50)
  })

  it('uses default distribution when goal is null', () => {
    const result = calculateMacros(calories, null)
    expect(result.protein_percentage).toBe(30)
  })

  it('protein grams calculation: calories * protein_pct / 100 / 4', () => {
    const result = calculateMacros(2000, 'maintain')
    const expected = Math.round((2000 * 30) / 100 / 4)
    expect(result.protein).toBe(expected)
  })

  it('fat grams calculation uses 9 kcal/g', () => {
    const result = calculateMacros(2000, 'maintain')
    const expected = Math.round((2000 * 25) / 100 / 9)
    expect(result.fat).toBe(expected)
  })
})

// ---------------------------------------------------------------------------
// calculateNutritionPlan
// ---------------------------------------------------------------------------

describe('calculateNutritionPlan', () => {
  const fullProfile: UserProfileData = {
    weight: 75,
    height: 175,
    age: 30,
    gender: 'male',
    activity_level: 'moderate',
    main_goal: 'maintain',
  }

  it('returns CalculatedMacros for complete profile', () => {
    const result = calculateNutritionPlan(fullProfile)
    expect(result).not.toBeNull()
    expect(result?.calories).toBeGreaterThan(0)
  })

  it('returns null when weight is missing', () => {
    expect(calculateNutritionPlan({ ...fullProfile, weight: null })).toBeNull()
  })

  it('returns null when height is missing', () => {
    expect(calculateNutritionPlan({ ...fullProfile, height: null })).toBeNull()
  })

  it('returns null when age is missing', () => {
    expect(calculateNutritionPlan({ ...fullProfile, age: null })).toBeNull()
  })

  it('returns null when gender is missing', () => {
    expect(calculateNutritionPlan({ ...fullProfile, gender: null })).toBeNull()
  })

  it('returns null when activity_level is missing', () => {
    expect(calculateNutritionPlan({ ...fullProfile, activity_level: null })).toBeNull()
  })

  it('returns valid plan even without main_goal', () => {
    const result = calculateNutritionPlan({ ...fullProfile, main_goal: null })
    expect(result).not.toBeNull()
  })

  it('lose_weight plan has fewer calories than maintain', () => {
    const maintain = calculateNutritionPlan({ ...fullProfile, main_goal: 'maintain' })
    const lose = calculateNutritionPlan({ ...fullProfile, main_goal: 'lose_weight' })
    expect(lose!.calories).toBeLessThan(maintain!.calories)
  })

  it('gain_muscle plan has more calories than maintain', () => {
    const maintain = calculateNutritionPlan({ ...fullProfile, main_goal: 'maintain' })
    const gain = calculateNutritionPlan({ ...fullProfile, main_goal: 'gain_muscle' })
    expect(gain!.calories).toBeGreaterThan(maintain!.calories)
  })
})

// ---------------------------------------------------------------------------
// compareNutritionPlans
// ---------------------------------------------------------------------------

describe('compareNutritionPlans', () => {
  const plan1: CalculatedMacros = {
    calories: 2000, protein: 150, carbs: 200, fat: 67,
    protein_percentage: 30, carbs_percentage: 40, fat_percentage: 30,
  }
  const plan2: CalculatedMacros = {
    calories: 2300, protein: 172, carbs: 230, fat: 77,
    protein_percentage: 30, carbs_percentage: 40, fat_percentage: 30,
  }

  it('calculates calorie difference', () => {
    const diff = compareNutritionPlans(plan1, plan2)
    expect(diff.calories.difference).toBe(300)
  })

  it('calculates protein difference', () => {
    const diff = compareNutritionPlans(plan1, plan2)
    expect(diff.protein.difference).toBe(22)
  })

  it('preserves current and proposed values', () => {
    const diff = compareNutritionPlans(plan1, plan2)
    expect(diff.calories.current).toBe(2000)
    expect(diff.calories.proposed).toBe(2300)
  })

  it('negative difference when proposed is lower', () => {
    const diff = compareNutritionPlans(plan2, plan1)
    expect(diff.calories.difference).toBe(-300)
  })

  it('returns zero difference for identical plans', () => {
    const diff = compareNutritionPlans(plan1, plan1)
    expect(diff.calories.difference).toBe(0)
    expect(diff.protein.difference).toBe(0)
  })
})
