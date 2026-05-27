'use client'

import React from 'react'
import { formatMacro } from '@/lib/utils'

interface DailyMacroTrackerSimpleProps {
  caloriesConsumed: number
  caloriesGoal: number
  proteinConsumed: number
  proteinGoal: number
  carbsConsumed: number
  carbsGoal: number
  fatConsumed: number
  fatGoal: number
  /** Cuando true, el objetivo fue ajustado al consumo real (dentro del ±5% o todas las comidas hechas) */
  isGoalAdjusted?: boolean
}

export function DailyMacroTrackerSimple({
  caloriesConsumed,
  caloriesGoal,
  proteinConsumed,
  proteinGoal,
  carbsConsumed,
  carbsGoal,
  fatConsumed,
  fatGoal,
  isGoalAdjusted = false,
}: DailyMacroTrackerSimpleProps) {
  const calculatePercentage = (consumed: number, goal: number): number => {
    if (goal === 0) return 0
    return Math.min(Math.round((consumed / goal) * 100), 100)
  }

  const calculateRemaining = (consumed: number, goal: number): number => {
    return Math.max(goal - consumed, 0)
  }

  return (
    <div className="w-full p-6 bg-card rounded-lg border border-border shadow-sm">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground mb-2">
          Macronutrientes de Hoy
        </h2>
        <p className="text-muted-foreground">
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
          <div className="text-sm font-medium text-foreground">Proteínas</div>
          <div className="text-xs text-muted-foreground">{formatMacro(proteinConsumed)}/{formatMacro(proteinGoal)}g</div>
        </div>
        
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-2 rounded-full border-4 border-green-500 flex items-center justify-center">
            <span className="text-lg font-bold text-green-600">
              {calculatePercentage(carbsConsumed, carbsGoal)}%
            </span>
          </div>
          <div className="text-sm font-medium text-foreground">Carbohidratos</div>
          <div className="text-xs text-muted-foreground">{formatMacro(carbsConsumed)}/{formatMacro(carbsGoal)}g</div>
        </div>
        
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-2 rounded-full border-4 border-yellow-500 flex items-center justify-center">
            <span className="text-lg font-bold text-yellow-600">
              {calculatePercentage(fatConsumed, fatGoal)}%
            </span>
          </div>
          <div className="text-sm font-medium text-foreground">Grasas</div>
          <div className="text-xs text-muted-foreground">{formatMacro(fatConsumed)}/{formatMacro(fatGoal)}g</div>
        </div>
      </div>

      {/* Barras de progreso detalladas */}
      <div className="space-y-4 mb-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm font-medium text-foreground">Proteínas</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-foreground">{formatMacro(proteinConsumed)}/{formatMacro(proteinGoal)}g</div>
              <div className="text-xs text-muted-foreground">Faltan {formatMacro(calculateRemaining(proteinConsumed, proteinGoal))}g</div>
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
              <span className="text-sm font-medium text-foreground">Carbohidratos</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-foreground">{formatMacro(carbsConsumed)}/{formatMacro(carbsGoal)}g</div>
              <div className="text-xs text-muted-foreground">Faltan {formatMacro(calculateRemaining(carbsConsumed, carbsGoal))}g</div>
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
              <span className="text-sm font-medium text-foreground">Grasas</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-foreground">{formatMacro(fatConsumed)}/{formatMacro(fatGoal)}g</div>
              <div className="text-xs text-muted-foreground">Faltan {formatMacro(calculateRemaining(fatConsumed, fatGoal))}g</div>
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
      <div className="pt-4 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            Calorías del día
            {isGoalAdjusted && (
              <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                ✓ Objetivo del día
              </span>
            )}
          </span>
          <span className="text-sm text-foreground">
            {isGoalAdjusted
              ? `${caloriesConsumed} kcal`
              : `${caloriesConsumed} / ${caloriesGoal} kcal`}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${isGoalAdjusted ? 'bg-emerald-500' : 'bg-orange-500'}`}
            style={{ width: `${calculatePercentage(caloriesConsumed, caloriesGoal)}%` }}
          />
        </div>
        {!isGoalAdjusted && caloriesGoal > caloriesConsumed && (
          <p className="mt-1 text-[11px] text-muted-foreground text-right">
            Faltan {caloriesGoal - caloriesConsumed} kcal
          </p>
        )}
      </div>
    </div>
  )
}
