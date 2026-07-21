"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { Camera, Loader2, Scale, Target, TrendingDown, TrendingUp } from "lucide-react"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { useAuth } from "@/contexts/auth-context"
import { useAdminUserProgress } from "@/hooks/use-admin-user-progress"
import { buildApiUrl } from "@/lib/api"
import { buildComparisonsByType } from "@/lib/progress-photo-compare"
import { getPhotoTypeLabel } from "@/lib/progress-photo-types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProgressPhotoPackages } from "@/components/progress-photo-packages"
import { toast } from "@/hooks/use-toast"

interface ProgressPhoto {
  id: string
  date: string
  photo_url: string
  photo_type: string
  weight?: number
}

interface Props {
  userId: string
  currentWeight?: number
  targetWeight?: number
}

const formatDate = (value?: string) => {
  if (!value) return "Sin fecha"
  return new Date(value).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}

export function UserProgressOverview({ userId, currentWeight, targetWeight }: Props) {
  const { getAuthHeaders } = useAuth()
  const progress = useAdminUserProgress(userId)
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])
  const [photosLoading, setPhotosLoading] = useState(true)

  const loadPhotos = async () => {
    try {
      setPhotosLoading(true)
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`admin/progress/users/${userId}/photos/`), {
        credentials: "include",
        headers,
      })
      if (!response.ok) throw new Error(`Error ${response.status}`)
      const data = await response.json()
      const list = Array.isArray(data) ? data : data.results || []
      setPhotos(
        list.map((photo: Record<string, unknown>) => ({
          id: String(photo.id),
          date: String(photo.date || ""),
          photo_url: String(photo.photo_url || photo.photo || ""),
          photo_type: String(photo.photo_type || "front"),
          weight: photo.weight ? Number(photo.weight) : undefined,
        })),
      )
    } catch {
      setPhotos([])
    } finally {
      setPhotosLoading(false)
    }
  }

  useEffect(() => {
    void loadPhotos()
  }, [getAuthHeaders, userId])

  const sortedWeights = useMemo(
    () => [...progress.entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [progress.entries],
  )
  const weightByDate = useMemo(() => {
    const map: Record<string, number> = {}
    for (const entry of progress.entries) {
      map[entry.date] = Number(entry.weight)
    }
    return map
  }, [progress.entries])

  const comparisons = useMemo(() => buildComparisonsByType(photos), [photos])

  const firstWeight = sortedWeights[0]
  const latestWeight = sortedWeights[sortedWeights.length - 1]
  const displayedCurrentWeight = latestWeight?.weight ?? currentWeight
  const totalChange = firstWeight && latestWeight ? Number(latestWeight.weight) - Number(firstWeight.weight) : null

  const classifyPhoto = async (photo: ProgressPhoto, photoType: string) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(`admin/progress/users/${userId}/photos/${photo.id}/`), {
        method: "PATCH",
        credentials: "include",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ photo_type: photoType }),
      })
      if (!response.ok) throw new Error(`Error ${response.status}`)
      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, photo_type: photoType } : p)))
      toast({ title: "Foto clasificada", description: getPhotoTypeLabel(photoType) })
    } catch {
      toast({ title: "Error", description: "No se pudo clasificar la foto.", variant: "destructive" })
    }
  }

  return (
    <section className="space-y-4" aria-labelledby="progress-overview-title">
      <div>
        <h2 id="progress-overview-title" className="text-xl font-semibold text-slate-900">
          Vista rápida del avance
        </h2>
        <p className="text-sm text-slate-500">Peso y fotos principales para valorar la evolución de un vistazo.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Peso inicial"
          value={firstWeight ? `${firstWeight.weight} kg` : "Sin registros"}
          detail={formatDate(firstWeight?.date)}
          icon={<Scale className="h-5 w-5 text-slate-500" />}
        />
        <MetricCard
          label="Peso actual"
          value={displayedCurrentWeight ? `${displayedCurrentWeight} kg` : "Sin registros"}
          detail={latestWeight ? formatDate(latestWeight.date) : currentWeight ? "Dato del perfil" : "Sin fecha"}
          icon={<Scale className="h-5 w-5 text-indigo-500" />}
        />
        <MetricCard
          label="Cambio total"
          value={totalChange === null ? "Sin datos" : `${totalChange > 0 ? "+" : ""}${totalChange.toFixed(1)} kg`}
          detail={sortedWeights.length ? `${sortedWeights.length} registros` : "Todavía sin historial"}
          icon={
            totalChange !== null && totalChange <= 0 ? (
              <TrendingDown className="h-5 w-5 text-emerald-600" />
            ) : (
              <TrendingUp className="h-5 w-5 text-amber-600" />
            )
          }
        />
        <MetricCard
          label="Peso objetivo"
          value={targetWeight ? `${targetWeight} kg` : "No definido"}
          detail={
            displayedCurrentWeight && targetWeight
              ? `${Math.abs(Number(displayedCurrentWeight) - targetWeight).toFixed(1)} kg de diferencia`
              : "Configurable en Perfil"
          }
          icon={<Target className="h-5 w-5 text-emerald-600" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolución del peso</CardTitle>
            <CardDescription>Histórico completo desde WeightEntry (antigua → reciente).</CardDescription>
          </CardHeader>
          <CardContent>
            {progress.loading ? (
              <LoadingState label="Cargando pesos..." />
            ) : sortedWeights.length > 1 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={sortedWeights}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 11 }} width={38} />
                  <Tooltip
                    formatter={(value) => [`${value} kg`, "Peso"]}
                    labelFormatter={(value) => formatDate(String(value))}
                  />
                  <Line type="monotone" dataKey="weight" stroke="#4f46e5" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : sortedWeights.length === 1 ? (
              <EmptyState
                icon={<Scale className="h-8 w-8" />}
                text={`Un registro: ${sortedWeights[0].weight} kg el ${formatDate(sortedWeights[0].date)}. Se necesitan al menos dos para la gráfica.`}
              />
            ) : (
              <EmptyState icon={<Scale className="h-8 w-8" />} text="Sin historial de peso (WeightEntry)." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Comparación por postura</CardTitle>
                <CardDescription>Primera vs última de cada tipo (sin mezclar).</CardDescription>
              </div>
              <Badge variant="outline">{photos.length} fotos</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {photosLoading ? (
              <LoadingState label="Cargando fotos..." />
            ) : photos.length ? (
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {comparisons.map((cmp) => (
                  <div key={cmp.type} className="rounded-lg border p-2">
                    <p className="mb-2 text-xs font-semibold text-slate-700">{cmp.label}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <MiniPhoto
                        photo={cmp.first ? { ...cmp.first, id: String(cmp.first.id) } : null}
                        label="Primera"
                      />
                      <MiniPhoto
                        photo={cmp.last ? { ...cmp.last, id: String(cmp.last.id) } : null}
                        label="Última"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<Camera className="h-8 w-8" />} text="Todavía no hay fotos de progreso." />
            )}
          </CardContent>
        </Card>
      </div>

      {!photosLoading ? (
        <ProgressPhotoPackages
          photos={photos}
          weightByDate={weightByDate}
          onClassifyPhoto={(photo, photoType) => classifyPhoto(photo as ProgressPhoto, photoType)}
        />
      ) : null}
    </section>
  )
}

function MiniPhoto({ photo, label }: { photo: ProgressPhoto | null; label: string }) {
  if (!photo) {
    return (
      <div className="flex aspect-[3/4] flex-col items-center justify-center rounded-md border border-dashed bg-slate-50 p-2 text-center">
        <p className="text-[11px] font-medium text-slate-500">{label}</p>
        <p className="text-[10px] text-slate-400">Foto no disponible</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-slate-100">
        {photo.photo_url ? (
          <Image src={photo.photo_url} alt={`${label} ${getPhotoTypeLabel(photo.photo_type)}`} fill className="object-cover" unoptimized />
        ) : (
          <Camera className="absolute inset-0 m-auto h-6 w-6 text-slate-400" />
        )}
        <Badge className="absolute left-1 top-1 bg-white/90 text-[10px] text-slate-800 hover:bg-white">{label}</Badge>
      </div>
      <p className="text-[10px] text-slate-500">{formatDate(photo.date)}</p>
    </div>
  )
}

function MetricCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 truncate text-xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{detail}</p>
        </div>
        <div className="rounded-lg bg-slate-100 p-2">{icon}</div>
      </CardContent>
    </Card>
  )
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex h-64 items-center justify-center gap-2 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  )
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center text-sm text-slate-500">
      {icon}
      <p className="max-w-xs">{text}</p>
    </div>
  )
}
