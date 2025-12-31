"use client"

import { useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, TrendingUp, HeartPulse, Image as ImageIcon, RefreshCw } from "lucide-react"
import { UserWeightHistory } from "./user-weight-history"
import { UserWellnessPanel } from "./user-wellness-panel"
// import { ProgressPhotosCarousel } from "./progress-photos-carousel" // Oculto temporalmente
import { useAdminUserProgress } from "@/hooks/use-admin-user-progress"
import { useAdminUserWellness } from "@/hooks/use-admin-user-wellness"

interface Props {
  userId: string
}

export function UserProgressPanel({ userId }: Props) {
  const progress = useAdminUserProgress(userId)
  const wellness = useAdminUserWellness(userId)

  // Debug logs
  useEffect(() => {
    console.log("📊 [UserProgressPanel] Rendering with userId:", userId)
    console.log("📊 [UserProgressPanel] Progress state:", {
      loading: progress.loading,
      error: progress.error,
      entriesCount: progress.entries?.length || 0,
      summary: progress.summary,
    })
    console.log("📊 [UserProgressPanel] Wellness state:", {
      loading: wellness.loading,
      error: wellness.error,
      entriesCount: wellness.entries?.length || 0,
    })
  }, [userId, progress.loading, progress.error, progress.entries, progress.summary, wellness.loading, wellness.error, wellness.entries])

  const isLoading = progress.loading || wellness.loading

  const weightSummary = useMemo(() => {
    return progress.summary || null
  }, [progress.summary])

  const wellnessSummary = useMemo(() => {
    return wellness.summary || null
  }, [wellness.summary])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-semibold">Progreso del usuario</h3>
            <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">Nuevo panel</span>
          </div>
          <p className="text-sm text-muted-foreground">Peso, bienestar y fotos de progreso</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            progress.refetch?.()
            wellness.refetch?.()
          }}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Recargar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-emerald-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-700">
              <TrendingUp className="h-5 w-5" />
              Peso y cambios
            </CardTitle>
            <CardDescription>Resumen de peso reciente</CardDescription>
          </CardHeader>
          <CardContent>
            {progress.loading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando peso...
              </div>
            ) : weightSummary ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Último peso</span>
                  <span className="font-semibold">{weightSummary.latest?.weight ?? "—"} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cambio reciente</span>
                  <span className={`font-semibold ${Number(weightSummary.change) > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {weightSummary.change ?? "—"} kg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entradas</span>
                  <span className="font-semibold">{progress.entries?.length ?? 0}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin datos de peso.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border border-blue-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <HeartPulse className="h-5 w-5" />
              Bienestar diario
            </CardTitle>
            <CardDescription>Estado general reportado</CardDescription>
          </CardHeader>
          <CardContent>
            {wellness.loading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando bienestar...
              </div>
            ) : wellnessSummary ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Último estado</span>
                  <span className="font-semibold">{wellnessSummary.last_mood ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Promedio de energía</span>
                  <span className="font-semibold">{wellnessSummary.avg_energy ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entradas</span>
                  <span className="font-semibold">{wellness.entries?.length ?? 0}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin datos de bienestar.</p>
            )}
          </CardContent>
        </Card>

        {/* Fotos de progreso - Oculto temporalmente */}
        {/* <Card className="border border-orange-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <ImageIcon className="h-5 w-5" />
              Fotos de progreso
            </CardTitle>
            <CardDescription>Últimas fotos registradas</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">Usa la galería para ver todas las fotos.</p>
            <ProgressPhotosCarousel userId={userId} />
          </CardContent>
        </Card> */}
      </div>

      <Tabs defaultValue="weight" className="space-y-4">
        <TabsList>
          <TabsTrigger value="weight">Peso</TabsTrigger>
          <TabsTrigger value="wellness">Bienestar</TabsTrigger>
          {/* <TabsTrigger value="photos">Fotos</TabsTrigger> */}
        </TabsList>

        <TabsContent value="weight" className="space-y-4">
          <UserWeightHistory userId={userId} />
        </TabsContent>

        <TabsContent value="wellness" className="space-y-4">
          <UserWellnessPanel userId={userId} />
        </TabsContent>

        {/* Fotos de progreso - Oculto temporalmente */}
        {/* <TabsContent value="photos" className="space-y-4">
          <ProgressPhotosCarousel userId={userId} />
        </TabsContent> */}
      </Tabs>
    </div>
  )
}

