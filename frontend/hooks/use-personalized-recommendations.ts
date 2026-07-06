import { useState, useEffect } from 'react'
import { buildApiUrl, getAuthHeaders } from '@/lib/api'

export interface PersonalizedRecommendation {
  recipes: any[]
  workout_programs: any[]
  wellness_tips: any[]
  user_profile: any
}

export function usePersonalizedRecommendations() {
  const [recommendations, setRecommendations] = useState<PersonalizedRecommendation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRecommendations = async () => {
    try {
      setLoading(true)

      // Cargar perfil del usuario
      const profileResponse = await fetch(buildApiUrl('me/'), {
        headers: getAuthHeaders(),
      })

      if (!profileResponse.ok) {
        throw new Error('Error al cargar perfil')
      }

      const profile = await profileResponse.json()

      // Las recetas del plan se gestionan desde nutrición; no listar el catálogo completo aquí.
      const recipes: any[] = []

      // Cargar programas de entrenamiento
      const workoutResponse = await fetch(buildApiUrl('workout-programs/?limit=6'), {
        headers: getAuthHeaders(),
      })

      let workoutPrograms = []
      if (workoutResponse.ok) {
        const workoutData = await workoutResponse.json()
        workoutPrograms = workoutData.results || workoutData || []
      }

      // Cargar wellness tips destacados
      const tipsResponse = await fetch(buildApiUrl('tips/?limit=3'), {
        headers: getAuthHeaders(),
      })

      let wellnessTips = []
      if (tipsResponse.ok) {
        const tipsData = await tipsResponse.json()
        wellnessTips = tipsData.results || tipsData || []
        // Filtrar solo destacados
        wellnessTips = wellnessTips.filter((tip: any) => tip.is_highlighted)
      }

      setRecommendations({
        recipes,
        workout_programs: workoutPrograms,
        wellness_tips: wellnessTips,
        user_profile: profile,
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecommendations()
  }, [])

  return {
    recommendations,
    loading,
    error,
    refresh: fetchRecommendations,
  }
}


