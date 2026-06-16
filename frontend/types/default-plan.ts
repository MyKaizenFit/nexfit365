export interface PlanSummary {
  id: string
  name: string
}

export interface CreatedBySummary {
  id: string | number
  email: string
  name: string
}

export interface DefaultPlanConfiguration {
  id: string
  name: string
  description: string
  priority: number
  is_active: boolean
  main_goal: string | null
  training_location: string | null
  activity_level: string | null
  gender: string | null
  min_training_days_per_week: number | null
  max_training_days_per_week: number | null
  age_min: number | null
  age_max: number | null
  dietary_restrictions: string[]
  equipment_keywords: string[]
  default_nutrition_plan: PlanSummary | null
  default_workout_program: PlanSummary | null
  nutrition_plan_is_assignable?: boolean
  workout_program_is_assignable?: boolean
  has_valid_templates?: boolean
  templates_issue?: string | null
  created_by: CreatedBySummary | null
  created_at: string
  updated_at: string
}

export interface UpsertDefaultPlanConfigurationPayload {
  name: string
  description?: string
  priority: number
  is_active: boolean
  main_goal?: string | null
  training_location?: string | null
  activity_level?: string | null
  gender?: string | null
  min_training_days_per_week?: number | null
  max_training_days_per_week?: number | null
  age_min?: number | null
  age_max?: number | null
  dietary_restrictions?: string[]
  equipment_keywords?: string[]
  default_nutrition_plan_id?: string | null
  default_workout_program_id?: string | null
}

export interface PlanOption {
  id: string
  name: string
}

