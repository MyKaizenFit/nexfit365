"use client"

import { useState, useEffect } from "react"
import { Dumbbell, Play, Check, Clock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"
import { useWorkouts } from "@/hooks/use-workouts"

export function WorkoutSummary() {
  const {
    activeProgram,
    workoutLogs,
    workoutStatistics,
    loading,
    error,
    getTodaysWorkout,
    getWeeklyProgress,
    createWorkoutLog
  } = useWorkouts()

  const [isStartingWorkout, setIsStartingWorkout] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)

  const restSeconds = workoutStatistics?.recommended_rest_seconds || 60
  const topPr = workoutStatistics?.estimated_1rm_prs?.[0]

  useEffect(() => {
    if (!timerRunning || timerSeconds <= 0) {
      return
    }
    const handle = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setTimerRunning(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(handle)
  }, [timerRunning, timerSeconds])

  const startRestTimer = () => {
    setTimerSeconds(restSeconds)
    setTimerRunning(true)
  }

  // Generar datos de la semana basados en el programa activo
  const generateWeeklyWorkouts = () => {
    if (!activeProgram) {
      return [
        { id: 1, day: "Lunes", name: "Sin programa activo", completed: false, isRestDay: false },
        { id: 2, day: "Martes", name: "Sin programa activo", completed: false, isRestDay: false },
        { id: 3, day: "Miércoles", name: "Sin programa activo", completed: false, isRestDay: false },
        { id: 4, day: "Jueves", name: "Sin programa activo", completed: false, isRestDay: false },
        { id: 5, day: "Viernes", name: "Sin programa activo", completed: false, isRestDay: false },
        { id: 6, day: "Sábado", name: "Sin programa activo", completed: false, isRestDay: false },
        { id: 7, day: "Domingo", name: "Descanso", completed: false, isRestDay: true },
      ]
    }

    const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

    return dayNames.map((dayName, index) => {
      const dayNumber = index === 0 ? 7 : index // Domingo es día 7
      const programDay = activeProgram.days?.find(day => day.day_number === dayNumber) || null

      // Verificar si hay logs para este día
      const today = new Date()
      const dayDate = new Date(today)
      dayDate.setDate(today.getDate() - today.getDay() + index)
      const dayDateStr = dayDate.toISOString().split('T')[0]

      const hasLog = workoutLogs.some(log =>
        log.date === dayDateStr && log.completed
      )

      return {
        id: index + 1,
        day: dayName,
        name: programDay ? programDay.day_name : "Descanso",
        completed: hasLog,
        isRestDay: programDay ? programDay.is_rest_day : (index === 0 || index === 6), // Domingo y sábado son descanso por defecto
        programDay: programDay
      }
    })
  }

  const workouts = generateWeeklyWorkouts()
  const completedWorkouts = workouts.filter((w) => w.completed && !w.isRestDay).length
  const totalWorkouts = workouts.filter((w) => !w.isRestDay).length
  const nextWorkout = workouts.find((w) => !w.completed && !w.isRestDay)

  const handleStartWorkout = async () => {
    if (!nextWorkout) return

    setIsStartingWorkout(true)
    try {
      // Usar el ID del workout directamente
      await createWorkoutLog(nextWorkout.id.toString(), "Entrenamiento iniciado")

      toast({
        title: "¡Entrenamiento iniciado!",
        description: `${nextWorkout.name} - ${nextWorkout.day}. ¡Dale todo!`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo iniciar el entrenamiento. Inténtalo de nuevo.",
        variant: "destructive"
      })
    } finally {
      setIsStartingWorkout(false)
    }
  }

  const handleViewPlan = () => {
    if (!activeProgram) {
      toast({
        title: "Sin programa activo",
        description: "No tienes un programa de entrenamiento activo. Contacta a tu entrenador.",
        variant: "destructive"
      })
      return
    }

    toast({
      title: "Plan de Entrenamientos",
      description: `Programa: ${activeProgram.name}. Duración: ${activeProgram.duration_weeks} semanas.`,
    })
  }

  const handleAddFeedback = () => {
    toast({
      title: "Feedback del entrenamiento",
      description: "¿Cómo te sentiste hoy? Comparte tu experiencia.",
    })
  }

  // Mostrar loading si está cargando
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Entrenamientos
          </CardTitle>
          <CardDescription>Resumen de tu rutina semanal</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Cargando entrenamientos...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Mostrar error si hay error
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Entrenamientos
          </CardTitle>
          <CardDescription>Resumen de tu rutina semanal</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">Error al cargar entrenamientos</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dumbbell className="h-4 w-4" />
          Entrenamientos
        </CardTitle>
        <CardDescription>
          {activeProgram
            ? `Programa: ${activeProgram.name} (${activeProgram.duration_weeks} semanas)`
            : "Resumen de tu rutina semanal"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Completados esta semana</span>
            <span>
              {completedWorkouts}/{totalWorkouts}
            </span>
          </div>
          <Progress
            value={totalWorkouts > 0 ? (completedWorkouts / totalWorkouts) * 100 : 0}
            className="cursor-pointer"
            onClick={() =>
              toast({
                title: "Progreso semanal",
                description: `Has completado ${completedWorkouts} de ${totalWorkouts} entrenamientos esta semana`,
              })
            }
          />
        </div>

        {/* Información del programa activo */}
        {activeProgram && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Dumbbell className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900 dark:text-blue-100 text-sm">Programa Activo</span>
            </div>
            <p className="text-blue-800 dark:text-blue-200 text-xs">
              {activeProgram.days_per_week} días/semana • {activeProgram.level} • {activeProgram.goal}
            </p>
          </div>
        )}

        {topPr && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Dumbbell className="h-4 w-4 text-emerald-600" />
              <span className="font-medium text-emerald-900 dark:text-emerald-100 text-sm">Progreso 1RM</span>
            </div>
            <p className="text-emerald-800 dark:text-emerald-200 text-xs">
              Mejor estimado: {topPr.exercise_name} - {topPr.estimated_1rm_kg} kg
            </p>
          </div>
        )}

        <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-medium text-orange-900 dark:text-orange-100 text-sm">Timer de descanso</p>
              <p className="text-orange-800 dark:text-orange-200 text-xs">
                Recomendado: {restSeconds}s
                {timerSeconds > 0 ? ` - ${timerSeconds}s restantes` : ""}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={startRestTimer}>
              Iniciar
            </Button>
          </div>
        </div>

        {/* Sin programa activo */}
        {!activeProgram && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="font-medium text-yellow-900 dark:text-yellow-100 text-sm">Sin programa activo</span>
            </div>
            <p className="text-yellow-800 dark:text-yellow-200 text-xs">
              Contacta a tu entrenador para asignarte un programa.
            </p>
          </div>
        )}

        {nextWorkout && !nextWorkout.isRestDay && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Próximo Entrenamiento</h4>
            <div className="p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{nextWorkout.name}</p>
                  <p className="text-xs text-muted-foreground">{nextWorkout.day} - 45 min</p>
                </div>
                <Button
                  size="sm"
                  onClick={handleStartWorkout}
                  className="hover:scale-105 transition-transform"
                  disabled={isStartingWorkout}
                >
                  {isStartingWorkout ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3 mr-1" />
                  )}
                  Iniciar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de entrenamientos de la semana */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Esta semana</h4>
          <div className="space-y-1">
            {workouts.map((workout) => (
              <div
                key={workout.id}
                className={`flex items-center justify-between p-2 rounded text-xs hover:bg-muted/50 transition-colors ${workout.isRestDay ? 'opacity-60' : ''
                  }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded-full ${workout.completed
                      ? "bg-green-500"
                      : workout.isRestDay
                        ? "bg-gray-300 dark:bg-gray-600"
                        : "bg-muted"
                    }`}>
                    {workout.completed ? (
                      <Check className="h-2 w-2 text-white" />
                    ) : workout.isRestDay ? (
                      <div className="h-2 w-2 rounded-full bg-gray-500" />
                    ) : (
                      <Clock className="h-2 w-2 text-muted-foreground" />
                    )}
                  </div>
                  <span className={
                    workout.completed
                      ? "text-green-600"
                      : workout.isRestDay
                        ? "text-muted-foreground"
                        : "text-muted-foreground"
                  }>
                    {workout.day}
                  </span>
                </div>
                <span className={
                  workout.isRestDay
                    ? "text-muted-foreground"
                    : "text-muted-foreground"
                }>
                  {workout.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full bg-transparent hover:bg-primary hover:text-primary-foreground transition-all duration-300"
            onClick={handleViewPlan}
          >
            Ver Plan Completo
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs hover:bg-muted transition-colors"
            onClick={handleAddFeedback}
          >
            Añadir Feedback del Entrenamiento
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
