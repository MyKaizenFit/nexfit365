"use client"

import { useState } from "react"
import { 
  TrendingUp, 
  Weight, 
  Camera, 
  Ruler, 
  Target,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  Calendar,
  Plus,
  Eye,
  Edit,
  Award,
  Activity
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useProgressStats } from "@/hooks/use-progress-stats"
import { useProgressPhotos } from "@/hooks/use-progress-photos"
import { useWeightHistory } from "@/hooks/use-weight-history"
import { useUserData } from "@/hooks/use-user-data"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/hooks/use-toast"

interface ProgressSummaryEnhancedProps {
  className?: string
  onAddWeight?: () => void
  onAddPhoto?: () => void
  onViewProgress?: () => void
}

export function ProgressSummaryEnhanced({ 
  className, 
  onAddWeight, 
  onAddPhoto, 
  onViewProgress 
}: ProgressSummaryEnhancedProps) {
  const { stats: progressStats, loading: statsLoading, refreshStats } = useProgressStats()
  const { photos, loading: photosLoading } = useProgressPhotos()
  const { entries: weightEntries, loading: weightLoading } = useWeightHistory()
  const { userStats, loading: userStatsLoading } = useUserData()

  // Calcular peso actual basándose en el historial más reciente
  const { user } = useAuth()
  const getCurrentWeight = () => {
    if (weightEntries && weightEntries.length > 0) {
      return weightEntries[0].weight // El más reciente
    }
    // Prioridad: peso del usuario > estadísticas > valor por defecto
    return user?.weight || progressStats?.weight.current || userStats?.currentWeight || null
  }
  
  const getWeightChange = () => {
    if (weightEntries && weightEntries.length >= 2) {
      const latest = weightEntries[0].weight
      const previous = weightEntries[1].weight
      return latest - previous
    }
    return progressStats?.weight.change || userStats?.weightChange || 0
  }
  
  const currentWeight = getCurrentWeight()
  const targetWeight = user?.target_weight || progressStats?.weight.goal || userStats?.targetWeight || null
  const weightChange = getWeightChange()
  const weightProgress = progressStats?.weight.progress || 0

  // Estadísticas de entrenamientos
  const workoutsThisWeek = progressStats?.workouts.this_week || userStats?.workoutsThisWeek || 0
  const workoutsGoal = progressStats?.workouts.goal_per_week || userStats?.workoutsGoal || 5
  const workoutProgress = progressStats?.workouts.progress || 0

  // Estadísticas de nutrición
  const mealsThisWeek = progressStats?.nutrition.meals_this_week || 0
  const nutritionGoal = progressStats?.nutrition.goal_per_week || 21
  const nutritionProgress = progressStats?.nutrition.progress || 0

  // Estadísticas de fotos
  const totalPhotos = progressStats?.photos.total || photos.length || 0
  const photosThisMonth = progressStats?.photos.this_month || 0

  // Progreso general
  const overallProgress = progressStats?.overall_progress || 0

  // Obtener la última entrada de peso
  const lastWeightEntry = weightEntries.length > 0 ? weightEntries[0] : null

  // Obtener la última foto
  const lastPhoto = photos.length > 0 ? photos[0] : null

  // Calcular días desde la última actualización
  const getDaysSinceLastUpdate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const handleRefreshData = async () => {
    try {
      await refreshStats()
      toast({
        title: "Datos actualizados",
        description: "Tu progreso ha sido actualizado correctamente.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron actualizar los datos. Inténtalo de nuevo.",
        variant: "destructive",
      })
    }
  }

  if (statsLoading || photosLoading || weightLoading || userStatsLoading) {
    return (
      <Card className={`backdrop-blur-sm bg-white/80 border-0 shadow-xl ${className}`}>
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

  return (
    <Card className={`backdrop-blur-sm bg-white/80 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.01] ${className}`}>
      <CardHeader className="p-2 sm:p-4 lg:p-6">
        <CardTitle className="text-xs sm:text-base lg:text-lg responsive-text bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent flex items-center gap-2">
          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
          Mi Progreso
        </CardTitle>
        <CardDescription className="text-[11px] sm:text-sm responsive-text text-gray-600">
          Tu transformación en números • {Math.round(overallProgress)}% de progreso general 📈
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-6 p-2 sm:p-4 lg:p-6 pt-0">
        {/* Progreso general */}
        <div className="text-center space-y-2 sm:space-y-4">
          <div className="text-xl sm:text-4xl font-bold text-emerald-600">
            {Math.round(overallProgress)}%
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">Progreso general</p>
          <Progress 
            value={overallProgress} 
            className="h-2.5 sm:h-4"
          />
          <div className="text-xs sm:text-sm text-muted-foreground">
            {overallProgress >= 80 ? "🎯 ¡Excelente progreso!" :
             overallProgress >= 60 ? "🚀 ¡Buen ritmo!" :
             overallProgress >= 40 ? "💪 ¡Sigue así!" :
             "🌟 ¡Cada paso cuenta!"}
          </div>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-4">
          {/* Peso */}
          <div className="p-2 sm:p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
            <div className="flex items-center justify-center mb-1">
              <Weight className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-sm sm:text-lg font-bold text-blue-700">{currentWeight}kg</div>
            <div className="text-xs text-blue-600">Peso actual</div>
            {weightChange !== 0 && (
              <div className={`text-xs flex items-center justify-center gap-1 mt-1 ${
                weightChange < 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {weightChange < 0 ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                {Math.abs(weightChange).toFixed(1)}kg
              </div>
            )}
          </div>

          {/* Entrenamientos */}
          <div className="p-2 sm:p-3 bg-purple-50 rounded-lg border border-purple-200 text-center">
            <div className="flex items-center justify-center mb-1">
              <Activity className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-sm sm:text-lg font-bold text-purple-700">{workoutsThisWeek}</div>
            <div className="text-xs text-purple-600">Esta semana</div>
            <div className="text-xs text-purple-600 mt-1">{workoutsGoal} objetivo</div>
          </div>

          {/* Nutrición */}
          <div className="p-2 sm:p-3 bg-red-50 rounded-lg border border-red-200 text-center">
            <div className="flex items-center justify-center mb-1">
              <Target className="h-4 w-4 text-red-600" />
            </div>
            <div className="text-sm sm:text-lg font-bold text-red-700">{mealsThisWeek}</div>
            <div className="text-xs text-red-600">Comidas</div>
            <div className="text-xs text-red-600 mt-1">{nutritionGoal} objetivo</div>
          </div>

          {/* Fotos */}
          <div className="p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200 text-center">
            <div className="flex items-center justify-center mb-1">
              <Camera className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-sm sm:text-lg font-bold text-green-700">{totalPhotos}</div>
            <div className="text-xs text-green-600">Fotos</div>
            <div className="text-xs text-green-600 mt-1">{photosThisMonth} este mes</div>
          </div>
        </div>

        {/* Progreso detallado */}
        <div className="space-y-3 sm:space-y-4">
          <h4 className="font-medium text-center text-sm sm:text-base">Progreso por Área</h4>
          
          {/* Peso */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Weight className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Peso</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-blue-600">
                  {Math.round(weightProgress)}%
                </span>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <Progress 
              value={weightProgress} 
              className="h-2"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{targetWeight}kg objetivo</span>
              <span>{currentWeight}kg actual</span>
            </div>
          </div>

          {/* Entrenamientos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Entrenamientos</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-purple-600">
                  {Math.round(workoutProgress)}%
                </span>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <Progress 
              value={workoutProgress} 
              className="h-2"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{workoutsGoal} objetivo semanal</span>
              <span>{workoutsThisWeek} completados</span>
            </div>
          </div>

          {/* Nutrición */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium">Nutrición</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-red-600">
                  {Math.round(nutritionProgress)}%
                </span>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <Progress 
              value={nutritionProgress} 
              className="h-2 bg-red-100"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{nutritionGoal} objetivo semanal</span>
              <span>{mealsThisWeek} comidas</span>
            </div>
          </div>
        </div>

        {/* Últimas actualizaciones */}
        <div className="space-y-3">
          <h4 className="font-medium text-center text-sm sm:text-base">Últimas Actualizaciones</h4>
          
          <div className="space-y-2">
            {/* Último peso */}
            {lastWeightEntry && (
              <div className="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Weight className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Peso registrado</div>
                    <div className="text-xs text-muted-foreground">
                      {lastWeightEntry.weight}kg • {new Date(lastWeightEntry.date).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">
                    Hace {getDaysSinceLastUpdate(lastWeightEntry.date)} días
                  </div>
                </div>
              </div>
            )}

            {/* Última foto */}
            {lastPhoto && (
              <div className="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Camera className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Foto de progreso</div>
                    <div className="text-xs text-muted-foreground">
                      {lastPhoto.photo_type} • {new Date(lastPhoto.date).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">
                    Hace {getDaysSinceLastUpdate(lastPhoto.date)} días
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botones de acción */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          <Button 
            onClick={onAddWeight}
            variant="outline"
            size="sm"
            className="bg-blue-50 hover:bg-blue-100 border-blue-200"
          >
            <Plus className="h-4 w-4 mr-1" />
            Peso
          </Button>
          <Button 
            onClick={onAddPhoto}
            variant="outline"
            size="sm"
            className="bg-green-50 hover:bg-green-100 border-green-200"
          >
            <Plus className="h-4 w-4 mr-1" />
            Foto
          </Button>
          <Button 
            onClick={onViewProgress}
            variant="outline"
            size="sm"
            className="bg-emerald-50 hover:bg-emerald-100 border-emerald-200 col-span-2 sm:col-span-1"
          >
            <Eye className="h-4 w-4 mr-1" />
            Ver Todo
          </Button>
        </div>

        {/* Botón de actualizar */}
        <Button 
          onClick={handleRefreshData}
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground hover:text-foreground"
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Actualizar Datos
        </Button>
      </CardContent>
    </Card>
  )
}
