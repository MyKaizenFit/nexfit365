'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useWorkouts } from '@/hooks/use-workouts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Dumbbell,
  Target,
  Calendar,
  Clock,
  TrendingUp,
  Play,
  CheckCircle,
  Plus,
  Settings,
  Star
} from 'lucide-react'
import { ExerciseCard } from '@/components/exercise-card'
import { TodaysWorkoutCard } from '@/components/todays-workout-card'
import { WorkoutScheduleConfig } from '@/components/workout-schedule-config'

export default function EntrenamientosPage() {
  const { user, isAuthenticated } = useAuth()
  const {
    activeProgram,
    workoutPrograms,
    templates,
    exercises,
    workoutLogs,
    loading,
    error,
    createProgramFromTemplate,
    activateProgram,
    createWorkoutLog,
    refreshData
  } = useWorkouts()

  const [selectedGoal, setSelectedGoal] = useState<string>('')
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)

  // Objetivos de fitness disponibles
  const fitnessGoals = [
    { id: 'weight_loss', name: 'Pérdida de Peso', icon: '🔥', color: 'bg-red-500' },
    { id: 'muscle_gain', name: 'Ganancia de Músculo', icon: '💪', color: 'bg-blue-500' },
    { id: 'strength', name: 'Fuerza', icon: '🏋️', color: 'bg-purple-500' },
    { id: 'endurance', name: 'Resistencia', icon: '🏃', color: 'bg-green-500' },
    { id: 'flexibility', name: 'Flexibilidad', icon: '🧘', color: 'bg-yellow-500' },
    { id: 'general', name: 'Fitness General', icon: '⭐', color: 'bg-gray-500' }
  ]

  // Filtrar plantillas por objetivo seleccionado
  const filteredTemplates = selectedGoal
    ? templates.filter(template =>
      template.goal === selectedGoal ||
      template.tags?.includes(selectedGoal)
    )
    : templates

  // Calcular progreso semanal
  const weeklyProgress = workoutLogs.filter(log => {
    const logDate = new Date(log.date)
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    return logDate >= oneWeekAgo && log.completed
  }).length

  const weeklyGoal = activeProgram?.days_per_week || 3
  const progressPercentage = (weeklyProgress / weeklyGoal) * 100

  // Obtener el entrenamiento de hoy
  const todaysWorkout = activeProgram && activeProgram.days ? (() => {
    const today = new Date().getDay()
    const dayNumber = today === 0 ? 7 : today
    return activeProgram.days.find(day => day.day_number === dayNumber) || null
  })() : null

  const handleCreateProgram = async (template: any) => {
    if (!user) return

    try {
      const program = await createProgramFromTemplate(template.id, user.id.toString())
      await activateProgram(program.id)
      await refreshData()
    } catch (error) {
    }
  }

  const handleStartWorkout = async (workoutDay: any) => {
    try {
      await createWorkoutLog(workoutDay.id, 'Entrenamiento iniciado')
      await refreshData()
    } catch (error) {
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">Error al cargar entrenamientos: {error}</p>
        <Button onClick={refreshData}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <div className="p-3 bg-purple-100 rounded-lg">
          <Dumbbell className="h-8 w-8 text-purple-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Entrenamientos 💪</h1>
          <p className="text-gray-600">Gestiona tu rutina de ejercicios y objetivos</p>
        </div>
      </div>

      {/* Progreso Semanal */}
      {activeProgram && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Progreso Semanal</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Entrenamientos completados: {weeklyProgress}/{weeklyGoal}</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <div className="text-sm text-gray-600">
                {weeklyProgress >= weeklyGoal
                  ? "¡Excelente! Has cumplido tu meta semanal 🎉"
                  : `Te faltan ${weeklyGoal - weeklyProgress} entrenamientos para cumplir tu meta`
                }
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="today" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="today">Hoy</TabsTrigger>
          <TabsTrigger value="current">Rutina</TabsTrigger>
          <TabsTrigger value="schedule">Horario</TabsTrigger>
          <TabsTrigger value="templates">Plantillas</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        {/* Pestaña de Entrenamiento de Hoy */}
        <TabsContent value="today" className="space-y-6">
          <TodaysWorkoutCard />
        </TabsContent>

        {/* Pestaña de Configuración de Horario */}
        <TabsContent value="schedule" className="space-y-6">
          <WorkoutScheduleConfig />
        </TabsContent>

        {/* Pestaña Actual */}
        <TabsContent value="current" className="space-y-6">
          {activeProgram ? (
            <div className="space-y-6">
              {/* Información del Programa Activo */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{activeProgram.name}</span>
                    <Badge variant="secondary">{activeProgram.level}</Badge>
                  </CardTitle>
                  <CardDescription>{activeProgram.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold">{activeProgram.days_per_week}</div>
                      <div className="text-gray-600">Días/semana</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">{activeProgram.duration_weeks}</div>
                      <div className="text-gray-600">Semanas</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold capitalize">{activeProgram.goal}</div>
                      <div className="text-gray-600">Objetivo</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">{activeProgram.days?.length || 0}</div>
                      <div className="text-gray-600">Días</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Entrenamiento de Hoy */}
              {todaysWorkout && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5" />
                      <span>Entrenamiento de Hoy - {todaysWorkout.day_name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{todaysWorkout.exercises.length} ejercicios</p>
                          <p className="text-sm text-gray-600">
                            Tiempo estimado: {todaysWorkout.exercises.length * 3} minutos
                          </p>
                        </div>
                        <Button
                          onClick={() => handleStartWorkout(todaysWorkout)}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Iniciar
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {todaysWorkout.exercises.map((exerciseItem: any, index: number) => (
                          <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="font-medium">{exerciseItem.exercise?.name || exerciseItem.name}</p>
                                {(exerciseItem.exercise || exerciseItem).has_video && (
                                  <Play className="h-4 w-4 text-purple-600" />
                                )}
                              </div>
                              <p className="text-sm text-gray-600">
                                {exerciseItem.sets} series x {exerciseItem.reps} repeticiones
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Todos los Días del Programa */}
              <Card>
                <CardHeader>
                  <CardTitle>Rutina Semanal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(activeProgram.days || []).map((day: any, index: number) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">{day.day_name || day.name}</h3>
                          <Badge variant={day.is_rest_day ? "secondary" : "default"}>
                            {day.is_rest_day ? "Descanso" : "Entrenamiento"}
                          </Badge>
                        </div>
                        {!day.is_rest_day && (
                          <div className="space-y-1 text-sm text-gray-600">
                            <p>{day.exercises?.length || 0} ejercicios</p>
                            <p>Tiempo: ~{(day.exercises?.length || 0) * 3} min</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Dumbbell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No tienes un plan de entrenamiento</h3>
                <p className="text-gray-600 mb-6">
                  Selecciona una plantilla que se adapte a tus objetivos y comienza tu transformación
                </p>
                <Button
                  onClick={() => (document.querySelector('[value="templates"]') as HTMLElement | null)?.click()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Elegir Plantilla
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Pestaña Plantillas */}
        <TabsContent value="templates" className="space-y-6">
          {/* Filtros por Objetivo */}
          <Card>
            <CardHeader>
              <CardTitle>Filtrar por Objetivo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <Button
                  variant={selectedGoal === '' ? 'default' : 'outline'}
                  onClick={() => setSelectedGoal('')}
                  className="h-auto p-3 flex flex-col space-y-2"
                >
                  <span className="text-lg">⭐</span>
                  <span className="text-xs">Todos</span>
                </Button>
                {fitnessGoals.map((goal) => (
                  <Button
                    key={goal.id}
                    variant={selectedGoal === goal.id ? 'default' : 'outline'}
                    onClick={() => setSelectedGoal(goal.id)}
                    className="h-auto p-3 flex flex-col space-y-2"
                  >
                    <span className="text-lg">{goal.icon}</span>
                    <span className="text-xs">{goal.name}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Lista de Plantillas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template: any) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="mt-1">{template.description}</CardDescription>
                    </div>
                    <Badge variant="secondary">{template.difficulty}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium">{template.days_per_week} días/semana</div>
                        <div className="text-gray-600">Frecuencia</div>
                      </div>
                      <div>
                        <div className="font-medium">{template.duration_weeks} semanas</div>
                        <div className="text-gray-600">Duración</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-gray-500" />
                      <span className="text-sm capitalize">{template.goal}</span>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleCreateProgram(template)}
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Usar Plantilla
                      </Button>
                      <Button variant="outline" size="icon">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Pestaña Ejercicios */}
        <TabsContent value="exercises" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Biblioteca de Ejercicios</CardTitle>
              <CardDescription>
                Explora todos los ejercicios disponibles organizados por categoría
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {exercises.map((exercise: any) => (
                  <ExerciseCard key={exercise.id} exercise={exercise} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña Historial */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Entrenamientos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workoutLogs.map((log: any) => (
                  <div key={log.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div className="flex-1">
                      <p className="font-medium">{log.workout_day}</p>
                      <p className="text-sm text-gray-600">{log.date}</p>
                    </div>
                    <div className="text-sm text-gray-600">
                      {log.duration_minutes && `${log.duration_minutes} min`}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}



