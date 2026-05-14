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
    // 1. Prioridad: peso más reciente del historial (solo si es válido)
    if (weightEntries && weightEntries.length > 0) {
      const validEntry = weightEntries.find(entry => 
        entry.weight !== null && 
        entry.weight !== undefined && 
        typeof entry.weight === 'number' && 
        entry.weight > 0
      )
      if (validEntry) {
        return validEntry.weight
      }
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

  // Calcular peso inicial: el más antiguo del historial ordenado por fecha (solo válido)
  const initialWeight = useMemo(() => {
    if (!weightEntries || weightEntries.length === 0) {
      return null
    }
    
    // Filtrar solo entradas válidas
    const validEntries = weightEntries.filter(entry => 
      entry.weight !== null && 
      entry.weight !== undefined && 
      typeof entry.weight === 'number' && 
      entry.weight > 0
    )
    
    if (validEntries.length === 0) {
      return null
    }
    
    // Ordenar por fecha ascendente (más antiguo primero)
    const sortedByDate = [...validEntries].sort((a, b) => {
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
      icon: <Minus className="h-4 w-4 text-muted-foreground" />, 
      label: 'Sin cambio', 
      color: 'text-muted-foreground',
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
      <CardHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-3 md:pb-4">
        <div className="flex items-start md:items-center justify-between gap-3 md:gap-4">
          <div className="flex items-center gap-3 md:gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg">
              <Weight className="h-6 w-6 md:h-7 md:w-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg md:text-xl font-bold leading-tight mb-1 md:mb-0.5">
                Seguimiento de Peso
              </CardTitle>
              <CardDescription className="text-xs md:text-sm leading-tight text-muted-foreground hidden sm:block">
                Tu evolución y progreso hacia el objetivo
              </CardDescription>
            </div>
          </div>
          <Button 
            onClick={onAddWeight} 
            size="sm"
            className="flex-shrink-0 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 shadow-md hover:shadow-lg h-10 md:h-9 px-4 md:px-3 text-sm md:text-xs font-medium touch-manipulation active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1.5 md:mr-1.5" />
            <span className="hidden sm:inline">Registrar</span>
            <span className="sm:hidden">Peso</span>
          </Button>
        </div>
        <CardDescription className="text-xs md:text-sm text-muted-foreground mt-2 sm:hidden">
          Tu evolución y progreso hacia el objetivo
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 md:px-6 pb-4 md:pb-6 space-y-4 md:space-y-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando historial de peso...</p>
          </div>
        ) : (
          <>
            {/* Resumen actual */}
            <div className={`grid gap-3 md:gap-4 p-3 md:p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg md:rounded-xl border border-blue-200 dark:border-blue-800/30 ${targetWeight ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {/* Peso Actual */}
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-blue-700">
                  {currentWeight !== null ? `${currentWeight.toFixed(1)} kg` : 'Sin registro'}
                </div>
                <div className="text-[10px] md:text-xs text-blue-600 mt-0.5">Peso actual</div>
              </div>

              {/* Peso Objetivo */}
              {targetWeight !== null && (
                <div className="text-center">
                  <div className="text-xl md:text-2xl font-bold text-blue-700">
                    {targetWeight.toFixed(1)} kg
                  </div>
                  <div className="text-[10px] md:text-xs text-blue-600 mt-0.5">Objetivo</div>
                </div>
              )}

              {/* Cambio Total */}
              {totalChange !== null && (
                <div className="text-center">
                  <div className={`text-xl md:text-2xl font-bold flex items-center justify-center gap-1 ${totalChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {totalChange >= 0 ? (
                      <>
                        <ArrowDown className="h-4 w-4 md:h-5 md:w-5" />
                        {Math.abs(totalChange).toFixed(1)} kg
                      </>
                    ) : (
                      <>
                        <ArrowUp className="h-4 w-4 md:h-5 md:w-5" />
                        {Math.abs(totalChange).toFixed(1)} kg
                      </>
                    )}
                  </div>
                  <div className="text-[10px] md:text-xs text-blue-600 mt-0.5">Cambio total</div>
                  {initialWeight !== null && (
                    <div className="text-[9px] md:text-xs text-blue-500 mt-0.5">
                      Desde {initialWeight.toFixed(1)} kg
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Progreso hacia objetivo - Solo mostrar si hay objetivo */}
            {targetWeight !== null && currentWeight !== null && initialWeight !== null && (
              <div className="space-y-2 md:space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs md:text-sm font-medium text-muted-foreground">Progreso hacia objetivo</span>
                  <span className="text-xs md:text-sm font-bold text-blue-600">{progressPercentage.toFixed(1)}%</span>
                </div>
                <Progress 
                  value={progressPercentage} 
                  className="h-2.5 md:h-3"
                />
                <div className="text-center text-xs md:text-sm text-muted-foreground">
                  {progressPercentage >= 80 ? '¡Casi alcanzas tu objetivo!' :
                   progressPercentage >= 60 ? '¡Excelente progreso!' :
                   progressPercentage >= 40 ? '¡Buen trabajo, sigue así!' :
                   progressPercentage >= 20 ? '¡Has comenzado bien!' :
                   '¡Cada paso cuenta hacia tu objetivo!'}
                </div>
              </div>
            )}

            {/* Historial reciente */}
            <div className="space-y-2 md:space-y-3">
              <h4 className="font-medium text-center text-sm md:text-base">Historial Reciente</h4>
              {(() => {
                // Filtrar solo entradas con peso válido (no null, no undefined, mayor que 0)
                const validEntries = weightEntries?.filter(entry => 
                  entry.weight !== null && 
                  entry.weight !== undefined && 
                  typeof entry.weight === 'number' && 
                  entry.weight > 0
                ) || []
                
                if (validEntries.length === 0) {
                  return (
                    <div className="text-center py-6 md:py-8 text-muted-foreground">
                      <Weight className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm md:text-base">No hay registros de peso válidos</p>
                      <p className="text-xs md:text-sm mt-1">Comienza registrando tu peso actual</p>
                    </div>
                  )
                }
                
                return (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {validEntries.slice(0, 5).map((entry, index) => {
                      // Calcular cambio respecto a la entrada anterior (ya están filtradas y ordenadas)
                      const previousEntry = index < validEntries.length - 1 ? validEntries[index + 1] : null
                      const change = previousEntry && entry.weight && previousEntry.weight
                        ? entry.weight - previousEntry.weight 
                        : 0
                      const trend = getTrend(change)
                      
                      return (
                        <div key={entry.id} className="flex items-center justify-between p-2.5 md:p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                          <div className="flex items-center gap-2.5 md:gap-3 flex-1 min-w-0">
                            <div className="w-8 h-8 md:w-9 md:h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <Weight className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm md:text-base">
                                {entry.weight.toFixed(1)} kg
                              </div>
                              <div className="text-xs md:text-sm text-muted-foreground truncate">{formatDate(entry.date)}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                            {previousEntry && change !== 0 && (
                              <div className="flex items-center gap-1">
                                {trend.arrow}
                                <span className={`text-xs md:text-sm font-medium ${trend.color}`}>
                                  {Math.abs(change).toFixed(1)} kg
                                </span>
                              </div>
                            )}
                            {previousEntry && (
                              <Badge variant="outline" className="text-[10px] md:text-xs px-1.5 md:px-2">
                                {trend.label}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>

            {/* Estadísticas adicionales */}
            {(() => {
              // Filtrar solo entradas válidas para estadísticas
              const validEntries = weightEntries?.filter(entry => 
                entry.weight !== null && 
                entry.weight !== undefined && 
                typeof entry.weight === 'number' && 
                entry.weight > 0
              ) || []
              
              if (validEntries.length > 1) {
                return (
                  <div className="p-3 md:p-4 bg-muted/30 rounded-lg md:rounded-xl border">
                    <h4 className="font-medium text-center mb-2 md:mb-3 text-sm md:text-base">Estadísticas</h4>
                    <div className="grid grid-cols-2 gap-3 md:gap-4 text-center">
                      <div>
                        <div className="text-base md:text-lg font-bold text-blue-600">
                          {Math.min(...validEntries.map(e => e.weight)).toFixed(1)} kg
                        </div>
                        <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5">Peso más bajo</div>
                      </div>
                      <div>
                        <div className="text-base md:text-lg font-bold text-blue-600">
                          {Math.max(...validEntries.map(e => e.weight)).toFixed(1)} kg
                        </div>
                        <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5">Peso más alto</div>
                      </div>
                    </div>
                  </div>
                )
              }
              return null
            })()}
          </>
        )}
      </CardContent>
    </Card>
  )
})
