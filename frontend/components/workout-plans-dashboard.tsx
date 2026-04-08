"use client"

import React, { useState } from 'react'
import { 
  Dumbbell, 
  Play, 
  Clock, 
  Target, 
  Calendar, 
  TrendingUp,
  Users,
  Award,
  Timer,
  CheckCircle,
  Star
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/use-toast'
import { useWorkouts, WorkoutProgram, WorkoutDay, WorkoutDayExercise } from '@/hooks/use-workouts'

interface WorkoutPlansDashboardProps {
  userProfile?: any
  onComplete?: () => void
}

export function WorkoutPlansDashboard({ userProfile, onComplete }: WorkoutPlansDashboardProps) {
  const { workoutPrograms, activeProgram, loading, activateProgram: activateProgramApi } = useWorkouts()
  const [activeTab, setActiveTab] = useState('my-plans')

  const getGoalDisplayName = (goal: string) => {
    const goalNames = {
      'weight_loss': 'Pérdida de Peso',
      'muscle_gain': 'Ganancia Muscular',
      'strength_building': 'Construcción de Fuerza',
      'endurance': 'Resistencia',
      'general_fitness': 'Fitness General'
    }
    return goalNames[goal as keyof typeof goalNames] || goal
  }

  const getLevelDisplayName = (level: string) => {
    const levelNames = {
      'beginner': 'Principiante',
      'intermediate': 'Intermedio',
      'advanced': 'Avanzado'
    }
    return levelNames[level as keyof typeof levelNames] || level
  }

  const getLevelColor = (level: string) => {
    const colors = {
      'beginner': 'bg-green-100 text-green-800',
      'intermediate': 'bg-yellow-100 text-yellow-800',
      'advanced': 'bg-red-100 text-red-800'
    }
    return colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const handleActivatePlan = async (plan: WorkoutProgram) => {
    try {
      await activateProgramApi(plan.id)
      toast({
        title: "Plan Activado",
        description: `El plan "${plan.name}" ha sido activado exitosamente`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo activar el plan",
        variant: "destructive"
      })
    }
  }

  const handleStartWorkout = (day: WorkoutDay) => {
    toast({
      title: "Iniciando Entrenamiento",
      description: `Comenzando ${day.day_name}`,
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
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

  return (
    <div className="space-y-6">
      {/* Header con información del usuario */}
      {userProfile && (
        <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-600" />
              Tu Perfil de Entrenamiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-purple-100 text-purple-800">
                Objetivo: {getGoalDisplayName(userProfile.main_goal)}
              </Badge>
              <Badge className="bg-blue-100 text-blue-800">
                Ubicación: {userProfile.training_location === 'home' ? 'Casa' : 'Gimnasio'}
              </Badge>
              <Badge className="bg-green-100 text-green-800">
                {userProfile.training_days_per_week} días/semana
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs para diferentes vistas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="my-plans">Mis Planes</TabsTrigger>
          <TabsTrigger value="available-plans">Planes Disponibles</TabsTrigger>
          <TabsTrigger value="active-plan">Plan Activo</TabsTrigger>
        </TabsList>

        {/* Tab: Mis Planes */}
        <TabsContent value="my-plans" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workoutPrograms.map((plan) => (
              <Card key={plan.id} className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {plan.description}
                      </CardDescription>
                    </div>
                    {plan.is_active && (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Activo
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge className={getLevelColor(plan.level)}>
                      {getLevelDisplayName(plan.level)}
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-800">
                      {getGoalDisplayName(plan.goal)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>{plan.days_per_week} días/sem</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-gray-500" />
                      <span>{plan.duration_weeks} semanas</span>
                    </div>
                  </div>

                  {!plan.is_active && (
                    <Button 
                      onClick={() => handleActivatePlan(plan)}
                      className="w-full bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white border-0"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Activar Plan
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab: Planes Disponibles */}
        <TabsContent value="available-plans" className="space-y-4">
          <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-600" />
                Planes Recomendados para Ti
              </CardTitle>
              <CardDescription>
                Basado en tu perfil y objetivos personales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workoutPrograms
                  .filter(plan => !plan.is_active)
                  .map((plan) => (
                    <Card key={plan.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-semibold">{plan.name}</h4>
                            <p className="text-sm text-gray-600">{plan.description}</p>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            <Badge className={getLevelColor(plan.level)}>
                              {getLevelDisplayName(plan.level)}
                            </Badge>
                            <Badge className="bg-blue-100 text-blue-800">
                              {getGoalDisplayName(plan.goal)}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                              {plan.days_per_week} días/sem • {plan.duration_weeks} semanas
                            </div>
                            <Button 
                              size="sm"
                              onClick={() => handleActivatePlan(plan)}
                              className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white border-0"
                            >
                              Activar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Plan Activo */}
        <TabsContent value="active-plan" className="space-y-4">
          {activeProgram ? (
            <div className="space-y-6">
              {/* Información del plan activo */}
              <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Dumbbell className="h-5 w-5 text-purple-600" />
                    {activeProgram.name}
                  </CardTitle>
                  <CardDescription>{activeProgram.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{activeProgram.days_per_week}</div>
                      <div className="text-sm text-gray-600">Días por semana</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{activeProgram.duration_weeks}</div>
                      <div className="text-sm text-gray-600">Semanas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{activeProgram.days?.length || 0}</div>
                      <div className="text-sm text-gray-600">Días de entrenamiento</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{getLevelDisplayName(activeProgram.level)}</div>
                      <div className="text-sm text-gray-600">Nivel</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Días de entrenamiento */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeProgram.days?.map((day) => (
                  <Card key={day.id} className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        {day.is_rest_day ? (
                          <Clock className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Dumbbell className="h-4 w-4 text-purple-600" />
                        )}
                        {day.day_name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {day.is_rest_day ? (
                        <div className="text-center py-4">
                          <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-600">Día de descanso activo</p>
                        </div>
                      ) : (
                        <>
                          <div className="text-sm text-gray-600">
                            {day.exercises.length} ejercicios
                          </div>
                          
                          <div className="space-y-2">
                            {day.exercises.slice(0, 3).map((exercise) => (
                              <div key={exercise.id} className="text-xs bg-gray-50 p-2 rounded">
                                <div className="font-medium">{exercise.exercise.name}</div>
                                <div className="text-gray-600">
                                  {exercise.sets} x {exercise.reps}
                                  {exercise.weight && ` @ ${exercise.weight}kg`}
                                </div>
                              </div>
                            ))}
                            {day.exercises.length > 3 && (
                              <div className="text-xs text-gray-500 text-center">
                                +{day.exercises.length - 3} ejercicios más
                              </div>
                            )}
                          </div>

                          <Button 
                            size="sm" 
                            className="w-full bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white border-0"
                            onClick={() => handleStartWorkout(day)}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Iniciar Entrenamiento
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
              <CardContent className="p-12 text-center">
                <Dumbbell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">No tienes un plan activo</h3>
                <p className="text-gray-600 mb-4">
                  Activa uno de tus planes de entrenamiento para comenzar tu rutina
                </p>
                <Button 
                  onClick={() => setActiveTab('my-plans')}
                  className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white border-0"
                >
                  Ver Mis Planes
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
