"use client"

import Image from "next/image"
import { CalendarDays, Camera } from "lucide-react"

import { Badge } from "@/components/ui/badge"
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
}

const typeLabels: Record<string, string> = {
  front: "Frontal",
  side: "Lateral",
  back: "Espalda",
  other: "Otra",
}

const formatDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

export function ProgressPhotoPackages({ photos, onPhotoClick }: Props) {
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
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => onPhotoClick?.(photo)}
                  className={`overflow-hidden rounded-lg border bg-card text-left shadow-sm transition ${onPhotoClick ? "hover:-translate-y-0.5 hover:shadow-md" : "cursor-default"}`}
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
              ))}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  )
}
