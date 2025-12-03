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
  AlertCircle,
  Info,
  Sparkles,
  Zap,
  Heart,
  Clock,
  Star,
  Award,
  Bell,
  Settings,
  User,
  LogOut,
  Home,
  ChefHat,
  Medal,
  Eye,
  Edit
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"
import { useUserData } from "@/hooks/use-user-data"
import { useProgressStats } from "@/hooks/use-progress-stats"
import { useDailyMeals } from "@/hooks/use-daily-meals"
import { useWorkouts } from "@/hooks/use-workouts"
import { useProgressPhotos } from "@/hooks/use-progress-photos"

import { useAutoRefresh } from "@/hooks/use-auto-refresh"
import { useWeightHistory } from "@/hooks/use-weight-history"
import { ProgressSummaryEnhanced } from "./progress-summary-enhanced"
import { WorkoutSummaryEnhanced } from "./workout-summary-enhanced"
import { NutritionSummaryEnhanced } from "./nutrition-summary-enhanced"
import { PhotoCarousel } from "./photo-carousel"


import { toast } from "@/hooks/use-toast"

interface DashboardEnhancedProps {
  className?: string
}

export function DashboardEnhanced({ className }: DashboardEnhancedProps) {
  const { user, logout, isAuthenticated } = useAuth()
  const { userStats, loading: statsLoading, refreshStats } = useUserData()
  const { stats: progressStats, loading: progressStatsLoading, refreshStats: refreshProgressStats } = useProgressStats()
  const { meals: dailyMeals, macros, loading: mealsLoading } = useDailyMeals()
  const { workoutLogs, loading: workoutLoading } = useWorkouts()
  const { photos, loading: photosLoading, refreshPhotos, uploadPhoto } = useProgressPhotos()
  const { entries: weightEntries, loading: weightLoading, refresh: refreshWeight } = useWeightHistory()

  // Debug: verificar estado de autenticación
  console.log('🔐 Dashboard - Estado de autenticación:', {
    isAuthenticated,
    user: user ? { id: user.id, email: user.email, name: user.first_name } : null,
    hasAccessToken: typeof window !== 'undefined' ? !!document.cookie.includes('accessToken') : false
  })


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

  // Calcular métricas generales
  const overallProgress = progressStats?.overall_progress || 0
  
  // Calcular peso actual desde el historial más reciente (prioridad)
  // El peso del historial es más preciso que el del perfil
  const latestWeightEntry = weightEntries && weightEntries.length > 0 ? weightEntries[0] : null
  const firstWeightEntry = weightEntries && weightEntries.length > 0 ? weightEntries[weightEntries.length - 1] : null
  
  // Prioridad: historial de peso > estadísticas de progreso > peso del perfil
  const currentWeight = latestWeightEntry?.weight || progressStats?.weight?.current || user?.weight || userStats?.currentWeight || null
  const targetWeight = user?.target_weight || progressStats?.weight?.goal || userStats?.targetWeight || null
  
  // Calcular cambio de peso real desde el historial
  const weightChange = (latestWeightEntry && firstWeightEntry) 
    ? latestWeightEntry.weight - firstWeightEntry.weight 
    : (progressStats?.weight?.change || userStats?.weightChange || 0)
  
  const daysInTransformation = userStats?.daysInTransformation || 1

  // Calcular calorías del día
  const caloriesConsumed = macros.caloriesConsumed || 0
  const caloriesGoal = macros.caloriesGoal || 2000
  const caloriesProgress = Math.min((caloriesConsumed / caloriesGoal) * 100, 100)

  // Estadísticas de entrenamientos (calcular desde workoutLogs)
  const workoutsThisWeek = workoutLogs.filter(log => {
    const logDate = new Date(log.date)
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return logDate >= weekAgo
  }).length
  const workoutsGoal = 5
  const workoutProgress = workoutsGoal > 0 ? Math.round((workoutsThisWeek / workoutsGoal) * 100) : 0

  // Estadísticas de fotos
  const totalPhotos = progressStats?.photos.total || photos.length || 0
  const photosThisMonth = progressStats?.photos.this_month || 0

  // Función para refrescar todos los datos
  const handleRefreshAll = async () => {
    try {
      setIsRefreshing(true)
      
      // Refrescar todos los datos en paralelo
      await Promise.all([
        refreshStats(),
        refreshProgressStats(),
        refreshPhotos(),
        refreshWeight()
      ])
      
      setLastRefresh(new Date())
      toast({
        title: "Datos actualizados",
        description: "Tu dashboard ha sido actualizado correctamente.",
      })
    } catch (error) {
      console.error('Error refreshing dashboard:', error)
      toast({
        title: "Error",
        description: "No se pudieron actualizar todos los datos. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Auto-refresh cada 5 minutos para evitar rate limiting
  useAutoRefresh({
    interval: 300000, // 5 minutos
    enabled: true,
    onRefresh: handleRefreshAll,
    dependencies: [user?.id] // Solo cuando cambie el usuario
  })



  // Función para abrir diálogo de fotos
  const handleAddPhoto = () => {
    setIsPhotoDialogOpen(true)
  }

  // Función para manejar selección de archivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  // Función para subir foto
  const handleUploadPhoto = async () => {
    if (!selectedFile || !newPhotoWeight.trim()) {
      toast({
        title: "❌ Error",
        description: "Por favor selecciona una foto y especifica el peso actual.",
        variant: "destructive",
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
      
      toast({
        title: "✅ ¡Foto añadida!",
        description: "Tu nueva foto de progreso ha sido guardada correctamente.",
      })
      
      // Reset form
      setSelectedFile(null)
      setNewPhotoWeight("")
      setNewPhotoNotes("")
      setSelectedPhotoType('front')
      setIsPhotoDialogOpen(false)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
    } catch (error) {
      console.error('Error al subir foto:', error)
      toast({
        title: "❌ Error",
        description: `No se pudo subir la foto: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: "destructive",
      })
    }
  }

  // Función para resetear formulario de fotos
  const resetPhotoForm = () => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setNewPhotoWeight("")
    setNewPhotoNotes("")
    setSelectedPhotoType('front')
  }

  // Función para ver progreso completo
  const handleViewProgress = () => {
    toast({
      title: "Ver Progreso Completo",
      description: "Abriendo tu progreso detallado...",
    })
  }

  // Si está cargando, mostrar skeleton
  if (statsLoading || progressStatsLoading || mealsLoading || workoutLoading || photosLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Header skeleton */}
        <div className="text-center space-y-4 animate-pulse">
          <div className="mx-auto w-16 h-16 bg-muted rounded-2xl"></div>
          <div className="h-8 bg-muted rounded w-1/3 mx-auto"></div>
          <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
        </div>
        
        {/* Grid skeleton */}
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
    <div className={`space-y-6 ${className}`}>
      {/* Header del Dashboard */}
      <Card className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-emerald-200/50 shadow-lg mb-6">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-md animate-bounce">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-emerald-700">
              ¡Hola, {user?.first_name || 'Usuario'}! 👋
            </h1>
            <p className="text-emerald-600/80 max-w-2xl mx-auto">
              Llevas {daysInTransformation} día{daysInTransformation !== 1 ? 's' : ''} en tu transformación. 
              ¡Cada paso cuenta hacia tu objetivo!
            </p>
            
            {/* Botón de actualizar y estado de conexión */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <Button 
                onClick={handleRefreshAll}
                disabled={isRefreshing}
                variant="outline"
                size="sm"
                className="border-emerald-200 hover:bg-emerald-50"
              >
                {isRefreshing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualizar Datos
                  </>
                )}
              </Button>
              
              {/* Indicador de conexión en tiempo real */}
              <div className="flex items-center gap-2 text-xs text-emerald-600/70">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span>Datos en tiempo real</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Progreso General */}
        <Card className="bg-white/95 border-2 border-emerald-100/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] overflow-hidden">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center mx-auto shadow-md">
              <TrendingUp className="h-7 w-7 text-white" />
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-emerald-700">
                {Math.round(overallProgress)}%
              </div>
              <div className="text-sm font-medium text-emerald-600">Progreso General</div>
            </div>
            <div className="pt-2">
              <div className="relative h-2.5 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 transition-all duration-500"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Peso */}
        <Card className="bg-white/95 border-2 border-blue-100/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] overflow-hidden">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center mx-auto shadow-md">
              <Target className="h-7 w-7 text-white" />
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-blue-700">
                {currentWeight}kg
              </div>
              <div className="text-sm font-medium text-blue-600">Peso Actual</div>
            </div>
            {weightChange !== 0 && (
              <div className={`text-xs flex items-center justify-center gap-1.5 pt-1 ${
                weightChange < 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {weightChange < 0 ? (
                  <ArrowDown className="h-3.5 w-3.5" />
                ) : (
                  <ArrowUp className="h-3.5 w-3.5" />
                )}
                <span className="font-semibold">{Math.abs(weightChange).toFixed(1)}kg</span>
                <span className="text-muted-foreground">
                  {weightChange < 0 ? 'bajó' : 'subió'}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Entrenamientos */}
        <Card className="bg-white/95 border-2 border-purple-100/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] overflow-hidden">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center mx-auto shadow-md">
              <Dumbbell className="h-7 w-7 text-white" />
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-purple-700">
                {workoutsThisWeek}
              </div>
              <div className="text-sm font-medium text-purple-600">Esta Semana</div>
              <div className="text-xs text-muted-foreground">{workoutsGoal} objetivo</div>
            </div>
            <div className="pt-2">
              <div className="relative h-2.5 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-purple-400 to-pink-500 transition-all duration-500"
                  style={{ width: `${workoutProgress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calorías */}
        <Card className="bg-white/95 border-2 border-red-100/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] overflow-hidden">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-gradient-to-br from-red-400 to-orange-500 rounded-xl flex items-center justify-center mx-auto shadow-md">
              <Flame className="h-7 w-7 text-white" />
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-red-700">
                {caloriesConsumed}
              </div>
              <div className="text-sm font-medium text-red-600">Calorías Hoy</div>
              <div className="text-xs text-muted-foreground">{caloriesGoal} objetivo</div>
            </div>
            <div className="pt-2">
              <div className="relative h-2.5 bg-gradient-to-r from-red-100 to-orange-100 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-red-400 to-orange-500 transition-all duration-500"
                  style={{ width: `${caloriesProgress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contenido principal con tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Progreso
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

        {/* Tab de Resumen */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProgressSummaryEnhanced 
              onAddPhoto={handleAddPhoto}
              onViewProgress={handleViewProgress}
            />
            <WorkoutSummaryEnhanced />
          </div>
          <NutritionSummaryEnhanced />
        </TabsContent>

        {/* Tab de Progreso */}
        <TabsContent value="progress" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <PhotoCarousel
              photos={photos}
              loading={photosLoading}
              onUploadPhoto={handleAddPhoto}
              onRefreshPhotos={refreshPhotos}
            />
          </div>
        </TabsContent>

        {/* Tab de Entrenamientos */}
        <TabsContent value="workouts" className="space-y-6">
          <WorkoutSummaryEnhanced />
        </TabsContent>

        {/* Tab de Nutrición */}
        <TabsContent value="nutrition" className="space-y-6">
          <NutritionSummaryEnhanced />
        </TabsContent>
      </Tabs>



      {/* Dialog para subir foto */}
      <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Subir Foto de Progreso
            </DialogTitle>
            <DialogDescription>
              Añade una nueva foto para documentar tu progreso. También se registrará tu peso actual.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Selector de archivo */}
            <div className="space-y-2">
              <Label htmlFor="photo-upload">Seleccionar Foto</Label>
              <Input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
            </div>

            {/* Preview de la imagen */}
            {previewUrl && (
              <div className="space-y-2">
                <Label>Vista Previa</Label>
                <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Tipo de foto */}
            <div className="space-y-2">
              <Label htmlFor="photo-type">Tipo de Foto</Label>
              <select
                id="photo-type"
                value={selectedPhotoType}
                onChange={(e) => setSelectedPhotoType(e.target.value as 'front' | 'side' | 'back' | 'other')}
                className="w-full p-2 border border-gray-300 rounded-md"
                title="Seleccionar tipo de foto"
              >
                <option value="front">Frontal</option>
                <option value="side">Lateral</option>
                <option value="back">Posterior</option>
                <option value="other">Otra</option>
              </select>
            </div>

            {/* Peso actual */}
            <div className="space-y-2">
              <Label htmlFor="photo-weight">Peso Actual (kg) *</Label>
              <Input
                id="photo-weight"
                type="number"
                step="0.1"
                placeholder="Ej: 70.5"
                value={newPhotoWeight}
                onChange={(e) => setNewPhotoWeight(e.target.value)}
                required
              />
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label htmlFor="photo-notes">Notas (opcional)</Label>
              <Textarea
                id="photo-notes"
                placeholder="Añade cualquier comentario sobre esta foto..."
                value={newPhotoNotes}
                onChange={(e) => setNewPhotoNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsPhotoDialogOpen(false)
                resetPhotoForm()
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUploadPhoto}
              disabled={!selectedFile || !newPhotoWeight.trim()}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            >
              <Camera className="h-4 w-4 mr-2" />
              Subir Foto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Información de última actualización */}
      <div className="text-center text-xs text-muted-foreground">
        Última actualización: {lastRefresh.toLocaleTimeString('es-ES')}
      </div>
    </div>
  )
}
