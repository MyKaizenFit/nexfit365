/**
 * Tipos relacionados con usuarios
 * Centraliza todas las definiciones de tipos de usuario
 */

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  role: 'MEMBER' | 'ADMIN' | 'TRAINER' | 'BASIC' | 'PRO' | 'PREMIUM' | 'member' | 'admin' | 'trainer' | 'basic' | 'pro' | 'premium'
  is_staff: boolean
  is_superuser: boolean
  
  // Información de perfil
  profile_picture?: string
  profile_picture_url?: string  // URL completa de la foto de perfil
  avatar?: string  // Alias para profile_picture
  phone?: string
  phone_number?: string
  date_of_birth?: string
  birth_date?: string
  height?: number
  weight?: number
  
  // Objetivos y preferencias
  age?: number
  gender?: 'male' | 'female' | 'other' | string
  main_goal?: 'lose_weight' | 'gain_muscle' | 'body_recomposition' | string
  additional_info_for_admin?: string
  fitness_goals?: string | string[]
  target_weight?: number
  target_date?: string
  activity_level?: string
  
  // Información de salud
  dietary_restrictions?: string | string[]
  allergies?: string | string[]
  disliked_foods?: string | string[]
  medical_conditions?: string | string[]
  injuries_or_medical_issues?: string
  
  // Contacto de emergencia
  emergency_contact_name?: string
  emergency_contact_phone?: string
  
  // Preferencias de entrenamiento
  equipment_available?: string | string[]
  workout_preferences?: string | string[]
  training_days_per_week?: number
  training_days?: number[] // Array de números 1-7 (1=Lunes, 7=Domingo)
  training_location?: 'home' | 'gym'
  
  // Racha de días completos
  daily_streak?: number
  longest_streak?: number
  last_completed_day?: string
  
  // Metadatos
  is_verified: boolean
  date_joined: string
  last_login?: string
  created_at?: string
  updated_at?: string
  
  // Contraseña temporal
  must_change_password?: boolean
}

export interface UserProfile extends User {
  // Alias y campos adicionales
  bio?: string
}

export interface UserStats {
  caloriesToday: number
  caloriesGoal: number
  currentWeight: number | null
  targetWeight: number | null
  startingWeight?: number | null
  weightChange: number
  workoutsThisWeek: number
  workoutsGoal: number
  nextReview: string
  daysInTransformation: number
  proteinToday: number
  proteinGoal: number
  carbsToday: number
  carbsGoal: number
  fatToday: number
  fatGoal: number
  
  // Estadísticas adicionales para admin
  total_users?: number
  active_users?: number
  inactive_users?: number
  staff_users?: number
  superusers?: number
  new_users_last_7_days?: number
  new_users_this_month?: number
  role_distribution?: Array<{ role: string; count: number }>
}

export interface UpdateUserData {
  email?: string
  first_name?: string
  last_name?: string
  role?: 'MEMBER' | 'ADMIN' | 'TRAINER' | 'BASIC' | 'PRO' | 'PREMIUM'
  is_active?: boolean
  phone?: string
  phone_number?: string
  date_of_birth?: string
  birth_date?: string
  height?: number
  weight?: number
  fitness_goals?: string | string[]
  target_weight?: number
  target_date?: string
  activity_level?: string
  dietary_restrictions?: string | string[]
  allergies?: string | string[]
  disliked_foods?: string | string[]
  medical_conditions?: string | string[]
  emergency_contact_name?: string
  emergency_contact_phone?: string
  equipment_available?: string | string[]
  workout_preferences?: string | string[]
  profile_picture?: string
  bio?: string
}

