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
  RefreshCw,
  Activity,
  Dumbbell,
  Flame,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  Sparkles,
  Zap,
  Heart,
  Clock,
  Star,
  Award,
  ChefHat,
  Scale,
  Play,
  ArrowRight,
  Utensils
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/auth-context"
import { useUserData } from "@/hooks/use-user-data"
import { useProgressStats } from "@/hooks/use-progress-stats"
import { useDailyMeals } from "@/hooks/use-daily-meals"
import { formatMacro } from "@/lib/utils"
import { useWorkouts } from "@/hooks/use-workouts"
import { useProgressPhotos } from "@/hooks/use-progress-photos"
import { useAutoRefresh } from "@/hooks/use-auto-refresh"
import { useWeightHistory } from "@/hooks/use-weight-history"
import { useUserProfile } from "@/hooks/use-user-profile"
import { toast } from "@/hooks/use-toast"

interface DashboardEnhancedProps {
  className?: string
}

export function DashboardEnhanced({ className }: DashboardEnhancedProps) {
  const { user, isAuthenticated } = useAuth()
  const { userStats, loading: statsLoading, refreshStats } = useUserData()
  const { stats: progressStats, loading: progressStatsLoading, refreshStats: refreshProgressStats } = useProgressStats()
  const { meals: dailyMeals, macros, loading: mealsLoading } = useDailyMeals()
  const { workoutLogs, loading: workoutLoading } = useWorkouts()
  const { photos, loading: photosLoading, refreshPhotos, uploadPhoto } = useProgressPhotos()
  const { entries: weightEntries, loading: weightLoading, refresh: refreshWeight } = useWeightHistory()
  const { profile } = useUserProfile()

  // Estados locales
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  
  // Estados para subida de fotos
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedPhotoType, setSelectedPhotoType] = useState<'front' | 'side' | 'back' | 'other'>('front')
  const [newPhotoWeight, setNewPhotoWeight] = useState("")
  const [newPhotoNotes, setNewPhotoNotes] = useState("")

  // Calcular métricas
  const overallProgress = progressStats?.overall_progress || 0
  const latestWeightEntry = weightEntries && weightEntries.length > 0 ? weightEntries[0] : null
  const firstWeightEntry = weightEntries && weightEntries.length > 0 ? weightEntries[weightEntries.length - 1] : null
  const currentWeight = latestWeightEntry?.weight || progressStats?.weight?.current || user?.weight || userStats?.currentWeight || null
  const targetWeight = user?.target_weight || progressStats?.weight?.goal || userStats?.targetWeight || null
  const weightChange = (latestWeightEntry && firstWeightEntry) 
    ? latestWeightEntry.weight - firstWeightEntry.weight 
    : (progressStats?.weight?.change || userStats?.weightChange || 0)
  const daysInTransformation = userStats?.daysInTransformation || 1

  // Calcular calorías del día
  const caloriesConsumed = macros.caloriesConsumed || 0
  const caloriesGoal = macros.caloriesGoal || 2000
  const caloriesProgress = Math.min((caloriesConsumed / caloriesGoal) * 100, 100)

  // Calcular macros
  const proteinConsumed = macros.proteinConsumed || 0
  const proteinGoal = macros.proteinGoal || 150
  const carbsConsumed = macros.carbsConsumed || 0
  const carbsGoal = macros.carbsGoal || 200
  const fatConsumed = macros.fatConsumed || 0
  const fatGoal = macros.fatGoal || 70

  // Estadísticas de entrenamientos
  const workoutsThisWeek = workoutLogs.filter(log => {
    const logDate = new Date(log.date)
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return logDate >= weekAgo
  }).length
  
  // Usar los días de entrenamiento del perfil del usuario como objetivo semanal
  const trainingDays = profile?.training_days || []
  const workoutsGoal = trainingDays.length > 0 ? trainingDays.length : (profile?.training_days_per_week || 5)
  const workoutProgress = workoutsGoal > 0 ? Math.round((workoutsThisWeek / workoutsGoal) * 100) : 0
  
  // Calcular cuántas sesiones REALMENTE faltan esta semana (solo días de entrenamiento restantes)
  const getRemainingTrainingDays = () => {
    const today = new Date()
    const todayDayNumber = today.getDay() === 0 ? 7 : today.getDay() // 1=Lunes, 7=Domingo
    
    // Contar cuántos días de entrenamiento quedan en la semana (incluyendo hoy)
    const remainingDays = trainingDays.filter((day: number) => day >= todayDayNumber).length
    return remainingDays
  }
  const remainingTrainingSessions = Math.max(0, getRemainingTrainingDays() - workoutsThisWeek)

  // Estadísticas de fotos
  const totalPhotos = progressStats?.photos.total || photos.length || 0

  // Obtener saludo según la hora
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "¡Buenos días"
    if (hour < 18) return "¡Buenas tardes"
    return "¡Buenas noches"
  }

  // Función para refrescar todos los datos
  const handleRefreshAll = async () => {
    try {
      setIsRefreshing(true)
      await Promise.all([
        refreshStats(),
        refreshProgressStats(),
        refreshPhotos(),
        refreshWeight()
      ])
      setLastRefresh(new Date())
      toast({
        title: "✅ Datos actualizados",
        description: "Tu dashboard ha sido actualizado correctamente.",
      })
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudieron actualizar los datos.",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Auto-refresh cada 5 minutos
  useAutoRefresh({
    interval: 300000,
    enabled: true,
    onRefresh: handleRefreshAll,
    dependencies: [user?.id]
  })

  // Funciones de foto
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleUploadPhoto = async () => {
    if (!selectedFile || !newPhotoWeight.trim()) {
      toast({
        title: "❌ Error",
        description: "Por favor selecciona una foto y especifica el peso.",
        variant: "destructive",
      })
      return
    }

    try {
      const weight = parseFloat(newPhotoWeight)
      await uploadPhoto(selectedFile, weight, newPhotoNotes, selectedPhotoType)
      toast({ title: "✅ ¡Foto añadida!", description: "Tu foto de progreso ha sido guardada." })
      setSelectedFile(null)
      setNewPhotoWeight("")
      setNewPhotoNotes("")
      setIsPhotoDialogOpen(false)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    } catch (error) {
      toast({
        title: "❌ Error",
        description: `No se pudo subir la foto: ${error instanceof Error ? error.message : 'Error'}`,
        variant: "destructive",
      })
    }
  }

  // Loading state
  if (statsLoading || progressStatsLoading || mealsLoading || workoutLoading || photosLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center space-y-4 animate-pulse">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-orange-200 to-gray-200 rounded-3xl"></div>
          <div className="h-10 bg-gray-200 rounded-lg w-2/3 mx-auto"></div>
          <div className="h-6 bg-gray-100 rounded w-1/2 mx-auto"></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 sm:space-y-8 ${className}`}>
      {/* Hero Section - Saludo personalizado */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 p-6 sm:p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>
        
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                    {getGreeting()}, {user?.first_name || 'Campeón'}! 💪
                  </h1>
                  <p className="text-white/80 text-sm sm:text-base">
                    Día {daysInTransformation} de tu transformación
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <Button 
                onClick={handleRefreshAll}
                disabled={isRefreshing}
                variant="secondary"
                size="sm"
                className="bg-white/20 hover:bg-white/30 border-0 text-white backdrop-blur-sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Actualizar</span>
              </Button>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-white/90">Online</span>
              </div>
            </div>
          </div>

          {/* Mensaje motivacional */}
          <div className="mt-6 p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
            <p className="text-white/90 text-sm sm:text-base flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-300 flex-shrink-0" />
              <span>
                {overallProgress >= 80 
                  ? "¡Increíble progreso! Estás cerca de tu objetivo 🎯"
                  : overallProgress >= 50 
                  ? "¡Vas por buen camino! Mantén el ritmo 🔥"
                  : "¡Cada día cuenta! Sigue adelante 💪"}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid - Métricas principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Progreso General */}
        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50 to-teal-50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-200/30 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
                {overallProgress >= 50 ? '👍' : '📈'}
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-2xl sm:text-3xl font-bold text-emerald-700">{Math.round(overallProgress)}%</p>
              <p className="text-xs sm:text-sm text-emerald-600 font-medium">Progreso Total</p>
              <Progress value={overallProgress} className="h-2 bg-emerald-100" />
            </div>
          </CardContent>
        </Card>

        {/* Peso Actual */}
        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200/30 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Scale className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              {weightChange !== 0 && (
                <Badge className={`border-0 text-xs ${weightChange < 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {weightChange < 0 ? '↓' : '↑'} {Math.abs(weightChange).toFixed(1)}kg
                </Badge>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-bold text-blue-700">{currentWeight || '--'}kg</p>
              <p className="text-xs sm:text-sm text-blue-600 font-medium">Peso Actual</p>
              {targetWeight && (
                <p className="text-xs text-blue-500">Objetivo: {targetWeight}kg</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Entrenamientos */}
        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-200/30 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <Badge className="bg-purple-100 text-purple-700 border-0 text-xs">
                {workoutsThisWeek}/{workoutsGoal}
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-2xl sm:text-3xl font-bold text-purple-700">{workoutsThisWeek}</p>
              <p className="text-xs sm:text-sm text-purple-600 font-medium">Esta Semana</p>
              <Progress value={workoutProgress} className="h-2 bg-purple-100" />
            </div>
          </CardContent>
        </Card>

        {/* Calorías */}
        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-orange-50 to-red-50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-20 h-20 bg-orange-200/30 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">
                {Math.round(caloriesProgress)}%
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-2xl sm:text-3xl font-bold text-orange-700">{caloriesConsumed}</p>
              <p className="text-xs sm:text-sm text-orange-600 font-medium">Calorías Hoy</p>
              <Progress value={caloriesProgress} className="h-2 bg-orange-100" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Acciones rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Button 
          variant="outline" 
          className="h-auto py-4 sm:py-5 flex flex-col items-center gap-2 bg-white hover:bg-purple-50 border-2 border-purple-100 hover:border-purple-300 transition-all group"
          onClick={() => window.dispatchEvent(new CustomEvent('sectionChange', { detail: { section: 'workouts' } }))}
        >
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
            <Dumbbell className="h-5 w-5 text-gray-700" />
          </div>
          <span className="text-xs sm:text-sm font-medium text-purple-700">Entrenar</span>
        </Button>

        <Button 
          variant="outline" 
          className="h-auto py-4 sm:py-5 flex flex-col items-center gap-2 bg-white hover:bg-orange-50 border-2 border-orange-100 hover:border-orange-300 transition-all group"
          onClick={() => window.dispatchEvent(new CustomEvent('sectionChange', { detail: { section: 'meals' } }))}
        >
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center group-hover:bg-orange-200 transition-colors">
            <Utensils className="h-5 w-5 text-gray-700" />
          </div>
          <span className="text-xs sm:text-sm font-medium text-orange-700">Comidas</span>
        </Button>

        <Button 
          variant="outline" 
          className="h-auto py-4 sm:py-5 flex flex-col items-center gap-2 bg-white hover:bg-emerald-50 border-2 border-emerald-100 hover:border-emerald-300 transition-all group"
          onClick={() => window.dispatchEvent(new CustomEvent('sectionChange', { detail: { section: 'day-one' } }))}
        >
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
            <Camera className="h-5 w-5 text-gray-700" />
          </div>
          <span className="text-xs sm:text-sm font-medium text-emerald-700">Progreso</span>
        </Button>

        <Button 
          variant="outline" 
          className="h-auto py-4 sm:py-5 flex flex-col items-center gap-2 bg-white hover:bg-blue-50 border-2 border-blue-100 hover:border-blue-300 transition-all group"
          onClick={() => setIsPhotoDialogOpen(true)}
        >
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
            <Plus className="h-5 w-5 text-gray-700" />
          </div>
          <span className="text-xs sm:text-sm font-medium text-blue-700">Nueva Foto</span>
        </Button>
      </div>

      {/* Resumen de Macros */}
      <Card className="border-0 bg-gradient-to-br from-gray-50 to-white shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl">Macros del Día</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Tu balance nutricional de hoy</CardDescription>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-violet-600 hover:text-violet-700 hover:bg-violet-50"
              onClick={() => window.dispatchEvent(new CustomEvent('sectionChange', { detail: { section: 'meals' } }))}
            >
              Ver más <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 sm:gap-6">
            {/* Proteína */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto bg-red-100 rounded-2xl flex items-center justify-center">
                <span className="text-xl sm:text-2xl">🥩</span>
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold text-red-600">{formatMacro(proteinConsumed)}g</p>
                <p className="text-xs text-gray-500">de {formatMacro(proteinGoal)}g</p>
                <Progress value={(proteinConsumed/proteinGoal)*100} className="h-1.5 mt-2 bg-red-100" />
              </div>
              <p className="text-xs font-medium text-gray-600">Proteína</p>
            </div>

            {/* Carbohidratos */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto bg-amber-100 rounded-2xl flex items-center justify-center">
                <span className="text-xl sm:text-2xl">🍞</span>
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold text-amber-600">{formatMacro(carbsConsumed)}g</p>
                <p className="text-xs text-gray-500">de {formatMacro(carbsGoal)}g</p>
                <Progress value={(carbsConsumed/carbsGoal)*100} className="h-1.5 mt-2 bg-amber-100" />
              </div>
              <p className="text-xs font-medium text-gray-600">Carbos</p>
            </div>

            {/* Grasas */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto bg-green-100 rounded-2xl flex items-center justify-center">
                <span className="text-xl sm:text-2xl">🥑</span>
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold text-green-600">{formatMacro(fatConsumed)}g</p>
                <p className="text-xs text-gray-500">de {formatMacro(fatGoal)}g</p>
                <Progress value={(fatConsumed/fatGoal)*100} className="h-1.5 mt-2 bg-green-100" />
              </div>
              <p className="text-xs font-medium text-gray-600">Grasas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen de Actividad */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Próximo Entrenamiento */}
        <Card className="border-0 bg-gradient-to-br from-purple-500 to-pink-500 text-white overflow-hidden">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5" />
                  <span className="font-medium text-sm">Entrenamientos</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold">
                  {workoutsThisWeek < workoutsGoal ? '¡A entrenar!' : '¡Meta cumplida!'}
                </h3>
                <p className="text-white/80 text-sm">
                  {remainingTrainingSessions > 0 
                    ? `Te ${remainingTrainingSessions === 1 ? 'falta' : 'faltan'} ${remainingTrainingSessions} ${remainingTrainingSessions === 1 ? 'sesión' : 'sesiones'} esta semana`
                    : 'Has completado tu objetivo semanal 🎉'}
                </p>
                <Button 
                  size="sm" 
                  className="bg-white/20 hover:bg-white/30 text-white border-0"
                  onClick={() => window.dispatchEvent(new CustomEvent('sectionChange', { detail: { section: 'workouts' } }))}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Comenzar
                </Button>
              </div>
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center">
                <Trophy className="w-10 h-10 text-white/80" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fotos de Progreso */}
        <Card className="border-0 bg-gradient-to-br from-emerald-500 to-teal-500 text-white overflow-hidden">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  <span className="font-medium text-sm">Tu Progreso</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold">
                  {totalPhotos} {totalPhotos === 1 ? 'foto' : 'fotos'}
                </h3>
                <p className="text-white/80 text-sm">
                  Documenta tu transformación visual
                </p>
                <Button 
                  size="sm" 
                  className="bg-white/20 hover:bg-white/30 text-white border-0"
                  onClick={() => setIsPhotoDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir Foto
                </Button>
              </div>
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center">
                <Heart className="w-10 h-10 text-white/80" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer info */}
      <div className="text-center text-xs text-gray-400 py-2">
        Última actualización: {lastRefresh.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
      </div>

      {/* Dialog para subir foto */}
      <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Camera className="h-5 w-5 text-gray-700" />
              Nueva Foto de Progreso
            </DialogTitle>
            <DialogDescription className="text-sm">
              Documenta tu transformación visual
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="photo-upload" className="text-sm font-medium">Seleccionar Foto</Label>
              <Input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="cursor-pointer text-sm"
              />
            </div>

            {previewUrl && (
              <div className="relative w-full h-40 sm:h-48 bg-gray-100 rounded-xl overflow-hidden">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="photo-type" className="text-sm font-medium">Tipo de Foto</Label>
              <select
                id="photo-type"
                value={selectedPhotoType}
                onChange={(e) => setSelectedPhotoType(e.target.value as 'front' | 'side' | 'back' | 'other')}
                className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="front">Frontal</option>
                <option value="side">Lateral</option>
                <option value="back">Posterior</option>
                <option value="other">Otra</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="photo-weight" className="text-sm font-medium">Peso Actual (kg) *</Label>
              <Input
                id="photo-weight"
                type="number"
                step="0.1"
                placeholder="Ej: 70.5"
                value={newPhotoWeight}
                onChange={(e) => setNewPhotoWeight(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="photo-notes" className="text-sm font-medium">Notas (opcional)</Label>
              <Textarea
                id="photo-notes"
                placeholder="Comentarios sobre esta foto..."
                value={newPhotoNotes}
                onChange={(e) => setNewPhotoNotes(e.target.value)}
                rows={2}
                className="text-sm resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsPhotoDialogOpen(false)
                setSelectedFile(null)
                setPreviewUrl(null)
                setNewPhotoWeight("")
                setNewPhotoNotes("")
              }}
              className="flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUploadPhoto}
              disabled={!selectedFile || !newPhotoWeight.trim()}
              className="flex-1 sm:flex-none bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              <Camera className="h-4 w-4 mr-2" />
              Subir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
