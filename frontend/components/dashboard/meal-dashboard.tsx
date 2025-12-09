'use client'

import React, { useState } from 'react'
import { useDailyMeals } from '@/hooks/use-daily-meals'
import { DailyMacroTrackerSimple } from './daily-macro-tracker-simple'
import { MealSelectionModal } from './meal-selection-modal'
import { NutritionPlanCard } from '@/components/nutrition-plan-card'
import { NutritionPlanHistoryUser } from '@/components/nutrition-plan-history-user'
import { MealOption } from '@/lib/nutrition-service'
import { Check, Clock, Plus, Utensils, RefreshCw, Cloud, Database, Target } from 'lucide-react'

export function MealDashboard() {
  const { meals, macros, loading, syncing, selectMealOption, getMealOptions } = useDailyMeals()
  const [selectedMeal, setSelectedMeal] = useState<{
    id: string
    name: string
    time: string
  } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

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
  const progressPercentage = (completedMeals / totalMeals) * 100

  // Debug temporal
  console.log('🔍 MealDashboard Debug:', {
    meals: meals.map(m => ({ id: m.id, name: m.name, selectedOption: m.selectedOption?.name })),
    macros,
    loading,
    syncing,
    completedMeals,
    totalMeals,
    progressPercentage
  })

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
    <div className="space-y-8">
      {/* Header con progreso del día */}
      <div className="bg-gradient-to-r from-blue-50 via-green-50 to-purple-50 rounded-xl p-6 border border-blue-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Buen día! 🌅</h2>
            <p className="text-gray-600">Tu plan nutricional personalizado</p>
          </div>
          <div className="flex items-center gap-3">
            {syncing && (
              <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Sincronizando...
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-white px-3 py-2 rounded-lg border">
              <Database className="w-3 h-3" />
              Backend
            </div>
          </div>
        </div>

        {/* Progreso del día */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progreso del día</span>
            <span className="text-sm text-gray-500">{completedMeals}/{totalMeals} comidas</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Resumen de macros */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
            <div className="text-2xl font-bold text-orange-500 mb-1">
              {macros.caloriesGoal - macros.caloriesConsumed}
            </div>
            <div className="text-sm text-gray-600">kcal restantes</div>
            <div className="text-xs text-gray-400 mt-1">
              {Math.round((macros.caloriesConsumed / macros.caloriesGoal) * 100)}% completado
            </div>
          </div>
          <div className="text-center bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
            <div className="text-2xl font-bold text-red-500 mb-1">
              {macros.proteinGoal - macros.proteinConsumed}
            </div>
            <div className="text-sm text-gray-600">g proteína</div>
            <div className="text-xs text-gray-400 mt-1">
              {Math.round((macros.proteinConsumed / macros.proteinGoal) * 100)}% completado
            </div>
          </div>
          <div className="text-center bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
            <div className="text-2xl font-bold text-green-500 mb-1">
              {macros.carbsGoal - macros.carbsConsumed}
            </div>
            <div className="text-sm text-gray-600">g carbos</div>
            <div className="text-xs text-gray-400 mt-1">
              {Math.round((macros.carbsConsumed / macros.carbsGoal) * 100)}% completado
            </div>
          </div>
          <div className="text-center bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
            <div className="text-2xl font-bold text-yellow-500 mb-1">
              {macros.fatGoal - macros.fatConsumed}
            </div>
            <div className="text-sm text-gray-600">g grasas</div>
            <div className="text-xs text-gray-400 mt-1">
              {Math.round((macros.fatConsumed / macros.fatGoal) * 100)}% completado
            </div>
          </div>
        </div>
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

      {/* Tracker de macros detallado */}
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

      {/* Card del Plan Nutricional */}
      <NutritionPlanCard />

      {/* Historial de cambios de plan */}
      <NutritionPlanHistoryUser />

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
    </div>
  )
}
