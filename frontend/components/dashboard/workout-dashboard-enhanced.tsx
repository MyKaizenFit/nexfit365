"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dumbbell, Play, Check, Clock, Target, Calendar,
  TrendingUp, Award, Timer, Users, BarChart3,
  Video, CheckCircle2, Circle, Repeat, RefreshCw, Flame
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { useWorkouts } from "@/hooks/use-workouts"
import { useUserProfile } from "@/hooks/use-user-profile"
import { useUserData } from "@/hooks/use-user-data"
import { useAuth } from "@/contexts/auth-context"
import { authenticatedFetch } from "@/lib/api"
import { type WorkoutDay } from "@/lib/workout-service"
import { ActiveWorkoutSession } from "@/components/active-workout-session"
import { ExerciseVideoPlayer } from "@/components/exercise-video-player"
import { WorkoutHistoryEnhanced } from "./workout-history-enhanced"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Función para corregir encoding de nombres de ejercicios y grupos musculares
const fixEncoding = (text: string): string => {
  if (!text || typeof text !== 'string') return text || ''
  
  let fixed = text
  
  // CASOS ESPECÍFICOS DE ENCODING MAL INTERPRETADO
  // ├│ es una codificación incorrecta de ó (UTF-8 mal interpretado como Windows-1252 o similar)
  fixed = fixed.replace(/├│/g, 'ó')
  fixed = fixed.replace(/├í/g, 'á')
  fixed = fixed.replace(/├®/g, 'é')
  fixed = fixed.replace(/├¡/g, 'í')
  fixed = fixed.replace(/├║/g, 'ú')
  fixed = fixed.replace(/├▒/g, 'ñ')
  
  // Casos específicos de caracteres que aparecen como barra vertical |
  fixed = fixed.replace(/Jal\|n/gi, 'Jalón')
  fixed = fixed.replace(/jal\|n/gi, 'Jalón')
  fixed = fixed.replace(/M\|quina/gi, 'Máquina')
  fixed = fixed.replace(/m\|quina/gi, 'Máquina')
  
  // Casos específicos comunes sin el carácter |
  fixed = fixed.replace(/Jaln\b/gi, 'Jalón')
  fixed = fixed.replace(/Mquina\b/gi, 'Máquina')
  
  // Reemplazos generales de encoding incorrecto
  fixed = fixed.replace(/b\?\?ceps/gi, 'bíceps')
  fixed = fixed.replace(/tr\?\?ceps/gi, 'tríceps')
  fixed = fixed.replace(/cu\?\?driceps/gi, 'cuádriceps')
  fixed = fixed.replace(/\?\?/g, 'í')
  fixed = fixed.replace(/Ã¡/g, 'á')
  fixed = fixed.replace(/Ã©/g, 'é')
  fixed = fixed.replace(/Ã­/g, 'í')
  fixed = fixed.replace(/Ã³/g, 'ó')
  fixed = fixed.replace(/Ãº/g, 'ú')
  fixed = fixed.replace(/Ã±/g, 'ñ')
  fixed = fixed.replace(/Ã¼/g, 'ü')
  fixed = fixed.replace(/Ã‰/g, 'É')
  fixed = fixed.replace(/Ã/g, 'í')
  fixed = fixed.replace(/â€™/g, "'")
  fixed = fixed.replace(/â€œ/g, '"')
  fixed = fixed.replace(/â€/g, '"')
  fixed = fixed.replace(/â€"/g, '—')
  fixed = fixed.replace(/â€"/g, '–')
  
  // Último recurso: reemplazar | con ó solo si no está ya corregido
  if (fixed.includes('|') && !fixed.includes('ó')) {
    fixed = fixed.replace(/\|/g, 'ó')
  }
  
  return fixed
}

export function WorkoutDashboardEnhanced() {
  const {
    workoutPrograms,
    activeProgram,
    workoutLogs,
    workoutStatistics,
    loading,
    error,
    logWorkout,
    fetchWorkoutLogs,
    fetchWorkoutStatistics,
    getTodaysWorkout,
    getWeeklyProgress
  } = useWorkouts()

  const { profile } = useUserProfile()
  const { userStats, refreshStats } = useUserData()
  const { isAuthenticated } = useAuth()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Usar activeProgram como userPlan
  const userPlan = activeProgram

  const [isWorkoutDialogOpen, setIsWorkoutDialogOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null)
  const [workoutForm, setWorkoutForm] = useState({
    duration: 45,
    notes: "",
    rating: 5
  })
  // Estado para ejercicios completados durante el entrenamiento
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set())
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null)
  // Estado para verificar si el entrenamiento de hoy ya está completado
  const [todayWorkoutCompleted, setTodayWorkoutCompleted] = useState<Record<string, boolean>>({})

  // Obtener entrenamiento de hoy
  const todaysWorkout = getTodaysWorkout()

  // Obtener progreso semanal
  const weeklyProgress = getWeeklyProgress()

  // Función para verificar si los entrenamientos del día ya están completados
  const checkCompletedWorkouts = useCallback(async () => {
    if (!activeProgram?.days) {
      setTodayWorkoutCompleted({})
      return
    }

    const completed: Record<string, boolean> = {}
    const checkedDayIds = new Set<string>()

    // También verificar desde los logs locales para respuesta más rápida
    const today = new Date()
    const todayLogs = workoutLogs.filter((log) => {
      if (!log?.date || !log?.completed) return false
      const logDate = new Date(log.date)
      return logDate.toDateString() === today.toDateString()
    })

    for (const day of activeProgram.days) {
      const dayId = String(day.id || '').trim()

      if (!dayId || !UUID_REGEX.test(dayId) || checkedDayIds.has(dayId)) {
        continue
      }

      checkedDayIds.add(dayId)

      if (day.is_rest_day) continue

      // Primero verificar en los logs locales
      const localCompleted = todayLogs.some(log =>
        log.workout_day === dayId || log.workout_day === String(dayId)
      )

      if (localCompleted) {
        completed[dayId] = true
        continue
      }

      // Si no está en local, verificar en el servidor
      try {
        const response = await authenticatedFetch(
          `workout-logs/check_today/?workout_day=${dayId}`
        )
        if (response.ok) {
          const text = await response.text()
          if (text) {
            try {
              const data = JSON.parse(text)
              completed[dayId] = data.is_completed || false
            } catch (parseError) {
            }
          }
        } else {
        }
      } catch (error) {
      }
    }

    setTodayWorkoutCompleted(completed)
  }, [activeProgram, workoutLogs, isAuthenticated])

  // Limpiar estado local cuando cambie el plan para evitar IDs obsoletos
  useEffect(() => {
    if (!activeProgram?.days?.length) {
      setTodayWorkoutCompleted({})
      return
    }

    const validDayIds = new Set(
      activeProgram.days
        .map((day) => String(day.id || '').trim())
        .filter((dayId) => UUID_REGEX.test(dayId))
    )

    setTodayWorkoutCompleted((prev) => {
      const filtered = Object.fromEntries(
        Object.entries(prev).filter(([dayId]) => validDayIds.has(dayId))
      )
      return filtered
    })
  }, [activeProgram])

  // Verificar si los entrenamientos del día ya están completados
  useEffect(() => {
    if (isAuthenticated && activeProgram) {
      checkCompletedWorkouts()
    }
  }, [isAuthenticated, activeProgram, checkCompletedWorkouts])

  // Verificar también cuando cambian los workoutLogs (después de completar uno)
  useEffect(() => {
    if (isAuthenticated && activeProgram && workoutLogs.length > 0) {
      // Pequeño delay para asegurar que el servidor haya actualizado
      const timeoutId = setTimeout(() => {
        checkCompletedWorkouts()
      }, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [workoutLogs.length, isAuthenticated, activeProgram, checkCompletedWorkouts]) // Solo cuando cambia el número de logs

  // Obtener el número de día actual (1-7, donde 1 = Lunes, 7 = Domingo)
  const getTodayDayNumber = () => {
    const today = new Date().getDay() // 0 = Domingo, 1 = Lunes, etc.
    return today === 0 ? 7 : today // Convertir domingo a día 7
  }
  
  const todayDayNumber = getTodayDayNumber()

  // Calcular el objetivo semanal basado en los días de entrenamiento del usuario
  // Usar profile?.training_days directamente para evitar problemas de inicialización
  const trainingDaysCount = Array.isArray(profile?.training_days) ? profile.training_days.length : 0
  const calculatedWeeklyGoal = trainingDaysCount > 0 
    ? trainingDaysCount 
    : (workoutStatistics?.weekly_goal || 5)

  // Usar estadísticas del servidor si están disponibles, sino calcular manualmente
  // Priorizar el valor calculado del frontend sobre el del backend para asegurar precisión
  const stats = workoutStatistics ? {
    completedThisWeek: workoutStatistics.completed_this_week,
    weeklyGoal: calculatedWeeklyGoal, // Siempre usar el calculado basado en training_days del perfil
    totalWorkouts: workoutStatistics.total_workouts,
    averageDuration: workoutStatistics.average_duration,
    currentStreak: workoutStatistics.current_streak,
    longestStreak: workoutStatistics.longest_streak,
    totalMinutesWeek: workoutStatistics.total_minutes_week
  } : {
    completedThisWeek: workoutLogs.filter(log => {
      const logDate = new Date(log.date)
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return logDate >= weekAgo && log.completed
    }).length,
    weeklyGoal: calculatedWeeklyGoal, // Usar el calculado basado en training_days
    totalWorkouts: workoutLogs.length,
    averageDuration: workoutLogs.filter(log => log.completed && log.duration_minutes).length > 0
      ? Math.round(workoutLogs.filter(log => log.completed && log.duration_minutes)
        .reduce((sum, log) => sum + (log.duration_minutes || 0), 0) /
        workoutLogs.filter(log => log.completed && log.duration_minutes).length)
      : 0,
    currentStreak: 0,
    longestStreak: 0,
    totalMinutesWeek: workoutLogs.filter(log => {
      const logDate = new Date(log.date)
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return logDate >= weekAgo && log.completed
    }).reduce((sum, log) => sum + (log.duration_minutes || 0), 0)
  }

  // Obtener día actual en español
  const getTodayName = () => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    return days[new Date().getDay()]
  }

  // Obtener días de entrenamiento del perfil y convertir strings a números si es necesario
  const trainingDaysRaw = profile?.training_days || []
  const trainingDays = trainingDaysRaw.map((day: string | number) => {
    // Si es un string, convertir a número
    if (typeof day === 'string') {
      const dayMap: Record<string, number> = {
        'monday': 1,
        'tuesday': 2,
        'wednesday': 3,
        'thursday': 4,
        'friday': 5,
        'saturday': 6,
        'sunday': 7
      }
      return dayMap[day.toLowerCase()] || day
    }
    return day
  }).filter((d: any) => typeof d === 'number') as number[]

  // Función para obtener el nombre del día desde el número (1=Lunes, 7=Domingo)
  const getDayNameFromNumber = (dayNumber: number) => {
    const days = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    return days[dayNumber] || ''
  }

  // Función para determinar si un día es de entrenamiento o descanso
  const isTrainingDay = (dayNumber: number) => {
    return trainingDays.includes(dayNumber)
  }

  // Función para obtener ejercicios completados de un día desde localStorage y workoutLogs
  const getCompletedExercisesForDay = (dayId: string | number) => {
    if (typeof window === 'undefined') return new Set<string>()

    const completedSet = new Set<string>()

    try {
      const dayIdStr = String(dayId)
      const today = new Date().toISOString().split('T')[0]
      
      // Primero intentar desde localStorage
      const saveKey = `workout_completed_${dayIdStr}_${today}`
      const saved = localStorage.getItem(saveKey)

      if (saved) {
        const savedExercises = JSON.parse(saved)
        savedExercises.forEach((id: string) => completedSet.add(String(id)))
      }

      // También buscar en workoutLogs del backend
      if (workoutLogs && Array.isArray(workoutLogs)) {
        const todayLog = workoutLogs.find((log: any) => {
          const logDate = log.date ? new Date(log.date).toISOString().split('T')[0] : null
          const logDayId = log.workout_day?.id || log.workout_day
          return logDate === today && String(logDayId) === dayIdStr && log.completed
        })

        if (todayLog && todayLog.exercises_data && Array.isArray(todayLog.exercises_data)) {
          todayLog.exercises_data.forEach((ex: any) => {
            if (ex.completed) {
              // Intentar obtener el ID del ejercicio de diferentes formas
              const exerciseId = ex.exercise_id || ex.id || ex.exercise?.id
              if (exerciseId) {
                completedSet.add(String(exerciseId))
              }
            }
          })
        }
      }
    } catch (error) {
    }

    return completedSet
  }

  const isWorkoutFullyCompleted = (day: any) => {
    if (!day?.id || !Array.isArray(day?.exercises) || day.exercises.length === 0) {
      return false
    }

    const completedExercisesForDay = getCompletedExercisesForDay(day.id)
    const totalExercises = day.exercises.length

    let completedCount = 0
    day.exercises.forEach((exercise: any) => {
      const exerciseData = exercise.exercise || exercise
      const exerciseId = String(exerciseData?.id || exercise?.id || exercise?.exercise_id || '')
      if (exerciseId && completedExercisesForDay.has(exerciseId)) {
        completedCount += 1
      }
    })

    return totalExercises > 0 && completedCount >= totalExercises
  }

  // Generar calendario semanal con días de entrenamiento y descanso
  const getWeeklyCalendar = () => {
    const days = [
      { number: 1, name: 'Lunes' },
      { number: 2, name: 'Martes' },
      { number: 3, name: 'Miércoles' },
      { number: 4, name: 'Jueves' },
      { number: 5, name: 'Viernes' },
      { number: 6, name: 'Sábado' },
      { number: 7, name: 'Domingo' },
    ]

    const today = new Date().getDay() // 0 = Domingo, 1 = Lunes, etc.
    const todayNumber = today === 0 ? 7 : today // Convertir a nuestro formato (1-7)

    // Obtener días de entrenamiento del plan (sin descanso), ordenados
    const planWorkoutDays = userPlan?.days
      ?.filter((d: any) => !d.is_rest_day)
      ?.sort((a: any, b: any) => (a.day_number || 0) - (b.day_number || 0)) || []

    // Días del usuario ordenados
    const userTrainingDays = trainingDays.length > 0 ? [...trainingDays].sort((a, b) => a - b) : []

    return days.map(day => {
      // El calendario siempre muestra los días según el perfil del usuario
      const isTraining = trainingDays.length > 0
        ? isTrainingDay(day.number) // Usar días del perfil siempre
        : false

      // Si hay días del usuario configurados, buscar el entrenamiento mapeado
      let mappedWorkoutDay = null
      if (trainingDays.length > 0 && isTraining) {
        const userDayIndex = userTrainingDays.indexOf(day.number)
        if (userDayIndex >= 0 && userDayIndex < planWorkoutDays.length) {
          mappedWorkoutDay = planWorkoutDays[userDayIndex]
        }
      }

      return {
        ...day,
        isTraining, // Basado en el perfil del usuario
        isToday: day.number === todayNumber,
        workoutDay: mappedWorkoutDay, // El entrenamiento mapeado para este día del usuario
        // Indica si hay un entrenamiento asignado para este día
        hasPlanWorkout: mappedWorkoutDay !== null
      }
    })
  }



  // Iniciar entrenamiento
  const handleStartWorkout = (day: any) => {
    const dayId = day.id || day.day_number || 'unknown'

    // Verificar si ya está completado antes de permitir iniciar
    if (todayWorkoutCompleted[dayId]) {
      toast({
        title: "Entrenamiento ya completado",
        description: "Ya has completado este entrenamiento hoy. No puedes realizarlo de nuevo el mismo día.",
        variant: "destructive"
      })
      return
    }

    setSelectedDay(day)

    // Cargar ejercicios completados guardados desde localStorage
    const savedKey = `workout_completed_${dayId}_${new Date().toISOString().split('T')[0]}`
    const saved = localStorage.getItem(savedKey)
    const savedExercises = saved ? JSON.parse(saved) : []

    setCompletedExercises(new Set(savedExercises))
    setWorkoutStartTime(new Date()) // Guardar tiempo de inicio
    setIsWorkoutDialogOpen(true)
  }

  // Marcar ejercicio como completado y guardar en localStorage
  const toggleExerciseCompleted = (exerciseId: string) => {
    setCompletedExercises(prev => {
      const newSet = new Set(prev)
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId)
      } else {
        newSet.add(exerciseId)
      }

      // Guardar en localStorage
      if (selectedDay) {
        const dayId = selectedDay.id || selectedDay.day_number || 'unknown'
        const saveKey = `workout_completed_${dayId}_${new Date().toISOString().split('T')[0]}`
        localStorage.setItem(saveKey, JSON.stringify(Array.from(newSet)))
      }

      return newSet
    })
  }

  // Completar entrenamiento
  const handleCompleteWorkout = async () => {
    if (!selectedDay) return

    try {
      // Calcular duración si se inició el entrenamiento
      let duration = workoutForm.duration
      if (workoutStartTime) {
        const endTime = new Date()
        const diffMinutes = Math.round((endTime.getTime() - workoutStartTime.getTime()) / (1000 * 60))
        duration = diffMinutes > 0 ? diffMinutes : duration
      }

      await logWorkout(selectedDay.id.toString(), workoutForm.notes)

      // Limpiar datos guardados en localStorage después de completar
      const dayId = selectedDay.id || selectedDay.day_number || 'unknown'
      const saveKey = `workout_completed_${dayId}_${new Date().toISOString().split('T')[0]}`
      localStorage.removeItem(saveKey)

      setIsWorkoutDialogOpen(false)
      setWorkoutForm({ duration: 45, notes: "", rating: 5 })
      setCompletedExercises(new Set())
      setWorkoutStartTime(null)
      toast({
        title: "¡Entrenamiento completado!",
        description: "Tu sesión ha sido registrada exitosamente.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar el entrenamiento.",
        variant: "destructive",
      })
    }
  }



  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!userPlan) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No tienes un plan de entrenamiento</h3>
          <p className="text-muted-foreground mb-4">
            Contacta con tu administrador para que te asigne un plan de entrenamiento personalizado
          </p>
          <Button variant="outline">
            Solicitar Plan
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Obtener el entrenamiento de hoy basado en los días del perfil
  const getTodaysWorkoutFromProfile = () => {
    if (!userPlan || !trainingDays.length) {
      // Si no hay training_days, usar la función original
      return getTodaysWorkout()
    }

    const today = new Date().getDay() // 0 = Domingo, 1 = Lunes, etc.
    const todayNumber = today === 0 ? 7 : today // Convertir a nuestro formato (1-7)

    // Verificar si hoy es un día de entrenamiento según el perfil
    if (!trainingDays.includes(todayNumber)) {
      // Si hoy no es un día de entrenamiento según el perfil, devolver null
      return null
    }

    // Obtener días de entrenamiento del plan (sin descanso), ordenados
    const planWorkoutDays = userPlan.days
      ?.filter((d: any) => !d.is_rest_day)
      ?.sort((a: any, b: any) => (a.day_number || 0) - (b.day_number || 0)) || []

    // Días del usuario ordenados
    const userTrainingDays = [...trainingDays].sort((a, b) => a - b)

    // Encontrar el índice del día de hoy en los días del usuario
    const todayIndex = userTrainingDays.indexOf(todayNumber)

    // Si hoy está en los días del usuario, obtener el entrenamiento correspondiente por índice
    if (todayIndex >= 0 && todayIndex < planWorkoutDays.length) {
      const todayWorkout = planWorkoutDays[todayIndex]
      // Retornar con day_number modificado al día de hoy para mantener consistencia
      return {
        ...todayWorkout,
        day_number: todayNumber, // Usar el día del usuario
        mapped_from: todayWorkout.day_number // Guardar el día original del plan para referencia
      }
    }

    return null
  }

  const todaysWorkoutFromProfile = getTodaysWorkoutFromProfile()
  const daysInTransformation = userStats?.daysInTransformation || 1

  // Función para refrescar datos
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        refreshStats(),
        fetchWorkoutLogs(),
        fetchWorkoutStatistics()
      ])
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero Section - Tarjeta de Entrenamiento */}
      <Card className="backdrop-blur-sm bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-0 shadow-xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-200/20 to-teal-200/20"></div>
        <CardHeader className="text-center relative z-10">
          <div className="flex justify-end mb-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-gray-600 hover:text-gray-900"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mb-4 shadow-2xl animate-pulse">
            <Dumbbell className="h-12 w-12 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
            Entrenamientos 💪
          </CardTitle>
          <CardDescription className="text-base mt-2 text-gray-700">
            Tu rutina completa con seguimiento y estadísticas
          </CardDescription>
          {daysInTransformation > 0 && (
            <Badge className="mt-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
              <Flame className="h-3 w-3 mr-1" />
              {daysInTransformation} días en tu transformación
            </Badge>
          )}
          {/* Barra de progreso semanal */}
          {stats.weeklyGoal > 0 && (
            <div className="mt-4 space-y-2">
              <Progress 
                value={Math.min((stats.completedThisWeek / stats.weeklyGoal) * 100, 100)} 
                className="h-3 bg-emerald-100" 
              />
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <Flame className="h-4 w-4 text-gray-600" />
                <span className="font-medium">
                  {stats.completedThisWeek} de {stats.weeklyGoal} entrenamientos completados esta semana
                </span>
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Resumen Semanal Compacto */}
      <Card className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 border-purple-200/50 shadow-lg">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-700">{weeklyProgress.completedWorkouts}</div>
              <div className="text-xs text-purple-600 font-medium">Completados</div>
              <div className="text-xs text-muted-foreground mt-1">de {stats.weeklyGoal} esta semana</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">{stats.totalMinutesWeek || 0}</div>
              <div className="text-xs text-blue-600 font-medium">Minutos</div>
              <div className="text-xs text-muted-foreground mt-1">total esta semana</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">{stats.totalWorkouts}</div>
              <div className="text-xs text-green-600 font-medium">Total</div>
              <div className="text-xs text-muted-foreground mt-1">entrenamientos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-700">{stats.averageDuration}</div>
              <div className="text-xs text-orange-600 font-medium">Promedio</div>
              <div className="text-xs text-muted-foreground mt-1">minutos/sesión</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-purple-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-purple-700">Progreso Semanal</span>
              <span className="text-sm font-bold text-purple-700">
                {Math.round((stats.completedThisWeek / stats.weeklyGoal) * 100)}%
              </span>
            </div>
            <div className="relative h-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full overflow-hidden mt-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-400 to-pink-500 transition-all duration-500"
                style={{ width: `${Math.min((stats.completedThisWeek / stats.weeklyGoal) * 100, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entrenamiento de Hoy - Destacado y Completo */}
      {/* Nota: El entrenamiento de hoy se muestra más completo que los demás porque es lo más importante para el usuario */}
      {todaysWorkoutFromProfile && !todaysWorkoutFromProfile.is_rest_day ? (
        (() => {
          const dayId = String(todaysWorkoutFromProfile.id)
          const completedByLog = todayWorkoutCompleted[dayId] === true
          const completedByExercises = isWorkoutFullyCompleted(todaysWorkoutFromProfile)
          const isTodayCompleted = completedByLog || completedByExercises

          return (
        <Card className="bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 border-2 border-blue-200/50 shadow-xl">
          <CardHeader className="pb-3 md:pb-4 px-3 md:px-6 pt-3 md:pt-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                  <Play className="h-5 w-5 md:h-7 md:w-7 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-lg md:text-2xl text-blue-700 leading-tight">Entrenamiento de Hoy</CardTitle>
                  <CardDescription className="text-blue-600/80 text-xs md:text-sm">
                    {getTodayName()} - {todaysWorkoutFromProfile.day_name || getDayNameFromNumber(todaysWorkoutFromProfile.day_number)}
                  </CardDescription>
                  {userPlan && (
                    <CardDescription className="text-blue-500/70 text-[10px] md:text-xs mt-0.5 md:mt-1 line-clamp-2">
                      Plan: {userPlan.name} • Asignado desde panel de administración
                    </CardDescription>
                  )}
                </div>
              </div>
              <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 text-[10px] md:text-sm px-2 py-0.5 md:px-3 md:py-1 flex-shrink-0">
                {todaysWorkoutFromProfile.exercises?.length || 0} ej.
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-3 md:px-6 pb-3 md:pb-6">
            {/* Ejercicios completos */}
            {/* Nota: Este entrenamiento se muestra completo porque es el de hoy, que es lo más relevante */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-3">
              {todaysWorkoutFromProfile.exercises?.map((exercise, index) => {
                const exerciseData = exercise.exercise || exercise
                // Intentar obtener el ID del ejercicio de diferentes formas
                const exerciseId = exerciseData.id || exercise.id || exercise.exercise_id
                const dayId = todaysWorkoutFromProfile.id
                const completedExercisesForDay = getCompletedExercisesForDay(dayId)
                // Verificar si el ejercicio está completado usando diferentes formatos de ID
                const isExerciseCompleted = exerciseId && (
                  completedExercisesForDay.has(String(exerciseId)) ||
                  completedExercisesForDay.has(exerciseId) ||
                  (exerciseData.id && completedExercisesForDay.has(String(exerciseData.id))) ||
                  (exercise.id && completedExercisesForDay.has(String(exercise.id)))
                )
                
                
                return (
                  <Card 
                    key={exercise.id || index} 
                    className={`bg-white/90 border-2 transition-all touch-manipulation ${
                      isExerciseCompleted 
                        ? 'bg-green-50/90 border-green-300 shadow-md' 
                        : 'border-blue-100'
                    }`}
                  >
                    <CardContent className="p-3 md:p-4">
                      <div className="flex items-start justify-between gap-2 md:gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 md:gap-2.5 mb-2">
                            <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-white text-xs md:text-sm font-bold flex-shrink-0 ${
                              isExerciseCompleted
                                ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                                : 'bg-gradient-to-br from-blue-400 to-cyan-500'
                            }`}>
                              {isExerciseCompleted ? (
                                <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5" />
                              ) : (
                                index + 1
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className={`font-semibold text-base md:text-lg leading-tight break-words ${
                                isExerciseCompleted ? 'text-green-900' : 'text-blue-900'
                              }`}>
                                {fixEncoding(exerciseData.name)}
                              </h4>
                              {isExerciseCompleted && (
                                <Badge variant="outline" className="mt-1.5 bg-green-100 border-green-300 text-green-700 text-[10px] md:text-xs px-1.5 py-0.5">
                                  Completado
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2 md:space-y-1">
                            <div className={`flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm ${
                              isExerciseCompleted ? 'text-green-700' : 'text-blue-700'
                            }`}>
                              <span className="font-semibold md:font-medium">{exercise.sets} series</span>
                              <span className="font-semibold md:font-medium">{exercise.reps} rep.</span>
                              {exercise.rest_time && (
                                <span className="text-muted-foreground text-[11px] md:text-sm">⏱️ {exercise.rest_time}s</span>
                              )}
                            </div>
                            {exerciseData.muscle_groups && exerciseData.muscle_groups.length > 0 && (
                              <div className="flex flex-wrap gap-1 md:gap-1 mt-1.5 -mx-0.5 px-0.5">
                                {exerciseData.muscle_groups.map((mg: string, i: number) => (
                                  <Badge 
                                    key={i} 
                                    variant="outline" 
                                    className={`text-[9px] md:text-xs px-1 py-0.5 max-w-full truncate ${
                                      isExerciseCompleted
                                        ? 'border-green-200 text-green-700 bg-green-50'
                                        : 'border-blue-200 text-blue-700 bg-blue-50'
                                    }`}
                                  >
                                    {fixEncoding(mg)}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Botón para iniciar */}
            {isTodayCompleted ? (
              <div className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-lg py-6 shadow-lg rounded-lg flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Entrenamiento Completado Hoy
              </div>
            ) : (
              <Button
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 text-lg py-6 shadow-lg"
                onClick={() => handleStartWorkout(todaysWorkoutFromProfile)}
              >
                <Play className="h-5 w-5 mr-2" />
                Iniciar Entrenamiento de Hoy
              </Button>
            )}
          </CardContent>
        </Card>
          )
        })()
      ) : trainingDays.length > 0 && !trainingDays.includes(todayDayNumber) ? (
        // Si hoy no es un día de entrenamiento según el perfil
        <Card className="bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-gray-200/50 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-slate-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md">
              <Clock className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-gray-700 mb-2">Día de Descanso</CardTitle>
            <CardDescription className="text-gray-600 text-lg">
              Hoy es {getTodayName()} - Es momento de descansar y recuperarte 💪
            </CardDescription>
            <CardDescription className="text-gray-500 text-sm mt-2">
              Tu próximo entrenamiento será: {
                trainingDays
                  .filter(d => d > todayDayNumber)
                  .map(d => getDayNameFromNumber(d))[0] ||
                trainingDays.map(d => getDayNameFromNumber(d))[0] ||
                'Próximamente'
              }
            </CardDescription>
          </CardContent>
        </Card>
      ) : todaysWorkout && todaysWorkout.is_rest_day ? (
        <Card className="bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-gray-200/50 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-slate-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md">
              <Clock className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-gray-700 mb-2">Día de Descanso</CardTitle>
            <CardDescription className="text-gray-600 text-lg">
              Hoy es {getTodayName()} - Es momento de descansar y recuperarte 💪
            </CardDescription>
          </CardContent>
        </Card>
      ) : null}

      {/* Plan Actual y Calendario Semanal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Actual */}
        {userPlan && (
          <Card className="bg-white/95 border-2 border-purple-100/50 rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700">
                <Dumbbell className="h-5 w-5" />
                Plan Actual
              </CardTitle>
              <CardDescription className="text-purple-600">{userPlan.name || 'Plan de entrenamiento'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                  Activo
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-purple-700">Inicio: {new Date(userPlan.start_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="text-purple-700">{userPlan.days?.length || 0} días</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calendario Semanal con Días de Entrenamiento y Descanso */}
        <Card className="bg-white/95 border-2 border-blue-100/50 rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Calendar className="h-5 w-5" />
              Calendario Semanal
            </CardTitle>
            <CardDescription className="text-blue-600">
              Días de entrenamiento y descanso
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2 md:px-6">
            <div className="grid grid-cols-7 gap-1 md:gap-2">
              {getWeeklyCalendar().map((day) => {
                // Determinar el color y estilo según si es día de entrenamiento según el perfil
                const isTrainingByProfile = day.isTraining // Basado en training_days del perfil

                return (
                  <div
                    key={day.number}
                    className={`p-1.5 md:p-3 rounded-lg text-center border-2 transition-all ${day.isToday
                      ? isTrainingByProfile
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-blue-600 shadow-lg md:scale-105'
                        : 'bg-gradient-to-br from-gray-400 to-slate-500 text-white border-gray-600 shadow-lg md:scale-105'
                      : isTrainingByProfile
                        ? 'bg-gradient-to-br from-blue-100 to-cyan-100 border-blue-300 text-blue-800'
                        : 'bg-gradient-to-br from-gray-100 to-slate-100 border-gray-300 text-gray-600'
                      }`}
                  >
                    <div className="text-[10px] md:text-xs font-medium mb-0.5 md:mb-1 leading-tight">{day.name.substring(0, 3)}</div>
                    <div className="flex items-center justify-center">
                      {isTrainingByProfile ? (
                        <Dumbbell className={`h-3.5 w-3.5 md:h-5 md:w-5 ${day.isToday ? 'text-white' : ''}`} />
                      ) : (
                        <Clock className={`h-3.5 w-3.5 md:h-5 md:w-5 ${day.isToday ? 'text-white' : ''}`} />
                      )}
                    </div>
                    {/* Mostrar ejercicios si hay plan para este día (aunque no coincida con perfil) */}
                    {day.hasPlanWorkout && day.workoutDay && (
                      <div className={`text-[9px] md:text-xs mt-0.5 md:mt-1 font-semibold leading-tight ${day.isToday ? 'text-white' : isTrainingByProfile ? 'text-blue-700' : 'text-orange-700'
                        }`}>
                        {day.workoutDay.exercises?.length || 0} ej.
                      </div>
                    )}
                    {day.isToday && (
                      <div className="text-[9px] md:text-xs mt-0.5 md:mt-1 font-bold leading-tight">HOY</div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Leyenda */}
            <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-200 flex items-center justify-center gap-3 md:gap-4 text-[10px] md:text-xs flex-wrap">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 md:w-4 md:h-4 rounded bg-gradient-to-br from-blue-400 to-cyan-500 flex-shrink-0"></div>
                <span className="text-gray-700 whitespace-nowrap">Entrenamiento</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 md:w-4 md:h-4 rounded bg-gradient-to-br from-gray-400 to-slate-500 flex-shrink-0"></div>
                <span className="text-gray-700 whitespace-nowrap">Descanso</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs con detalles del plan */}
      <Tabs defaultValue="schedule" className="space-y-4 md:space-y-6">
        <TabsList className="grid w-full grid-cols-3 gap-1 md:gap-2 h-auto md:h-10">
          <TabsTrigger value="schedule" className="text-[11px] md:text-sm px-2 md:px-4 py-2 md:py-1.5 whitespace-nowrap">Programa Semanal</TabsTrigger>
          <TabsTrigger value="history" className="text-[11px] md:text-sm px-2 md:px-4 py-2 md:py-1.5 whitespace-nowrap">Historial</TabsTrigger>
          <TabsTrigger value="progress" className="text-[11px] md:text-sm px-2 md:px-4 py-2 md:py-1.5 whitespace-nowrap">Progreso</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4">

          {/* Mostrar días según el perfil del usuario, mapeando entrenamientos del plan en orden */}
          {trainingDays.length > 0 ? (() => {
            // Obtener días de entrenamiento del plan (sin descanso), ordenados por day_number
            const planWorkoutDays = userPlan?.days
              ?.filter((d: any) => !d.is_rest_day)
              ?.sort((a: any, b: any) => (a.day_number || 0) - (b.day_number || 0)) || []

            // Días del usuario ordenados
            const userTrainingDays = [...trainingDays].sort((a, b) => a - b)

            // Mapear entrenamientos del plan a los días del usuario
            // Primer entrenamiento del plan → primer día del usuario
            // Segundo entrenamiento del plan → segundo día del usuario
            // etc.
            const mappedDays = userTrainingDays.map((userDayNumber, index) => {
              const planWorkoutDay = planWorkoutDays[index] || null // Usar índice para mapear
              return {
                userDayNumber,
                planDay: planWorkoutDay
              }
            })

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mappedDays.map(({ userDayNumber, planDay }) => {
                  const dayName = getDayNameFromNumber(userDayNumber)
                  const isToday = userDayNumber === (new Date().getDay() === 0 ? 7 : new Date().getDay())

                  return (
                    <Card key={userDayNumber} className={planDay ? '' : 'border-orange-200 bg-orange-50/30'}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <div className="p-2 bg-gradient-to-r from-purple-400 to-violet-500 rounded-full">
                              <Dumbbell className="h-4 w-4 text-white" />
                            </div>
                            {dayName}
                          </CardTitle>
                          {isToday && (
                            <Badge variant="default" className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0">
                              Hoy
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {planDay ? (() => {
                          // Obtener ejercicios completados para este día
                          const dayId = planDay.id || planDay.day_number || userDayNumber
                          const completedExercisesForDay = getCompletedExercisesForDay(dayId)
                          const totalExercises = planDay.exercises?.length || 0
                          const completedCount = completedExercisesForDay.size
                          const progressPercentage = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0

                          return (
                            <>
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-muted-foreground">
                                  {totalExercises} ejercicios
                                </div>
                                {completedCount > 0 && (
                                  <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    {completedCount}/{totalExercises}
                                  </Badge>
                                )}
                              </div>

                              {/* Barra de progreso */}
                              {completedCount > 0 && (
                                <div className="space-y-1">
                                  <Progress value={progressPercentage} className="h-2" />
                                  <p className="text-xs text-muted-foreground text-center">
                                    {Math.round(progressPercentage)}% completado
                                  </p>
                                </div>
                              )}

                              <div className="space-y-1.5 md:space-y-2">
                                {planDay.exercises?.slice(0, 3).map((exercise: any) => {
                                  const exerciseData = exercise.exercise || exercise
                                  const exerciseId = exercise.id || exerciseData.id || String(exercise)
                                  const isCompleted = completedExercisesForDay.has(String(exerciseId))

                                  return (
                                    <div
                                      key={exercise.id}
                                      className={`text-[11px] md:text-xs p-2 md:p-2.5 rounded transition-all touch-manipulation ${isCompleted
                                        ? 'bg-green-50 border border-green-200'
                                        : 'bg-muted/50'
                                        }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        {isCompleted && (
                                          <CheckCircle2 className="h-3.5 w-3.5 md:h-3 md:w-3 text-green-600 flex-shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <div className={`font-semibold md:font-medium leading-tight break-words ${isCompleted ? 'text-green-700 line-through' : 'text-gray-900'}`}>
                                            {fixEncoding(exerciseData.name)}
                                          </div>
                                          <div className="text-muted-foreground mt-0.5 text-[10px] md:text-xs">
                                            {exercise.sets} x {exercise.reps} {exercise.weight && `@ ${exercise.weight}`}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                                {planDay.exercises && planDay.exercises.length > 3 && (
                                  <div className="text-xs text-muted-foreground text-center">
                                    +{planDay.exercises.length - 3} ejercicios más
                                  </div>
                                )}
                              </div>

                              {todayWorkoutCompleted[planDay.id] ? (
                                <div className="w-full bg-green-100 border border-green-300 text-green-700 text-sm py-2 rounded-md flex items-center justify-center">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Completado Hoy
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  className="w-full"
                                  onClick={() => handleStartWorkout(planDay)}
                                  variant={completedCount === totalExercises && totalExercises > 0 ? "default" : "default"}
                                >
                                  <Play className="h-3 w-3 mr-1" />
                                  {completedCount === totalExercises && totalExercises > 0 ? 'Continuar' : 'Iniciar'}
                                </Button>
                              )}
                            </>
                          )
                        })() : (
                          <div className="text-center py-6">
                            <Clock className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                            <p className="text-sm text-orange-700 font-medium mb-1">Sin plan asignado</p>
                            <p className="text-xs text-muted-foreground">
                              No hay entrenamiento asignado para este día.
                              <br />
                              Contacta con tu entrenador para que te asigne ejercicios.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )
          })() : (
            // Si no hay training_days configurado, mostrar todos los días del plan
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userPlan?.days?.map((day: any, index: number) => {
                const isToday = day.day_number === (new Date().getDay() === 0 ? 7 : new Date().getDay())

                return (
                  <Card key={day.id} className={day.is_rest_day ? 'opacity-75' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          {day.is_rest_day ? (
                            <div className="p-2 bg-gradient-to-br from-gray-400 to-slate-500 rounded-full">
                              <Clock className="h-4 w-4 text-white" />
                            </div>
                          ) : (
                            <div className="p-2 bg-gradient-to-r from-purple-400 to-violet-500 rounded-full">
                              <Dumbbell className="h-4 w-4 text-white" />
                            </div>
                          )}
                          {day.day_name || getDayNameFromNumber(day.day_number)}
                        </CardTitle>
                        {isToday && (
                          <Badge variant="default" className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0">
                            Hoy
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {day.is_rest_day ? (
                        <div className="text-center py-4">
                          <Clock className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                          <p className="text-sm text-muted-foreground">Día de descanso</p>
                        </div>
                      ) : (() => {
                        // Obtener ejercicios completados para este día
                        const dayId = day.id || day.day_number
                        const completedExercisesForDay = getCompletedExercisesForDay(dayId)
                        const totalExercises = day.exercises?.length || 0
                        const completedCount = completedExercisesForDay.size
                        const progressPercentage = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0

                        return (
                          <>
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-muted-foreground">
                                {totalExercises} ejercicios
                              </div>
                              {completedCount > 0 && (
                                <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  {completedCount}/{totalExercises}
                                </Badge>
                              )}
                            </div>

                            {/* Barra de progreso */}
                            {completedCount > 0 && (
                              <div className="space-y-1">
                                <Progress value={progressPercentage} className="h-2" />
                                <p className="text-xs text-muted-foreground text-center">
                                  {Math.round(progressPercentage)}% completado
                                </p>
                              </div>
                            )}

                            <div className="space-y-1.5 md:space-y-2">
                              {day.exercises?.slice(0, 3).map((exercise: any) => {
                                const exerciseData = exercise.exercise || exercise
                                const exerciseId = exercise.id || exerciseData.id || String(exercise)
                                const isCompleted = completedExercisesForDay.has(String(exerciseId))

                                return (
                                  <div
                                    key={exercise.id}
                                    className={`text-[11px] md:text-xs p-2 md:p-2.5 rounded transition-all touch-manipulation ${isCompleted
                                      ? 'bg-green-50 border border-green-200'
                                      : 'bg-muted/50'
                                      }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      {isCompleted && (
                                        <CheckCircle2 className="h-3.5 w-3.5 md:h-3 md:w-3 text-green-600 flex-shrink-0" />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <div className={`font-semibold md:font-medium leading-tight break-words ${isCompleted ? 'text-green-700 line-through' : 'text-gray-900'}`}>
                                          {fixEncoding(exerciseData.name)}
                                        </div>
                                        <div className="text-muted-foreground mt-0.5 text-[10px] md:text-xs">
                                          {exercise.sets} x {exercise.reps} {exercise.weight && `@ ${exercise.weight}`}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                              {day.exercises && day.exercises.length > 3 && (
                                <div className="text-xs text-muted-foreground text-center">
                                  +{day.exercises.length - 3} ejercicios más
                                </div>
                              )}
                            </div>

                            {todayWorkoutCompleted[day.id] ? (
                              <div className="w-full bg-green-100 border border-green-300 text-green-700 text-sm py-2 rounded-md flex items-center justify-center">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Completado Hoy
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                className="w-full"
                                onClick={() => handleStartWorkout(day)}
                                variant={completedCount === totalExercises && totalExercises > 0 ? "default" : "default"}
                              >
                                <Play className="h-3 w-3 mr-1" />
                                {completedCount === totalExercises && totalExercises > 0 ? 'Continuar' : 'Iniciar'}
                              </Button>
                            )}
                          </>
                        )
                      })()}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <WorkoutHistoryEnhanced workoutLogs={workoutLogs} />
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          {stats.totalWorkouts > 0 || stats.completedThisWeek > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
                <CardHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-3 md:pb-4">
                  <CardTitle className="text-base md:text-lg flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
                    Estadísticas Generales
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 md:px-6 pb-4 md:pb-6 space-y-3 md:space-y-4">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm md:text-base text-gray-700">Total entrenamientos</span>
                    <span className="font-semibold text-base md:text-lg text-purple-700">{stats.totalWorkouts}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm md:text-base text-gray-700">Duración promedio</span>
                    <span className="font-semibold text-base md:text-lg text-purple-700">{stats.averageDuration || 0} min</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm md:text-base text-gray-700">Racha actual</span>
                    <span className="font-semibold text-base md:text-lg text-purple-700">{stats.currentStreak || 0} días</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm md:text-base text-gray-700">Mejor racha</span>
                    <span className="font-semibold text-base md:text-lg text-purple-700">{stats.longestStreak || 0} días</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
                <CardHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-3 md:pb-4">
                  <CardTitle className="text-base md:text-lg flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
                    Progreso Semanal
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 md:px-6 pb-4 md:pb-6 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm md:text-base">
                      <span className="text-gray-700">Entrenamientos completados</span>
                      <span className="font-semibold text-purple-700">{stats.completedThisWeek}/{stats.weeklyGoal}</span>
                    </div>
                    <Progress
                      value={stats.weeklyGoal > 0 ? Math.min((stats.completedThisWeek / stats.weeklyGoal) * 100, 100) : 0}
                      className="h-3 bg-purple-100"
                    />
                  </div>

                  <div className="text-center pt-2">
                    <div className="text-2xl md:text-3xl font-bold text-purple-600">
                      {stats.weeklyGoal > 0 ? Math.round((stats.completedThisWeek / stats.weeklyGoal) * 100) : 0}%
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground mt-1">
                      del objetivo semanal
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
              <CardContent className="p-8 md:p-12 text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                  <Target className="h-8 w-8 md:h-10 md:w-10 text-white" />
                </div>
                <CardTitle className="text-xl md:text-2xl mb-2 md:mb-3 text-gray-800">
                  Comienza tu progreso
                </CardTitle>
                <CardDescription className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">
                  Aún no tienes entrenamientos registrados. Completa tu primer entrenamiento para comenzar a ver tus estadísticas aquí.
                </CardDescription>
                <div className="space-y-2 text-left max-w-md mx-auto">
                  <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm md:text-base text-gray-800">Registra tus entrenamientos</p>
                      <p className="text-xs md:text-sm text-gray-600">Completa tus entrenamientos diarios para comenzar a ver tu progreso</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                    <Target className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm md:text-base text-gray-800">Rastrea tus rachas</p>
                      <p className="text-xs md:text-sm text-gray-600">Mantén la consistencia para ver tus rachas de entrenamiento</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm md:text-base text-gray-800">Alcanza tus objetivos</p>
                      <p className="text-xs md:text-sm text-gray-600">Completa tus entrenamientos semanales para cumplir con tus metas</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Nuevo componente de entrenamiento activo */}
      {selectedDay && (
        <ActiveWorkoutSession
          workoutDay={selectedDay}
          isOpen={isWorkoutDialogOpen}
          onClose={() => {
            setIsWorkoutDialogOpen(false)
            setSelectedDay(null)
          }}
          onComplete={async (data) => {
            if (!selectedDay) return

            try {
              // Guardar el workout log con todos los datos
              await logWorkout(
                selectedDay.id.toString(),
                data.notes,
                data.duration_minutes,
                data.rating,
                data.exercises_data
              ).catch((error: any) => {
                // Manejar errores de forma más clara
                let errorMessage = 'Error desconocido al guardar entrenamiento'
                
                if (error instanceof Error) {
                  errorMessage = error.message || 'Error desconocido al guardar entrenamiento'
                } else if (typeof error === 'string') {
                  errorMessage = error
                } else if (error?.message) {
                  errorMessage = typeof error.message === 'string' ? error.message : JSON.stringify(error.message)
                } else if (error?.detail) {
                  errorMessage = typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail)
                } else if (error && typeof error === 'object') {
                  try {
                    errorMessage = JSON.stringify(error)
                  } catch (e) {
                    errorMessage = 'Error desconocido al guardar entrenamiento'
                  }
                } else {
                  errorMessage = String(error) || 'Error desconocido al guardar entrenamiento'
                }
                
                throw new Error(errorMessage)
              })

              // Marcar como completado primero
              setTodayWorkoutCompleted(prev => ({
                ...prev,
                [selectedDay.id]: true
              }))

              // Recargar logs y estadísticas en paralelo
              await Promise.all([
                fetchWorkoutLogs(),
                fetchWorkoutStatistics()
              ])
              
              // Esperar un momento y recargar nuevamente para asegurar que los datos estén actualizados
              setTimeout(async () => {
                await Promise.all([
                  fetchWorkoutLogs(),
                  fetchWorkoutStatistics(),
                  checkCompletedWorkouts()
                ])
              }, 1500)

              // Guardar ejercicios completados en localStorage
              if (data.exercises_data && Array.isArray(data.exercises_data)) {
                const completedExerciseIds = data.exercises_data
                  .filter((ex: any) => ex.completed)
                  .map((ex: any) => {
                    // Intentar obtener el ID del ejercicio de diferentes formas
                    return String(ex.exercise_id || ex.id || ex.exercise?.id || '')
                  })
                  .filter((id: string) => id && id !== 'undefined' && id !== 'null')
                
                if (completedExerciseIds.length > 0) {
                  const dayId = selectedDay.id.toString()
                  const today = new Date().toISOString().split('T')[0]
                  const saveKey = `workout_completed_${dayId}_${today}`
                  
                  try {
                    localStorage.setItem(saveKey, JSON.stringify(completedExerciseIds))
                  } catch (error) {
                  }
                }
              }

              // Marcar como completado
              setTodayWorkoutCompleted(prev => ({
                ...prev,
                [selectedDay.id]: true
              }))

              // Recargar estadísticas
              await fetchWorkoutStatistics()

              // Verificar nuevamente los entrenamientos completados después de un breve delay
              setTimeout(() => {
                checkCompletedWorkouts()
              }, 1000)

              toast({
                title: "¡Entrenamiento completado! 🎉",
                description: `Duración: ${data.duration_minutes} min | Calificación: ${data.rating}/5 estrellas`,
              })
            } catch (error: any) {
              // Extraer el mensaje de error de forma segura
              let errorMessage = 'Error al guardar el entrenamiento'
              
              if (error) {
                if (typeof error === 'string') {
                  errorMessage = error
                } else if (error instanceof Error) {
                  errorMessage = error.message
                } else if (error?.message) {
                  errorMessage = typeof error.message === 'string' ? error.message : JSON.stringify(error.message)
                } else if (error?.response?.data) {
                  const data = error.response.data
                  if (typeof data === 'string') {
                    errorMessage = data
                  } else if (data.detail) {
                    errorMessage = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)
                  } else if (data.message) {
                    errorMessage = typeof data.message === 'string' ? data.message : JSON.stringify(data.message)
                  } else {
                    try {
                      errorMessage = JSON.stringify(data)
                    } catch (e) {
                      errorMessage = 'Error desconocido al guardar el entrenamiento'
                    }
                  }
                } else {
                  try {
                    errorMessage = JSON.stringify(error)
                  } catch (e) {
                    errorMessage = error?.toString() || 'Error desconocido al guardar el entrenamiento'
                  }
                }
              }
              
              
              toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
              })
              throw error
            }
          }}
        />
      )}
    </div>
  )
}
