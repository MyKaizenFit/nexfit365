"use client"

import { memo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  Flame, 
  Zap, 
  Apple, 
  Droplets, 
  Info, 
  Target, 
  CheckCircle, 
  AlertCircle,
  ChefHat
} from "lucide-react"
import { useDailyMeals } from "@/hooks/use-daily-meals"
import { useNutrition } from "@/hooks/use-nutrition"
import { formatMacro } from "@/lib/utils"

interface NutritionSummaryEnhancedProps {
  className?: string
}

export const NutritionSummaryEnhanced = memo(function NutritionSummaryEnhanced({ className }: NutritionSummaryEnhancedProps) {
  const { meals: dailyMeals, macros, loading: mealsLoading } = useDailyMeals()
  const { dailyStats, isLoading: nutritionLoading } = useNutrition()

  // Usar datos del hook de comidas diarias o del hook de nutrición
  const caloriesConsumed = macros.caloriesConsumed || dailyStats.totalCalories || 0
  const caloriesGoal = macros.caloriesGoal || 2000
  const proteinConsumed = macros.proteinConsumed || dailyStats.totalProtein || 0
  const proteinGoal = macros.proteinGoal || 150
  const carbsConsumed = macros.carbsConsumed || dailyStats.totalCarbs || 0
  const carbsGoal = macros.carbsGoal || 220
  const fatConsumed = macros.fatConsumed || dailyStats.totalFat || 0
  const fatGoal = macros.fatGoal || 80

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

  // Contar comidas completadas
  const completedMeals = dailyMeals.filter(meal => meal.selectedOption).length
  const totalMeals = dailyMeals.length



  if (mealsLoading || nutritionLoading) {
    return (
      <Card className={`border shadow-xl ${className}`}>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-3/4 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-20 bg-muted rounded animate-pulse"></div>
            <div className="h-32 bg-muted rounded animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`border shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.01] ${className}`}>
      <CardHeader className="p-3 sm:p-4 lg:p-6">
        <CardTitle className="text-sm sm:text-base lg:text-lg responsive-text bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent flex items-center gap-2">
          <Flame className="h-4 w-4 sm:h-5 sm:w-5" />
          Nutrición de Hoy
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm responsive-text text-muted-foreground">
          Tu balance energético y macronutrientes • {completedMeals}/{totalMeals} comidas completadas 🍽️
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6 pt-0">
        {/* Calorías principales */}
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="text-2xl sm:text-4xl font-bold text-red-600">
            {caloriesConsumed} / {caloriesGoal}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">kcal consumidas</p>
          
          <Progress 
            value={caloriesProgress} 
            className="h-3 sm:h-4 bg-red-100"
          />
          
          <div className="text-xs sm:text-sm text-muted-foreground">
            {getMotivationalMessage()}
          </div>
        </div>

        {/* Resumen de calorías */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
          <div className="p-2 sm:p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-xs text-red-600 font-medium">Consumidas</p>
            <p className="text-sm font-bold text-red-700">{caloriesConsumed}</p>
          </div>
          <div className="p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-xs text-green-600 font-medium">Restantes</p>
            <p className="text-sm font-bold text-green-700">{caloriesRemaining}</p>
          </div>
          <div className="p-2 sm:p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-600 font-medium">Objetivo</p>
            <p className="text-sm font-bold text-blue-700">{caloriesGoal}</p>
          </div>
        </div>

        {/* Macros detallados */}
        <div className="space-y-3 sm:space-y-4">
          <h4 className="font-medium text-center text-sm sm:text-base">Macronutrientes</h4>
          
          {/* Proteína */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Proteína</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-blue-600">
                  {formatMacro(proteinConsumed)}g / {formatMacro(proteinGoal)}g
                </span>
                {proteinStatus.icon}
              </div>
            </div>
            <div className="py-1">
              <Progress 
                value={proteinProgress} 
                className="h-1.5 bg-blue-500/10"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>0g</span>
              <span className={proteinStatus.color}>
                {proteinStatus.status === 'optimal' ? 'Óptimo' : 
                 proteinStatus.status === 'low' ? 'Bajo' :
                 proteinStatus.status === 'high' ? 'Alto' : 'Moderado'}
              </span>
              <span>{formatMacro(proteinGoal)}g</span>
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
                  {formatMacro(carbsConsumed)}g / {formatMacro(carbsGoal)}g
                </span>
                {carbsStatus.icon}
              </div>
            </div>
            <div className="py-1">
              <Progress 
                value={carbsProgress} 
                className="h-1.5 bg-green-500/10"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>0g</span>
              <span className={carbsStatus.color}>
                {carbsStatus.status === 'optimal' ? 'Óptimo' : 
                 carbsStatus.status === 'low' ? 'Bajo' :
                 carbsStatus.status === 'high' ? 'Alto' : 'Moderado'}
              </span>
              <span>{formatMacro(carbsGoal)}g</span>
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
                  {formatMacro(fatConsumed)}g / {formatMacro(fatGoal)}g
                </span>
                {fatStatus.icon}
              </div>
            </div>
            <div className="py-1">
              <Progress 
                value={fatProgress} 
                className="h-1.5 bg-yellow-500/10"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>0g</span>
              <span className={fatStatus.color}>
                {fatStatus.status === 'optimal' ? 'Óptimo' : 
                 fatStatus.status === 'low' ? 'Bajo' :
                 fatStatus.status === 'high' ? 'Alto' : 'Moderado'}
              </span>
              <span>{formatMacro(fatGoal)}g</span>
            </div>
          </div>
        </div>

        {/* Comidas del día */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm sm:text-base">Comidas de Hoy</h4>
            <Badge variant="outline" className="text-xs">
              {completedMeals}/{totalMeals} completadas
            </Badge>
          </div>
          
          {dailyMeals.length > 0 ? (
            <div className="space-y-2 max-h-32 sm:max-h-48 overflow-y-auto">
              {dailyMeals.map((meal, index) => (
                <div key={index} className="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <ChefHat className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{meal.name}</div>
                      <div className="text-xs text-muted-foreground">
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
            <div className="text-center py-4 sm:py-6 text-muted-foreground">
              <Info className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 opacity-50" />
              <p className="text-sm">No has seleccionado comidas para hoy</p>
              <p className="text-xs">Ve a "Menús y Recetas" para planificar tu día</p>
            </div>
          )}
        </div>


      </CardContent>
    </Card>
  )
})
