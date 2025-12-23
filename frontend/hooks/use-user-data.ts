import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { userService, UserStats, UserProfile } from '@/lib/user-service'

export function useUserData() {
  const { user, isAuthenticated } = useAuth()
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Solo ejecutar cuando el usuario esté completamente autenticado
    if (isAuthenticated && user) {
      // Pequeño delay para asegurar que los tokens estén disponibles
      const timer = setTimeout(() => {
        fetchUserStats()
      }, 100)
      
      return () => clearTimeout(timer)
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, user])

  const fetchUserStats = async () => {
    try {
      setLoading(true)
      setError(null)

      // Obtener estadísticas del usuario usando el nuevo servicio
      const data = await userService.getUserStats()
      
      if (data) {
        setUserStats(data)
      } else {
        // Si no hay datos (usuario no autenticado), usar valores por defecto
        setUserStats({
          caloriesToday: 0,
          caloriesGoal: 2000,
          currentWeight: null,
          targetWeight: null,
          weightChange: 0,
          workoutsThisWeek: 0,
          workoutsGoal: 5,
          nextReview: 'Próximamente',
          daysInTransformation: 1,
          proteinToday: 0,
          proteinGoal: 150,
          carbsToday: 0,
          carbsGoal: 220,
          fatToday: 0,
          fatGoal: 80
        })
      }
    } catch (err) {
      console.error('Error fetching user stats:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      
      // Los datos por defecto ya están en el servicio
      setUserStats({
        caloriesToday: 0,
        caloriesGoal: 2000,
        currentWeight: null,
        targetWeight: null,
        weightChange: 0,
        workoutsThisWeek: 0,
        workoutsGoal: 5,
        nextReview: 'Próximamente',
        daysInTransformation: 1,
        proteinToday: 0,
        proteinGoal: 150,
        carbsToday: 0,
        carbsGoal: 220,
        fatToday: 0,
        fatGoal: 80
      })
    } finally {
      setLoading(false)
    }
  }

  const updateUserStats = async (newStats: Partial<UserStats>) => {
    try {
      // Por ahora, solo actualizamos localmente
      // TODO: Implementar endpoint de actualización en el backend
      setUserStats(prev => prev ? { ...prev, ...newStats } : null)
      
      // Refrescar los datos
      await fetchUserStats()
    } catch (err) {
      console.error('Error updating user stats:', err)
      setError(err instanceof Error ? err.message : 'Error al actualizar')
    }
  }

  return {
    userStats,
    loading,
    error,
    refreshStats: fetchUserStats,
    updateStats: updateUserStats,
  }
}
