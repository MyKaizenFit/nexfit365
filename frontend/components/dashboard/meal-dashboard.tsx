'use client'

import React, { useState, lazy, Suspense, useMemo, memo, useRef, useCallback, useEffect } from 'react'
import { useDailyMeals } from '@/hooks/use-daily-meals'
import { DailyMacroTrackerSimple } from './daily-macro-tracker-simple'
import { MealSelectionModal } from './meal-selection-modal'
import { SkipMealModal } from './skip-meal-modal'
import { MealOption, RecipeExclusionItem, nutritionService } from '@/lib/nutrition-service'
import { Check, Clock, Plus, Utensils, Cloud, Target, ChefHat, RefreshCw, Flame, Calendar, Camera, Loader2, Trash2, Ban } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUserData } from '@/hooks/use-user-data'
import { getAuthHeaders, buildApiUrl } from '@/lib/api'
import { toast } from '@/hooks/use-toast'

const WeeklyMealPlan = lazy(() => import('@/app/dashboard/components/weekly-meal-plan').then(module => ({ default: module.WeeklyMealPlan })))

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Desayuno',
  lunch: 'Comida',
  snack: 'Merienda',
  dinner: 'Cena',
}

function SkippedHistoryTab({
  todaySkipped,
  history,
  loading,
  onRefresh,
}: {
  todaySkipped: Array<{ id: string; name: string; mealType: string; skipReason?: string | null; selectedOption?: { name: string } | null }>
  history: Array<{ id: string; date: string; meal_type: string; custom_description: string; skip_reason: string }>
  loading: boolean
  onRefresh: () => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const pastHistory = history.filter(h => h.date !== today)

  return (
    <div className="space-y-6">
      {/* Hoy */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-amber-400 to-orange-400 rounded-lg flex items-center justify-center">
              <span className="text-sm">⏭️</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm md:text-base">Saltadas hoy</h3>
              <p className="text-xs text-gray-500">{todaySkipped.length} comida{todaySkipped.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {todaySkipped.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <span className="text-3xl block mb-2">✅</span>
            <p className="text-sm">No has saltado ninguna comida hoy</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todaySkipped.map(meal => (
              <div key={meal.id} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <span className="text-lg mt-0.5">⏭️</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {meal.selectedOption?.name || meal.name}
                  </p>
                  <p className="text-[10px] text-gray-500 capitalize">{MEAL_TYPE_LABELS[meal.mealType] || meal.mealType}</p>
                  {meal.skipReason && (
                    <p className="text-xs text-amber-700 mt-1 italic">"{meal.skipReason}"</p>
                  )}
                </div>
                <span className="text-[10px] text-amber-500 font-medium flex-shrink-0">Hoy</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial últimos 30 días */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-gray-400 to-gray-500 rounded-lg flex items-center justify-center">
              <span className="text-sm">📋</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm md:text-base">Historial (30 días)</h3>
              <p className="text-xs text-gray-500">{pastHistory.length} entrada{pastHistory.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 touch-manipulation"
          >
            {loading ? '⟳ Cargando...' : '↻ Actualizar'}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500" />
          </div>
        ) : pastHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <span className="text-3xl block mb-2">🎉</span>
            <p className="text-sm">Sin comidas saltadas en los últimos 30 días</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pastHistory.map(entry => (
              <div key={entry.id} className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                <span className="text-lg mt-0.5">⏭️</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{entry.custom_description || '—'}</p>
                  <p className="text-[10px] text-gray-500 capitalize">
                    {MEAL_TYPE_LABELS[entry.meal_type] || entry.meal_type}
                  </p>
                  {entry.skip_reason && (
                    <p className="text-xs text-gray-500 mt-1 italic">"{entry.skip_reason}"</p>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 flex-shrink-0 text-right">
                  {new Date(entry.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function MealDashboard() {
  const { meals, macros, loading, syncing, selectMealOption, markMealCompleted, markMealAsNotEaten, getMealOptions, uploadMealPhoto } = useDailyMeals()
  const { userStats, refreshStats } = useUserData()
  const [selectedMeal, setSelectedMeal] = useState<{
    id: string
    name: string
    time: string
    mealType: string
    currentSelection?: {
      optionId?: string | null
      recipeId?: string | null
    }
  } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [skipModalMeal, setSkipModalMeal] = useState<{ id: string; name: string } | null>(null)
  const [skippedHistory, setSkippedHistory] = useState<Array<{
    id: string
    date: string
    meal_type: string
    custom_description: string
    skip_reason: string
  }>>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [recipeExclusions, setRecipeExclusions] = useState<RecipeExclusionItem[]>([])
  const [loadingExclusions, setLoadingExclusions] = useState(false)
  const [removingExclusionId, setRemovingExclusionId] = useState<string | null>(null)

  const loadRecipeExclusions = useCallback(async () => {
    setLoadingExclusions(true)
    try {
      const exclusions = await nutritionService.getRecipeExclusions()
      setRecipeExclusions(exclusions)
    } finally {
      setLoadingExclusions(false)
    }
  }, [])

  const handleRemoveExclusion = useCallback(async (exclusionId: string) => {
    setRemovingExclusionId(exclusionId)
    try {
      const ok = await nutritionService.removeRecipeExclusion(exclusionId)
      if (ok) {
        setRecipeExclusions(prev => prev.filter(e => e.id !== exclusionId))
      }
    } finally {
      setRemovingExclusionId(null)
    }
  }, [])

  const handleClearAllExclusions = useCallback(async () => {
    const ids = recipeExclusions.map(e => e.id)
    for (const id of ids) {
      await nutritionService.removeRecipeExclusion(id)
    }
    setRecipeExclusions([])
  }, [recipeExclusions])

  const loadSkippedHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const headers = await getAuthHeaders()
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const from = thirtyDaysAgo.toISOString().split('T')[0]
      const url = buildApiUrl(`nutrition/meallogs/?is_skipped=true&date__gte=${from}&ordering=-date`)
      const res = await fetch(url, { headers })
      if (res.ok) {
        const data = await res.json()
        setSkippedHistory(Array.isArray(data) ? data : (data.results ?? []))
      }
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  const handlePhotoUpload = useCallback(async (mealId: string, file: File) => {
    setUploadingPhotoId(mealId)
    try {
      await uploadMealPhoto(mealId, file)
    } finally {
      setUploadingPhotoId(null)
    }
  }, [uploadMealPhoto])

  const handleOpenMealOptions = (meal: { id: string; name: string; time: string; mealType: string }) => {
    const fullMeal = meals.find((item) => item.id === meal.id)
    setSelectedMeal({
      ...meal,
      currentSelection: {
        optionId: fullMeal?.selectedOption?.id ? String(fullMeal.selectedOption.id) : null,
        recipeId: fullMeal?.selectedOption?.recipeId ? String(fullMeal.selectedOption.recipeId) : null,
      },
    })
    setIsModalOpen(true)
  }

  const handleSelectOption = async (option: MealOption) => {
    if (selectedMeal) {
      await selectMealOption(selectedMeal.id, option)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedMeal(null)
  }

  // Calcular progreso del día con useMemo
  const progressData = useMemo(() => {
    const completedMeals = meals.filter(meal => meal.selectedOption).length
    const totalMeals = meals.length
    const progressPercentage = totalMeals > 0 ? (completedMeals / totalMeals) * 100 : 0
    return {
      completedMeals,
      totalMeals,
      progressPercentage,
      daysInTransformation: userStats?.daysInTransformation || 1
    }
  }, [meals, userStats?.daysInTransformation])
  
  const { completedMeals, totalMeals, progressPercentage, daysInTransformation } = progressData

  // Función para refrescar datos
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshStats()
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSkipMeal = (mealId: string) => {
    const meal = meals.find((m) => m.id === mealId)
    if (meal) setSkipModalMeal({ id: mealId, name: meal.selectedOption?.name || meal.name })
  }

  const handleSkipConfirm = async (reason: string, excludeFromRecommendations: boolean) => {
    if (!skipModalMeal) return
    const mealName = skipModalMeal.name
    setSkipModalMeal(null)
    const ok = await markMealAsNotEaten(skipModalMeal.id, reason, excludeFromRecommendations)
    if (ok) {
      if (excludeFromRecommendations) {
        toast({
          title: '🚫 Receta excluida',
          description: `"${mealName}" no aparecerá en futuras sugerencias. Puedes reactivarla en el tab "No como".`,
        })
        // Refrescar la lista de exclusiones si ya estaba cargada
        if (recipeExclusions.length > 0 || loadingExclusions) {
          loadRecipeExclusions()
        }
      } else {
        toast({
          title: '⏭️ Comida saltada',
          description: `"${mealName}" marcada como no comida hoy.`,
        })
      }
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-4">
      {/* Hero Section - Tarjeta de Nutrición */}
      <Card className="backdrop-blur-sm bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 border-0 shadow-xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-200/20 to-amber-200/20"></div>
        <CardHeader className="text-center relative z-10 p-4 md:p-6">
          <div className="flex justify-end mb-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-gray-600 hover:text-gray-900 h-8 md:h-9 text-xs md:text-sm"
            >
              <RefreshCw className={`h-3 w-3 md:h-4 md:w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
          <div className="mx-auto w-16 h-16 md:w-24 md:h-24 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mb-3 md:mb-4 shadow-2xl animate-pulse">
            <ChefHat className="h-8 w-8 md:h-12 md:w-12 text-white" />
          </div>
          <CardTitle className="text-xl md:text-3xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent">
            Plan Nutricional 🍽️
          </CardTitle>
          <CardDescription className="text-sm md:text-base mt-2 text-gray-700">
            Tu alimentación equilibrada para alcanzar tus objetivos
          </CardDescription>
          {daysInTransformation > 0 && (
            <Badge className="mt-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs md:text-sm">
              <Flame className="h-3 w-3 mr-1" />
              {daysInTransformation} días en tu transformación
            </Badge>
          )}
          {/* Barra de progreso de comidas */}
          {totalMeals > 0 && (
            <div className="mt-3 md:mt-4 space-y-1.5 md:space-y-2">
              <Progress value={progressPercentage} className="h-2 md:h-3 bg-orange-100" />
              <div className="flex items-center justify-center gap-2 text-xs md:text-sm text-gray-600">
                <Flame className="h-3 w-3 md:h-4 md:w-4 text-orange-500" />
                <span className="font-medium">
                  {completedMeals} de {totalMeals} comidas completadas
                </span>
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Tabs para vista diaria y semanal */}
      <Tabs defaultValue="daily" className="w-full" onValueChange={(v) => {
        if (v === 'saltadas' && skippedHistory.length === 0 && !loadingHistory) loadSkippedHistory()
        if (v === 'exclusiones' && recipeExclusions.length === 0 && !loadingExclusions) loadRecipeExclusions()
      }}>
        <TabsList className="grid w-full grid-cols-5 h-auto p-1">
          <TabsTrigger value="daily" className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm py-2 md:py-2.5">
            <Clock className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Vista </span>Diaria
          </TabsTrigger>
          <TabsTrigger value="weekly" className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm py-2 md:py-2.5">
            <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Vista </span>Semanal
          </TabsTrigger>
          <TabsTrigger value="fotos" className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm py-2 md:py-2.5">
            <Camera className="h-3.5 w-3.5 md:h-4 md:w-4" />
            Fotos
          </TabsTrigger>
          <TabsTrigger value="saltadas" className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm py-2 md:py-2.5">
            <span className="text-sm">⏭️</span>
            <span className="hidden sm:inline">Saltadas</span>
            <span className="sm:hidden">Skip</span>
          </TabsTrigger>
          <TabsTrigger value="exclusiones" className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm py-2 md:py-2.5">
            <Ban className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">No como</span>
            <span className="sm:hidden">🚫</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          {/* Progreso Detallado del Día - Movido a la parte superior */}
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Target className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg md:text-xl font-bold text-gray-900">Progreso Detallado del Día</h3>
            <p className="text-xs md:text-sm text-gray-500">Seguimiento de tus macros y objetivos</p>
          </div>
        </div>
        
        <DailyMacroTrackerSimple
          caloriesConsumed={macros.caloriesConsumed}
          caloriesGoal={macros.caloriesGoal}
          proteinConsumed={macros.proteinConsumed}
          proteinGoal={macros.proteinGoal}
          carbsConsumed={macros.carbsConsumed}
          carbsGoal={macros.carbsGoal}
          fatConsumed={macros.fatConsumed}
          fatGoal={macros.fatGoal}
        />
      </div>

      {/* Comidas del día */}
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Utensils className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg md:text-xl font-bold text-gray-900">Plan de Comidas del Día</h3>
              <p className="text-xs md:text-sm text-gray-500">Selecciona tus opciones preferidas</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] md:text-xs text-gray-500 bg-gray-50 px-2 md:px-3 py-1.5 md:py-2 rounded-lg self-start sm:self-auto">
            <Cloud className="w-3 h-3" />
            <span className="hidden sm:inline">Sincronizado en la nube</span>
            <span className="sm:hidden">Sincronizado</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {meals.map((meal) => (
            <div
              key={meal.id}
              className={`group relative border-2 rounded-xl p-4 md:p-6 transition-all duration-300 ${
                meal.selectedOption
                  ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg shadow-green-100'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-lg hover:shadow-blue-50'
              }`}
            >
              {/* Indicador de estado */}
              {meal.selectedOption && (
                <div className="absolute -top-2 -right-2 md:-top-3 md:-right-3 w-7 h-7 md:w-8 md:h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <Check className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
              )}

              {/* Header de la comida */}
              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center text-xl md:text-2xl flex-shrink-0 ${
                  meal.selectedOption 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {meal.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 text-base md:text-lg truncate">{meal.name}</h4>
                  <p className="text-xs md:text-sm text-gray-500 flex items-center gap-1.5 md:gap-2">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    <span>{meal.time}</span>
                  </p>
                </div>
              </div>

              {/* Descripción */}
              <p className="text-xs md:text-sm text-gray-600 mb-3 md:mb-4 leading-relaxed line-clamp-2">{meal.description}</p>

              {/* Comida seleccionada o botón */}
              {meal.selectedOption ? (
                <div className="space-y-3 md:space-y-4">
                  {/* Tarjeta de comida seleccionada */}
                  <div className={`bg-white rounded-lg p-3 md:p-4 border shadow-sm ${
                    meal.isCompleted 
                      ? 'border-green-200 bg-green-50/30' 
                      : 'border-blue-200 bg-blue-50/30'
                  }`}>
                    <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                      {meal.selectedOption.imageUrl ? (
                        <img
                          src={meal.selectedOption.imageUrl}
                          alt={meal.selectedOption.name}
                          className="w-7 h-7 md:w-8 md:h-8 rounded-md object-cover border border-gray-200 flex-shrink-0"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement
                            img.style.display = 'none'
                            const sibling = img.nextElementSibling as HTMLElement
                            if (sibling) sibling.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        meal.isCompleted ? 'bg-green-100' : 'bg-blue-100'
                      }${meal.selectedOption.imageUrl ? ' hidden' : ''}`}>
                        <span className="text-base md:text-lg">{meal.selectedOption.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-semibold text-gray-900 text-xs md:text-sm truncate">
                          {meal.selectedOption.name}
                        </h5>
                        <p className="text-[10px] md:text-xs text-gray-500">
                          {meal.isCompleted ? '✅ Completada' : meal.isSkipped ? '⏭️ Saltada (no como)' : '📋 Seleccionada'}
                        </p>
                      </div>
                    </div>

                    {meal.isSkipped ? (
                      <div className="mb-2">
                        <Badge variant="outline" className="text-[10px] md:text-xs border-amber-300 text-amber-700">
                          No se contará en macros de hoy
                        </Badge>
                        {meal.skipReason ? (
                          <p className="text-[10px] md:text-xs text-amber-700 mt-1">Motivo: {meal.skipReason}</p>
                        ) : null}
                      </div>
                    ) : null}
                    
                    {/* Macros de la comida seleccionada */}
                    <div className="grid grid-cols-3 gap-2 md:gap-3">
                      <div className="text-center bg-orange-50 rounded-lg p-1.5 md:p-2">
                        <div className="font-bold text-orange-600 text-base md:text-lg">
                          {meal.selectedOption.calories}
                        </div>
                        <div className="text-[10px] md:text-xs text-orange-500 font-medium">kcal</div>
                      </div>
                      <div className="text-center bg-blue-50 rounded-lg p-1.5 md:p-2">
                        <div className="font-bold text-blue-600 text-base md:text-lg">
                          {meal.selectedOption.protein}
                        </div>
                        <div className="text-[10px] md:text-xs text-blue-500 font-medium">prot</div>
                      </div>
                      <div className="text-center bg-green-50 rounded-lg p-1.5 md:p-2">
                        <div className="font-bold text-green-600 text-base md:text-lg">
                          {meal.selectedOption.carbs}
                        </div>
                        <div className="text-[10px] md:text-xs text-green-500 font-medium">carb</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Botones de acción */}
                  <div className="flex gap-2">
                    {!meal.isCompleted && (
                      <button
                        onClick={async () => {
                          await markMealCompleted(meal.id)
                        }}
                        className="flex-1 text-xs md:text-sm text-white font-medium bg-green-500 hover:bg-green-600 px-3 md:px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 md:gap-2 touch-manipulation"
                      >
                        <Check className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        <span className="hidden sm:inline">Marcar como completada</span>
                        <span className="sm:hidden">Completar</span>
                      </button>
                    )}

                    {!meal.isCompleted && !meal.isSkipped && (
                      <button
                        onClick={() => {
                          handleSkipMeal(meal.id)
                        }}
                        className="text-xs md:text-sm font-medium px-3 md:px-4 py-2 rounded-lg transition-colors touch-manipulation text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 active:bg-amber-200"
                      >
                        ⏭️ <span className="hidden sm:inline">No como esta comida</span><span className="sm:hidden">No como</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenMealOptions(meal)}
                      className={`text-xs md:text-sm font-medium px-3 md:px-4 py-2 rounded-lg transition-colors touch-manipulation ${
                        meal.isCompleted
                          ? 'text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 active:bg-blue-200'
                          : 'text-gray-600 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 active:bg-gray-200'
                      }`}
                    >
                      ✏️ <span className="hidden sm:inline">Cambiar</span>
                    </button>
                  </div>

                  {/* Foto de la comida */}
                  <div className="space-y-2">
                    {meal.photo ? (
                      <div className="relative rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={meal.photo}
                          alt={`Foto de ${meal.name}`}
                          className="w-full h-36 object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                          <span className="text-[10px] text-white font-medium">📸 Foto guardada</span>
                        </div>
                      </div>
                    ) : null}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      ref={(el) => { fileInputRefs.current[meal.id] = el }}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handlePhotoUpload(meal.id, file)
                        e.target.value = ''
                      }}
                    />
                    <button
                      onClick={() => fileInputRefs.current[meal.id]?.click()}
                      disabled={uploadingPhotoId === meal.id}
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 active:bg-purple-200 text-purple-700 transition-colors disabled:opacity-60 touch-manipulation"
                    >
                      {uploadingPhotoId === meal.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Camera className="w-3.5 h-3.5" />
                      )}
                      {uploadingPhotoId === meal.id
                        ? 'Subiendo foto...'
                        : meal.photo
                          ? '📷 Cambiar foto'
                          : '📷 Añadir foto'}
                    </button>
                  </div>

                </div>
              ) : (
                <button
                  onClick={() => handleOpenMealOptions(meal)}
                  className="w-full flex items-center justify-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation text-sm md:text-base"
                  disabled={syncing}
                >
                  <Plus className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="font-medium">
                    {syncing ? 'Sincronizando...' : 'Ver Opciones'}
                  </span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

          {/* Modal de selección de comidas */}
          {selectedMeal && (
            <MealSelectionModal
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              mealName={selectedMeal.name}
              mealTime={selectedMeal.time}
              mealType={selectedMeal.mealType}
              options={getMealOptions(selectedMeal.id)}
              currentSelection={selectedMeal.currentSelection}
              onSelectOption={handleSelectOption}
            />
          )}

          {/* Modal de motivo "No como" */}
          {skipModalMeal && (
            <SkipMealModal
              mealName={skipModalMeal.name}
              onConfirm={handleSkipConfirm}
              onCancel={() => setSkipModalMeal(null)}
            />
          )}
        </TabsContent>

        <TabsContent value="weekly" className="mt-6">
          <Suspense fallback={
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
          }>
            <WeeklyMealPlan />
          </Suspense>
        </TabsContent>

        {/* Tab galería de fotos */}
        <TabsContent value="fotos" className="mt-4 md:mt-6">
          {(() => {
            const mealsWithPhotos = meals.filter(m => m.photo)
            if (mealsWithPhotos.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                  <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center">
                    <Camera className="w-10 h-10 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700">Aún no hay fotos hoy</h3>
                  <p className="text-sm text-gray-500 max-w-xs">
                    Completa una comida y usa el botón 📷 Añadir foto para registrar tus platos de hoy.
                  </p>
                </div>
              )
            }
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Fotos de hoy</h3>
                    <p className="text-xs text-gray-500">{mealsWithPhotos.length} {mealsWithPhotos.length === 1 ? 'comida fotografiada' : 'comidas fotografiadas'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                  {mealsWithPhotos.map(meal => (
                    <div key={meal.id} className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
                      <div className="relative">
                        <img
                          src={meal.photo!}
                          alt={`Foto de ${meal.name}`}
                          className="w-full h-40 md:h-48 object-cover"
                        />
                        {meal.isCompleted && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow">
                            <Check className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{meal.icon}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-900 truncate">{meal.name}</p>
                            {meal.selectedOption && (
                              <p className="text-[10px] text-gray-500 truncate">{meal.selectedOption.name}</p>
                            )}
                          </div>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          ref={(el) => { fileInputRefs.current[`gallery-${meal.id}`] = el }}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handlePhotoUpload(meal.id, file)
                            e.target.value = ''
                          }}
                        />
                        <button
                          onClick={() => fileInputRefs.current[`gallery-${meal.id}`]?.click()}
                          disabled={uploadingPhotoId === meal.id}
                          className="mt-2 w-full flex items-center justify-center gap-1 text-[10px] font-medium px-2 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors disabled:opacity-60 touch-manipulation"
                        >
                          {uploadingPhotoId === meal.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Camera className="w-3 h-3" />
                          )}
                          {uploadingPhotoId === meal.id ? 'Subiendo...' : 'Cambiar foto'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </TabsContent>

        {/* Tab historial de comidas saltadas */}
        <TabsContent value="saltadas" className="mt-4 md:mt-6">
          <SkippedHistoryTab
            todaySkipped={meals.filter(m => m.isSkipped)}
            history={skippedHistory}
            loading={loadingHistory}
            onRefresh={loadSkippedHistory}
          />
        </TabsContent>

        {/* Tab gestión de exclusiones permanentes */}
        <TabsContent value="exclusiones" className="mt-4 md:mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-rose-500 rounded-lg flex items-center justify-center">
                  <Ban className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Recetas excluidas</h3>
                  <p className="text-xs text-gray-500">No aparecerán en futuras sugerencias</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadRecipeExclusions}
                  disabled={loadingExclusions}
                  className="text-xs"
                >
                  {loadingExclusions ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                </Button>
                {recipeExclusions.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAllExclusions}
                    className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Quitar todas
                  </Button>
                )}
              </div>
            </div>

            {loadingExclusions ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : recipeExclusions.length === 0 ? (
              <Card className="border-dashed border-2 border-gray-200">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mb-4">
                    <Check className="w-7 h-7 text-green-500" />
                  </div>
                  <p className="text-gray-700 font-medium">¡Sin exclusiones!</p>
                  <p className="text-sm text-gray-500 mt-1 max-w-xs">
                    Todas las recetas de tu plan están disponibles. Cuando marques una comida como &quot;no como&quot; con la opción &apos;No recomendar más&apos;, aparecerá aquí.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">{recipeExclusions.length} receta{recipeExclusions.length !== 1 ? 's' : ''} excluida{recipeExclusions.length !== 1 ? 's' : ''}</p>
                {recipeExclusions.map((exclusion) => (
                  <Card key={exclusion.id} className="overflow-hidden">
                    <CardContent className="p-3 md:p-4">
                      <div className="flex items-center gap-3">
                        {exclusion.image_url ? (
                          <img
                            src={exclusion.image_url}
                            alt={exclusion.recipe_name}
                            className="w-14 h-14 md:w-16 md:h-16 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Utensils className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{exclusion.recipe_name}</p>
                          {exclusion.reason && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">Motivo: {exclusion.reason}</p>
                          )}
                          <Badge variant="secondary" className="mt-1 text-xs bg-red-50 text-red-600 border-red-100">
                            🚫 Excluida
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveExclusion(exclusion.id)}
                          disabled={removingExclusionId === exclusion.id}
                          className="flex-shrink-0 text-xs text-green-700 border-green-200 hover:bg-green-50"
                        >
                          {removingExclusionId === exclusion.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-3.5 w-3.5 mr-1" />
                              <span className="hidden sm:inline">Comer de nuevo</span>
                              <span className="sm:hidden">Activar</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
