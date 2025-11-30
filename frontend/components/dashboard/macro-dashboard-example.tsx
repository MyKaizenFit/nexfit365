'use client'

import React from 'react'
import { DailyMacroTracker } from './daily-macro-tracker'
import { useDailyMacros } from '@/hooks/use-daily-macros'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function MacroDashboardExample() {
  const { macros, loading, error, refreshMacros } = useDailyMacros()

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center space-y-2">
              <Skeleton className="w-20 h-20 rounded-full mx-auto" />
              <Skeleton className="h-4 w-16 mx-auto" />
              <Skeleton className="h-3 w-12 mx-auto" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error al cargar los macronutrientes: {error}
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-2"
            onClick={refreshMacros}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <DailyMacroTracker
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
        <Button 
          variant="outline" 
          onClick={refreshMacros}
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar datos
        </Button>
      </div>
    </div>
  )
}
