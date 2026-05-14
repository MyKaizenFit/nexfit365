'use client'

import React, { useState, lazy, Suspense, useMemo, memo } from 'react'
import { useDailyMeals } from '@/hooks/use-daily-meals'
import { DailyMacroTrackerSimple } from './daily-macro-tracker-simple'
import { MealSelectionModal } from './meal-selection-modal'
import { MealOption } from '@/lib/nutrition-service'
import { Check, Clock, Plus, Utensils, Cloud, Target, ChefHat, RefreshCw, Flame, Calendar } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUserData } from '@/hooks/use-user-data'
import { PlanShoppingList } from '@/app/dashboard/components/plan-shopping-list'

const WeeklyMealPlan = lazy(() => import('@/app/dashboard/components/weekly-meal-plan').then(module => ({ default: module.WeeklyMealPlan })))

export function MealDashboard() {
  const { meals, macros, loading, syncing, selectMealOption, markMealCompleted, markMealAsNotEaten, getMealOptions } = useDailyMeals()
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
          <div className="mx-auto w-16 h-16 md:w-24 md:h-24 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mb-3 md:mb-4 shadow-2xl animate-pulse">
            <ChefHat className="h-8 w-8 md:h-12 md:w-12 text-white" />
          </div>
          <CardTitle className="text-xl md:text-3xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent">
            Plan Nutricional 🍽️
          </CardTitle>
          <CardDescription className="text-sm md:text-base mt-2 text-foreground">
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
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Target className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg md:text-xl font-bold text-foreground">Progreso Detallado del Día</h3>
            <p className="text-xs md:text-sm text-muted-foreground">Seguimiento de tus macros y objetivos</p>
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
          {meals.map((meal) => (
            <div
              key={meal.id}
              className={`group relative border-2 rounded-xl p-4 md:p-6 transition-all duration-300 ${
                meal.selectedOption
                  ? 'border-green-300 dark:border-green-700/50 bg-green-500/5 dark:bg-green-900/10 shadow-lg'
                  : 'border-border bg-card hover:border-blue-300 hover:shadow-lg hover:shadow-blue-50'
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
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {meal.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground text-base md:text-lg truncate">{meal.name}</h4>
                  <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1.5 md:gap-2">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    <span>{meal.time}</span>
                  </p>
                </div>
              </div>

              {/* Descripción */}
              <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4 leading-relaxed line-clamp-2">{meal.description}</p>

              {/* Comida seleccionada o botón */}
              {meal.selectedOption ? (
                <div className="space-y-3 md:space-y-4">
                  {/* Tarjeta de comida seleccionada */}
                  <div className={`bg-card rounded-lg p-3 md:p-4 border shadow-sm ${
                    meal.isCompleted 
                      ? 'border-green-200 bg-green-50/30' 
                      : 'border-blue-200 bg-blue-50/30'
                  }`}>
                    <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                      {meal.selectedOption.imageUrl ? (
                        <img
                          src={meal.selectedOption.imageUrl}
                          alt={meal.selectedOption.name}
                          className="w-7 h-7 md:w-8 md:h-8 rounded-md object-cover border border-border flex-shrink-0"
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
                        <h5 className="font-semibold text-foreground text-xs md:text-sm truncate">
                          {meal.selectedOption.name}
                        </h5>
                        <p className="text-[10px] md:text-xs text-muted-foreground">
                          {meal.isSkipped ? '⏭️ Saltada (no como)' : '✅ Completada'}
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
                    {!meal.isSkipped && (
                      <button
                        onClick={async () => {
                          await handleSkipMeal(meal.id)
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
                          : 'text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80'
                      }`}
                    >
                      ✏️ <span className="hidden sm:inline">Cambiar</span>
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
