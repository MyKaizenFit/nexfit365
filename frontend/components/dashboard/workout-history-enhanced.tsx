"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Check, Clock, Award, Calendar, TrendingUp, 
  BarChart3, Target, Zap, Weight, Repeat,
  ChevronDown, ChevronUp, Eye, Dumbbell
} from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { WorkoutLog } from "@/hooks/use-workouts"

interface WorkoutHistoryEnhancedProps {
  workoutLogs: WorkoutLog[]
}

interface ExerciseStats {
  exercise_id: string
  exercise_name: string
  pr: number // Personal Record - máximo peso
  rem: number // Repeticiones Máximas
  totalVolume: number // Tonelaje total
  lastDate: string
  occurrences: number
}

interface TonnageData {
  date: string
  tonnage: number
  exercises: number
}

export function WorkoutHistoryEnhanced({ workoutLogs }: WorkoutHistoryEnhancedProps) {
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const [selectedTimeRange, setSelectedTimeRange] = useState<'week' | 'month' | 'all'>('month')

  // Filtrar logs completados y ordenar por fecha
  const completedLogs = useMemo(() => {
    return workoutLogs
      .filter(log => log.completed)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [workoutLogs])

  // Calcular PR y REM por ejercicio
  const exerciseStats = useMemo(() => {
    const stats: Record<string, ExerciseStats> = {}

    completedLogs.forEach(log => {
      // Usar exercises_data si está disponible
      const exercisesData = (log as any).exercises_data || []
      
      exercisesData.forEach((exerciseData: any) => {
        const exerciseId = exerciseData.exercise_id || exerciseData.exercise?.id || 'unknown'
        const exerciseName = exerciseData.exercise_name || exerciseData.exercise?.name || 'Ejercicio desconocido'
        const sets = exerciseData.sets || []

        if (!stats[exerciseId]) {
          stats[exerciseId] = {
            exercise_id: exerciseId,
            exercise_name: exerciseName,
            pr: 0,
            rem: 0,
            totalVolume: 0,
            lastDate: log.date,
            occurrences: 0
          }
        }

        // Calcular PR (máximo peso) y REM (máximo reps)
        let maxWeight = stats[exerciseId].pr
        let maxReps = stats[exerciseId].rem
        let volume = 0

        sets.forEach((set: any) => {
          if (set.completed && set.weight && set.reps) {
            const weight = parseFloat(set.weight) || 0
            const reps = parseInt(set.reps) || 0
            
            if (weight > maxWeight) maxWeight = weight
            if (reps > maxReps) maxReps = reps
            
            // Tonelaje = Peso * Repeticiones (por serie)
            volume += weight * reps
          }
        })

        stats[exerciseId].pr = maxWeight
        stats[exerciseId].rem = maxReps
        stats[exerciseId].totalVolume += volume
        stats[exerciseId].occurrences += 1
        if (new Date(log.date) > new Date(stats[exerciseId].lastDate)) {
          stats[exerciseId].lastDate = log.date
        }
      })
    })

    return Object.values(stats).sort((a, b) => b.totalVolume - a.totalVolume)
  }, [completedLogs])

  // Calcular datos de tonelaje para gráficas
  const tonnageData = useMemo(() => {
    const dataMap: Record<string, { tonnage: number; exercises: number }> = {}

    completedLogs.forEach(log => {
      const date = log.date
      const exercisesData = (log as any).exercises_data || []
      
      let dayTonnage = 0
      let exerciseCount = 0

      exercisesData.forEach((exerciseData: any) => {
        const sets = exerciseData.sets || []
        let exerciseVolume = 0

        sets.forEach((set: any) => {
          if (set.completed && set.weight && set.reps) {
            const weight = parseFloat(set.weight) || 0
            const reps = parseInt(set.reps) || 0
            exerciseVolume += weight * reps
          }
        })

        if (exerciseVolume > 0) {
          dayTonnage += exerciseVolume
          exerciseCount++
        }
      })

      if (dayTonnage > 0) {
        if (!dataMap[date]) {
          dataMap[date] = { tonnage: 0, exercises: 0 }
        }
        dataMap[date].tonnage += dayTonnage
        dataMap[date].exercises += exerciseCount
      }
    })

    // Convertir a array y ordenar por fecha
    const data: TonnageData[] = Object.entries(dataMap)
      .map(([date, values]) => ({
        date,
        tonnage: Math.round(values.tonnage),
        exercises: values.exercises
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Filtrar por rango de tiempo
    const now = new Date()
    let filteredData = data

    if (selectedTimeRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      filteredData = data.filter(d => new Date(d.date) >= weekAgo)
    } else if (selectedTimeRange === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      filteredData = data.filter(d => new Date(d.date) >= monthAgo)
    }

    return filteredData
  }, [completedLogs, selectedTimeRange])

  // Calcular estadísticas generales
  const totalTonnage = useMemo(() => {
    return tonnageData.reduce((sum, d) => sum + d.tonnage, 0)
  }, [tonnageData])

  const averageTonnage = useMemo(() => {
    return tonnageData.length > 0 ? Math.round(totalTonnage / tonnageData.length) : 0
  }, [tonnageData, totalTonnage])

  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(logId)) {
        newSet.delete(logId)
      } else {
        newSet.add(logId)
      }
      return newSet
    })
  }

  const getExerciseDetails = (log: any) => {
    const exercisesData = log.exercises_data || []
    return exercisesData.map((exerciseData: any) => {
      const sets = exerciseData.sets || []
      let exerciseTonnage = 0
      let completedSets = 0
      let maxWeight = 0
      let maxReps = 0

      sets.forEach((set: any) => {
        if (set.completed && set.weight && set.reps) {
          const weight = parseFloat(set.weight) || 0
          const reps = parseInt(set.reps) || 0
          exerciseTonnage += weight * reps
          completedSets++
          if (weight > maxWeight) maxWeight = weight
          if (reps > maxReps) maxReps = reps
        }
      })

      return {
        name: exerciseData.exercise_name || 'Ejercicio desconocido',
        sets: completedSets,
        tonnage: Math.round(exerciseTonnage),
        pr: maxWeight,
        rem: maxReps,
        setsData: sets.filter((s: any) => s.completed)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas generales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
          <CardHeader className="pb-3">
            <CardDescription>Total Entrenamientos</CardDescription>
            <CardTitle className="text-3xl">{completedLogs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
          <CardHeader className="pb-3">
            <CardDescription>Tonelaje Total</CardDescription>
            <CardTitle className="text-3xl">{totalTonnage.toLocaleString()} kg</CardTitle>
          </CardHeader>
        </Card>
        <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
          <CardHeader className="pb-3">
            <CardDescription>Tonelaje Promedio</CardDescription>
            <CardTitle className="text-3xl">{averageTonnage.toLocaleString()} kg</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="history" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="history">Historial</TabsTrigger>
          <TabsTrigger value="pr-rem">PR & REM</TabsTrigger>
          <TabsTrigger value="tonnage">Tonelaje</TabsTrigger>
        </TabsList>

        {/* Tab Historial */}
        <TabsContent value="history" className="space-y-4">
          {completedLogs.length === 0 ? (
            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No hay entrenamientos completados aún</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {completedLogs.map((log) => {
                const isExpanded = expandedLogs.has(log.id)
                const exerciseDetails = getExerciseDetails(log)
                const logTonnage = exerciseDetails.reduce((sum, ex) => sum + ex.tonnage, 0)

                return (
                  <Card key={log.id} className="backdrop-blur-sm bg-white/80 border-0 shadow-xl hover:shadow-2xl transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-medium">
                                {format(new Date(log.date), "EEEE, d 'de' MMMM yyyy", { locale: es })}
                              </div>
                              {log.workout_day_name && (
                                <Badge variant="outline" className="text-xs">
                                  {log.workout_day_name}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {log.duration_minutes && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {log.duration_minutes} min
                                </span>
                              )}
                              {logTonnage > 0 && (
                                <span className="flex items-center gap-1">
                                  <Weight className="h-3 w-3" />
                                  {logTonnage.toLocaleString()} kg
                                </span>
                              )}
                              {exerciseDetails.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Dumbbell className="h-3 w-3" />
                                  {exerciseDetails.length} ejercicios
                                </span>
                              )}
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleLogExpansion(log.id)}
                            className="h-8 w-8 p-0"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {isExpanded && exerciseDetails.length > 0 && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          <h4 className="font-semibold text-sm mb-2">Ejercicios realizados:</h4>
                          {exerciseDetails.map((exercise, idx) => (
                            <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">{exercise.name}</span>
                                <div className="flex items-center gap-3 text-xs">
                                  {exercise.pr > 0 && (
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                      PR: {exercise.pr} kg
                                    </Badge>
                                  )}
                                  {exercise.rem > 0 && (
                                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                      REM: {exercise.rem}
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    {exercise.tonnage} kg
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-xs text-gray-600 space-y-1">
                                {exercise.setsData.map((set: any, setIdx: number) => (
                                  <div key={setIdx} className="flex items-center gap-2">
                                    <span>Serie {setIdx + 1}:</span>
                                    {set.weight && <span>{set.weight} kg</span>}
                                    {set.reps && <span>× {set.reps} reps</span>}
                                    {set.weight && set.reps && (
                                      <span className="text-gray-400">
                                        = {Math.round(parseFloat(set.weight) * parseInt(set.reps))} kg
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                          {log.notes && (
                            <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-gray-700">
                              <strong>Notas:</strong> {log.notes}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab PR & REM */}
        <TabsContent value="pr-rem" className="space-y-4">
          {exerciseStats.length === 0 ? (
            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
              <CardContent className="p-8 text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No hay datos suficientes para calcular PR y REM</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* PR (Personal Records) */}
              <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Personal Records (PR)
                  </CardTitle>
                  <CardDescription>Máximo peso levantado por ejercicio</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {exerciseStats
                      .filter(ex => ex.pr > 0)
                      .sort((a, b) => b.pr - a.pr)
                      .slice(0, 20)
                      .map((exercise) => (
                        <div key={exercise.exercise_id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{exercise.exercise_name}</div>
                            <div className="text-xs text-gray-600">
                              {format(new Date(exercise.lastDate), "dd MMM yyyy", { locale: es })}
                            </div>
                          </div>
                          <Badge className="bg-blue-600 text-white">
                            {exercise.pr} kg
                          </Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* REM (Repeticiones Máximas) */}
              <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Repeat className="h-5 w-5 text-purple-600" />
                    Repeticiones Máximas (REM)
                  </CardTitle>
                  <CardDescription>Máximo número de repeticiones por ejercicio</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {exerciseStats
                      .filter(ex => ex.rem > 0)
                      .sort((a, b) => b.rem - a.rem)
                      .slice(0, 20)
                      .map((exercise) => (
                        <div key={exercise.exercise_id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{exercise.exercise_name}</div>
                            <div className="text-xs text-gray-600">
                              {format(new Date(exercise.lastDate), "dd MMM yyyy", { locale: es })}
                            </div>
                          </div>
                          <Badge className="bg-purple-600 text-white">
                            {exercise.rem} reps
                          </Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Tab Tonelaje */}
        <TabsContent value="tonnage" className="space-y-4">
          <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                    Evolución del Tonelaje
                  </CardTitle>
                  <CardDescription>
                    Tonelaje = Peso × Series × Repeticiones
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={selectedTimeRange === 'week' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedTimeRange('week')}
                  >
                    Semana
                  </Button>
                  <Button
                    variant={selectedTimeRange === 'month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedTimeRange('month')}
                  >
                    Mes
                  </Button>
                  <Button
                    variant={selectedTimeRange === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedTimeRange('all')}
                  >
                    Todo
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {tonnageData.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay datos de tonelaje disponibles</p>
                </div>
              ) : (
                <ChartContainer
                  config={{
                    tonnage: {
                      label: "Tonelaje (kg)",
                      color: "hsl(142, 76%, 36%)"
                    }
                  }}
                  className="h-[400px]"
                >
                  <LineChart data={tonnageData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), "dd MMM", { locale: es })}
                      className="text-xs"
                    />
                    <YAxis 
                      label={{ value: 'Tonelaje (kg)', angle: -90, position: 'insideLeft' }}
                      className="text-xs"
                    />
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as TonnageData
                          return (
                            <div className="bg-white p-3 border rounded-lg shadow-lg">
                              <p className="font-semibold mb-1">
                                {format(new Date(data.date), "EEEE, d 'de' MMMM", { locale: es })}
                              </p>
                              <p className="text-sm text-green-600">
                                Tonelaje: {data.tonnage.toLocaleString()} kg
                              </p>
                              <p className="text-xs text-gray-600">
                                Ejercicios: {data.exercises}
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="tonnage" 
                      stroke="hsl(142, 76%, 36%)"
                      strokeWidth={3}
                      dot={{ r: 5, fill: "hsl(142, 76%, 36%)" }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Gráfica de barras de tonelaje */}
          {tonnageData.length > 0 && (
            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  Tonelaje por Entrenamiento
                </CardTitle>
                <CardDescription>Comparación visual del tonelaje diario</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    tonnage: {
                      label: "Tonelaje (kg)",
                      color: "hsl(24, 95%, 53%)"
                    }
                  }}
                  className="h-[300px]"
                >
                  <BarChart data={tonnageData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), "dd MMM", { locale: es })}
                      className="text-xs"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      label={{ value: 'Tonelaje (kg)', angle: -90, position: 'insideLeft' }}
                      className="text-xs"
                    />
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as TonnageData
                          return (
                            <div className="bg-white p-3 border rounded-lg shadow-lg">
                              <p className="font-semibold mb-1">
                                {format(new Date(data.date), "EEEE, d 'de' MMMM", { locale: es })}
                              </p>
                              <p className="text-sm text-orange-600">
                                Tonelaje: {data.tonnage.toLocaleString()} kg
                              </p>
                              <p className="text-xs text-gray-600">
                                Ejercicios: {data.exercises}
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar 
                      dataKey="tonnage" 
                      fill="hsl(24, 95%, 53%)"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

