'use client'

import React from 'react'
import { DailyMacroTrackerSimple } from './daily-macro-tracker-simple'
import { useDailyMacrosSimple } from '@/hooks/use-daily-macros-simple'

export function MacroDashboardSimple() {
  const { macros, loading, refreshMacros } = useDailyMacrosSimple()

  if (loading) {
    return (
      <div className="w-full p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mb-6"></div>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-16 mx-auto mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-12 mx-auto"></div>
              </div>
            ))}
          </div>
          
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="h-2 bg-gray-200 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
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
      
      <div className="flex justify-end">
        <button 
          onClick={refreshMacros}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Actualizar datos
        </button>
      </div>
    </div>
  )
}
