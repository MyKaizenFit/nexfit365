export interface RestWellnessAccess {
  can_fill: boolean
  can_coach: boolean
}

export interface RestWellnessQuestion {
  index: number
  category_key: string
  pts: number
  text: string
}

export interface RestWellnessQuestionsResponse {
  total: number
  questions: RestWellnessQuestion[]
}

export interface RestWellnessTier {
  label: string
  color: string
  key: string
}

export interface RestWellnessRankedCategory {
  key: string
  emoji: string
  name: string
  score: number
  tier: RestWellnessTier
}

export interface RestWellnessAssessmentSummary {
  id: string
  name: string
  date: string
  top_categories: string[]
  scores: Record<string, number>
}

export interface RestWellnessAssessmentDetail extends RestWellnessAssessmentSummary {
  script: string
  ranked: RestWellnessRankedCategory[]
  answers: boolean[]
}
