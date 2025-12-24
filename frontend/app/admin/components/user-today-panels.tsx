"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, UtensilsCrossed, Dumbbell } from "lucide-react"
import { useAdminUserNutrition } from "@/hooks/use-admin-user-nutrition"
import { useAdminUserWorkouts } from "@/hooks/use-admin-user-workouts"

export function UserTodayPanels({ userId }: { userId: string }) {
  const { summary, loading: loadingNutri } = useAdminUserNutrition(userId)
  const { program, loading: loadingWod } = useAdminUserWorkouts(userId)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4" />
            Nutrición de hoy
          </CardTitle>
          <CardDescription>Macros consumidos vs objetivo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {loadingNutri ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="secondary">Objetivo {summary?.macros_target?.calories || "—"} kcal</Badge>
                <Badge variant="outline">{Math.round(summary?.macro_intake?.totals?.calories || 0)} kcal consumidas</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Proteína: {Math.round(summary?.macro_intake?.totals?.protein || 0)} g · Carbs: {Math.round(summary?.macro_intake?.totals?.carbs || 0)} g · Grasas: {Math.round(summary?.macro_intake?.totals?.fat || 0)} g
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Entrenamiento del día
          </CardTitle>
          <CardDescription>Programa asignado y estado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {loadingWod ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold">{program?.program?.name || "Sin programa"}</p>
              <p className="text-xs text-muted-foreground">
                Días/sem: {program?.summary?.days_per_week || "—"} · Duración: {program?.summary?.duration_weeks || "—"} semanas
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


