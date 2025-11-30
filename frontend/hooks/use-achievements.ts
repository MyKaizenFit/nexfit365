import { useState, useEffect } from 'react'
import { authenticatedFetch } from '@/lib/api'

interface Achievement {
  id: string
  key: string
  name: string
  description: string
  category: 'workout' | 'nutrition' | 'progress' | 'streak' | 'milestone' | 'social' | 'system'
  icon: string
  points: number
  criteria: any
}

interface UserAchievement {
  id: string
  achievement: Achievement
  unlocked_at: string
  progress?: any
}

interface AchievementSummary {
  total_achievements: number
  unlocked_count: number
  total_points: number
  unlocked_percentage: number
  recent_achievements: UserAchievement[]
}

export function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([])
  const [summary, setSummary] = useState<AchievementSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAllData()
  }, [])

  // Recalcular summary cuando cambien achievements o userAchievements
  useEffect(() => {
    if ((achievements.length > 0 || userAchievements.length > 0) && !summary) {
      setSummary({
        total_achievements: achievements.length || 0,
        unlocked_count: userAchievements.length || 0,
        total_points: userAchievements.reduce((sum, ua) => sum + (ua.achievement?.points || 0), 0),
        unlocked_percentage: achievements.length > 0 ? (userAchievements.length / achievements.length) * 100 : 0,
        recent_achievements: userAchievements.slice(0, 5)
      })
    }
  }, [achievements, userAchievements])

  const fetchAllData = async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([
        fetchAchievements(),
        fetchUserAchievements(),
        fetchSummary()
      ])
    } catch (err) {
      console.error('Error fetching achievements data:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar logros')
    } finally {
      setLoading(false)
    }
  }

  const fetchAchievements = async () => {
    try {
      const response = await authenticatedFetch('achievements/achievements/')
      if (response.ok) {
        const data = await response.json()
        setAchievements(data.results || data || [])
      }
    } catch (err) {
      console.error('Error fetching achievements:', err)
      setAchievements([])
    }
  }

  const fetchUserAchievements = async () => {
    try {
      const response = await authenticatedFetch('achievements/user-achievements/')
      if (response.ok) {
        const data = await response.json()
        setUserAchievements(data.results || data || [])
      }
    } catch (err) {
      console.error('Error fetching user achievements:', err)
      setUserAchievements([])
    }
  }

  const fetchSummary = async () => {
    try {
      const response = await authenticatedFetch('achievements/user-achievements/summary/')
      if (response.ok) {
        const data = await response.json()
        setSummary(data)
        return
      }
    } catch (err) {
      console.error('Error fetching summary:', err)
    }
    
    // Si falla o no existe, calcular un resumen básico
    // Usar un efecto para calcular después de cargar los datos
    if (achievements.length > 0 || userAchievements.length > 0) {
      setSummary({
        total_achievements: achievements.length || 0,
        unlocked_count: userAchievements.length || 0,
        total_points: userAchievements.reduce((sum, ua) => sum + (ua.achievement?.points || 0), 0),
        unlocked_percentage: achievements.length > 0 ? (userAchievements.length / achievements.length) * 100 : 0,
        recent_achievements: userAchievements.slice(0, 5)
      })
    }
  }

  const getUnlockedAchievementIds = () => {
    return new Set(userAchievements.map(ua => ua.achievement.id))
  }

  const getAchievementsByCategory = (category: string) => {
    const unlockedIds = getUnlockedAchievementIds()
    return achievements
      .filter(a => a.category === category)
      .map(achievement => ({
        ...achievement,
        unlocked: unlockedIds.has(achievement.id),
        unlockedAt: userAchievements.find(ua => ua.achievement.id === achievement.id)?.unlocked_at
      }))
  }

  const refresh = () => {
    fetchAllData()
  }

  return {
    achievements,
    userAchievements,
    summary,
    loading,
    error,
    getUnlockedAchievementIds,
    getAchievementsByCategory,
    refresh
  }
}

