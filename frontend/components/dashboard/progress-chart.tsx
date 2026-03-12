"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus, Target, ArrowUp, ArrowDown } from "lucide-react"

interface ProgressMetric {
  label: string
  current: number
  target: number
  unit: string
  color: string
  icon: React.ReactNode
  progress: number
  change?: number
  changeType?: 'increase' | 'decrease' | 'stable'
  trend?: 'up' | 'down' | 'stable'
}

interface ProgressChartProps {
  metrics: ProgressMetric[]
  overallProgress: number
  className?: string
}

export function ProgressChart({ metrics, overallProgress, className = "" }: ProgressChartProps) {
  const getBarColor = (label: string) => {
    switch (label) {
      case 'Peso':
        return 'bg-gradient-to-r from-blue-200 to-blue-300'
      case 'Grasa Corporal':
        return 'bg-gradient-to-r from-green-200 to-green-300'
      case 'Masa Muscular':
        return 'bg-gradient-to-r from-orange-200 to-orange-300'
      case 'Entrenamientos':
        return 'bg-gradient-to-r from-purple-200 to-pink-300'
      default:
        return 'bg-gradient-to-r from-gray-200 to-gray-300'
    }
  }

  const getBarIndicatorColor = (label: string) => {
    switch (label) {
      case 'Peso':
        return 'bg-gradient-to-r from-blue-400 to-blue-600'
      case 'Grasa Corporal':
        return 'bg-gradient-to-r from-green-400 to-green-600'
      case 'Masa Muscular':
        return 'bg-gradient-to-r from-orange-400 to-orange-600'
      case 'Entrenamientos':
        return 'bg-gradient-to-r from-purple-400 to-pink-500'
      default:
        return 'bg-gradient-to-r from-gray-400 to-gray-600'
    }
  }

  const getChangeDisplay = (change?: number, changeType?: 'increase' | 'decrease' | 'stable', unit?: string) => {
    if (change === undefined) return null
    
    const sign = changeType === 'increase' ? '+' : changeType === 'decrease' ? '–' : ''
    const absChange = Math.abs(change)
    const displayUnit = unit === '%' ? unit : unit === 'kg' ? 'kg' : ''
    
    return (
      <span className="text-xs text-muted-foreground">
        {sign}{absChange.toFixed(1)} {displayUnit}
      </span>
    )
  }

  const getChangeLabel = (changeType?: 'increase' | 'decrease' | 'stable') => {
    switch (changeType) {
      case 'increase':
        return 'Aumentó'
      case 'decrease':
        return 'Disminuyó'
      default:
        return 'Estable'
    }
  }

  const getOverallMessage = (progress: number) => {
    if (progress >= 80) return '¡Excelente progreso!'
    if (progress >= 60) return 'Buen progreso, sigue así'
    if (progress >= 40) return 'Progreso moderado'
    if (progress >= 20) return 'Comenzando bien'
    return '¡Comienza tu viaje!'
  }

  const getMotivationalMessage = (progress: number) => {
    if (progress >= 80) return '🎉 ¡Estás muy cerca de alcanzar todos tus objetivos!'
    if (progress >= 60) return '🚀 ¡Excelente trabajo! Mantén la consistencia'
    if (progress >= 40) return '💪 ¡Buen progreso! Cada día cuenta'
    if (progress >= 20) return '🌟 ¡Has comenzado! El primer paso es el más importante'
    return '🚀 ¡Es hora de comenzar tu transformación! Cada pequeño paso te acerca a tu objetivo'
  }

  return (
    <Card className={`bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-emerald-200/50 shadow-lg ${className}`}>
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl font-bold text-emerald-700 mb-1">
          Progreso General
        </CardTitle>
        <CardDescription className="text-emerald-600/80">
          Tu avance hacia todos los objetivos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Progreso general */}
        <div className="text-center space-y-4">
          <div className="text-5xl font-bold text-emerald-700">
            {overallProgress.toFixed(1)}%
          </div>
          <div className="px-4 space-y-2">
            <div className="relative h-3 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <div className="mt-2">
              <span className="text-sm font-medium text-emerald-600">
                {getOverallMessage(overallProgress)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Métricas individuales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {metrics.map((metric) => (
            <Card 
              key={metric.label}
              className="bg-white/90 border-2 border-emerald-100/50 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02] overflow-hidden"
            >
              <CardContent className="p-5 space-y-4">
                {/* Header con icono */}
                <div className="flex items-center justify-between">
                  <div className={`w-14 h-14 bg-gradient-to-br ${metric.color} rounded-xl flex items-center justify-center shadow-md`}>
                    {metric.icon}
                  </div>
                  {metric.progress >= 80 && (
                    <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 text-xs px-2 py-1">
                      ¡Objetivo cerca!
                    </Badge>
                  )}
                </div>
                
                {/* Título */}
                <div>
                  <h3 className="text-sm font-semibold text-emerald-700 mb-1">{metric.label}</h3>
                  <div className="text-xl font-bold text-emerald-800">
                    {metric.current} / {metric.target} {metric.unit}
                  </div>
                </div>
                
                {/* Barra de progreso personalizada */}
                <div className="space-y-1.5">
                  <div className="relative h-2.5 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${getBarIndicatorColor(metric.label)}`}
                      style={{ width: `${metric.progress}%` }}
                    />
                  </div>
                </div>
                
                {/* Cambio y estado */}
                <div className="flex items-center justify-between pt-2 border-t border-emerald-100">
                  {metric.change !== undefined ? (
                    <div className="flex items-center gap-2">
                      {metric.changeType === 'increase' ? (
                        <ArrowUp className="h-3 w-3 text-red-500" />
                      ) : metric.changeType === 'decrease' ? (
                        <ArrowDown className="h-3 w-3 text-green-500" />
                      ) : (
                        <Minus className="h-3 w-3 text-gray-500" />
                      )}
                      <span className={`text-xs font-medium ${
                        metric.changeType === 'increase' ? 'text-red-600' :
                        metric.changeType === 'decrease' ? 'text-green-600' :
                        'text-gray-600'
                      }`}>
                        {getChangeDisplay(metric.change, metric.changeType, metric.unit)} {getChangeLabel(metric.changeType)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {metric.progress >= 60 ? 'Buen progreso' :
                       metric.progress >= 40 ? 'En camino' :
                       metric.progress >= 20 ? 'Comenzando' : 'Por empezar'}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Resumen motivacional */}
        <div className="text-center p-5 bg-gradient-to-r from-emerald-100/60 to-teal-100/60 rounded-xl border border-emerald-200/50 backdrop-blur-sm">
          <p className="text-sm font-medium text-emerald-700">
            {getMotivationalMessage(overallProgress)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}






