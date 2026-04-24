"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Flame, Zap, Apple, Droplets, Info, Target, CheckCircle, AlertCircle, Trophy } from "lucide-react"

interface NutritionSummaryProps {
  caloriesConsumed: number
  caloriesGoal: number
  proteinConsumed: number
  proteinGoal: number
  carbsConsumed: number
  carbsGoal: number
  fatConsumed: number
  fatGoal: number
  dailyMeals: Array<{
    name: string
    selectedOption?: {
      calories: number
      protein: number
      carbs: number
      fat: number
    } | null
  }>
  className?: string
}

export function NutritionSummary({
  caloriesConsumed,
  caloriesGoal,
  proteinConsumed,
  proteinGoal,
  carbsConsumed,
  carbsGoal,
  fatConsumed,
  fatGoal,
  dailyMeals,
  className = ""
}: NutritionSummaryProps) {
  // Calcular porcentajes
  const caloriesProgress = Math.min((caloriesConsumed / caloriesGoal) * 100, 100)
  const proteinProgress = Math.min((proteinConsumed / proteinGoal) * 100, 100)
  const carbsProgress = Math.min((carbsConsumed / carbsGoal) * 100, 100)
  const fatProgress = Math.min((fatConsumed / fatGoal) * 100, 100)

  // Calcular calorías restantes
  const caloriesRemaining = Math.max(0, caloriesGoal - caloriesConsumed)

  // Evaluar el estado de cada macro
  const getMacroStatus = (consumed: number, goal: number) => {
    const percentage = (consumed / goal) * 100
    if (percentage >= 90 && percentage <= 110) return { status: 'optimal', color: 'text-green-600', icon: <CheckCircle className="h-4 w-4" /> }
    if (percentage < 70) return { status: 'low', color: 'text-red-600', icon: <AlertCircle className="h-4 w-4" /> }
    if (percentage > 130) return { status: 'high', color: 'text-orange-600', icon: <AlertCircle className="h-4 w-4" /> }
    return { status: 'moderate', color: 'text-yellow-600', icon: <Target className="h-4 w-4" /> }
  }

  const proteinStatus = getMacroStatus(proteinConsumed, proteinGoal)
  const carbsStatus = getMacroStatus(carbsConsumed, carbsGoal)
  const fatStatus = getMacroStatus(fatConsumed, fatGoal)

  const completedMeals = dailyMeals.filter((meal) => meal.isCompleted && meal.selectedOption).length
  const totalMeals = dailyMeals.length
  const plannedMeals = dailyMeals.filter((meal) => meal.selectedOption).length

  const getAlignmentScore = (consumed: number, goal: number) => {
    if (!goal || goal <= 0) return 0
    const percentage = (consumed / goal) * 100
    return Math.max(0, Math.min(100, 100 - Math.abs(100 - percentage)))
  }

  const caloriesAlignment = getAlignmentScore(caloriesConsumed, caloriesGoal)
  const proteinAlignment = getAlignmentScore(proteinConsumed, proteinGoal)
  const carbsAlignment = getAlignmentScore(carbsConsumed, carbsGoal)
  const fatAlignment = getAlignmentScore(fatConsumed, fatGoal)
  const mealAdherence = totalMeals > 0 ? Math.round((completedMeals / totalMeals) * 100) : 0
  const optimalMacros = [proteinStatus, carbsStatus, fatStatus].filter((item) => item.status === 'optimal').length
  const overallAdherence = Math.round((
    caloriesAlignment + proteinAlignment + carbsAlignment + fatAlignment + mealAdherence
  ) / 5)

  const getAdherenceLabel = () => {
    if (overallAdherence >= 85) return { label: 'Excelente', color: 'text-green-700 bg-green-50 border-green-200' }
    if (overallAdherence >= 65) return { label: 'Buena', color: 'text-amber-700 bg-amber-50 border-amber-200' }
    return { label: 'Mejorable', color: 'text-red-700 bg-red-50 border-red-200' }
  }

  const adherenceTone = getAdherenceLabel()

  // Obtener mensaje motivacional
  const getMotivationalMessage = () => {
    if (caloriesProgress >= 90 && caloriesProgress <= 110) {
      return "🎯 ¡Perfecto! Has alcanzado tu objetivo de calorías"
    } else if (caloriesProgress < 70) {
      return "💪 ¡Sigue así! Aún tienes calorías por consumir"
    } else if (caloriesProgress > 130) {
      return "⚠️ Has excedido tu objetivo. Considera ajustar para mañana"
    } else {
      return "🚀 ¡Buen progreso! Estás cerca de tu objetivo"
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-red-600" />
          Resumen de Nutrición Hoy
        </CardTitle>
        <CardDescription>Tu balance energético y macronutrientes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-emerald-900 flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Adherencia consolidada del día
              </h3>
              <p className="text-xs text-emerald-700">
                Vista rápida de cumplimiento de comidas, calorías y macros.
              </p>
            </div>
            <Badge variant="outline" className={adherenceTone.color}>
              {adherenceTone.label}: {overallAdherence}%
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg bg-white/70 p-3 text-center">
              <div className="text-[11px] text-muted-foreground">Comidas completas</div>
              <div className="text-lg font-bold text-emerald-700">{completedMeals}/{totalMeals || 0}</div>
            </div>
            <div className="rounded-lg bg-white/70 p-3 text-center">
              <div className="text-[11px] text-muted-foreground">Macros en objetivo</div>
              <div className="text-lg font-bold text-emerald-700">{optimalMacros}/3</div>
            </div>
            <div className="rounded-lg bg-white/70 p-3 text-center">
              <div className="text-[11px] text-muted-foreground">Calorías</div>
              <div className="text-lg font-bold text-emerald-700">{Math.round(caloriesAlignment)}%</div>
            </div>
            <div className="rounded-lg bg-white/70 p-3 text-center">
              <div className="text-[11px] text-muted-foreground">Planificadas</div>
              <div className="text-lg font-bold text-emerald-700">{plannedMeals}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Proteína {Math.round(proteinAlignment)}%</Badge>
            <Badge variant="secondary">Carbs {Math.round(carbsAlignment)}%</Badge>
            <Badge variant="secondary">Grasas {Math.round(fatAlignment)}%</Badge>
            <Badge variant="secondary">Comidas {mealAdherence}%</Badge>
          </div>
        </div>

        {/* Calorías principales */}
        <div className="text-center space-y-4">
          <div className="text-4xl font-bold text-red-600">
            {caloriesConsumed} / {caloriesGoal}
          </div>
          <p className="text-sm text-muted-foreground">kcal consumidas</p>

          <Progress
            value={caloriesProgress}
            className="h-4"
          />

          <div className="text-sm text-muted-foreground">
            {getMotivationalMessage()}
          </div>
        </div>

        {/* Resumen de calorías */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-xs text-red-600 font-medium">Consumidas</p>
            <p className="text-sm font-bold text-red-700">{caloriesConsumed}</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-xs text-green-600 font-medium">Restantes</p>
            <p className="text-sm font-bold text-green-700">{caloriesRemaining}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-600 font-medium">Objetivo</p>
            <p className="text-sm font-bold text-blue-700">{caloriesGoal}</p>
          </div>
        </div>

        {/* Macros detallados */}
        <div className="space-y-4">
          <h4 className="font-medium text-center">Macronutrientes</h4>

          {/* Proteína */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Proteína</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-blue-600">
                  {proteinConsumed}g / {proteinGoal}g
                </span>
                {proteinStatus.icon}
              </div>
            </div>
            <div className="py-1">
              <Progress
                value={proteinProgress}
                className="h-1.5 bg-gradient-to-r from-blue-50 to-blue-100/50"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>0g</span>
              <span className={proteinStatus.color}>
                {proteinStatus.status === 'optimal' ? 'Óptimo' :
                  proteinStatus.status === 'low' ? 'Bajo' :
                    proteinStatus.status === 'high' ? 'Alto' : 'Moderado'}
              </span>
              <span>{proteinGoal}g</span>
            </div>
          </div>

          {/* Carbohidratos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Apple className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Carbohidratos</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-green-600">
                  {carbsConsumed}g / {carbsGoal}g
                </span>
                {carbsStatus.icon}
              </div>
            </div>
            <div className="py-1">
              <Progress
                value={carbsProgress}
                className="h-1.5 bg-gradient-to-r from-green-50 to-green-100/50"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>0g</span>
              <span className={carbsStatus.color}>
                {carbsStatus.status === 'optimal' ? 'Óptimo' :
                  carbsStatus.status === 'low' ? 'Bajo' :
                    carbsStatus.status === 'high' ? 'Alto' : 'Moderado'}
              </span>
              <span>{carbsGoal}g</span>
            </div>
          </div>

          {/* Grasas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Grasas</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-yellow-600">
                  {fatConsumed}g / {fatGoal}g
                </span>
                {fatStatus.icon}
              </div>
            </div>
            <div className="py-1">
              <Progress
                value={fatProgress}
                className="h-1.5 bg-gradient-to-r from-yellow-50 to-orange-50/50"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>0g</span>
              <span className={fatStatus.color}>
                {fatStatus.status === 'optimal' ? 'Óptimo' :
                  fatStatus.status === 'low' ? 'Bajo' :
                    fatStatus.status === 'high' ? 'Alto' : 'Moderado'}
              </span>
              <span>{fatGoal}g</span>
            </div>
          </div>
        </div>

        {/* Comidas del día */}
        <div className="space-y-3">
          <h4 className="font-medium text-center">Comidas Seleccionadas Hoy</h4>
          {dailyMeals.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {dailyMeals.map((meal, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <Flame className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <div className="font-medium">{meal.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {meal.selectedOption ? `${meal.selectedOption.calories} kcal` : 'Sin seleccionar'}
                      </div>
                    </div>
                  </div>

                  {meal.selectedOption ? (
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {meal.selectedOption.calories} kcal
                      </div>
                      <div className="text-xs text-muted-foreground">
                        P: {meal.selectedOption.protein}g | C: {meal.selectedOption.carbs}g | G: {meal.selectedOption.fat}g
                      </div>
                    </div>
                  ) : (
                    <div className="text-right">
                      <div className="text-sm font-medium text-muted-foreground">
                        Sin seleccionar
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Info className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No has seleccionado comidas para hoy</p>
              <p className="text-sm">Ve a "Menús y Recetas" para planificar tu día</p>
            </div>
          )}
        </div>

        {/* Consejos nutricionales */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-center mb-3 text-blue-700">💡 Consejos del Día</h4>
          <div className="text-sm text-blue-600 space-y-2">
            {proteinStatus.status === 'low' && (
              <p>• Considera agregar más proteínas como pollo, pescado o legumbres</p>
            )}
            {carbsStatus.status === 'low' && (
              <p>• Los carbohidratos son tu fuente de energía, incluye granos enteros</p>
            )}
            {fatStatus.status === 'low' && (
              <p>• Las grasas saludables son importantes, agrega aguacate o frutos secos</p>
            )}
            {caloriesProgress < 70 && (
              <p>• Aún tienes calorías disponibles, considera un snack saludable</p>
            )}
            {proteinStatus.status === 'optimal' && carbsStatus.status === 'optimal' && fatStatus.status === 'optimal' && (
              <p>• ¡Excelente balance! Has logrado una distribución óptima de macronutrientes</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
