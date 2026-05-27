'use client'

import React, { useState, lazy, Suspense, useMemo, memo } from 'react'
import { useDailyMeals } from '@/hooks/use-daily-meals'
import { DailyMacroTrackerSimple } from './daily-macro-tracker-simple'
import { MealSelectionModal } from './meal-selection-modal'
import { MealOption } from '@/lib/nutrition-service'
import { Clock, Plus, Utensils, Cloud, Target, ChefHat, RefreshCw, Flame, Calendar, SkipForward, Pencil } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUserData } from '@/hooks/use-user-data'
import { PlanShoppingList } from '@/app/dashboard/components/plan-shopping-list'
import { formatMacro } from '@/lib/utils'

const WeeklyMealPlan = lazy(() => import('@/app/dashboard/components/weekly-meal-plan').then(module => ({ default: module.WeeklyMealPlan })))

export function MealDashboard() {
  const { meals, macros, loading, syncing, selectMealOption, deselectMealOption, markMealAsNotEaten, getMealOptions } = useDailyMeals()
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

  // Ajusta las macros de una opción de cena para que sus calorías se acerquen
  // al presupuesto calórico restante del día (escala proporcional de todos los macros).
  // Solo actúa si la diferencia es > 5 %.
  const applyDinnerScaling = React.useCallback(
    (mealId: string, option: MealOption): MealOption => {
      const meal = meals.find((m) => m.id === mealId)
      if (!meal || meal.mealType !== 'dinner') return option
      if (option.calories <= 0) return option

      const otherConsumed = meals
        .filter((m) => m.mealType !== 'dinner' && m.selectedOption && !m.isSkipped)
        .reduce((sum, m) => sum + (m.selectedOption?.calories ?? 0), 0)
      const budget = macros.caloriesGoal - otherConsumed
      if (budget <= 0) return option

      const diff = Math.abs(option.calories - budget) / budget
      if (diff <= 0.05) return option // ya está dentro del margen

      const factor = budget / option.calories
      return {
        ...option,
        calories: Math.round(budget),
        protein: Math.round(option.protein * factor * 10) / 10,
        carbs: Math.round(option.carbs * factor * 10) / 10,
        fat: Math.round(option.fat * factor * 10) / 10,
        customDescription: `${option.name} (cantidades ajustadas)`,
      }
    },
    [meals, macros.caloriesGoal]
  )

  const handleSelectOption = async (option: MealOption) => {
    if (selectedMeal) {
      const finalOption = applyDinnerScaling(selectedMeal.id, option)
      await selectMealOption(selectedMeal.id, finalOption)
    }
  }

  const handleSelectPreviewOption = async (mealId: string, option: MealOption) => {
    const finalOption = applyDinnerScaling(mealId, option)
    await selectMealOption(mealId, finalOption)
  }

  const handleDeselectOption = async () => {
    if (selectedMeal) {
      await deselectMealOption(selectedMeal.id)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedMeal(null)
  }

  // Calcular progreso del día con useMemo
  const progressData = useMemo(() => {
    const completedMeals = meals.filter(meal => meal.isCompleted).length
    const totalMeals = meals.length
    const progressPercentage = totalMeals > 0 ? (completedMeals / totalMeals) * 100 : 0
    return {
      completedMeals,
      totalMeals,
      progressPercentage,
      daysInTransformation: userStats?.daysInTransformation || 1
    }
  }, [meals, userStats?.daysInTransformation])

  // Objetivo efectivo de calorías: si el total está dentro del ±5% del objetivo
  // o todas las comidas están decididas, ajustar la meta al consumo real (barra al 100%)
  const { effectiveCaloriesGoal, isGoalAdjusted } = useMemo(() => {
    const consumed = macros.caloriesConsumed
    const goal = macros.caloriesGoal
    if (goal <= 0) return { effectiveCaloriesGoal: goal, isGoalAdjusted: false }

    const allMealsDone =
      meals.length > 0 && meals.every((m) => m.isCompleted || m.isSkipped)
    const withinFivePercent = Math.abs(consumed - goal) / goal <= 0.05

    if (allMealsDone || withinFivePercent) {
      return { effectiveCaloriesGoal: consumed, isGoalAdjusted: true }
    }
    return { effectiveCaloriesGoal: goal, isGoalAdjusted: false }
  }, [meals, macros.caloriesConsumed, macros.caloriesGoal])

  // Presupuesto calórico para la cena: calorías que faltan para alcanzar el objetivo
  const dinnerCalorieBudget = useMemo(() => {
    const dinnerMeal = meals.find((m) => m.mealType === 'dinner')
    if (!dinnerMeal || dinnerMeal.selectedOption || dinnerMeal.isSkipped) return null

    const otherConsumed = meals
      .filter((m) => m.mealType !== 'dinner' && m.selectedOption && !m.isSkipped)
      .reduce((sum, m) => sum + (m.selectedOption?.calories ?? 0), 0)

    const budget = macros.caloriesGoal - otherConsumed
    if (budget <= 0) return null
    return { mealId: dinnerMeal.id, budget: Math.round(budget) }
  }, [meals, macros.caloriesGoal])
  
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

  const handleSkipMeal = async (mealId: string) => {
    const reason = window.prompt('¿Por qué no comes esta comida?', 'No me gusta esta comida') || 'No me gusta esta comida'
    await markMealAsNotEaten(mealId, reason, true)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-4">
      {/* Hero Section - Tarjeta de Nutrición */}
      <Card className="border shadow-xl dark:bg-card overflow-hidden relative">
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
          <div className="mx-auto w-16 h-16 md:w-24 md:h-24 bg-orange-100 rounded-full flex items-center justify-center mb-3 md:mb-4 shadow-sm ring-1 ring-orange-200">
            <ChefHat className="h-8 w-8 md:h-12 md:w-12 text-orange-700" />
          </div>
          <CardTitle className="text-xl md:text-3xl font-bold text-slate-900">
            Plan Nutricional
          </CardTitle>
          <CardDescription className="text-sm md:text-base mt-2 text-foreground">
            Tu alimentación equilibrada para alcanzar tus objetivos
          </CardDescription>
          {daysInTransformation > 0 && (
            <Badge className="mt-2 border border-orange-200 bg-orange-50 text-orange-700 text-xs md:text-sm">
              <Flame className="h-3 w-3 mr-1" />
              {daysInTransformation} días en tu transformación
            </Badge>
          )}
          {/* Barra de progreso de comidas */}
          {totalMeals > 0 && (
            <div className="mt-3 md:mt-4 space-y-1.5 md:space-y-2">
              <Progress value={progressPercentage} className="h-2 md:h-3 bg-orange-100" />
              <div className="flex items-center justify-center gap-2 text-xs md:text-sm text-muted-foreground">
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
      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          <TabsTrigger value="daily" className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm py-2 md:py-2.5">
            <Clock className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Vista </span>Diaria
          </TabsTrigger>
          <TabsTrigger value="weekly" className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm py-2 md:py-2.5">
            <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Vista </span>Semanal
          </TabsTrigger>
          <TabsTrigger value="shopping" className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm py-2 md:py-2.5">
            <Utensils className="h-3.5 w-3.5 md:h-4 md:w-4" />
            Compras
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          {/* Progreso Detallado del Día - Movido a la parte superior */}
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 ring-1 ring-orange-200">
            <Target className="w-4 h-4 md:w-5 md:h-5 text-orange-700" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg md:text-xl font-bold text-foreground">Progreso Detallado del Día</h3>
            <p className="text-xs md:text-sm text-muted-foreground">Seguimiento de tus macros y objetivos</p>
          </div>
        </div>
        
        <DailyMacroTrackerSimple
          caloriesConsumed={macros.caloriesConsumed}
          caloriesGoal={effectiveCaloriesGoal}
          proteinConsumed={macros.proteinConsumed}
          proteinGoal={macros.proteinGoal}
          carbsConsumed={macros.carbsConsumed}
          carbsGoal={macros.carbsGoal}
          fatConsumed={macros.fatConsumed}
          fatGoal={macros.fatGoal}
          isGoalAdjusted={isGoalAdjusted}
        />
      </div>

      {/* Comidas del día */}
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0 ring-1 ring-sky-200">
              <Utensils className="w-4 h-4 md:w-5 md:h-5 text-sky-700" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg md:text-xl font-bold text-foreground">Plan de Comidas del Día</h3>
              <p className="text-xs md:text-sm text-muted-foreground">Selecciona tus opciones preferidas</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] md:text-xs text-muted-foreground bg-muted px-2 md:px-3 py-1.5 md:py-2 rounded-lg self-start sm:self-auto">
            <Cloud className="w-3 h-3" />
            <span className="hidden sm:inline">Sincronizado en la nube</span>
            <span className="sm:hidden">Sincronizado</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {meals.map((meal) => {
            const previewOption = meal.selectedOption ? null : getMealOptions(meal.id)[0] || null
            const displayOption = meal.selectedOption || previewOption
            const isPreview = !meal.selectedOption && !!previewOption

            return (
            <div
              key={meal.id}
              className={`group overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:bg-card ${
                meal.isCompleted
                  ? 'border-emerald-200 dark:border-emerald-700/50'
                  : displayOption
                  ? 'border-orange-200 dark:border-orange-800/50'
                  : 'border-slate-200 hover:border-orange-200'
              }`}
            >
              <div className="relative h-48 overflow-hidden bg-gradient-to-br from-orange-50 via-stone-50 to-rose-50">
                {displayOption?.imageUrl ? (
                  <img
                    src={displayOption.imageUrl}
                    alt={displayOption.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = '/placeholder.jpg'
                    }}
                  />
                ) : (
                  <div className="absolute inset-0">
                    <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full border border-orange-200/70" />
                    <div className="absolute right-12 bottom-6 h-20 w-20 rounded-full bg-white/70 shadow-sm ring-1 ring-orange-100" />
                    <div className="absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-orange-100/45" />
                  </div>
                )}
                <div className={`absolute inset-0 ${displayOption?.imageUrl ? 'bg-gradient-to-t from-black/70 via-black/20 to-transparent' : 'bg-gradient-to-t from-white/75 via-white/25 to-transparent'}`} />

                <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full border border-orange-200 bg-white/85 px-2.5 py-1 text-[10px] font-black text-orange-800 shadow-sm">
                    {meal.selectedOption ? 'Planificada' : isPreview ? 'Sugerida' : 'Pendiente'}
                  </span>
                  {meal.isCompleted && (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 shadow-sm">
                      Completada
                    </span>
                  )}
                  {meal.isSkipped && (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700 shadow-sm">
                      No como
                    </span>
                  )}
                </div>

                <div className="absolute bottom-3 left-3 right-3">
                  <div className={`mb-2 flex items-center gap-2 text-xs font-semibold ${displayOption?.imageUrl ? 'text-white/85' : 'text-slate-600'}`}>
                    <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-lg shadow-sm ring-1 backdrop-blur ${displayOption?.imageUrl ? 'bg-white/18 ring-white/25' : 'bg-white/80 ring-orange-100'}`}>
                      {meal.icon}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {meal.time}
                    </span>
                  </div>
                  <h4 className={`line-clamp-2 text-xl font-black leading-tight ${displayOption?.imageUrl ? 'text-white drop-shadow' : 'text-slate-900'}`}>
                    {displayOption?.name || meal.name}
                  </h4>
                  <p className={`mt-1 line-clamp-2 text-xs font-medium ${displayOption?.imageUrl ? 'text-white/85' : 'text-slate-600'}`}>
                    {displayOption ? (displayOption.description || meal.description) : 'Selecciona una receta para esta comida'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 p-3">
                {meal.selectedOption ? (
                  <>
                    {meal.isSkipped ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-2">
                        <Badge variant="outline" className="text-[10px] md:text-xs border-amber-300 text-amber-700">
                          No se contará en macros de hoy
                        </Badge>
                        {meal.skipReason ? (
                          <p className="mt-1 text-[10px] md:text-xs text-amber-700">Motivo: {meal.skipReason}</p>
                        ) : null}
                      </div>
                    ) : null}
                    {meal.selectedOption.substitution_details?.length ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-[10px] font-semibold text-emerald-800 md:text-xs">
                        Cambio: {meal.selectedOption.substitution_details[0].original_food_name} por {meal.selectedOption.substitution_details[0].replacement_quantity}{meal.selectedOption.substitution_details[0].replacement_unit} de {meal.selectedOption.substitution_details[0].replacement_food_name}
                      </div>
                    ) : null}

                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl border border-orange-100 bg-orange-50 p-2 text-center">
                        <div className="text-lg font-black text-orange-700">{meal.selectedOption.calories}</div>
                        <div className="text-[10px] font-semibold text-orange-500">kcal</div>
                      </div>
                      <div className="rounded-xl border border-blue-100 bg-blue-50 p-2 text-center">
                        <div className="text-lg font-black text-blue-700">{formatMacro(meal.selectedOption.protein)}</div>
                        <div className="text-[10px] font-semibold text-blue-500">prot</div>
                      </div>
                      <div className="rounded-xl border border-green-100 bg-green-50 p-2 text-center">
                        <div className="text-lg font-black text-green-700">{formatMacro(meal.selectedOption.carbs)}</div>
                        <div className="text-[10px] font-semibold text-green-500">carb</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {!meal.isSkipped && (
                        <button
                          onClick={async () => {
                            await handleSkipMeal(meal.id)
                          }}
                          className="flex items-center justify-center gap-1 rounded-xl bg-amber-50 px-2 py-2 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-100"
                        >
                          <SkipForward className="h-3.5 w-3.5" />
                          <span>No como</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenMealOptions(meal)}
                        className="flex items-center justify-center gap-1 rounded-xl bg-gray-50 px-2 py-2 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Cambiar</span>
                      </button>
                    </div>
                  </>
                ) : isPreview && previewOption ? (
                  <>
                    {dinnerCalorieBudget?.mealId === meal.id && (
                      <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-center">
                        <span className="text-xs font-bold text-violet-700">
                          🎯 Objetivo cena: ~{dinnerCalorieBudget.budget} kcal
                        </span>
                        <p className="text-[10px] text-violet-500 mt-0.5">
                          Las cantidades se ajustarán para alcanzar tu meta
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl border border-orange-100 bg-orange-50 p-2 text-center">
                        <div className="text-lg font-black text-orange-700">{previewOption.calories}</div>
                        <div className="text-[10px] font-semibold text-orange-500">kcal</div>
                      </div>
                      <div className="rounded-xl border border-blue-100 bg-blue-50 p-2 text-center">
                        <div className="text-lg font-black text-blue-700">{formatMacro(previewOption.protein)}</div>
                        <div className="text-[10px] font-semibold text-blue-500">prot</div>
                      </div>
                      <div className="rounded-xl border border-green-100 bg-green-50 p-2 text-center">
                        <div className="text-lg font-black text-green-700">{formatMacro(previewOption.carbs)}</div>
                        <div className="text-[10px] font-semibold text-green-500">carb</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleSelectPreviewOption(meal.id, previewOption)}
                        className="flex items-center justify-center gap-1 rounded-xl bg-orange-100 px-2 py-2 text-xs font-bold text-orange-800 transition-colors hover:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={syncing}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Seleccionar</span>
                      </button>

                      <button
                        onClick={() => handleOpenMealOptions(meal)}
                        className="flex items-center justify-center gap-1 rounded-xl bg-gray-50 px-2 py-2 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Cambiar</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {dinnerCalorieBudget?.mealId === meal.id && (
                      <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-center">
                        <span className="text-xs font-bold text-violet-700">
                          🎯 Objetivo cena: ~{dinnerCalorieBudget.budget} kcal
                        </span>
                        <p className="text-[10px] text-violet-500 mt-0.5">
                          Las cantidades se ajustarán para alcanzar tu meta
                        </p>
                      </div>
                    )}
                  <button
                    onClick={() => handleOpenMealOptions(meal)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-100 px-4 py-3 text-sm font-black text-orange-800 shadow-sm transition-all hover:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={syncing}
                  >
                    <Plus className="h-4 w-4" />
                    <span>{syncing ? 'Sincronizando...' : 'Ver opciones'}</span>
                  </button>
                  </>
                )}
              </div>
            </div>
            )
          })}
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
              onDeselectOption={handleDeselectOption}
            />
          )}
        </TabsContent>

        <TabsContent value="shopping" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          <PlanShoppingList />
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
      </Tabs>
    </div>
  )
}
