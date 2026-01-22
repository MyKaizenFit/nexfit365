"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info, Target, Zap, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"
import { progressService, ProgressAnalysis } from "@/lib/progress-service"
import { nutritionService } from "@/lib/nutrition-service"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function ProgressAnalysisPanel() {
  const [analysis, setAnalysis] = useState<ProgressAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [applyingAdjustment, setApplyingAdjustment] = useState(false)
  const [weeks, setWeeks] = useState(4)

  useEffect(() => {
    loadAnalysis()
  }, [weeks])

  const loadAnalysis = async () => {
    setLoading(true)
    try {
      const data = await progressService.getProgressAnalysis(weeks)
      setAnalysis(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar el análisis de progreso",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApplyAdjustment = async () => {
    if (!analysis?.plan_adjustment_suggestion) return

    const adjustment = analysis.plan_adjustment_suggestion.calorie_adjustment
    const reason = analysis.plan_adjustment_suggestion.reason || 'stalled_progress'
    const message = analysis.plan_adjustment_suggestion.message || ''
    
    setApplyingAdjustment(true)
    
    try {
      const updatedPlan = await nutritionService.adjustPlan(
        adjustment,
        reason,
        `Ajuste basado en análisis de progreso: ${message}`
      )
      
      if (updatedPlan) {
        toast({
          title: "✅ Plan ajustado exitosamente",
          description: `Tu plan nutricional ha sido ${adjustment > 0 ? 'aumentado' : 'reducido'} en ${Math.abs(adjustment)} calorías diarias. Nuevas calorías: ${updatedPlan.daily_calories} kcal`,
          duration: 5000,
        })
        
        // Recargar análisis para reflejar cambios
        await loadAnalysis()
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "No se pudo aplicar el ajuste",
        variant: "destructive"
      })
    } finally {
      setApplyingAdjustment(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </CardContent>
      </Card>
    )
  }

  if (!analysis) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">No hay datos suficientes para analizar</p>
        </CardContent>
      </Card>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on_track':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'stalled':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'slow':
        return <Info className="h-5 w-5 text-blue-500" />
      case 'too_fast':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />
      default:
        return <Info className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track':
        return 'bg-green-500'
      case 'stalled':
        return 'bg-yellow-500'
      case 'slow':
        return 'bg-blue-500'
      case 'too_fast':
        return 'bg-orange-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Análisis de Progreso
              </CardTitle>
              <CardDescription>
                Últimas {weeks} semanas
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={weeks === 2 ? "default" : "outline"}
                size="sm"
                onClick={() => setWeeks(2)}
              >
                2 sem
              </Button>
              <Button
                variant={weeks === 4 ? "default" : "outline"}
                size="sm"
                onClick={() => setWeeks(4)}
              >
                4 sem
              </Button>
              <Button
                variant={weeks === 8 ? "default" : "outline"}
                size="sm"
                onClick={() => setWeeks(8)}
              >
                8 sem
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Sugerencia de ajuste de plan */}
      {analysis.plan_adjustment_suggestion && (
        <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800 dark:text-yellow-200">
            {analysis.plan_adjustment_suggestion.reason}
          </AlertTitle>
          <AlertDescription className="text-yellow-700 dark:text-yellow-300">
            <p className="mb-2">{analysis.plan_adjustment_suggestion.message}</p>
            <Button
              size="sm"
              onClick={handleApplyAdjustment}
              disabled={applyingAdjustment}
              className="mt-2"
            >
              {applyingAdjustment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Aplicando...
                </>
              ) : (
                <>
                  Aplicar ajuste de {analysis.plan_adjustment_suggestion.calorie_adjustment > 0 ? '+' : ''}
                  {analysis.plan_adjustment_suggestion.calorie_adjustment} kcal
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Análisis de peso */}
      {analysis.weight_analysis.has_enough_data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(analysis.weight_analysis.status || 'unknown')}
              Progreso de Peso
            </CardTitle>
            <CardDescription>
              {analysis.weight_analysis.first_weight && analysis.weight_analysis.last_weight && (
                <>
                  {analysis.weight_analysis.first_weight.toFixed(1)} kg → {analysis.weight_analysis.last_weight.toFixed(1)} kg
                  {analysis.weight_analysis.weight_change !== undefined && (
                    <span className={analysis.weight_analysis.weight_change >= 0 ? "text-red-500" : "text-green-500"}>
                      {" "}({analysis.weight_analysis.weight_change >= 0 ? "+" : ""}{analysis.weight_analysis.weight_change.toFixed(1)} kg)
                    </span>
                  )}
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis.weight_analysis.weekly_change !== undefined && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Cambio semanal promedio</span>
                  <span className="font-medium">
                    {analysis.weight_analysis.weekly_change >= 0 ? "+" : ""}
                    {analysis.weight_analysis.weekly_change.toFixed(2)} kg/semana
                  </span>
                </div>
                <Progress
                  value={Math.abs(analysis.weight_analysis.weekly_change) * 50}
                  className="h-2"
                />
              </div>
            )}

            {analysis.weight_analysis.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Recomendaciones:</h4>
                {analysis.weight_analysis.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      rec.type === 'warning' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' :
                      rec.type === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-950' :
                      'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {rec.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />}
                      {rec.type === 'success' && <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />}
                      {rec.type === 'info' && <Info className="h-4 w-4 text-blue-600 mt-0.5" />}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{rec.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{rec.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Análisis de entrenamientos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Consistencia de Entrenamientos
          </CardTitle>
          <CardDescription>
            {analysis.workout_analysis.total_workouts} de {analysis.workout_analysis.expected_workouts} entrenamientos completados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Consistencia</span>
              <span className="font-medium">{analysis.workout_analysis.consistency_pct.toFixed(1)}%</span>
            </div>
            <Progress value={analysis.workout_analysis.consistency_pct} className="h-2" />
          </div>

          {analysis.workout_analysis.recommendations.length > 0 && (
            <div className="space-y-2">
              {analysis.workout_analysis.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    rec.type === 'warning' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' :
                    rec.type === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-950' :
                    'border-blue-500 bg-blue-50 dark:bg-blue-950'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {rec.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />}
                    {rec.type === 'success' && <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />}
                    {rec.type === 'info' && <Info className="h-4 w-4 text-blue-600 mt-0.5" />}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{rec.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{rec.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Análisis nutricional */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Seguimiento Nutricional
          </CardTitle>
          <CardDescription>
            {analysis.nutrition_analysis.days_with_meals} de {analysis.nutrition_analysis.total_days} días registrados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Consistencia</span>
              <span className="font-medium">{analysis.nutrition_analysis.consistency_pct.toFixed(1)}%</span>
            </div>
            <Progress value={analysis.nutrition_analysis.consistency_pct} className="h-2" />
          </div>

          {analysis.nutrition_analysis.recommendations.length > 0 && (
            <div className="space-y-2">
              {analysis.nutrition_analysis.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    rec.type === 'warning' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' :
                    rec.type === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-950' :
                    'border-blue-500 bg-blue-50 dark:bg-blue-950'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {rec.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />}
                    {rec.type === 'success' && <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />}
                    {rec.type === 'info' && <Info className="h-4 w-4 text-blue-600 mt-0.5" />}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{rec.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{rec.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


