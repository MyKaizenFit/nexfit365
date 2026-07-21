"use client"

import Image from "next/image"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { 
  TrendingUp, 
  Target, 
  Calendar, 
  Trophy, 
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
import { Card, CardContent } from "@/components/ui/card"
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
import { useAutoRefresh } from "@/hooks/use-auto-refresh"
import { toast } from "@/hooks/use-toast"
import { buildApiUrl, getAuthHeaders } from "@/lib/api"
import { userService } from "@/lib/user-service"
import type { ProgressPhotoType } from "@/lib/progress-photo-types"
import {
  ContentReveal,
  DashboardHeroShell,
  QuickAccessCardSkeleton,
  StatCardSkeleton,
} from "@/components/dashboard/dashboard-skeletons"
import { Skeleton } from "@/components/ui/skeleton"

interface DashboardEnhancedProps {
  className?: string
}

export function DashboardEnhanced({ className }: DashboardEnhancedProps) {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const { userStats, loading: statsLoading, refreshStats } = useUserData()
  const { stats: progressStats, loading: progressStatsLoading, refreshStats: refreshProgressStats } = useProgressStats()

  // Estados locales
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [greeting, setGreeting] = useState("¡Hola")
  const [lastRefreshLabel, setLastRefreshLabel] = useState<string | null>(null)
  const [todayDate, setTodayDate] = useState("")
  const [birthdayMessage, setBirthdayMessage] = useState<string | null>(null)
  
  // Estados para subida de fotos
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedPhotoType, setSelectedPhotoType] = useState<ProgressPhotoType>('front')
  const [newPhotoWeight, setNewPhotoWeight] = useState("")
  const [newPhotoNotes, setNewPhotoNotes] = useState("")
  const [newPhotoDate, setNewPhotoDate] = useState("")
  const [photoUploading, setPhotoUploading] = useState(false)

  useEffect(() => {
    const now = new Date()
    const hour = now.getHours()
    if (hour < 12) setGreeting("¡Buenos días")
    else if (hour < 18) setGreeting("¡Buenas tardes")
    else setGreeting("¡Buenas noches")

    const dateLabel = now.toLocaleDateString("en-CA")
    setTodayDate(dateLabel)
    setNewPhotoDate(dateLabel)
    setLastRefreshLabel(now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }))
  }, [])

  useEffect(() => {
    const handleWeightUpdate = async () => {
      await Promise.all([refreshStats(), refreshProgressStats()])
    }

    window.addEventListener('weightUpdated', handleWeightUpdate)
    return () => window.removeEventListener('weightUpdated', handleWeightUpdate)
  }, [refreshStats, refreshProgressStats])

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return

    let cancelled = false
    const checkBirthday = async () => {
      try {
        const response = await fetch(buildApiUrl("notifications/birthday_status/"), {
        credentials: 'include',
          headers: getAuthHeaders(),
        })
        if (!response.ok) return

        const data = await response.json()
        if (!cancelled && data?.is_birthday) {
          const message = data.message || "¡Feliz cumpleaños! Todo el equipo te desea un día genial."
          setBirthdayMessage(message)

          const todayKey = new Date().toLocaleDateString("en-CA")
          const storageKey = `birthday-toast-${user.id}-${todayKey}`
          if (typeof window !== "undefined" && sessionStorage.getItem(storageKey) !== "shown") {
            toast({ title: "¡Feliz cumpleaños!", description: message })
            sessionStorage.setItem(storageKey, "shown")
          }
        }
      } catch {
      }
    }

    checkBirthday()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.id])

  const metrics = useMemo(() => {
    const entriesCount = progressStats?.weight?.entries_count ?? 0
    const hasTrackedWeightProgress = entriesCount >= 2
    const currentWeight =
      progressStats?.weight?.current ??
      userStats?.currentWeight ??
      user?.weight ??
      null
    const targetWeight =
      user?.target_weight ??
      progressStats?.weight?.goal ??
      userStats?.targetWeight ??
      null
    const weightChange = progressStats?.weight?.change ?? userStats?.weightChange ?? 0
    const weightProgress = hasTrackedWeightProgress
      ? Math.min(Math.max(progressStats?.weight?.progress || 0, 0), 100)
      : 0

    return {
      transformationProgress: weightProgress,
      hasTrackedWeightProgress,
      currentWeight,
      targetWeight,
      weightChange,
      daysInTransformation: userStats?.daysInTransformation || 1,
    }
  }, [progressStats, user, userStats])
  
  const { transformationProgress, hasTrackedWeightProgress, currentWeight, targetWeight, weightChange, daysInTransformation } = metrics

  const nutritionData = useMemo(() => {
    const caloriesConsumed = userStats?.caloriesToday ?? 0
    const caloriesGoal = userStats?.caloriesGoal ?? 2000
    const caloriesProgress =
      caloriesGoal > 0 ? Math.min(Math.max((caloriesConsumed / caloriesGoal) * 100, 0), 100) : 0

    return { caloriesConsumed, caloriesGoal, caloriesProgress }
  }, [userStats])
  
  const { caloriesConsumed, caloriesGoal, caloriesProgress } = nutritionData

  const workoutsThisWeek =
    userStats?.workoutsThisWeek ?? progressStats?.workouts?.this_week ?? 0
  
  // Usar objetivo de entrenamientos del plan (vía user-stats sincronizado con admin)
  const trainingData = useMemo(() => {
    const workoutsGoal = userStats?.workoutsGoal || 5
    const workoutProgress = workoutsGoal > 0 ? Math.min(Math.round((workoutsThisWeek / workoutsGoal) * 100), 100) : 0

    return {
      workoutsGoal,
      workoutProgress,
      remainingSessions: Math.max(0, workoutsGoal - workoutsThisWeek),
    }
  }, [userStats, workoutsThisWeek])

  const { workoutsGoal, workoutProgress, remainingSessions: remainingTrainingSessions } = trainingData

  const totalPhotos = progressStats?.photos.total ?? 0

  const progressMetricsLoading = progressStatsLoading
  const caloriesLoading = statsLoading
  const workoutsLoading = statsLoading
  const photosLoading = progressStatsLoading

  // Función para refrescar todos los datos
  const handleRefreshAll = async () => {
    try {
      setIsRefreshing(true)
      await Promise.all([refreshStats(), refreshProgressStats()])
      const now = new Date()
      setLastRefreshLabel(now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }))
      toast({
        title: "✅ Datos actualizados",
        description: "Inicio se ha actualizado correctamente.",
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
    if (photoUploading) return
    if (!selectedFile || !newPhotoWeight.trim()) {
      toast({
        title: "❌ Error",
        description: "Por favor selecciona una foto y especifica el peso.",
        variant: "destructive",
      })
      return
    }

    try {
      setPhotoUploading(true)
      const weight = parseFloat(newPhotoWeight)
      const idemKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`
      await userService.uploadProgressPhoto(
        selectedFile,
        weight,
        newPhotoNotes,
        selectedPhotoType,
        newPhotoDate,
        idemKey,
      )
      await refreshProgressStats()
      if (weight !== undefined && !isNaN(weight)) {
        window.dispatchEvent(new CustomEvent('weightUpdated', { detail: { weight } }))
      }
      toast({ title: "✅ ¡Foto añadida!", description: "Tu foto de progreso ha sido guardada." })
      setSelectedFile(null)
      setNewPhotoWeight("")
      setNewPhotoNotes("")
      setSelectedPhotoType('front')
      setNewPhotoDate(todayDate)
      setIsPhotoDialogOpen(false)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    } catch (error) {
      toast({
        title: "❌ Error",
        description: `No se pudo subir la foto: ${error instanceof Error ? error.message : 'Error'}`,
        variant: "destructive",
      })
    } finally {
      setPhotoUploading(false)
    }
  }

  const heroActions = (
    <div className="flex items-center gap-2 sm:gap-3">
      <Button
        onClick={handleRefreshAll}
        disabled={isRefreshing}
        variant="secondary"
        size="sm"
        className="bg-white/20 hover:bg-white/30 border-0 text-white backdrop-blur-sm"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
        <span className="hidden sm:inline">Actualizar</span>
      </Button>
      <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        <span className="text-xs text-white/90">Online</span>
      </div>
    </div>
  )

  const motivationalMessage = progressMetricsLoading ? (
    <Skeleton className="h-5 w-full max-w-lg bg-white/25" />
  ) : (
    <p className="text-white/90 text-sm sm:text-base flex items-center gap-2">
      <Zap className="h-5 w-5 text-yellow-300 flex-shrink-0" />
      <span>
        {transformationProgress >= 80
          ? "¡Increíble progreso! Estás cerca de tu objetivo 🎯"
          : transformationProgress >= 50
            ? "¡Vas por buen camino! Mantén el ritmo 🔥"
            : !hasTrackedWeightProgress
              ? "Registra tu peso para empezar a medir tu progreso real 📈"
              : "¡Cada día cuenta! Sigue adelante 💪"}
      </span>
    </p>
  )

  return (
    <div className={`flex flex-col space-y-6 sm:space-y-8 ${className}`}>
      <DashboardHeroShell
        greeting={greeting}
        userName={user?.first_name || "Campeón"}
        daysLoading={statsLoading && userStats == null}
        daysLabel={
          <p className="text-white/80 text-sm sm:text-base">
            Día {daysInTransformation} de tu transformación
          </p>
        }
        motivationalContent={motivationalMessage}
        actions={heroActions}
      />

      {birthdayMessage && (
        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-amber-900">¡Feliz cumpleaños!</p>
                <p className="text-sm text-amber-800">{birthdayMessage}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid - Métricas principales */}
      <div className="order-last grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Progreso General */}
        {progressMetricsLoading ? (
          <StatCardSkeleton />
        ) : (
          <ContentReveal>
            <Card className="group relative overflow-hidden border hover:shadow-xl dark:bg-card transition-all duration-300 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-200/30 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0 text-xs">
                    {hasTrackedWeightProgress && transformationProgress >= 50 ? "👍" : "📈"}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">{Math.round(transformationProgress)}%</p>
                  <p className="text-xs sm:text-sm text-emerald-500 dark:text-emerald-400 font-medium">Progreso Total</p>
                  <Progress value={transformationProgress} className="h-2 bg-emerald-500/20" />
                </div>
              </CardContent>
            </Card>
          </ContentReveal>
        )}

        {/* Peso Actual */}
        {progressMetricsLoading ? (
          <StatCardSkeleton />
        ) : (
          <ContentReveal>
            <Card className="group relative overflow-hidden border hover:shadow-xl dark:bg-card transition-all duration-300 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Scale className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  {hasTrackedWeightProgress && weightChange !== 0 && (
                    <Badge className={`border-0 text-xs ${weightChange < 0 ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-red-500/15 text-red-600 dark:text-red-400"}`}>
                      {weightChange < 0 ? "↓" : "↑"} {Math.abs(weightChange).toFixed(1)}kg
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">{currentWeight || "--"}kg</p>
                  <p className="text-xs sm:text-sm text-blue-500 dark:text-blue-400 font-medium">Peso Actual</p>
                  {targetWeight && (
                    <p className="text-xs text-blue-400 dark:text-blue-500">Objetivo: {targetWeight}kg</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </ContentReveal>
        )}

        {/* Entrenamientos */}
        {workoutsLoading ? (
          <StatCardSkeleton />
        ) : (
          <ContentReveal>
            <Card className="group relative overflow-hidden border hover:shadow-xl dark:bg-card transition-all duration-300 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-0 text-xs">
                    {workoutsThisWeek}/{workoutsGoal}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">{workoutsThisWeek}</p>
                  <p className="text-xs sm:text-sm text-purple-500 dark:text-purple-400 font-medium">Esta Semana</p>
                  <Progress value={workoutProgress} className="h-2 bg-purple-500/20" />
                </div>
              </CardContent>
            </Card>
          </ContentReveal>
        )}

        {/* Calorías */}
        {caloriesLoading ? (
          <StatCardSkeleton />
        ) : (
          <ContentReveal>
            <Card className="group relative overflow-hidden border hover:shadow-xl dark:bg-card transition-all duration-300 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border-0 text-xs">
                    {Math.round(caloriesProgress)}%
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">{caloriesConsumed}</p>
                  <p className="text-xs sm:text-sm text-orange-500 dark:text-orange-400 font-medium">Calorías Hoy</p>
                  <Progress value={caloriesProgress} className="h-2 bg-orange-500/20" />
                </div>
              </CardContent>
            </Card>
          </ContentReveal>
        )}
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Próximo Entrenamiento */}
        {workoutsLoading ? (
          <QuickAccessCardSkeleton className="bg-gradient-to-br from-purple-500/30 to-pink-500/30" />
        ) : (
          <ContentReveal>
            <Card className="border-0 bg-gradient-to-br from-purple-500 to-pink-500 text-white overflow-hidden">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Dumbbell className="h-5 w-5" />
                      <span className="font-medium text-sm">Entrenamientos</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold">
                      {workoutsThisWeek < workoutsGoal ? "¡A entrenar!" : "¡Meta cumplida!"}
                    </h3>
                    <p className="text-white/80 text-sm">
                      {remainingTrainingSessions > 0
                        ? `Te ${remainingTrainingSessions === 1 ? "falta" : "faltan"} ${remainingTrainingSessions} ${remainingTrainingSessions === 1 ? "sesión" : "sesiones"} esta semana`
                        : "Has completado tu objetivo semanal 🎉"}
                    </p>
                    <Button
                      size="sm"
                      className="bg-white/20 hover:bg-white/30 text-white border-0"
                      onClick={() => router.push("/dashboard?section=workouts-3")}
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
          </ContentReveal>
        )}

        {/* Fotos de Progreso */}
        {photosLoading ? (
          <QuickAccessCardSkeleton className="bg-gradient-to-br from-emerald-500/30 to-teal-500/30" />
        ) : (
          <ContentReveal>
            <Card className="border-0 bg-gradient-to-br from-emerald-500 to-teal-500 text-white overflow-hidden">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      <span className="font-medium text-sm">Tu Progreso</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold">
                      {totalPhotos} {totalPhotos === 1 ? "foto" : "fotos"}
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
          </ContentReveal>
        )}

        {/* Menús */}
        <Card className="border-0 bg-gradient-to-br from-orange-500 to-amber-500 text-white overflow-hidden">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Utensils className="h-5 w-5" />
                  <span className="font-medium text-sm">Menús</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold">Plan semanal</h3>
                <p className="text-white/80 text-sm">
                  Consulta tus comidas y opciones asignadas
                </p>
                <Button
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-0"
                  onClick={() => router.push('/dashboard?section=meals')}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Ir a menús
                </Button>
              </div>
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center">
                <Utensils className="w-10 h-10 text-white/80" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recetas */}
        <Card className="border-0 bg-gradient-to-br from-sky-500 to-cyan-500 text-white overflow-hidden">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ChefHat className="h-5 w-5" />
                  <span className="font-medium text-sm">Recetas</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold">Ideas rápidas</h3>
                <p className="text-white/80 text-sm">
                  Accede a recetas y preparaciones guardadas
                </p>
                <Button
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-0"
                  onClick={() => router.push('/dashboard?section=recipe-community')}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Ir a recetas
                </Button>
              </div>
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center">
                <ChefHat className="w-10 h-10 text-white/80" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer info */}
      <div className="text-center text-xs text-gray-400 py-2">
        {lastRefreshLabel ? `Última actualización: ${lastRefreshLabel}` : null}
      </div>

      {/* Dialog para subir foto */}
      <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Camera className="h-5 w-5 text-foreground" />
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
              <div className="relative w-full h-40 sm:h-48 bg-muted rounded-xl overflow-hidden">
                <Image fill src={previewUrl} alt="Preview" className="object-cover" />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="photo-type" className="text-sm font-medium">Tipo de Foto</Label>
              <select
                id="photo-type"
                value={selectedPhotoType}
                onChange={(e) => setSelectedPhotoType(e.target.value as ProgressPhotoType)}
                className="w-full p-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="front">Frontal</option>
                <option value="back">Espalda</option>
                <option value="left_side">Lateral izquierdo</option>
                <option value="right_side">Lateral derecho</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="photo-date" className="text-sm font-medium">Fecha de la foto</Label>
              <Input
                id="photo-date"
                type="date"
                max={todayDate || undefined}
                value={newPhotoDate}
                onChange={(e) => setNewPhotoDate(e.target.value)}
                className="text-sm"
              />
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
                setNewPhotoDate(todayDate)
              }}
              className="flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUploadPhoto}
              disabled={photoUploading || !selectedFile || !newPhotoWeight.trim()}
              className="flex-1 sm:flex-none bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              <Camera className="h-4 w-4 mr-2" />
              {photoUploading ? "Subiendo…" : "Subir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
