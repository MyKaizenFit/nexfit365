'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { useNutrition } from '@/hooks/use-nutrition'
import { 
  ChefHat, 
  Calendar, 
  Target, 
  TrendingUp, 
  CheckCircle,
  ArrowRight,
  Loader2,
  Database
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export function NutritionPlanCard() {
  const { currentPlan, isLoading, changePlan, getAvailablePlans, refreshPlan } = useNutrition()
  const [availablePlans, setAvailablePlans] = useState<any[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [changing, setChanging] = useState(false)

  useEffect(() => {
    if (isDialogOpen) {
      loadAvailablePlans()
    }
  }, [isDialogOpen])

  const loadAvailablePlans = async () => {
    setLoadingPlans(true)
    try {
      const plans = await getAvailablePlans()
      setAvailablePlans(plans)
    } catch (error) {
    } finally {
      setLoadingPlans(false)
    }
  }

  const handleChangePlan = async (planId: string) => {
    setChanging(true)
    try {
      const success = await changePlan(planId)
      if (success) {
        setIsDialogOpen(false)
        await refreshPlan()
      }
    } catch (error) {
    } finally {
      setChanging(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-gray-600">Cargando plan nutricional...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!currentPlan) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <ChefHat className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-4">No tienes un plan nutricional activo</p>
          <Button onClick={() => setIsDialogOpen(true)}>
            Seleccionar Plan
          </Button>
        </CardContent>
      </Card>
    )
  }

  const macros = currentPlan.target_macros || {
    protein: 0,
    carbs: 0,
    fat: 0
  }

  const proteinPct = currentPlan.target_macros?.protein_percentage || 0
  const carbsPct = currentPlan.target_macros?.carbs_percentage || 0
  const fatPct = currentPlan.target_macros?.fat_percentage || 0

  return (
    <>
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-blue-600" />
              Plan Nutricional Activo
            </CardTitle>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
              <CheckCircle className="w-3 h-3 mr-1" />
              Activo
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {currentPlan.name}
              </h3>
              {(currentPlan.is_system || currentPlan.is_template) && (
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300 text-xs">
                  <Database className="w-3 h-3 mr-1" />
                  Backend
                </Badge>
              )}
            </div>
            {currentPlan.description && (
              <p className="text-sm text-gray-600">{currentPlan.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-medium text-gray-600">Calorías diarias</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {currentPlan.daily_calories || 0}
              </div>
              <div className="text-xs text-gray-500">kcal/día</div>
            </div>

            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-xs font-medium text-gray-600">Comidas incluidas</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {currentPlan.meals?.length || 0}
              </div>
              <div className="text-xs text-gray-500">opciones diarias</div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="text-xs font-medium text-gray-600 mb-2">Distribución de macronutrientes</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Proteína</span>
                <span className="font-semibold">{proteinPct}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Carbohidratos</span>
                <span className="font-semibold">{carbsPct}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Grasas</span>
                <span className="font-semibold">{fatPct}%</span>
              </div>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full" onClick={() => setIsDialogOpen(true)}>
                <ArrowRight className="w-4 h-4 mr-2" />
                Cambiar Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cambiar Plan Nutricional</DialogTitle>
                <DialogDescription>
                  Selecciona un nuevo plan nutricional. Las calorías se ajustarán a tu perfil.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {loadingPlans ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  </div>
                ) : availablePlans.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No hay planes disponibles
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availablePlans.map((plan) => (
                      <Card 
                        key={plan.id} 
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          plan.id === currentPlan.id ? 'border-2 border-blue-500 bg-blue-50' : ''
                        }`}
                        onClick={() => !changing && handleChangePlan(plan.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                              {plan.target_audience && (
                                <Badge variant="secondary" className="mt-1 text-xs">
                                  {plan.target_audience}
                                </Badge>
                              )}
                            </div>
                            {plan.is_default && (
                              <Badge variant="default" className="text-xs">Por defecto</Badge>
                            )}
                          </div>
                          {plan.description && (
                            <p className="text-sm text-gray-600 mb-3">{plan.description}</p>
                          )}
                          <div className="space-y-1 text-xs text-gray-500">
                            <div>Calorías: {plan.daily_calories} kcal/día</div>
                            {plan.duration_weeks && (
                              <div>Duración: {plan.duration_weeks} semanas</div>
                            )}
                            {plan.min_role_required && (
                              <div>Rol requerido: {plan.min_role_required}</div>
                            )}
                          </div>
                          {plan.id === currentPlan.id && (
                            <Badge className="mt-2 w-full justify-center" variant="default">
                              Plan Actual
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
              {changing && (
                <div className="flex items-center justify-center gap-2 text-sm text-blue-600 mt-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cambiando plan...
                </div>
              )}
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </>
  )
}

