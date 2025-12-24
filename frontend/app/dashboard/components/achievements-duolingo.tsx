"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Flame, Target, ChefHat, Dumbbell, 
  Zap, CheckCircle
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDailyMeals } from "@/hooks/use-daily-meals"
import { useWorkouts } from "@/hooks/use-workouts"
import { useUserProfile } from "@/hooks/use-user-profile"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "@/hooks/use-toast"
import { buildApiUrl, getAuthHeaders } from "@/lib/api"

interface DailyGoal {
  id: string
  type: 'workout' | 'nutrition' | 'both'
  name: string
  description: string
  icon: any
  target: number
  current: number
  completed: boolean
  color: string
}

interface WeeklyStreak {
  days: number[]
  currentStreak: number
  longestStreak: number
}

export function AchievementsDuolingo() {
  const router = useRouter()
  const { meals, macros } = useDailyMeals()
  const { workoutLogs, activeProgram } = useWorkouts()
  const { profile } = useUserProfile()
  
  const [weeklyStreak, setWeeklyStreak] = useState<WeeklyStreak>({
    days: [],
    currentStreak: profile?.daily_streak || 0,
    longestStreak: profile?.longest_streak || 0
  })
  
  const [lastCompletedDay, setLastCompletedDay] = useState<string | null>(null)

  // Detectar si hoy es día de descanso según el perfil del usuario
  const isRestDay = () => {
    const trainingDaysRaw = profile?.training_days || []
    if (trainingDaysRaw.length === 0) return false // Si no hay días configurados, asumimos que no es descanso
    
    // Convertir training_days a números si es necesario
    const trainingDays = trainingDaysRaw.map((day: string | number) => {
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
    
    // Obtener el día actual (1-7, donde 1 = Lunes, 7 = Domingo)
    const today = new Date()
    const todayDayNumber = today.getDay() === 0 ? 7 : today.getDay() // 1=Lunes, 7=Domingo
    
    // Es día de descanso si NO está en la lista de días de entrenamiento
    return !trainingDays.includes(todayDayNumber)
  }
  
  const isTodayRestDay = isRestDay()

  // Verificar si hay un entrenamiento completado hoy
  const hasWorkoutToday = workoutLogs.some(log => {
    const logDate = new Date(log.date)
    const today = new Date()
    return logDate.toDateString() === today.toDateString() && log.completed
  })

  // Calcular objetivos diarios
  const dailyGoals: DailyGoal[] = [
    {
      id: 'workout',
      type: 'workout',
      name: isTodayRestDay ? 'Día de Descanso 😴' : 'Entrenamiento Diario',
      description: isTodayRestDay 
        ? '¡Hoy es tu día de descanso! 🎉' 
        : 'Completa tu entrenamiento del día',
      icon: Dumbbell,
      target: 1,
      // Si es día de descanso, el objetivo se considera completado automáticamente
      current: isTodayRestDay ? 1 : (hasWorkoutToday ? 1 : 0),
      completed: isTodayRestDay || hasWorkoutToday,
      color: isTodayRestDay ? 'from-teal-500 to-cyan-600' : 'from-purple-500 to-violet-600'
    },
    {
      id: 'nutrition',
      type: 'nutrition',
      name: 'Plan Nutricional',
      description: 'Completa todas tus comidas del día',
      icon: ChefHat,
      target: meals.length,
      current: meals.filter(meal => meal.selectedOption).length,
      completed: meals.length > 0 && meals.every(meal => meal.selectedOption),
      color: 'from-orange-500 to-red-600'
    },
    {
      id: 'macros',
      type: 'nutrition',
      name: 'Macros Completos',
      description: 'Se completa automáticamente al seleccionar todas las comidas',
      icon: Target,
      target: 100,
      current: Math.round(
        ((macros.proteinConsumed / (macros.proteinGoal || 1)) * 0.3 +
         (macros.carbsConsumed / (macros.carbsGoal || 1)) * 0.4 +
         (macros.fatConsumed / (macros.fatGoal || 1)) * 0.3) * 100
      ),
      // Los macros se completan automáticamente cuando el plan nutricional está completo
      completed: meals.length > 0 && meals.every(meal => meal.selectedOption),
      color: 'from-blue-500 to-indigo-600'
    },
    {
      id: 'streak',
      type: 'both',
      name: 'Racha de Días',
      description: 'Mantén tu racha activa',
      icon: Zap,
      target: 7,
      current: weeklyStreak.currentStreak,
      completed: weeklyStreak.currentStreak >= 7,
      color: 'from-yellow-500 to-amber-600'
    }
  ]

  // Verificar si el día está completo
  // Un día completo requiere: entrenamiento completado (o día de descanso) Y plan nutricional completado
  const isDayComplete = () => {
    const workoutGoal = dailyGoals.find(g => g.id === 'workout')
    const nutritionGoal = dailyGoals.find(g => g.id === 'nutrition')
    
    return workoutGoal?.completed && nutritionGoal?.completed
  }

  // Actualizar racha cuando se completa un día completo
  useEffect(() => {
    const checkAndUpdateStreak = async () => {
      // Si es día de descanso, solo verificar nutrición
      // Si no, verificar ambos: entrenamiento y nutrición
      const workoutComplete = isTodayRestDay || hasWorkoutToday
      const allMealsSelected = meals.length > 0 && meals.every(meal => meal.selectedOption)
      
      const dayComplete = workoutComplete && allMealsSelected

      if (!dayComplete) return

      const today = new Date().toDateString()
      
      // Evitar actualizar múltiples veces el mismo día
      if (lastCompletedDay === today) return

      try {
        // Llamar al backend para actualizar la racha
        const response = await fetch(buildApiUrl('achievements/complete-day/'), {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          setWeeklyStreak(prev => ({
            ...prev,
            currentStreak: data.daily_streak || prev.currentStreak,
            longestStreak: data.longest_streak || prev.longestStreak,
          }))
          setLastCompletedDay(today)
          
          toast({
            title: "🎉 ¡Día Completo!",
            description: `Has completado todos tus objetivos. Racha: ${data.daily_streak || weeklyStreak.currentStreak + 1} días`,
          })
        } else {
          console.error('Error al actualizar racha:', response.status, response.statusText)
          const errorData = await response.json().catch(() => ({}))
          console.error('Error details:', errorData)
        }
      } catch (error) {
        console.error('Error al actualizar racha:', error)
        // No actualizar localmente si hay error, mejor dejar que el backend maneje la racha
      }
    }

    // Solo verificar si hay datos disponibles
    if (workoutLogs && meals) {
      checkAndUpdateStreak()
    }
  }, [meals, workoutLogs, lastCompletedDay, isTodayRestDay, hasWorkoutToday])

  const daysOfWeek = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-yellow-500 via-amber-400 to-orange-400 p-6 sm:p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Target className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                Mis Recompensas 🏆
              </h1>
              <p className="text-white/80 text-sm sm:text-base">
                Completa todos los objetivos del día para sumar un día a tu racha
              </p>
            </div>
          </div>

          {/* Mensaje motivacional */}
          <div className="mt-4 p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
            <p className="text-white/90 text-sm sm:text-base flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-300 flex-shrink-0" />
              <span>
                {weeklyStreak.currentStreak >= 7 
                  ? "¡Racha perfecta! Sigue así 🔥"
                  : weeklyStreak.currentStreak >= 3 
                  ? "¡Vas por buen camino! Mantén tu racha 💪"
                  : "¡Cada día cuenta! Completa tus objetivos para aumentar tu racha 🌟"}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Objetivos Diarios */}
      <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
            <Target className="h-5 w-5" />
            Objetivos de Hoy
          </CardTitle>
          <CardDescription>
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dailyGoals.map((goal) => {
            const Icon = goal.icon
            const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0
            const isCompleted = goal.completed || progress >= 100

            return (
              <div
                key={goal.id}
                className={`p-4 rounded-xl border-2 transition-all ${
                  isCompleted
                    ? `bg-gradient-to-r ${goal.color} border-transparent shadow-lg`
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full ${
                    isCompleted 
                      ? 'bg-white/20 backdrop-blur-sm' 
                      : 'bg-gray-200'
                  }`}>
                    <Icon className={`h-6 w-6 ${
                      isCompleted ? 'text-white' : 'text-gray-600'
                    }`} />
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className={`font-semibold ${
                          isCompleted ? 'text-white' : 'text-gray-900'
                        }`}>
                          {goal.name}
                        </h3>
                        <p className={`text-sm ${
                          isCompleted ? 'text-white/90' : 'text-gray-600'
                        }`}>
                          {goal.description}
                        </p>
                      </div>
                      
                      {isCompleted ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-6 w-6 text-white animate-bounce" />
                          <Badge className="bg-white/20 text-white border-white/30">
                            ✓ Completado
                          </Badge>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {goal.current}/{goal.target}
                        </Badge>
                      )}
                    </div>

                    {!isCompleted && (
                      <Progress value={Math.min(progress, 100)} className="h-2" />
                    )}

                    {isCompleted && (
                      <div className="flex items-center gap-2 text-white/90 text-sm">
                        <CheckCircle className="h-4 w-4" />
                        <span>Objetivo completado</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Racha Semanal */}
      <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            <Flame className="h-5 w-5" />
            Racha Semanal
          </CardTitle>
          <CardDescription>
            Mantén tu racha activa completando objetivos diarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-orange-600">{weeklyStreak.currentStreak} días</p>
                <p className="text-sm text-gray-600">Racha actual</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-700">{weeklyStreak.longestStreak} días</p>
                <p className="text-xs text-gray-600">Racha más larga</p>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {daysOfWeek.map((day, index) => {
                const dayNumber = index + 1
                const isCompleted = weeklyStreak.days.includes(dayNumber)
                const today = new Date().getDay()
                const isToday = (today === 0 ? 7 : today) === dayNumber

                return (
                  <div
                    key={day}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center border-2 transition-all ${
                      isCompleted
                        ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white border-orange-300 shadow-md'
                        : isToday
                        ? 'bg-gray-100 border-gray-300 text-gray-700 font-bold'
                        : 'bg-gray-50 border-gray-200 text-gray-400'
                    }`}
                  >
                    <span className="text-xs font-medium">{day}</span>
                    {isCompleted && (
                      <CheckCircle className="h-4 w-4 mt-1" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acción rápida */}
      <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
        <CardContent className="p-6 text-center">
          <p className="text-sm font-medium text-gray-900 mb-3">
            ¿Listo para completar tus objetivos de hoy? 💪
          </p>
          <div className="flex gap-2 justify-center">
            <Button 
              onClick={() => router.push('/dashboard?section=workouts-1')}
              className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white border-0 shadow-lg hover:shadow-xl transition-all"
            >
              <Dumbbell className="h-4 w-4 mr-2" />
              Entrenar
            </Button>
            <Button 
              onClick={() => router.push('/dashboard?section=meals')}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 shadow-lg hover:shadow-xl transition-all"
            >
              <ChefHat className="h-4 w-4 mr-2" />
              Ver Menú
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

