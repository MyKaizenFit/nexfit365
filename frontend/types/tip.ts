export type WellnessTipCategory = "nutrition" | "training" | "mindset" | "recovery" | "lifestyle"

export interface WellnessTip {
  id: string
  title: string
  summary: string
  content: string
  category: WellnessTipCategory
  audience: string
  is_active: boolean
  is_highlighted: boolean
  created_at: string
  updated_at: string
  author_name?: string | null
  author_email?: string | null
}

export interface WellnessTipPayload {
  title: string
  summary?: string
  content: string
  category: WellnessTipCategory
  audience?: string
  is_active?: boolean
  is_highlighted?: boolean
}

