'use client'

import React, { useState, lazy, Suspense } from 'react'
import { useDailyMeals } from '@/hooks/use-daily-meals'
import { DailyMacroTrackerSimple } from './daily-macro-tracker-simple'
import { MealSelectionModal } from './meal-selection-modal'
import { MealOption } from '@/lib/nutrition-service'
import { Check, Clock, Plus, Utensils, Cloud, Target, ChefHat, RefreshCw, Flame, Calendar, CalendarDays } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUserData } from '@/hooks/use-user-data'

const WeeklyMealPlan = lazy(() => import('@/app/dashboard/components/weekly-meal-plan').then(module => ({ default: module.WeeklyMealPlan })))
const MonthlyMealPlan = lazy(() => import('@/app/dashboard/components/monthly-meal-plan').then(module => ({ default: module.MonthlyMealPlan })))

export function MealDashboard() {
  const { meals, macros, loading, syncing, selectMealOption, getMealOptions } = useDailyMeals()
  const { userStats, refreshStats } = useUserData()
  const [selectedMeal, setSelectedMeal] = useState<{
    id: string
    name: string
    time: string
  } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleOpenMealOptions = (meal: { id: string; name: string; time: string }) => {
    setSelectedMeal(meal)
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

  // Calcular progreso del día
  const completedMeals = meals.filter(meal => meal.selectedOption).length
  const totalMeals = meals.length
  const progressPercentage = totalMeals > 0 ? (completedMeals / totalMeals) * 100 : 0
  const daysInTransformation = userStats?.daysInTransformation || 1

  // Función para refrescar datos
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshStats()
    } finally {
      setIsRefreshing(false)
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
        <CardHeader className="text-center relative z-10">
          <div className="flex justify-end mb-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-gray-600 hover:text-gray-900"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mb-4 shadow-2xl animate-pulse">
            <ChefHat className="h-12 w-12 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent">
            Plan Nutricional 🍽️
          </CardTitle>
          <CardDescription className="text-base mt-2 text-gray-700">
            Tu alimentación equilibrada para alcanzar tus objetivos
          </CardDescription>
          {daysInTransformation > 0 && (
            <Badge className="mt-2 bg-gradient-to-r from-orange-500 to-red-500 text-white">
              <Flame className="h-3 w-3 mr-1" />
              {daysInTransformation} días en tu transformación
            </Badge>
          )}
          {/* Barra de progreso de comidas */}
          {totalMeals > 0 && (
            <div className="mt-4 space-y-2">
              <Progress value={progressPercentage} className="h-3 bg-orange-100" />
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="font-medium">
                  {completedMeals} de {totalMeals} comidas completadas
                </span>
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Tabs para vista diaria, semanal y mensual */}
      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="daily" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Vista Diaria
          </TabsTrigger>
          <TabsTrigger value="weekly" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Vista Semanal
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Vista Mensual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-6 mt-6">
          {/* Progreso Detallado del Día - Movido a la parte superior */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Progreso Detallado del Día</h3>
            <p className="text-sm text-gray-500">Seguimiento de tus macros y objetivos</p>
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Utensils className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Plan de Comidas del Día</h3>
              <p className="text-sm text-gray-500">Selecciona tus opciones preferidas</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
            <Cloud className="w-3 h-3" />
            Sincronizado en la nube
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {meals.map((meal) => (
            <div
              key={meal.id}
              className={`group relative border-2 rounded-xl p-6 transition-all duration-300 ${
                meal.selectedOption
                  ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg shadow-green-100'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-lg hover:shadow-blue-50'
              }`}
            >
              {/* Indicador de estado */}
              {meal.selectedOption && (
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <Check className="w-5 h-5 text-white" />
                </div>
              )}

              {/* Header de la comida */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                  meal.selectedOption 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {meal.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 text-lg">{meal.name}</h4>
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {meal.time}
                  </p>
                </div>
              </div>

              {/* Descripción */}
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">{meal.description}</p>

              {/* Comida seleccionada o botón */}
              {meal.selectedOption ? (
                <div className="space-y-4">
                  {/* Tarjeta de comida seleccionada */}
                  <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <span className="text-lg">{meal.selectedOption.icon}</span>
                      </div>
                      <div className="flex-1">
                        <h5 className="font-semibold text-gray-900 text-sm">
                          {meal.selectedOption.name}
                        </h5>
                        <p className="text-xs text-gray-500">Opción seleccionada</p>
                      </div>
                    </div>
                    
                    {/* Macros de la comida seleccionada */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center bg-orange-50 rounded-lg p-2">
                        <div className="font-bold text-orange-600 text-lg">
                          {meal.selectedOption.calories}
                        </div>
                        <div className="text-xs text-orange-500 font-medium">kcal</div>
                      </div>
                      <div className="text-center bg-blue-50 rounded-lg p-2">
                        <div className="font-bold text-blue-600 text-lg">
                          {meal.selectedOption.protein}
                        </div>
                        <div className="text-xs text-blue-500 font-medium">prot</div>
                      </div>
                      <div className="text-center bg-green-50 rounded-lg p-2">
                        <div className="font-bold text-green-600 text-lg">
                          {meal.selectedOption.carbs}
                        </div>
                        <div className="text-xs text-green-500 font-medium">carb</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Botón para cambiar */}
                  <button
                    onClick={() => handleOpenMealOptions(meal)}
                    className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
                  >
                    ✏️ Cambiar opción
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleOpenMealOptions(meal)}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={syncing}
                >
                  <Plus className="w-5 h-5" />
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
              options={getMealOptions(selectedMeal.name)}
              onSelectOption={handleSelectOption}
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

        <TabsContent value="monthly" className="mt-6">
          <Suspense fallback={
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
          }>
            <MonthlyMealPlan />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}
