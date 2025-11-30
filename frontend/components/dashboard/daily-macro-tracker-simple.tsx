'use client'

import React from 'react'

interface DailyMacroTrackerSimpleProps {
  caloriesConsumed: number
  caloriesGoal: number
  proteinConsumed: number
  proteinGoal: number
  carbsConsumed: number
  carbsGoal: number
  fatConsumed: number
  fatGoal: number
}

export function DailyMacroTrackerSimple({
  caloriesConsumed,
  caloriesGoal,
  proteinConsumed,
  proteinGoal,
  carbsConsumed,
  carbsGoal,
  fatConsumed,
  fatGoal
}: DailyMacroTrackerSimpleProps) {
  const calculatePercentage = (consumed: number, goal: number): number => {
    if (goal === 0) return 0
    return Math.min(Math.round((consumed / goal) * 100), 100)
  }

  const calculateRemaining = (consumed: number, goal: number): number => {
    return Math.max(goal - consumed, 0)
  }

  return (
    <div className="w-full p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Macronutrientes de Hoy
        </h2>
        <p className="text-gray-600">
          Tu progreso diario • {caloriesConsumed} kcal consumidas
        </p>
      </div>
      
      {/* Gráficos circulares de resumen */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-2 rounded-full border-4 border-blue-500 flex items-center justify-center">
            <span className="text-lg font-bold text-blue-600">
              {calculatePercentage(proteinConsumed, proteinGoal)}%
            </span>
          </div>
          <div className="text-sm font-medium text-gray-700">Proteínas</div>
          <div className="text-xs text-gray-500">{proteinConsumed}/{proteinGoal}g</div>
        </div>
        
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-2 rounded-full border-4 border-green-500 flex items-center justify-center">
            <span className="text-lg font-bold text-green-600">
              {calculatePercentage(carbsConsumed, carbsGoal)}%
            </span>
          </div>
          <div className="text-sm font-medium text-gray-700">Carbohidratos</div>
          <div className="text-xs text-gray-500">{carbsConsumed}/{carbsGoal}g</div>
        </div>
        
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-2 rounded-full border-4 border-yellow-500 flex items-center justify-center">
            <span className="text-lg font-bold text-yellow-600">
              {calculatePercentage(fatConsumed, fatGoal)}%
            </span>
          </div>
          <div className="text-sm font-medium text-gray-700">Grasas</div>
          <div className="text-xs text-gray-500">{fatConsumed}/{fatGoal}g</div>
        </div>
      </div>

      {/* Barras de progreso detalladas */}
      <div className="space-y-4 mb-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm font-medium text-gray-700">Proteínas</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{proteinConsumed}/{proteinGoal}g</div>
              <div className="text-xs text-gray-500">Faltan {calculateRemaining(proteinConsumed, proteinGoal)}g</div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${calculatePercentage(proteinConsumed, proteinGoal)}%` }}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-gray-700">Carbohidratos</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{carbsConsumed}/{carbsGoal}g</div>
              <div className="text-xs text-gray-500">Faltan {calculateRemaining(carbsConsumed, carbsGoal)}g</div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${calculatePercentage(carbsConsumed, carbsGoal)}%` }}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-sm font-medium text-gray-700">Grasas</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{fatConsumed}/{fatGoal}g</div>
              <div className="text-xs text-gray-500">Faltan {calculateRemaining(fatConsumed, fatGoal)}g</div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${calculatePercentage(fatConsumed, fatGoal)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Resumen de calorías */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Calorías del día</span>
          <span className="text-sm text-gray-900">{caloriesConsumed} / {caloriesGoal} kcal</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-orange-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${calculatePercentage(caloriesConsumed, caloriesGoal)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
