"use client"

import { useCallback, useEffect, useState } from "react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { ChefHat, Loader2, RefreshCw, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { buildApiUrl } from "@/lib/api"

interface MealSubstitutionDetail {
  original_food_name?: string
  replacement_food_name?: string
  replacement_quantity?: number | string
  replacement_unit?: string
}

interface MealLogData {
  id?: string
  recipe_name?: string
  custom_description?: string
  substitution_details?: MealSubstitutionDetail[]
  recipe_changed?: boolean
  completed?: boolean
  is_skipped?: boolean
  skip_reason?: string
}

interface MealSlotStatus {
  plan_meal_id?: string | null
  name: string
  meal_type: string
  suggested_recipe_name?: string | null
  status: "completed" | "pending" | "skipped" | "missing"
  log?: MealLogData | null
}

interface DailyMealStatus {
  date: string
  slots: MealSlotStatus[]
}

interface UserMealActivityPanelProps {
  userId: string | number
}

function formatSubstitution(details?: MealSubstitutionDetail[]) {
  if (!details?.length) return null
  const first = details[0]
  if (!first?.original_food_name || !first?.replacement_food_name) return null
  const qty = first.replacement_quantity ? `${first.replacement_quantity}${first.replacement_unit || ""} de ` : ""
  return `${first.original_food_name} → ${qty}${first.replacement_food_name}`
}

function slotStatusClasses(status: MealSlotStatus["status"]) {
  switch (status) {
    case "completed":
      return "border-green-300 bg-green-50 text-green-900"
    case "skipped":
      return "border-amber-300 bg-amber-50 text-amber-900"
    case "pending":
      return "border-slate-300 bg-slate-100 text-slate-700"
    default:
      return "border-slate-200 bg-slate-50 text-slate-500"
  }
}

function slotStatusLabel(status: MealSlotStatus["status"]) {
  switch (status) {
    case "completed":
      return "Hecha"
    case "skipped":
      return "No comió"
    case "pending":
      return "Seleccionada, no completada"
    default:
      return "Sin registrar"
  }
}

export function UserMealActivityPanel({ userId }: UserMealActivityPanelProps) {
  const { getAuthHeaders } = useAuth()
  const [days, setDays] = useState<DailyMealStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const headers = await getAuthHeaders()
      const response = await fetch(
        buildApiUrl(`admin/nutrition/users/${userId}/daily-meal-status/`),
        { headers },
      )
      if (!response.ok) {
        throw new Error(`Error ${response.status}`)
      }
      const data = await response.json()
      setDays(Array.isArray(data.days) ? data.days : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders, userId])

  useEffect(() => {
    if (userId) {
      void fetchStatus()
    }
  }, [userId, fetchStatus])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600 mr-2" />
          <span className="text-sm text-muted-foreground">Cargando actividad de comidas...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-red-500 mb-2" />
          <p className="text-red-600 mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void fetchStatus()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!days.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-emerald-600" />
            Actividad de comidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No hay datos de comidas en el periodo.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-emerald-600" />
              Actividad de comidas (últimos 7 días)
            </CardTitle>
            <CardDescription>
              Verde = completada · Gris = no hecha o sin registrar · Cambios de receta/ingrediente visibles
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void fetchStatus()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {days.map((day) => (
          <div key={day.date} className="rounded-xl border p-4 bg-white">
            <p className="text-sm font-semibold mb-3 capitalize">
              {format(parseISO(day.date), "EEEE d 'de' MMMM", { locale: es })}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {day.slots.map((slot, index) => {
                const performedName = slot.log?.recipe_name || slot.log?.custom_description
                const substitution = formatSubstitution(slot.log?.substitution_details)
                const recipeChanged = slot.log?.recipe_changed && performedName && slot.suggested_recipe_name

                return (
                  <div
                    key={`${day.date}-${slot.plan_meal_id || slot.meal_type}-${index}`}
                    className={`rounded-lg border p-3 ${slotStatusClasses(slot.status)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{slot.name}</p>
                        <p className="text-xs opacity-80">{slotStatusLabel(slot.status)}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-white/70">
                        {slot.meal_type}
                      </Badge>
                    </div>

                    {performedName ? (
                      <p className="text-xs mt-2">
                        <span className="font-semibold">Hizo:</span> {performedName}
                      </p>
                    ) : null}

                    {recipeChanged ? (
                      <p className="text-xs mt-1">
                        <span className="font-semibold">Plan:</span> {slot.suggested_recipe_name}
                        {" → "}
                        <span className="font-semibold">Elegida:</span> {performedName}
                      </p>
                    ) : null}

                    {substitution ? (
                      <p className="text-xs mt-1 rounded-md bg-white/60 px-2 py-1">
                        <span className="font-semibold">Ingrediente:</span> {substitution}
                      </p>
                    ) : null}

                    {slot.status === "skipped" && slot.log?.skip_reason ? (
                      <p className="text-xs mt-1 italic">Motivo: {slot.log.skip_reason}</p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
