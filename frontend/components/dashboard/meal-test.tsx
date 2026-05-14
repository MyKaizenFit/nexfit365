'use client'

import React, { useState } from 'react'
import { useDailyMeals } from '@/hooks/use-daily-meals'

export function MealTest() {
  const { meals, macros, loading, syncing, selectMealOption, getMealOptions } = useDailyMeals()
  const [localState, setLocalState] = useState<string>('Estado inicial')

  if (loading) {
    return <div className="p-4 bg-yellow-100 border border-yellow-300 rounded">🔄 Cargando...</div>
  }

  // Función de prueba simple
  const testSelectBreakfast = () => {
    setLocalState('Probando selección...')
    
    const breakfastMeal = meals.find(m => m.name === 'Desayuno')
    if (breakfastMeal) {
      const options = getMealOptions('Desayuno')
      if (options.length > 0) {
        
        selectMealOption(breakfastMeal.id, options[0])
        
        // Verificar estado después de un delay
        setTimeout(() => {
          setLocalState('Selección completada - revisa consola')
        }, 1000)
      }
    }
  }

  return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-lg space-y-4">
      <h3 className="text-lg font-semibold text-red-900">🧪 COMPONENTE DE PRUEBA SIMPLE</h3>
      
      {/* Estado local */}
      <div className="p-3 bg-card border border-red-300 rounded">
        <p className="text-sm font-medium text-red-900">Estado Local: {localState}</p>
      </div>
      
      {/* Botón de prueba */}
      <div className="p-3 bg-red-100 border border-red-300 rounded">
        <button
          onClick={testSelectBreakfast}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 font-bold"
          disabled={syncing}
        >
          {syncing ? '🔄 Sincronizando...' : '🧪 PROBAR SELECCIÓN DESAYUNO'}
        </button>
        <p className="text-xs text-red-700 mt-1">
          Haz clic aquí y revisa la consola del navegador
        </p>
      </div>

      {/* Estado del hook */}
      <div className="p-3 bg-card border border-red-300 rounded">
        <h4 className="font-medium text-red-900 mb-2">Estado del Hook:</h4>
        <div className="space-y-2 text-sm">
          <div><strong>Total comidas:</strong> {meals.length}</div>
          <div><strong>Comidas seleccionadas:</strong> {meals.filter(m => m.selectedOption).length}</div>
          <div><strong>Sincronizando:</strong> {syncing ? 'SÍ' : 'NO'}</div>
        </div>
      </div>

      {/* Lista simple de comidas */}
      <div className="p-3 bg-card border border-red-300 rounded">
        <h4 className="font-medium text-red-900 mb-2">Comidas (Estado Simple):</h4>
        <div className="space-y-2">
          {meals.map((meal) => (
            <div key={meal.id} className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="font-medium">{meal.name}</span>
              <span className={meal.selectedOption ? 'text-green-600 font-bold' : 'text-muted-foreground'}>
                {meal.selectedOption ? `✅ ${meal.selectedOption.name}` : '❌ No seleccionado'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Macros */}
      <div className="p-3 bg-card border border-red-300 rounded">
        <h4 className="font-medium text-red-900 mb-2">Macros:</h4>
        <div className="text-sm">
          <div>Calorías: <strong>{macros.caloriesConsumed}</strong> / {macros.caloriesGoal}</div>
          <div>Proteína: <strong>{macros.proteinConsumed}</strong> / {macros.proteinGoal}</div>
          <div>Carbos: <strong>{macros.carbsConsumed}</strong> / {macros.carbsGoal}</div>
          <div>Grasas: <strong>{macros.fatConsumed}</strong> / {macros.fatGoal}</div>
        </div>
      </div>
    </div>
  )
}

