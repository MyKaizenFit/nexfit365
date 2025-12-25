"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { calculateNutritionPlan, compareNutritionPlans, type CalculatedMacros, type UserProfileData } from "@/lib/nutrition-calculator"

interface NutritionPreviewProps {
  currentProfile: UserProfileData
  proposedProfile: UserProfileData
  currentPlan?: CalculatedMacros | null
}

export function NutritionPreview({
  currentProfile,
  proposedProfile,
  currentPlan,
}: NutritionPreviewProps) {
  // Calcular plan actual si no se proporciona
  const currentCalculated = currentPlan || calculateNutritionPlan(currentProfile)
  const proposedCalculated = calculateNutritionPlan(proposedProfile)

  // Si no se pueden calcular ambos planes, no mostrar preview
  if (!currentCalculated || !proposedCalculated) {
    return null
  }

  // Comparar planes
  const comparison = compareNutritionPlans(currentCalculated, proposedCalculated)

  // Determinar si hay cambios significativos
  const hasChanges =
    Math.abs(comparison.calories.difference) > 10 ||
    Math.abs(comparison.protein.difference) > 5 ||
    Math.abs(comparison.carbs.difference) > 5 ||
    Math.abs(comparison.fat.difference) > 2

  if (!hasChanges) {
    return (
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-sm">Vista previa de cambios</CardTitle>
          <CardDescription>Los cambios no afectarán significativamente tu plan nutricional</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const getChangeIcon = (difference: number) => {
    if (Math.abs(difference) < 1) {
      return <Minus className="h-4 w-4 text-gray-400" />
    }
    return difference > 0 ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    )
  }

  const getChangeColor = (difference: number) => {
    if (Math.abs(difference) < 1) return "text-gray-600"
    return difference > 0 ? "text-green-600" : "text-red-600"
  }

  const formatChange = (value: number) => {
    if (value === 0) return "Sin cambios"
    const sign = value > 0 ? "+" : ""
    return `${sign}${value.toFixed(0)}`
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50/50 to-pink-50/50 shadow-lg">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span>📊</span>
          Vista previa de cambios en tu plan nutricional
        </CardTitle>
        <CardDescription>
          Tu plan se actualizará automáticamente con estos nuevos valores al guardar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Calorías */}
        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-lg">🔥</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Calorías diarias</p>
              <p className="text-xs text-gray-500">Objetivo calórico</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-700">
                {comparison.calories.current} kcal
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <div className="text-right">
              <p className={`text-sm font-semibold ${getChangeColor(comparison.calories.difference)}`}>
                {comparison.calories.proposed} kcal
              </p>
              <p className={`text-xs ${getChangeColor(comparison.calories.difference)}`}>
                {formatChange(comparison.calories.difference)}
              </p>
            </div>
            {getChangeIcon(comparison.calories.difference)}
          </div>
        </div>

        {/* Macros */}
        <div className="grid grid-cols-3 gap-3">
          {/* Proteína */}
          <div className="p-3 bg-white rounded-lg border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">Proteína</span>
              {getChangeIcon(comparison.protein.difference)}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-700">
                {comparison.protein.current}g
              </p>
              <p className={`text-xs font-medium ${getChangeColor(comparison.protein.difference)}`}>
                → {comparison.protein.proposed}g
              </p>
              <Badge
                variant="outline"
                className={`text-xs ${getChangeColor(comparison.protein.difference)} border-current`}
              >
                {formatChange(comparison.protein.difference)}g
              </Badge>
            </div>
          </div>

          {/* Carbohidratos */}
          <div className="p-3 bg-white rounded-lg border border-green-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">Carbohidratos</span>
              {getChangeIcon(comparison.carbs.difference)}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-700">
                {comparison.carbs.current}g
              </p>
              <p className={`text-xs font-medium ${getChangeColor(comparison.carbs.difference)}`}>
                → {comparison.carbs.proposed}g
              </p>
              <Badge
                variant="outline"
                className={`text-xs ${getChangeColor(comparison.carbs.difference)} border-current`}
              >
                {formatChange(comparison.carbs.difference)}g
              </Badge>
            </div>
          </div>

          {/* Grasas */}
          <div className="p-3 bg-white rounded-lg border border-yellow-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">Grasas</span>
              {getChangeIcon(comparison.fat.difference)}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-700">
                {comparison.fat.current}g
              </p>
              <p className={`text-xs font-medium ${getChangeColor(comparison.fat.difference)}`}>
                → {comparison.fat.proposed}g
              </p>
              <Badge
                variant="outline"
                className={`text-xs ${getChangeColor(comparison.fat.difference)} border-current`}
              >
                {formatChange(comparison.fat.difference)}g
              </Badge>
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <div className="pt-2 border-t border-purple-100">
          <p className="text-xs text-gray-600 text-center">
            💡 Estos valores se calcularán automáticamente basándose en tus nuevos datos
          </p>
        </div>
      </CardContent>
    </Card>
  )
}






