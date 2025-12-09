"use client"

import { useState } from "react"
import {
  Dumbbell,
  Play,
  Check,
  Clock,
  Trophy,
  Flame,
  Target,
  TrendingUp,
  Calendar,
  Zap,
  Award,
  Activity,
  Calendar as CalendarIcon,
  Clock as ClockIcon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useWorkouts, WorkoutLog } from "@/hooks/use-workouts"
import { toast } from "@/hooks/use-toast"

interface WorkoutSummaryEnhancedProps {
  className?: string
}

export function WorkoutSummaryEnhanced({ className }: WorkoutSummaryEnhancedProps) {
  const {
    workoutLogs,
    loading,
    error,
    activeProgram,
    refreshData
  } = useWorkouts()

  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutLog | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  // Calcular estadísticas manualmente
  const stats = {
    totalWorkouts: workoutLogs.length,
    completedThisWeek: workoutLogs.filter(log => {
      const logDate = new Date(log.date)
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return logDate >= weekAgo
    }).length,
    weeklyGoal: 5,
    averageRating: workoutLogs.length > 0
      ? workoutLogs.reduce((sum, log) => sum + (log.rating || 0), 0) / workoutLogs.length
      : 0,
    totalMinutes: workoutLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0),
    // Propiedades adicionales para compatibilidad
    current_streak: 0,
    this_week: workoutLogs.filter(log => {
      const logDate = new Date(log.date)
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return logDate >= weekAgo
    }).length,
    goal_per_week: 5,
    progress: 0,
    total_time_month: workoutLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0),
    longest_streak: 0
  }

  // Obtener entrenamientos recientes (últimos 7 días)
  const recentWorkouts = Array.isArray(workoutLogs) ? workoutLogs
    .filter(log => {
      if (!log || !log.date) return false
      const logDate = new Date(log.date)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return logDate >= weekAgo
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5) : []

  const handleViewWorkoutDetails = (workout: WorkoutLog) => {
    setSelectedWorkout(workout)
    setIsDetailsOpen(true)
  }

  // Obtener los ejercicios del día de entrenamiento desde el programa activo
  const getWorkoutDayDetails = (workoutDayId: string) => {
    if (!activeProgram || !activeProgram.days || !workoutDayId) return null

    return activeProgram.days.find(day => day.id === workoutDayId) || null
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-3/4 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-20 bg-muted rounded animate-pulse"></div>
            <div className="h-32 bg-muted rounded animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && !loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Dumbbell className="h-5 w-5" />
            Error al cargar entrenamientos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={refreshData} variant="outline" size="sm">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`backdrop-blur-sm bg-white/80 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.01] ${className}`}>
      <CardHeader className="p-3 sm:p-4 lg:p-6">
        <CardTitle className="text-sm sm:text-base lg:text-lg responsive-text bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
          <Dumbbell className="h-4 w-4 sm:h-5 sm:w-5" />
          Entrenamientos de la Semana
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm responsive-text text-gray-600">
          Tu actividad física y progreso • {stats?.current_streak || 0} días de racha 🔥
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6 pt-0">
        {/* Resumen de la semana */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
          <div className="text-center">
            <div className="text-lg sm:text-2xl font-bold text-purple-700">
              {stats?.this_week || 0}
            </div>
            <div className="text-xs text-purple-600">Completados</div>
          </div>
          <div className="text-center">
            <div className="text-lg sm:text-2xl font-bold text-purple-700">
              {stats?.goal_per_week || 5}
            </div>
            <div className="text-xs text-purple-600">Objetivo</div>
          </div>
          <div className="text-center">
            <div className="text-lg sm:text-2xl font-bold text-purple-700">
              {Math.round(stats?.progress || 0)}%
            </div>
            <div className="text-xs text-purple-600">Progreso</div>
          </div>
          <div className="text-center">
            <div className="text-lg sm:text-2xl font-bold text-purple-700">
              {stats?.current_streak || 0}
            </div>
            <div className="text-xs text-purple-600">Racha</div>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progreso semanal</span>
            <span className="text-purple-600 font-bold">
              {stats?.this_week || 0} / {stats?.goal_per_week || 5}
            </span>
          </div>
          <Progress
            value={stats?.progress || 0}
            className="h-2"
          />
        </div>

        {/* Estadísticas adicionales */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="flex items-center gap-2 p-2 sm:p-3 bg-muted/50 rounded-lg">
            <Clock className="h-4 w-4 text-blue-600" />
            <div>
              <div className="text-sm font-medium">{stats?.total_time_month || 0} min</div>
              <div className="text-xs text-muted-foreground">Este mes</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 sm:p-3 bg-muted/50 rounded-lg">
            <Trophy className="h-4 w-4 text-yellow-600" />
            <div>
              <div className="text-sm font-medium">{stats?.longest_streak || 0} días</div>
              <div className="text-xs text-muted-foreground">Mejor racha</div>
            </div>
          </div>
        </div>

        {/* Lista de entrenamientos recientes */}
        {recentWorkouts.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Entrenamientos recientes</h4>
            <div className="space-y-2">
              {recentWorkouts.map((workout) => (
                <div
                  key={workout.id}
                  onClick={() => handleViewWorkoutDetails(workout)}
                  className="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    {workout.completed ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-600" />
                    )}
                    <div>
                      <div className="text-sm font-medium">
                        {workout.workout_day_name ||
                          (workout.workout_day_day ?
                            workout.workout_day_day.charAt(0).toUpperCase() + workout.workout_day_day.slice(1) :
                            'Entrenamiento')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(workout.date).toLocaleDateString('es-ES', {
                          weekday: 'short',
                          day: 'numeric'
                        })} • {workout.duration_minutes || 0} min
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {workout.rating && (
                      <div className="flex items-center gap-1">
                        <Award className="h-3 w-3 text-yellow-500" />
                        <span className="text-xs font-medium">{workout.rating || 0}</span>
                      </div>
                    )}
                    <Badge
                      variant={workout.completed ? "default" : "secondary"}
                      className={workout.completed ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-xs" : "text-xs"}
                    >
                      {workout.completed ? "Completado" : "Pendiente"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <Dumbbell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No tienes entrenamientos registrados aún
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ¡Comienza tu primera sesión de entrenamiento!
            </p>
          </div>
        )}

      </CardContent>

      {/* Modal de detalles del entrenamiento */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-purple-600" />
              Detalles del Entrenamiento
            </DialogTitle>
            <DialogDescription>
              Información completa de tu sesión de entrenamiento
            </DialogDescription>
          </DialogHeader>

          {selectedWorkout && (
            <div className="space-y-6">
              {/* Información general */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarIcon className="h-4 w-4 text-purple-600" />
                      <span className="text-xs font-medium text-purple-700">Fecha</span>
                    </div>
                    <p className="text-sm font-semibold text-purple-900">
                      {new Date(selectedWorkout.date).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ClockIcon className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-700">Duración</span>
                    </div>
                    <p className="text-sm font-semibold text-blue-900">
                      {selectedWorkout.duration_minutes || 0} minutos
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Nombre del entrenamiento */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {selectedWorkout.workout_day_name ||
                      (selectedWorkout.workout_day_day ?
                        selectedWorkout.workout_day_day.charAt(0).toUpperCase() + selectedWorkout.workout_day_day.slice(1) :
                        'Entrenamiento')}
                  </CardTitle>
                </CardHeader>
              </Card>

              {/* Ejercicios del día */}
              {(() => {
                const workoutDay = getWorkoutDayDetails(selectedWorkout.workout_day)
                return workoutDay && workoutDay.exercises ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Ejercicios ({workoutDay.exercises.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {workoutDay.exercises.map((exercise: any, index: number) => {
                          const exerciseData = exercise.exercise || exercise
                          return (
                            <div
                              key={exercise.id || index}
                              className="p-3 bg-muted/50 rounded-lg border border-purple-100"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-sm">{exerciseData.name || 'Ejercicio'}</h4>
                                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                    <span>{exercise.sets} series</span>
                                    <span>{exercise.reps} repeticiones</span>
                                    {exercise.weight && <span>Peso: {exercise.weight}</span>}
                                    {exercise.rest_seconds && <span>Descanso: {exercise.rest_seconds}s</span>}
                                  </div>
                                  {exerciseData.category && (
                                    <Badge variant="outline" className="mt-2 text-xs">
                                      {exerciseData.category}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No se encontraron detalles de los ejercicios</p>
                    </CardContent>
                  </Card>
                )
              })()}

              {/* Notas y calificación */}
              <div className="grid grid-cols-2 gap-4">
                {selectedWorkout.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Notas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{selectedWorkout.notes}</p>
                    </CardContent>
                  </Card>
                )}

                {selectedWorkout.rating && (
                  <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Award className="h-4 w-4 text-yellow-600" />
                        Calificación
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-yellow-700">{selectedWorkout.rating}</span>
                        <span className="text-sm text-yellow-600">/ 10</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Estado */}
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-900">Entrenamiento Completado</span>
                    </div>
                    <Badge className="bg-green-500 text-white">
                      ✓ Finalizado
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
