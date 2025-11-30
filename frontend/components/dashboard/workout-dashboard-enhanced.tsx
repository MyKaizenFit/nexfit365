"use client"

import { useState, useEffect } from "react"
import { 
  Dumbbell, Play, Check, Clock, Target, Calendar, 
  TrendingUp, Award, Timer, Users, BarChart3, 
  Video, CheckCircle2, Circle, Repeat
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
import { type WorkoutDay } from "@/lib/workout-service"

export function WorkoutDashboardEnhanced() {
  const {
    workoutPrograms,
    activeProgram,
    workoutLogs,
    loading,
    error,
    logWorkout,
    getTodaysWorkout,
    getWeeklyProgress
  } = useWorkouts()
  
  const { profile } = useUserProfile()
  
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

  // Obtener entrenamiento de hoy
  const todaysWorkout = getTodaysWorkout()
  
  // Obtener progreso semanal
  const weeklyProgress = getWeeklyProgress()

  // Calcular estadísticas manualmente
  const stats = {
    completedThisWeek: workoutLogs.filter(log => {
      const logDate = new Date(log.date)
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return logDate >= weekAgo
    }).length,
    weeklyGoal: 5,
    totalWorkouts: workoutLogs.length,
    averageDuration: workoutLogs.length > 0 
      ? Math.round(workoutLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) / workoutLogs.length)
      : 0,
    currentStreak: 0, // Simplificado, se puede calcular más adelante
    longestStreak: 0 // Simplificado, se puede calcular más adelante
  }
  
  // Obtener día actual en español
  const getTodayName = () => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    return days[new Date().getDay()]
  }
  
  // Obtener días de entrenamiento del perfil
  const trainingDays = profile?.training_days || []
  
  // Función para obtener el nombre del día desde el número (1=Lunes, 7=Domingo)
  const getDayNameFromNumber = (dayNumber: number) => {
    const days = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    return days[dayNumber] || ''
  }
  
  // Función para determinar si un día es de entrenamiento o descanso
  const isTrainingDay = (dayNumber: number) => {
    return trainingDays.includes(dayNumber)
  }

  // Función para obtener ejercicios completados de un día desde localStorage
  const getCompletedExercisesForDay = (dayId: string | number) => {
    if (typeof window === 'undefined') return new Set<string>()
    
    try {
      const dayIdStr = String(dayId)
      const today = new Date().toISOString().split('T')[0]
      const saveKey = `workout_completed_${dayIdStr}_${today}`
      const saved = localStorage.getItem(saveKey)
      
      if (saved) {
        const savedExercises = JSON.parse(saved)
        return new Set(savedExercises)
      }
    } catch (error) {
      console.error('Error al cargar ejercicios completados:', error)
    }
    
    return new Set<string>()
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
    setSelectedDay(day)
    const dayId = day.id || day.day_number || 'unknown'
    
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

  return (
    <div className="space-y-6">
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
              <div className="text-2xl font-bold text-blue-700">{weeklyProgress.totalMinutes}</div>
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
        <Card className="bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 border-2 border-blue-200/50 shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
                  <Play className="h-7 w-7 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-blue-700">Entrenamiento de Hoy</CardTitle>
                  <CardDescription className="text-blue-600/80">
                    {getTodayName()} - {todaysWorkoutFromProfile.day_name || getDayNameFromNumber(todaysWorkoutFromProfile.day_number)}
                  </CardDescription>
                  {userPlan && (
                    <CardDescription className="text-blue-500/70 text-xs mt-1">
                      Plan: {userPlan.name} • Asignado desde panel de administración
                    </CardDescription>
                  )}
                </div>
              </div>
              <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 text-sm px-3 py-1">
                {todaysWorkoutFromProfile.exercises?.length || 0} ejercicios
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Ejercicios completos */}
            {/* Nota: Este entrenamiento se muestra completo porque es el de hoy, que es lo más relevante */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {todaysWorkoutFromProfile.exercises?.map((exercise, index) => {
                const exerciseData = exercise.exercise || exercise
                return (
                  <Card key={exercise.id || index} className="bg-white/90 border-blue-100">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                              {index + 1}
                            </div>
                            <h4 className="font-semibold text-blue-900">{exerciseData.name}</h4>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-4 text-blue-700">
                              <span className="font-medium">{exercise.sets} series</span>
                              <span className="font-medium">{exercise.reps} repeticiones</span>
                              {exercise.rest_time && (
                                <span className="text-muted-foreground">Descanso: {exercise.rest_time}s</span>
                              )}
                            </div>
                            {exerciseData.muscle_groups && exerciseData.muscle_groups.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {exerciseData.muscle_groups.map((mg: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs border-blue-200 text-blue-700">
                                    {mg}
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
                  <Button 
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 text-lg py-6 shadow-lg"
                    onClick={() => handleStartWorkout(todaysWorkoutFromProfile)}
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Iniciar Entrenamiento de Hoy
                  </Button>
                </CardContent>
              </Card>
            ) : trainingDays.length > 0 && !trainingDays.includes(new Date().getDay() === 0 ? 7 : new Date().getDay()) ? (
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
                        .filter(d => d > (new Date().getDay() === 0 ? 7 : new Date().getDay()))
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
                  <Calendar className="h-4 w-4 text-purple-600" />
                  <span className="text-purple-700">Inicio: {new Date(userPlan.start_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
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
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {getWeeklyCalendar().map((day) => {
                // Determinar el color y estilo según si es día de entrenamiento según el perfil
                const isTrainingByProfile = day.isTraining // Basado en training_days del perfil
                
                return (
                  <div
                    key={day.number}
                    className={`p-3 rounded-lg text-center border-2 transition-all ${
                      day.isToday
                        ? isTrainingByProfile
                          ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-blue-600 shadow-lg scale-105'
                          : 'bg-gradient-to-br from-gray-400 to-slate-500 text-white border-gray-600 shadow-lg scale-105'
                        : isTrainingByProfile
                        ? 'bg-gradient-to-br from-blue-100 to-cyan-100 border-blue-300 text-blue-800'
                        : 'bg-gradient-to-br from-gray-100 to-slate-100 border-gray-300 text-gray-600'
                    }`}
                  >
                    <div className="text-xs font-medium mb-1">{day.name.substring(0, 3)}</div>
                    <div className="flex items-center justify-center">
                      {isTrainingByProfile ? (
                        <Dumbbell className={`h-5 w-5 ${day.isToday ? 'text-white' : 'text-blue-600'}`} />
                      ) : (
                        <Clock className={`h-5 w-5 ${day.isToday ? 'text-white' : 'text-gray-500'}`} />
                      )}
                    </div>
                    {/* Mostrar ejercicios si hay plan para este día (aunque no coincida con perfil) */}
                    {day.hasPlanWorkout && day.workoutDay && (
                      <div className={`text-xs mt-1 font-semibold ${
                        day.isToday ? 'text-white' : isTrainingByProfile ? 'text-blue-700' : 'text-orange-700'
                      }`}>
                        {day.workoutDay.exercises?.length || 0} ej.
                      </div>
                    )}
                    {day.isToday && (
                      <div className="text-xs mt-1 font-bold">HOY</div>
                    )}
                  </div>
                )
              })}
            </div>
            
            {/* Leyenda */}
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-400 to-cyan-500"></div>
                <span className="text-gray-700">Entrenamiento</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-gray-400 to-slate-500"></div>
                <span className="text-gray-700">Descanso</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs con detalles del plan */}
      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="schedule">Programa Semanal</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
          <TabsTrigger value="progress">Progreso</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4">
          {/* Nota: Los entrenamientos se obtienen del plan asignado por el administrador */}
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Los entrenamientos se adaptan a tus días seleccionados en el perfil.
              {trainingDays.length > 0 && (
                <span className="block mt-1">
                  Tus días de entrenamiento: {trainingDays.map(d => getDayNameFromNumber(d)).join(', ')}
                </span>
              )}
            </p>
          </div>
          
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
                              
                              <div className="space-y-2">
                                {planDay.exercises?.slice(0, 3).map((exercise: any) => {
                                  const exerciseData = exercise.exercise || exercise
                                  const exerciseId = exercise.id || exerciseData.id || String(exercise)
                                  const isCompleted = completedExercisesForDay.has(String(exerciseId))
                                  
                                  return (
                                    <div 
                                      key={exercise.id} 
                                      className={`text-xs p-2 rounded transition-all ${
                                        isCompleted 
                                          ? 'bg-green-50 border border-green-200' 
                                          : 'bg-muted/50'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        {isCompleted && (
                                          <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                                        )}
                                        <div className="flex-1">
                                          <div className={`font-medium ${isCompleted ? 'text-green-700 line-through' : ''}`}>
                                            {exerciseData.name}
                                          </div>
                                          <div className="text-muted-foreground">
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

                              <Button 
                                size="sm" 
                                className="w-full"
                                onClick={() => handleStartWorkout(planDay)}
                                variant={completedCount === totalExercises && totalExercises > 0 ? "default" : "default"}
                              >
                                <Play className="h-3 w-3 mr-1" />
                                {completedCount === totalExercises && totalExercises > 0 ? 'Continuar' : 'Iniciar'}
                              </Button>
                            </>
                          )
                        })() : (
                          <div className="text-center py-6">
                            <Clock className="h-8 w-8 mx-auto mb-2 text-orange-500" />
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
                            
                            <div className="space-y-2">
                              {day.exercises?.slice(0, 3).map((exercise: any) => {
                                const exerciseData = exercise.exercise || exercise
                                const exerciseId = exercise.id || exerciseData.id || String(exercise)
                                const isCompleted = completedExercisesForDay.has(String(exerciseId))
                                
                                return (
                                  <div 
                                    key={exercise.id} 
                                    className={`text-xs p-2 rounded transition-all ${
                                      isCompleted 
                                        ? 'bg-green-50 border border-green-200' 
                                        : 'bg-muted/50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      {isCompleted && (
                                        <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                                      )}
                                      <div className="flex-1">
                                        <div className={`font-medium ${isCompleted ? 'text-green-700 line-through' : ''}`}>
                                          {exerciseData.name}
                                        </div>
                                        <div className="text-muted-foreground">
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

                            <Button 
                              size="sm" 
                              className="w-full"
                              onClick={() => handleStartWorkout(day)}
                              variant={completedCount === totalExercises && totalExercises > 0 ? "default" : "default"}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              {completedCount === totalExercises && totalExercises > 0 ? 'Continuar' : 'Iniciar'}
                            </Button>
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

        <TabsContent value="history" className="space-y-4">
          <div className="space-y-3">
            {workoutLogs.slice(0, 10).map((log) => (
              <Card key={log.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {log.completed ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-yellow-600" />
                      )}
                      <div>
                        <div className="font-medium">
                          {new Date(log.date).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {log.duration_minutes} minutos
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {log.rating && (
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Award 
                              key={i} 
                              className={`h-4 w-4 ${i < (log.rating || 0) ? 'text-yellow-500' : 'text-gray-300'}`} 
                            />
                          ))}
                        </div>
                      )}
                      <Badge 
                        variant={log.completed ? "default" : "secondary"}
                        className={log.completed ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0" : ""}
                      >
                        {log.completed ? "Completado" : "Pendiente"}
                      </Badge>
                    </div>
                  </div>
                  {log.notes && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      {log.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Estadísticas Generales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total entrenamientos</span>
                  <span className="font-semibold">{stats.totalWorkouts}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duración promedio</span>
                  <span className="font-semibold">{stats.averageDuration} min</span>
                </div>
                <div className="flex justify-between">
                  <span>Racha actual</span>
                  <span className="font-semibold">{stats.currentStreak} días</span>
                </div>
                <div className="flex justify-between">
                  <span>Mejor racha</span>
                  <span className="font-semibold">{stats.longestStreak} días</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Progreso Semanal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Entrenamientos completados</span>
                    <span>{stats.completedThisWeek}/{stats.weeklyGoal}</span>
                  </div>
                  <Progress 
                    value={(stats.completedThisWeek / stats.weeklyGoal) * 100} 
                    className="h-3"
                  />
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round((stats.completedThisWeek / stats.weeklyGoal) * 100)}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    del objetivo semanal
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog para entrenamiento interactivo */}
      <Dialog open={isWorkoutDialogOpen} onOpenChange={setIsWorkoutDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-purple-600" />
              Entrenamiento: {selectedDay?.day_name || 'Día de Entrenamiento'}
            </DialogTitle>
            <DialogDescription>
              Completa los ejercicios marcando cada uno cuando termines
            </DialogDescription>
          </DialogHeader>
          
          {selectedDay && selectedDay.exercises && (
            <div className="space-y-6">
              {/* Lista de ejercicios */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Ejercicios ({completedExercises.size} / {selectedDay.exercises.length} completados)
                </h3>
                
                <div className="grid gap-3">
                  {selectedDay.exercises.map((exerciseItem: any) => {
                    const exercise = exerciseItem.exercise || exerciseItem
                    const exerciseId = exerciseItem.id || exercise.id || String(exerciseItem)
                    const isCompleted = completedExercises.has(String(exerciseId))
                    
                    return (
                      <Card 
                        key={exerciseId} 
                        className={`transition-all ${
                          isCompleted 
                            ? 'bg-green-50 border-green-300' 
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {/* Checkbox para marcar como completado */}
                            <button
                              onClick={() => toggleExerciseCompleted(String(exerciseId))}
                              className={`mt-1 transition-all ${
                                isCompleted 
                                  ? 'text-green-600 hover:text-green-700' 
                                  : 'text-gray-400 hover:text-gray-600'
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="h-6 w-6" />
                              ) : (
                                <Circle className="h-6 w-6" />
                              )}
                            </button>
                            
                            {/* Información del ejercicio */}
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <h4 className={`font-semibold text-lg mb-1 ${
                                    isCompleted ? 'text-green-700 line-through' : 'text-gray-900'
                                  }`}>
                                    {exercise.name || exerciseItem.name || 'Ejercicio'}
                                  </h4>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Target className="h-4 w-4" />
                                      {exerciseItem.sets || 'N/A'} series
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Repeat className="h-4 w-4" />
                                      {exerciseItem.reps || 'N/A'} reps
                                    </span>
                                    {exerciseItem.weight && (
                                      <span className="flex items-center gap-1">
                                        <Dumbbell className="h-4 w-4" />
                                        {exerciseItem.weight} kg
                                      </span>
                                    )}
                                  </div>
                                  {exercise.instructions && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      {exercise.instructions}
                                    </p>
                                  )}
                                </div>
                                
                                {/* Botón de video */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center gap-2"
                                  onClick={() => {
                                    // Por ahora solo mostrar un toast
                                    toast({
                                      title: "Reproducir video",
                                      description: "La funcionalidad de video estará disponible pronto.",
                                    })
                                  }}
                                >
                                  <Video className="h-4 w-4" />
                                  Ver Video
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
              
              {/* Progreso */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progreso del entrenamiento</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {Math.round((completedExercises.size / selectedDay.exercises.length) * 100)}%
                  </span>
                </div>
                <Progress 
                  value={(completedExercises.size / selectedDay.exercises.length) * 100} 
                  className="h-2"
                />
              </div>
              
              {/* Formulario final */}
              <div className="border-t pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duración (minutos)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={workoutForm.duration}
                      onChange={(e) => setWorkoutForm({ ...workoutForm, duration: Number(e.target.value) })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="rating">Calificación (1-5)</Label>
                    <Input
                      id="rating"
                      type="number"
                      min="1"
                      max="5"
                      value={workoutForm.rating}
                      onChange={(e) => setWorkoutForm({ ...workoutForm, rating: Number(e.target.value) })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas (opcional)</Label>
                  <Textarea
                    id="notes"
                    value={workoutForm.notes}
                    onChange={(e) => setWorkoutForm({ ...workoutForm, notes: e.target.value })}
                    placeholder="¿Cómo te sentiste? ¿Algún comentario?"
                    rows={3}
                  />
                </div>
              </div>
              
              {/* Botones de acción */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  // No limpiar el estado guardado, solo cerrar el diálogo
                  setIsWorkoutDialogOpen(false)
                  setWorkoutStartTime(null)
                }}>
                  Cerrar (guardado)
                </Button>
                <Button 
                  onClick={handleCompleteWorkout}
                  className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
                  disabled={completedExercises.size === 0}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Completar Entrenamiento
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
