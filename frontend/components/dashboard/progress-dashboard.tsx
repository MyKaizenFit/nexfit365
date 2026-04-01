"use client"

import { useState, useEffect } from "react"
import { 
  TrendingUp, 
  Target, 
  Calendar, 
  Trophy, 
  BarChart3, 
  Camera, 
  Plus,
  ChevronLeft,
  ChevronRight,
  Upload,
  X,
  Weight,
  Ruler,
  Heart,
  Zap,
  Clock,
  Star,
  RefreshCw,
  Activity,
  Dumbbell,
  Flame,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  AlertCircle,
  Info
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUserData } from "@/hooks/use-user-data"
import { useProgressPhotos } from "@/hooks/use-progress-photos"
import { useAuth } from "@/contexts/auth-context"
import { useDailyMeals } from "@/hooks/use-daily-meals"
import { useProgressStats } from "@/hooks/use-progress-stats"
import { useWeightHistory } from "@/hooks/use-weight-history"
import { useWorkouts } from "@/hooks/use-workouts"
import { WeightEntry } from "@/lib/progress-service"
import { WeightHistory } from "./weight-history"
import { NutritionSummary } from "./nutrition-summary"
import { PhotoCarousel } from "./photo-carousel"
import { WeightDialog } from "./weight-dialog"
import Image from "next/image"
import { toast } from "@/hooks/use-toast"


interface WorkoutSession {
  id: string
  date: string
  type: string
  duration: number
  calories: number
  completed: boolean
}

