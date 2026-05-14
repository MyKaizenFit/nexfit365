'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Sparkles, Flame } from 'lucide-react'

interface MacroData {
  name: string
  consumed: number
  goal: number
  color: string
  icon: React.ReactNode
}

interface DailyMacroTrackerProps {
  caloriesConsumed: number
  caloriesGoal: number
  proteinConsumed: number
  proteinGoal: number
  carbsConsumed: number
  carbsGoal: number
  fatConsumed: number
  fatGoal: number
}

export function DailyMacroTracker({
  caloriesConsumed,
  caloriesGoal,
  proteinConsumed,
  proteinGoal,
  carbsConsumed,
  carbsGoal,
  fatConsumed,
  fatGoal
}: DailyMacroTrackerProps) {
  const macros: MacroData[] = [
    {
      name: 'Proteínas',
      consumed: proteinConsumed,
      goal: proteinGoal,
      color: 'bg-blue-500',
      icon: <div className="w-3 h-3 rounded-full bg-blue-500" />
    },
    {
      name: 'Carbohidratos',
      consumed: carbsConsumed,
      goal: carbsGoal,
      color: 'bg-green-500',
      icon: <div className="w-3 h-3 rounded-full bg-green-500" />
    },
    {
      name: 'Grasas',
      consumed: fatConsumed,
      goal: fatGoal,
      color: 'bg-yellow-500',
      icon: <div className="w-3 h-3 rounded-full bg-yellow-500" />
    }
  ]

  const calculatePercentage = (consumed: number, goal: number): number => {
    if (goal === 0) return 0
    return Math.min(Math.round((consumed / goal) * 100), 100)
  }

  const calculateRemaining = (consumed: number, goal: number): number => {
    return Math.max(goal - consumed, 0)
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold text-teal-700">
              Macronutrientes de Hoy
            </CardTitle>
            <Sparkles className="w-4 h-4 text-teal-600" />
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Tu progreso diario de macros</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            {caloriesConsumed} kcal consumidas
            <Flame className="w-3 h-3 text-orange-500" />
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Gráficos circulares de resumen */}
        <div className="grid grid-cols-3 gap-4">
          {macros.map((macro) => {
            const percentage = calculatePercentage(macro.consumed, macro.goal)
            const remaining = calculateRemaining(macro.consumed, macro.goal)
            
            return (
              <div key={macro.name} className="text-center">
                <div className="relative w-20 h-20 mx-auto mb-2">
                  {/* Círculo de fondo */}
                  <div className="w-full h-full rounded-full border-4 border-border" />
                  
                  {/* Círculo de progreso */}
                  <div 
                    className="absolute inset-0 rounded-full border-4 border-transparent"
                    style={{
                      background: `conic-gradient(${macro.color} ${percentage * 3.6}deg, transparent 0deg)`
                    }}
                  />
                  
                  {/* Porcentaje en el centro */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-foreground">
                      {percentage}%
                    </span>
                  </div>
                </div>
                
                <div className="text-sm font-medium text-foreground">
                  {macro.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {macro.consumed}/{macro.goal}g
                </div>
              </div>
            )
          })}
        </div>

        {/* Barras de progreso detalladas */}
        <div className="space-y-4">
          {macros.map((macro) => {
            const percentage = calculatePercentage(macro.consumed, macro.goal)
            const remaining = calculateRemaining(macro.consumed, macro.goal)
            
            return (
              <div key={macro.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {macro.icon}
                    <span className="text-sm font-medium text-foreground">
                      {macro.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-foreground">
                      {macro.consumed}/{macro.goal}g
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Faltan {remaining}g
                    </div>
                  </div>
                </div>
                
                <Progress 
                  value={percentage} 
                  className="h-2"
                  style={{
                    '--progress-background': macro.color.replace('bg-', '')
                  } as React.CSSProperties}
                />
              </div>
            )
          })}
        </div>

        {/* Resumen de calorías */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              Calorías del día
            </span>
            <span className="text-sm text-foreground">
              {caloriesConsumed} / {caloriesGoal} kcal
            </span>
          </div>
          <Progress 
            value={calculatePercentage(caloriesConsumed, caloriesGoal)} 
            className="h-2 mt-2"
          />
        </div>
      </CardContent>
    </Card>
  )
}
