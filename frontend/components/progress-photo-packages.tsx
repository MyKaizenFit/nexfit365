"use client"

import Image from "next/image"
import { CalendarDays, Camera, GitCompare, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export interface PackagedProgressPhoto {
  id: string | number
  date: string
  photo_url: string
  photo_type: string
  weight?: number
}

interface Props {
  photos: PackagedProgressPhoto[]
  onPhotoClick?: (photo: PackagedProgressPhoto) => void
  onDeletePhoto?: (photo: PackagedProgressPhoto) => void | Promise<void>
  showComparison?: boolean
}

const typeLabels: Record<string, string> = {
  front: "Frontal",
  side: "Lateral",
  back: "Espalda",
  other: "Otra",
}

const formatDate = (value: string) => {
  if (!value || value === "Sin fecha") return "Sin fecha"
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function ProgressPhotoPackages({ photos, onPhotoClick, onDeletePhoto, showComparison = true }: Props) {
  const sortedPhotos = [...photos].sort((a, b) => {
    const dateDiff = new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime()
    return dateDiff || String(a.id).localeCompare(String(b.id))
  })
  const firstPhoto = sortedPhotos[0]
  const latestPhoto = sortedPhotos[sortedPhotos.length - 1]
  const packages = Object.entries(
    photos.reduce<Record<string, PackagedProgressPhoto[]>>((grouped, photo) => {
      const date = photo.date || "Sin fecha"
      grouped[date] = [...(grouped[date] || []), photo]
      return grouped
    }, {}),
  ).sort(([dateA], [dateB]) => dateB.localeCompare(dateA))

  if (!packages.length) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-5 w-5 text-indigo-600" />
          Paquetes de fotos por día
        </CardTitle>
        <CardDescription>Cada fecha reúne todos los ángulos fotografiados ese día.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {showComparison && firstPhoto && latestPhoto && firstPhoto.id !== latestPhoto.id ? (
          <section className="rounded-xl border bg-gradient-to-br from-emerald-50 to-teal-50 p-3 sm:p-4">
            <div className="mb-3 flex items-center gap-2">
              <GitCompare className="h-4 w-4 text-emerald-700" />
              <h3 className="font-semibold text-emerald-950">Comparación Día 1 vs último día</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ComparisonPhoto photo={firstPhoto} label="Día 1" />
              <ComparisonPhoto photo={latestPhoto} label="Último día" />
            </div>
          </section>
        ) : null}

        {packages.map(([date, dailyPhotos]) => (
          <section key={date} className="space-y-3 rounded-xl border bg-muted/20 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold capitalize">{date === "Sin fecha" ? date : formatDate(date)}</h3>
                <p className="text-xs text-muted-foreground">
                  {dailyPhotos.length} foto{dailyPhotos.length !== 1 ? "s" : ""} en este paquete
                </p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Camera className="h-3.5 w-3.5" />
                {dailyPhotos.length}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {dailyPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className={`overflow-hidden rounded-lg border bg-card text-left shadow-sm transition ${onPhotoClick ? "hover:-translate-y-0.5 hover:shadow-md" : "cursor-default"}`}
                >
                  <button
                    type="button"
                    onClick={() => onPhotoClick?.(photo)}
                    className="block w-full text-left"
                  >
                    <div className="relative aspect-[3/4] bg-muted">
                    {photo.photo_url ? (
                      <Image src={photo.photo_url} alt={`${typeLabels[photo.photo_type] || photo.photo_type} del ${date}`} fill className="object-cover" unoptimized />
                    ) : (
                      <Camera className="absolute inset-0 m-auto h-8 w-8 text-muted-foreground" />
                    )}
                    </div>
                    <div className="space-y-1 p-2">
                      <p className="text-xs font-medium">{typeLabels[photo.photo_type] || photo.photo_type}</p>
                      {photo.weight ? <p className="text-xs text-muted-foreground">{photo.weight} kg</p> : null}
                    </div>
                  </button>
                  {onDeletePhoto ? (
                    <div className="border-t p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-full text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => onDeletePhoto(photo)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Borrar foto
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  )
}

function ComparisonPhoto({ photo, label }: { photo: PackagedProgressPhoto; label: string }) {
  return (
    <div className="space-y-2">
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted">
        {photo.photo_url ? (
          <Image src={photo.photo_url} alt={`${label} foto de progreso`} fill className="object-cover" unoptimized />
        ) : (
          <Camera className="absolute inset-0 m-auto h-8 w-8 text-muted-foreground" />
        )}
        <Badge className="absolute left-2 top-2 bg-white/90 text-slate-800 hover:bg-white">{label}</Badge>
      </div>
      <div>
        <p className="text-xs font-medium capitalize">{formatDate(photo.date)}</p>
        <p className="text-xs text-muted-foreground">
          {typeLabels[photo.photo_type] || photo.photo_type}{photo.weight ? ` · ${photo.weight} kg` : ""}
        </p>
      </div>
    </div>
  )
}