export function ProgressDashboard() {
  const { userStats, loading: statsLoading, refreshStats: refreshUserStats } = useUserData()
  const { photos, loading: photosLoading, error: photosError, uploadPhoto, deletePhoto, refreshPhotos } = useProgressPhotos()
  const { user } = useAuth()
  const { meals: dailyMeals, macros } = useDailyMeals()
  const { stats: progressStats, loading: progressStatsLoading, refreshStats } = useProgressStats()
  const { entries: weightEntries, loading: weightLoading, addEntry: addWeightEntry, updateEntry: updateWeightEntry } = useWeightHistory()
  
  // Calcular totales desde las macros
  const totalCalories = macros.caloriesConsumed
  const totalProtein = macros.proteinConsumed
  const totalCarbs = macros.carbsConsumed
  const totalFat = macros.fatConsumed
  
  // Asegurar que photos sea siempre un array
  const safePhotos = Array.isArray(photos) ? photos : []
  
  // Estados locales

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isWeightDialogOpen, setIsWeightDialogOpen] = useState(false)
  const [isMeasurementDialogOpen, setIsMeasurementDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedPhotoType, setSelectedPhotoType] = useState<'front' | 'side' | 'back' | 'other'>('front')
  const [newPhotoWeight, setNewPhotoWeight] = useState("")
  const [newPhotoNotes, setNewPhotoNotes] = useState("")
  
  // Nuevos estados para métricas
  const [editingWeightEntry, setEditingWeightEntry] = useState<WeightEntry | null>(null)
  const [newWeight, setNewWeight] = useState("")
  const [newWeightNotes, setNewWeightNotes] = useState("")
  const [newMeasurements, setNewMeasurements] = useState({
    chest: "",
    waist: "",
    hips: "",
    arms: "",
    thighs: "",
    notes: ""
  })

  // Funciones para manejar peso
  const handleAddWeight = async (weight: number, date: string, notes: string) => {
    try {
      await addWeightEntry(weight, date, notes)
      
      // Sincronizar todos los datos relacionados con peso
      await Promise.all([
        refreshUserStats(),    // Actualizar datos del usuario
        refreshStats(),        // Actualizar estadísticas de progreso
      ])
      
      toast({
        title: "Peso registrado",
        description: "Tu peso ha sido registrado exitosamente",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar el peso. Inténtalo de nuevo.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateWeight = async (id: string, weight: number, date: string, notes: string) => {
    try {
      await updateWeightEntry(id, weight, date, notes)
      
      // Sincronizar todos los datos relacionados con peso
      await Promise.all([
        refreshUserStats(),    // Actualizar datos del usuario
        refreshStats(),        // Actualizar estadísticas de progreso
      ])
      
      toast({
        title: "Peso actualizado",
        description: "Tu peso ha sido actualizado exitosamente",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el peso. Inténtalo de nuevo.",
        variant: "destructive",
      })
    }
  }

  const handleEditWeight = (entry: WeightEntry) => {
    setEditingWeightEntry(entry)
    setIsWeightDialogOpen(true)
  }

  const handleCloseWeightDialog = () => {
    setIsWeightDialogOpen(false)
    setEditingWeightEntry(null)
  }

  // Obtener workout logs reales
  const { workoutLogs } = useWorkouts()
  
  // Convertir workoutLogs a workoutSessions con nombres descriptivos
  const workoutSessions: WorkoutSession[] = workoutLogs.length > 0 ? workoutLogs.map((log) => {
    // Generar nombre descriptivo
    let workoutName = log.workout_day_name || 'Entrenamiento'
    
    // Si es un UUID, intentar generar nombre basado en la fecha
    if (!log.workout_day_name && log.workout_day && log.workout_day.length > 20) {
      const date = new Date(log.date)
      const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' })
      workoutName = `Entrenamiento ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}`
    }
    
    return {
      id: log.id,
      date: log.date,
      type: workoutName,
      duration: log.duration_minutes || 0,
      calories: 0, // No tenemos calorías en el log actualmente
      completed: log.completed
    }
  }) : []

  // Calcular peso actual basándose en el historial más reciente
  const getCurrentWeight = () => {
    if (weightEntries && weightEntries.length > 0) {
      return weightEntries[0].weight // El más reciente
    }
    // Prioridad: peso del usuario > estadísticas > valor por defecto
    return user?.weight || userStats?.currentWeight || null
  }
  
  const getWeightChange = () => {
    if (weightEntries && weightEntries.length >= 2) {
      const latest = weightEntries[0].weight
      const previous = weightEntries[1].weight
      return latest - previous
    }
    return userStats?.weightChange || 0
  }
  
  const currentWeight = getCurrentWeight()
  const weightChange = getWeightChange()
  const targetWeight = user?.target_weight || userStats?.targetWeight || null

  // Calcular calorías del día desde las comidas seleccionadas
  const caloriesFromMeals = totalCalories
  const caloriesGoal = userStats?.caloriesGoal || 2000
  const caloriesRemaining = Math.max(0, caloriesGoal - caloriesFromMeals)
  const caloriesProgress = Math.min((caloriesFromMeals / caloriesGoal) * 100, 100)



  // Manejo de archivos
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedFile(file)
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
      } else {
        toast({
          title: "❌ Error",
          description: "Por favor selecciona un archivo de imagen válido.",
        })
      }
    }
  }

  const handleUploadPhoto = async () => {
    if (!selectedFile || !newPhotoWeight.trim()) {
      toast({
        title: "❌ Error",
        description: "Por favor selecciona una foto y especifica el peso actual.",
      })
      return
    }

    try {
      const weight = parseFloat(newPhotoWeight)
      if (isNaN(weight) || weight <= 0) {
        toast({
          title: "❌ Error",
          description: "Por favor ingresa un peso válido mayor a 0.",
          variant: "destructive",
        })
        return
      }
      
      await uploadPhoto(selectedFile, weight, newPhotoNotes, selectedPhotoType)
      
      // Agregar automáticamente el peso al historial
      try {
        await addWeightEntry(weight, new Date().toISOString().split('T')[0], `Peso registrado al subir foto de progreso${newPhotoNotes ? `: ${newPhotoNotes}` : ''}`)
        // Refrescar estadísticas de progreso
        refreshStats()
        toast({
          title: "✅ ¡Foto y peso registrados!",
          description: "Tu foto de progreso y peso han sido registrados correctamente.",
        })
      } catch (weightError) {
        toast({
          title: "✅ ¡Foto añadida!",
          description: "Tu nueva foto de progreso ha sido guardada correctamente.",
        })
      }
      
      // Reset form
      setSelectedFile(null)
      setNewPhotoWeight("")
      setNewPhotoNotes("")
      setSelectedPhotoType('front')
      setIsUploadDialogOpen(false)
      setPreviewUrl(null)
    } catch (error) {
      toast({
        title: "❌ Error",
        description: `No se pudo subir la foto: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: "destructive",
      })
    }
  }



  const resetUploadForm = () => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setNewPhotoWeight("")
    setNewPhotoNotes("")
    setSelectedPhotoType('front')
  }

  // Calcular días en transformación
  const daysInTransformation = userStats?.daysInTransformation || 1
  const nextReview = userStats?.nextReview || 'Próximamente'

  // Si aún no hay datos o está cargando, mostrar skeleton
  if (statsLoading || photosLoading || !user) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4 animate-in slide-in-from-top-8 duration-700">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center animate-pulse">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Tu Progreso Increíble 📈
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-24">
      {/* Header del Progreso */}
      <div className="text-center space-y-3 animate-in slide-in-from-top-8 duration-700">
        <div className="mx-auto w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center animate-bounce">
          <TrendingUp className="w-7 h-7 md:w-8 md:h-8 text-white" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
          Histórico de Tu Progreso 📈
        </h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs md:text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5 md:gap-2">
            <Weight className="h-4 w-4" />
            <span>
              {currentWeight ? `${currentWeight} kg` : 'Sin registro'}
              {targetWeight && ` → Objetivo: ${targetWeight} kg`}
            </span>
          </div>
          <span className="hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5 md:gap-2">
            <Calendar className="h-4 w-4" />
            <span>{daysInTransformation} día{daysInTransformation !== 1 ? 's' : ''} en transformación</span>
          </div>
        </div>
      </div>

      {/* Resumen de Cambios Recientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
        {/* Cambio de Peso Reciente */}
        {weightEntries.length > 0 && (
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-900 flex items-center gap-2">
                <Weight className="h-4 w-4" />
                Último Cambio de Peso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-blue-700">{weightEntries[0].weight} kg</span>
                  {weightEntries.length > 1 && (
                    <span className={`text-sm font-semibold ${weightEntries[0].weight - weightEntries[1].weight > 0 ? 'text-red-600' : weightEntries[0].weight - weightEntries[1].weight < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                      {weightEntries[0].weight - weightEntries[1].weight > 0 ? '+' : ''}{(weightEntries[0].weight - weightEntries[1].weight).toFixed(1)} kg
                    </span>
                  )}
                </div>
                <p className="text-xs text-blue-600">
                  {new Date(weightEntries[0].date).toLocaleDateString('es-ES', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </p>
                {targetWeight && (
                  <p className="text-xs text-blue-500 mt-1">
                    Objetivo: {targetWeight} kg
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Última Foto */}
        {safePhotos.length > 0 && (
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-purple-900 flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Última Foto de Progreso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-xs text-purple-600">
                  {new Date(safePhotos[0].date).toLocaleDateString('es-ES', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </div>
                {safePhotos[0].weight && (
                  <p className="text-sm font-semibold text-purple-700">
                    Peso: {safePhotos[0].weight} kg
                  </p>
                )}
                <p className="text-xs text-purple-500">
                  {safePhotos.length} foto{safePhotos.length !== 1 ? 's' : ''} en total
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Último Entrenamiento */}
        {workoutSessions.length > 0 && workoutSessions.some(s => s.completed) && (
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-emerald-900 flex items-center gap-2">
                <Dumbbell className="h-4 w-4" />
                Último Entrenamiento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {workoutSessions.filter(s => s.completed).slice(0, 1).map((session) => (
                  <div key={session.id}>
                    <p className="text-sm font-semibold text-emerald-700 truncate">
                      {session.type && session.type.length > 30 
                        ? session.type.substring(0, 30) + '...'
                        : session.type || 'Entrenamiento'}
                    </p>
                    <p className="text-xs text-emerald-600">
                      {new Date(session.date).toLocaleDateString('es-ES', { 
                        day: 'numeric', 
                        month: 'long' 
                      })}
                      {session.duration > 0 && ` • ${session.duration} min`}
                    </p>
                  </div>
                ))}
                <p className="text-xs text-emerald-500 mt-1">
                  {workoutSessions.filter(s => s.completed).length} completado{workoutSessions.filter(s => s.completed).length !== 1 ? 's' : ''} esta semana
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Días en Transformación */}
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-amber-900 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Días en transformación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-amber-700">{daysInTransformation}</p>
              <p className="text-xs text-amber-600">día{daysInTransformation !== 1 ? 's' : ''} de tu viaje</p>
            </div>
          </CardContent>
        </Card>

        {/* Total de Registros */}
        <Card className="bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-indigo-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Registros Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="font-semibold text-indigo-700">{weightEntries.length}</p>
                  <p className="text-indigo-600">Pesos</p>
                </div>
                <div>
                  <p className="font-semibold text-indigo-700">{safePhotos.length}</p>
                  <p className="text-indigo-600">Fotos</p>
                </div>
                <div>
                  <p className="font-semibold text-indigo-700">{workoutSessions.filter(s => s.completed).length}</p>
                  <p className="text-indigo-600">Entrenamientos</p>
                </div>
                <div>
                  <p className="font-semibold text-indigo-700">{dailyMeals.filter(m => m.selectedOption).length}</p>
                  <p className="text-indigo-600">Comidas hoy</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs principales */}
      <Tabs defaultValue="photos" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="photos" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Fotos
          </TabsTrigger>
          <TabsTrigger value="weight" className="flex items-center gap-2">
            <Weight className="h-4 w-4" />
            Peso
          </TabsTrigger>
          <TabsTrigger value="workouts" className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Entrenamientos
          </TabsTrigger>
          <TabsTrigger value="nutrition" className="flex items-center gap-2">
            <Flame className="h-4 w-4" />
            Nutrición
          </TabsTrigger>
        </TabsList>

        {/* Tab de Fotos */}
        <TabsContent value="photos" className="space-y-6">
          <PhotoCarousel
            photos={safePhotos}
            loading={photosLoading}
            onUploadPhoto={() => setIsUploadDialogOpen(true)}
            onRefreshPhotos={refreshPhotos}
          />
          

        </TabsContent>

        {/* Tab de Peso */}
        <TabsContent value="weight" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Seguimiento de Peso */}
            <WeightHistory
              onAddWeight={() => setIsWeightDialogOpen(true)}
            />

            {/* Próxima Revisión */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  Próxima Revisión
                </CardTitle>
                <CardDescription>Tu evaluación de progreso</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Star className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-lg font-semibold text-purple-700">{nextReview}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Mantén tu consistencia para obtener los mejores resultados
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Días en transformación</span>
                    <span className="font-bold text-purple-600">{daysInTransformation}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Entrenamientos esta semana</span>
                    <span className="font-bold text-purple-600">
                      {userStats?.workoutsThisWeek || 0} / {userStats?.workoutsGoal || 5}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab de Entrenamientos */}
        <TabsContent value="workouts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-purple-600" />
                Histórico de Entrenamientos
              </CardTitle>
              <CardDescription>Tu actividad física y progreso a lo largo del tiempo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Resumen de la semana */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-700">
                      {userStats?.workoutsThisWeek || 0}
                    </div>
                    <div className="text-xs text-purple-600">Esta semana</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-700">
                      {workoutSessions.filter(s => s.completed).length}
                    </div>
                    <div className="text-xs text-purple-600">Total completados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-700">
                      {userStats?.workoutsGoal || 5}
                    </div>
                    <div className="text-xs text-purple-600">Objetivo semanal</div>
                  </div>
                </div>

                {/* Histórico de entrenamientos - Ordenados por fecha (más recientes primero) */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Últimos entrenamientos</h4>
                  {workoutSessions.length > 0 ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {workoutSessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {session.completed ? (
                              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">
                                {session.type && session.type.length > 36 
                                  ? (session.type.includes('-') 
                                      ? session.type.split('-').slice(1).join('-').trim() || session.type
                                      : `Entrenamiento ${new Date(session.date).toLocaleDateString('es-ES', { weekday: 'long' })}`)
                                  : (session.type || `Entrenamiento ${new Date(session.date).toLocaleDateString('es-ES', { weekday: 'long' })}`)}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                {new Date(session.date).toLocaleDateString('es-ES', { 
                                  day: 'numeric', 
                                  month: 'short', 
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                                {session.duration > 0 && (
                                  <>
                                    <span>•</span>
                                    <Clock className="h-3 w-3" />
                                    <span>{session.duration} min</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <Badge 
                            variant={session.completed ? "default" : "secondary"}
                            className={`flex-shrink-0 ${session.completed ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0" : ""}`}
                          >
                            {session.completed ? "Completado" : "Pendiente"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No hay entrenamientos registrados</p>
                      <p className="text-sm">Comienza registrando tus entrenamientos</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

                {/* Tab de Nutrición */}
        <TabsContent value="nutrition" className="space-y-6">
          <NutritionSummary
            caloriesConsumed={caloriesFromMeals}
            caloriesGoal={caloriesGoal}
            proteinConsumed={totalProtein}
            proteinGoal={macros.proteinGoal}
            carbsConsumed={totalCarbs}
            carbsGoal={macros.carbsGoal}
            fatConsumed={totalFat}
            fatGoal={macros.fatGoal}
            dailyMeals={dailyMeals}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog para subir foto */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Subir Nueva Foto de Progreso</DialogTitle>
            <DialogDescription>
              Selecciona una foto y especifica tu peso actual para registrar tu progreso.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Selección de archivo */}
            <div>
              <Label htmlFor="photo-upload">Seleccionar Foto</Label>
              <div className="mt-2">
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  title="Seleccionar foto de progreso"
                  aria-label="Seleccionar foto de progreso"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('photo-upload')?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {selectedFile ? selectedFile.name : "Seleccionar archivo"}
                </Button>
              </div>
            </div>

            {/* Tipo de foto */}
            <div>
              <Label htmlFor="photo-type">Tipo de Foto</Label>
              <Select value={selectedPhotoType} onValueChange={(value: any) => setSelectedPhotoType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo de foto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="front">Frontal</SelectItem>
                  <SelectItem value="side">Lateral</SelectItem>
                  <SelectItem value="back">Espalda</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preview de la imagen */}
            {previewUrl && (
              <div className="relative">
                <Label>Vista previa:</Label>
                <div className="mt-2 relative inline-block">
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    width={120}
                    height={160}
                    className="rounded-lg object-cover border"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={resetUploadForm}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white hover:bg-red-600"
                    aria-label="Eliminar foto"
                    title="Eliminar foto"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Campo de peso */}
            <div>
              <Label htmlFor="weight">Peso Actual (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                placeholder="Ej: 75.5"
                value={newPhotoWeight}
                onChange={(e) => setNewPhotoWeight(e.target.value)}
                className="mt-2"
              />
            </div>

            {/* Campo de notas */}
            <div>
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Comentarios sobre tu progreso..."
                value={newPhotoNotes}
                onChange={(e) => setNewPhotoNotes(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetUploadForm()
                  setIsUploadDialogOpen(false)
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleUploadPhoto}
                disabled={!selectedFile || !newPhotoWeight.trim()}
                className="flex-1"
              >
                Subir Foto
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para agregar/editar peso */}
      <WeightDialog
        open={isWeightDialogOpen}
        onOpenChange={handleCloseWeightDialog}
        onSave={handleAddWeight}
        entry={editingWeightEntry}
        onUpdate={handleUpdateWeight}
      />
    </div>
  )
}
