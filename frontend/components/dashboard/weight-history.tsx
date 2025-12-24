"use client"

import { useMemo, useEffect, memo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Plus, TrendingUp, TrendingDown, Minus, Target, Calendar, Weight, ArrowUp, ArrowDown } from "lucide-react"
import { useWeightHistory } from "@/hooks/use-weight-history"
import { useAuth } from "@/contexts/auth-context"
import { useUserData } from "@/hooks/use-user-data"
import { useUserProfile } from "@/hooks/use-user-profile"
import { useProgressStats } from "@/hooks/use-progress-stats"

interface WeightHistoryProps {
  onAddWeight: () => void
  className?: string
}

export const WeightHistory = memo(function WeightHistory({ onAddWeight, className = "" }: WeightHistoryProps) {
  // Obtener datos de múltiples fuentes
  const { user } = useAuth()
  const { entries: weightEntries, loading: weightLoading, refresh } = useWeightHistory()
  const { userStats, loading: statsLoading } = useUserData()
  const { profile, loading: profileLoading } = useUserProfile()
  const { stats: progressStats, loading: progressStatsLoading } = useProgressStats()

  const loading = weightLoading || statsLoading || profileLoading || progressStatsLoading

  // Escuchar actualizaciones de peso desde otros componentes
  useEffect(() => {
    const handleWeightUpdate = async () => {
      await refresh()
    }
    
    window.addEventListener('weightUpdated', handleWeightUpdate)
    return () => window.removeEventListener('weightUpdated', handleWeightUpdate)
  }, [refresh])

  // Calcular peso actual desde múltiples fuentes (prioridad: historial > perfil > stats > user)
  const currentWeight = useMemo(() => {
    // 1. Prioridad: peso más reciente del historial
    if (weightEntries && weightEntries.length > 0) {
      return weightEntries[0].weight
    }
    
    // 2. Peso del perfil del usuario
    if (profile?.weight && typeof profile.weight === 'number') {
      return profile.weight
    }
    
    // 3. Peso de las estadísticas de progreso
    if (progressStats?.weight?.current && typeof progressStats.weight.current === 'number') {
      return progressStats.weight.current
    }
    
    // 4. Peso de las estadísticas del usuario
    if (userStats?.currentWeight && typeof userStats.currentWeight === 'number') {
      return userStats.currentWeight
    }
    
    // 5. Peso del objeto user
    if (user?.weight && typeof user.weight === 'number') {
      return user.weight
    }
    
    return null
  }, [weightEntries, profile?.weight, progressStats?.weight?.current, userStats?.currentWeight, user?.weight])

  // Calcular peso objetivo desde múltiples fuentes
  const targetWeight = useMemo(() => {
    // 1. Peso objetivo del perfil
    if (profile?.target_weight && typeof profile.target_weight === 'number') {
      return profile.target_weight
    }
    
    // 2. Peso objetivo de las estadísticas de progreso
    if (progressStats?.weight?.goal && typeof progressStats.weight.goal === 'number') {
      return progressStats.weight.goal
    }
    
    // 3. Peso objetivo de las estadísticas del usuario
    if (userStats?.targetWeight && typeof userStats.targetWeight === 'number') {
      return userStats.targetWeight
    }
    
    // 4. Peso objetivo del objeto user
    if (user?.target_weight && typeof user.target_weight === 'number') {
      return user.target_weight
    }
    
    return null
  }, [profile?.target_weight, progressStats?.weight?.goal, userStats?.targetWeight, user?.target_weight])

  // Calcular peso inicial: el más antiguo del historial ordenado por fecha
  const initialWeight = useMemo(() => {
    if (!weightEntries || weightEntries.length === 0) {
      return null
    }
    
    // Ordenar por fecha ascendente (más antiguo primero)
    const sortedByDate = [...weightEntries].sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      return dateA - dateB
    })
    
    return sortedByDate[0].weight
  }, [weightEntries])

  // Calcular cambio total desde el peso inicial
  const totalChange = useMemo(() => {
    if (initialWeight === null || currentWeight === null) {
      return null
    }
    return initialWeight - currentWeight
  }, [initialWeight, currentWeight])

  // Calcular progreso hacia el objetivo
  const progressPercentage = useMemo(() => {
    if (!initialWeight || !currentWeight || !targetWeight) {
      return 0
    }
    
    if (initialWeight === targetWeight) {
      return currentWeight === targetWeight ? 100 : 0
    }
    
    const progress = ((initialWeight - currentWeight) / (initialWeight - targetWeight)) * 100
    return Math.max(0, Math.min(100, progress))
  }, [initialWeight, currentWeight, targetWeight])

  // Calcular tendencia
  const getTrend = (change: number) => {
    if (change > 0) {
      return { 
        icon: <TrendingUp className="h-4 w-4 text-red-600" />, 
               label: 'Aumentó', 
               color: 'text-red-600',
               arrow: <ArrowUp className="h-4 w-4 text-red-600" />
      }
    }
    if (change < 0) {
      return { 
        icon: <TrendingDown className="h-4 w-4 text-green-600" />, 
        label: 'Disminuyó', 
        color: 'text-green-600',
        arrow: <ArrowDown className="h-4 w-4 text-green-600" />
      }
    }
    return { 
      icon: <Minus className="h-4 w-4 text-gray-600" />, 
      label: 'Sin cambio', 
      color: 'text-gray-600',
      arrow: null
    }
  }

  // Formatear fecha
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'short',
        year: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Weight className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle>Seguimiento de Peso</CardTitle>
              <CardDescription>Tu evolución y progreso hacia el objetivo</CardDescription>
            </div>
          </div>
          <Button onClick={onAddWeight} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Registrar Peso
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando historial de peso...</p>
          </div>
        ) : (
          <>
            {/* Resumen actual */}
            <div className={`grid gap-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200 ${targetWeight ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
              {/* Peso Actual */}
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-700">
                  {currentWeight !== null ? `${currentWeight.toFixed(1)} kg` : 'Sin registro'}
                </div>
                <div className="text-xs text-blue-600">Peso actual</div>
              </div>

              {/* Peso Objetivo */}
              {targetWeight !== null && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-700">
                    {targetWeight.toFixed(1)} kg
                  </div>
                  <div className="text-xs text-blue-600">Objetivo</div>
                </div>
              )}

              {/* Cambio Total */}
              {totalChange !== null && (
                <div className="text-center">
                  <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${totalChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {totalChange >= 0 ? (
                      <>
                        <ArrowDown className="h-5 w-5" />
                        {Math.abs(totalChange).toFixed(1)} kg
                      </>
                    ) : (
                      <>
                        <ArrowUp className="h-5 w-5" />
                        {Math.abs(totalChange).toFixed(1)} kg
                      </>
                    )}
                  </div>
                  <div className="text-xs text-blue-600">Cambio total</div>
                  {initialWeight !== null && (
                    <div className="text-xs text-blue-500 mt-1">
                      Desde {initialWeight.toFixed(1)} kg
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Progreso hacia objetivo - Solo mostrar si hay objetivo */}
            {targetWeight !== null && currentWeight !== null && initialWeight !== null && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Progreso hacia objetivo</span>
                  <span className="text-sm font-bold text-blue-600">{progressPercentage.toFixed(1)}%</span>
                </div>
                <Progress 
                  value={progressPercentage} 
                  className="h-3"
                />
                <div className="text-center text-sm text-muted-foreground">
                  {progressPercentage >= 80 ? '¡Casi alcanzas tu objetivo!' :
                   progressPercentage >= 60 ? '¡Excelente progreso!' :
                   progressPercentage >= 40 ? '¡Buen trabajo, sigue así!' :
                   progressPercentage >= 20 ? '¡Has comenzado bien!' :
                   '¡Cada paso cuenta hacia tu objetivo!'}
                </div>
              </div>
            )}

            {/* Historial reciente */}
            <div className="space-y-3">
              <h4 className="font-medium text-center">Historial Reciente</h4>
              {weightEntries && weightEntries.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {weightEntries.slice(0, 5).map((entry, index) => {
                    // Calcular cambio respecto a la entrada anterior
                    const previousEntry = index < weightEntries.length - 1 ? weightEntries[index + 1] : null
                    const change = previousEntry ? entry.weight - previousEntry.weight : 0
                    const trend = getTrend(change)
                    
                    return (
                      <div key={entry.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Weight className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium">{entry.weight.toFixed(1)} kg</div>
                            <div className="text-sm text-muted-foreground">{formatDate(entry.date)}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {previousEntry && change !== 0 && (
                            <div className="flex items-center gap-1">
                              {trend.arrow}
                              <span className={`text-sm font-medium ${trend.color}`}>
                                {Math.abs(change).toFixed(1)} kg
                              </span>
                            </div>
                          )}
                          {previousEntry && (
                            <Badge variant="outline" className="text-xs">
                              {trend.label}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Weight className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay registros de peso</p>
                  <p className="text-sm">Comienza registrando tu peso actual</p>
                </div>
              )}
            </div>

            {/* Estadísticas adicionales */}
            {weightEntries && weightEntries.length > 1 && (
              <div className="p-4 bg-muted/30 rounded-lg border">
                <h4 className="font-medium text-center mb-3">Estadísticas</h4>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-blue-600">
                      {Math.min(...weightEntries.map(e => e.weight)).toFixed(1)} kg
                    </div>
                    <div className="text-xs text-muted-foreground">Peso más bajo</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-600">
                      {Math.max(...weightEntries.map(e => e.weight)).toFixed(1)} kg
                    </div>
                    <div className="text-xs text-muted-foreground">Peso más alto</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
})
