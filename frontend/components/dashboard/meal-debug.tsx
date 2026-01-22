'use client'

import React from 'react'
import { useDailyMeals } from '@/hooks/use-daily-meals'

export function MealDebug() {
  const { meals, macros, loading, syncing, selectMealOption, getMealOptions } = useDailyMeals()

  if (loading) {
    return <div className="p-4 bg-yellow-100 border border-yellow-300 rounded">🔄 Cargando...</div>
  }

  // Función de prueba para seleccionar desayuno
  const testSelectBreakfast = () => {
    const breakfastMeal = meals.find(m => m.name === 'Desayuno')
    if (breakfastMeal) {
      const options = getMealOptions('Desayuno')
      if (options.length > 0) {
        selectMealOption(breakfastMeal.id, options[0])
      }
    }
  }

  return (
    <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">🔍 Debug - Estado del Hook</h3>
      
      {/* Botón de prueba */}
      <div className="p-3 bg-orange-50 border border-orange-200 rounded">
        <h4 className="font-medium text-orange-900 mb-2">🧪 Botón de Prueba:</h4>
        <button
          onClick={testSelectBreakfast}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          disabled={syncing}
        >
          {syncing ? 'Sincronizando...' : '🧪 Seleccionar Desayuno (Prueba)'}
        </button>
        <p className="text-xs text-orange-700 mt-1">
          Este botón selecciona directamente la primera opción del desayuno para probar la funcionalidad
        </p>
      </div>
      
      {/* Estado de sincronización */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Estado:</span>
          {syncing ? (
            <span className="text-blue-600">🔄 Sincronizando con backend...</span>
          ) : (
            <span className="text-green-600">✅ Sincronizado</span>
          )}
        </div>
      </div>

      {/* Comidas y sus estados */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-700">Comidas del Día:</h4>
        {meals.map((meal) => (
          <div key={meal.id} className="p-3 bg-white border border-gray-200 rounded">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-lg">{meal.icon}</span>
                <span className="ml-2 font-medium">{meal.name}</span>
                <span className="ml-2 text-sm text-gray-500">({meal.time})</span>
              </div>
              <div className="flex items-center gap-2">
                {meal.selectedOption ? (
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✅ Seleccionado</span>
                    <span className="text-sm bg-green-100 px-2 py-1 rounded">
                      {meal.selectedOption.name}
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-500">❌ No seleccionado</span>
                )}
              </div>
            </div>
            
            {/* Botón de prueba para seleccionar */}
            {!meal.selectedOption && (
              <div className="mt-2">
                <button
                  onClick={() => {
                    const options = getMealOptions(meal.name)
                    if (options.length > 0) {
                      selectMealOption(meal.id, options[0])
                    }
                  }}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                  disabled={syncing}
                >
                  {syncing ? 'Sincronizando...' : 'Seleccionar Primera Opción'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Macros actuales */}
      <div className="p-3 bg-green-50 border border-green-200 rounded">
        <h4 className="font-medium text-gray-700 mb-2">📊 Macros Calculados:</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="font-medium text-orange-600">
              {macros.caloriesConsumed} / {macros.caloriesGoal}
            </div>
            <div className="text-gray-600">Calorías</div>
          </div>
          <div>
            <div className="font-medium text-blue-600">
              {macros.proteinConsumed} / {macros.proteinGoal}
            </div>
            <div className="text-gray-600">Proteína (g)</div>
          </div>
          <div>
            <div className="font-medium text-green-600">
              {macros.carbsConsumed} / {macros.carbsGoal}
            </div>
            <div className="text-gray-600">Carbohidratos (g)</div>
          </div>
          <div>
            <div className="font-medium text-yellow-600">
              {macros.fatConsumed} / {macros.fatGoal}
            </div>
            <div className="text-gray-600">Grasas (g)</div>
          </div>
        </div>
      </div>

      {/* Información de debug */}
      <div className="p-3 bg-gray-100 border border-gray-300 rounded text-xs text-gray-600">
        <div><strong>Total comidas:</strong> {meals.length}</div>
        <div><strong>Comidas seleccionadas:</strong> {meals.filter(m => m.selectedOption).length}</div>
        <div><strong>Comidas completadas:</strong> {meals.filter(m => m.isCompleted).length}</div>
        <div><strong>Calorías totales:</strong> {macros.caloriesConsumed} kcal</div>
      </div>
    </div>
  )
}
