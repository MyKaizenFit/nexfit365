'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dumbbell,
  CheckCircle,
  Circle,
  Clock,
  Play,
  Trophy,
  Target,
  Shield
} from 'lucide-react'
import { ExerciseVideoPlayer } from './exercise-video-player'
import { ActiveWorkoutSession } from './active-workout-session'
import { toast } from '@/hooks/use-toast'
import { useWorkouts } from '@/hooks/use-workouts'
import { useUserProfile } from '@/hooks/use-user-profile'

interface TodaysWorkoutCardProps {
  className?: string
}

export function TodaysWorkoutCard({ className }: TodaysWorkoutCardProps) {
  const { activeProgram, workoutLogs, createWorkoutLog, refreshData } = useWorkouts()
  const { profile } = useUserProfile()
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set())
  const [workoutStarted, setWorkoutStarted] = useState(false)
  const [workoutCompleted, setWorkoutCompleted] = useState(false)
  const [showActiveWorkout, setShowActiveWorkout] = useState(false)

  // Obtener el día actual (1-7, donde 1 = Lunes, 7 = Domingo)
  const getTodayDayNumber = () => {
    const today = new Date().getDay() // 0 = Domingo, 1 = Lunes, etc.
    return today === 0 ? 7 : today // Convertir domingo a día 7
  }

  const todayDayNumber = getTodayDayNumber()

  // Verificar si hoy es día de entrenamiento según el perfil del usuario
  const trainingDays = profile?.training_days || []
  const isTrainingDay = trainingDays.length > 0 ? trainingDays.includes(todayDayNumber) : true // Si no hay configuración, asumir que sí

  // Obtener el entrenamiento de hoy
  const todaysWorkout = activeProgram && activeProgram.days ? (() => {
    return activeProgram.days.find(day => day.day_number === todayDayNumber) || null
  })() : null

  // Verificar si es día de descanso
  const isRestDay = !isTrainingDay || (todaysWorkout?.is_rest_day ?? false)

  // Verificar si hay logs de entrenamiento de hoy
  const todayLogs = workoutLogs.filter(log => {
    const logDate = new Date(log.date)
    const today = new Date()
    return logDate.toDateString() === today.toDateString()
  })

  // Verificar si el entrenamiento de hoy ya fue completado
  const isWorkoutCompletedToday = todayLogs.some(log =>
    log.completed && log.workout_day === todaysWorkout?.id
  )

  // Calcular progreso
  const totalExercises = todaysWorkout?.exercises?.length || 0
  const completedCount = completedExercises.size
  const progress = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0

  // Manejar inicio de entrenamiento
  const handleStartWorkout = () => {
    if (!todaysWorkout) return

    setWorkoutStarted(true)
    toast({
      title: "Entrenamiento iniciado",
      description: "¡Buena suerte! Marca los ejercicios conforme los completes.",
    })
  }

  // Manejar completar ejercicio
  const handleToggleExercise = (exerciseId: string) => {
    setCompletedExercises(prev => {
      const newSet = new Set(prev)
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId)
      } else {
        newSet.add(exerciseId)
      }
      return newSet
    })
  }

  // Manejar completar entrenamiento completo
  const handleCompleteWorkout = async () => {
    if (!todaysWorkout) return

    try {
      await createWorkoutLog(todaysWorkout.id, 'Entrenamiento completado')
      setWorkoutCompleted(true)
      await refreshData()

      toast({
        title: "¡Entrenamiento completado! 🎉",
        description: "Excelente trabajo. Sigue así.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar el entrenamiento.",
        variant: "destructive",
      })
    }
  }

  // Función para crear plan automáticamente
  const handleCreatePlan = async () => {
    try {
      // Verificar que el perfil esté completo (tiene datos mínimos)
      if (!profile || !profile.main_goal || !profile.activity_level || !profile.training_days_per_week) {
        toast({
          title: "Perfil incompleto",
          description: "Por favor, completa el formulario de registro inicial primero.",
          variant: "destructive",
        })
        return
      }

      // Redirigir al formulario de registro inicial para completar los datos
      toast({
        title: "Redirigiendo al formulario",
        description: "Vamos a completar tu perfil para asignarte un plan personalizado.",
      })

      // Esperar un momento para que se vea el toast
      setTimeout(() => {
        window.location.href = '/initial-registration'
      }, 1500)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el plan. Por favor, intenta completar el formulario de registro.",
        variant: "destructive",
      })
    }
  }

  // Si no hay plan activo
  if (!activeProgram) {
    const hasCompleteProfile = profile && profile.main_goal && profile.activity_level && profile.training_days_per_week

    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
            <Dumbbell className="h-8 w-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            No tienes un plan de entrenamiento activo
          </h3>
          <p className="text-muted-foreground mb-4">
            {hasCompleteProfile
              ? "Completa el formulario de registro para que te asignemos un plan personalizado automáticamente."
              : "Completa tu perfil para obtener un plan de entrenamiento personalizado."
            }
          </p>
          <Button
            onClick={handleCreatePlan}
            className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600"
          >
            <Target className="h-4 w-4 mr-2" />
            Completar Perfil y Obtener Plan
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Si es día de descanso (no está en los días de entrenamiento configurados o es marcado como descanso)
  if (isRestDay) {
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const dayName = dayNames[new Date().getDay()]

    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-violet-100 rounded-full flex items-center justify-center">
            <Clock className="h-8 w-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-purple-700">
            Día de Descanso
          </h3>
          <p className="text-muted-foreground mb-4">
            Hoy es {dayName}, tu día de descanso. ¡Disfrútalo! 😌
          </p>
          {trainingDays.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-500 mb-2">Tus días de entrenamiento:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {trainingDays.map((day: number) => {
                  const dayNamesShort = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
                  return (
                    <Badge
                      key={day}
                      className={day === todayDayNumber ? 'bg-purple-600' : 'bg-gray-200 text-gray-600'}
                    >
                      {dayNamesShort[day - 1]}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-600" />
              Entrenamiento de Hoy
            </CardTitle>
            <CardDescription>
              {todaysWorkout.day_name} • {totalExercises} ejercicios
            </CardDescription>
          </div>
          {isWorkoutCompletedToday && (
            <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
              <Trophy className="h-3 w-3 mr-1" />
              Completado
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Barra de progreso */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {workoutStarted || isWorkoutCompletedToday
                ? `${completedCount}/${totalExercises} ejercicios completados`
                : 'Entrenamiento pendiente'
              }
            </span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={isWorkoutCompletedToday ? 100 : progress} className="h-2" />
        </div>

        {/* Ejercicios */}
        <div className="space-y-3">
          {todaysWorkout.exercises?.map((exercise: any, index: number) => {
            const exerciseData = exercise.exercise || exercise
            const isCompleted = completedExercises.has(exercise.id) || isWorkoutCompletedToday

            return (
              <div
                key={exercise.id}
                className={`
                  p-4 rounded-lg border-2 transition-all
                  ${isCompleted
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-gray-200 hover:border-purple-300 cursor-pointer'
                  }
                `}
                onClick={() => workoutStarted && handleToggleExercise(exercise.id)}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <div className="pt-1 cursor-pointer">
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-400 hover:text-purple-600" />
                    )}
                  </div>

                  {/* Información del ejercicio */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className={`font-semibold ${isCompleted ? 'text-green-700 line-through' : 'text-gray-900'}`}>
                          {index + 1}. {exerciseData.name}
                        </h4>
                        <div className="mt-1 flex items-center gap-3 text-sm text-gray-600">
                          {exercise.sets && (
                            <span className="flex items-center gap-1">
                              <Dumbbell className="h-3 w-3" />
                              {exercise.sets} series
                            </span>
                          )}
                          {exercise.reps && (
                            <span>{exercise.reps} reps</span>
                          )}
                          {exercise.rest_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {exercise.rest_time}s
                            </span>
                          )}
                        </div>
                        {Array.isArray(exerciseData.substitutes) && exerciseData.substitutes.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-amber-100 bg-amber-50/50 rounded-md p-2">
                            <p className="text-xs font-semibold text-amber-900 mb-1.5 flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              Ejercicios de respaldo ({exerciseData.substitutes.length})
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {exerciseData.substitutes.map((sub: any) => (
                                <Badge
                                  key={sub.id}
                                  variant="secondary"
                                  className="bg-gradient-to-r from-amber-100 to-orange-100 text-amber-900 border border-amber-300 text-[10px] px-2 py-0.5"
                                >
                                  <Shield className="h-2.5 w-2.5 mr-1 inline" />
                                  {sub.substitute_name || sub.name}
                                </Badge>
                              ))}
                            </div>
                            <p className="text-[10px] text-amber-700 mt-1.5 italic">Si no puedes realizar el ejercicio principal, usa estos alternativos.</p>
                          </div>
                        )}
                      </div>

                      {/* Botón de video si está disponible */}
                      {exerciseData.has_video && (
                        <ExerciseVideoPlayer exercise={exerciseData}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-shrink-0"
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Ver
                          </Button>
                        </ExerciseVideoPlayer>
                      )}
                    </div>

                    {/* Thumbnail del ejercicio si existe */}
                    {(exerciseData.thumbnail_url || exerciseData.image_url) && (
                      <ExerciseVideoPlayer exercise={exerciseData}>
                        <div className="mt-2 relative w-32 h-20 bg-gray-100 rounded overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border border-gray-200">
                          <img
                            src={exerciseData.thumbnail_url || exerciseData.image_url}
                            alt={exerciseData.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
                            <Play className="h-6 w-6 text-white drop-shadow-lg" />
                          </div>
                        </div>
                      </ExerciseVideoPlayer>
                    )}

                    {/* Notas si existen */}
                    {exercise.notes && (
                      <p className="mt-2 text-xs text-gray-600 italic">
                        {exercise.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Acciones */}
        <div className="pt-4 space-y-2">
          {!isWorkoutCompletedToday && (
            <Button
              onClick={() => setShowActiveWorkout(true)}
              className="w-full bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600"
            >
              <Play className="h-4 w-4 mr-2" />
              Iniciar Entrenamiento Completo
            </Button>
          )}
        </div>
      </CardContent>

      {/* Sesión de entrenamiento activo */}
      {todaysWorkout && (
        <ActiveWorkoutSession
          workoutDay={todaysWorkout}
          isOpen={showActiveWorkout}
          onClose={() => setShowActiveWorkout(false)}
          onComplete={async (data) => {
            try {
              await createWorkoutLog(todaysWorkout.id, data.notes)
              await refreshData()
              setShowActiveWorkout(false)
            } catch (error) {
              throw error
            }
          }}
        />
      )}
    </Card>
  )
}
