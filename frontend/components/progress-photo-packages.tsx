"use client"

import Image from "next/image"
import { CalendarDays, Camera, GitCompare, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { buildComparisonsByType, buildDayPackages } from "@/lib/progress-photo-compare"
import {
  COMPARABLE_PHOTO_TYPES,
  getPhotoTypeLabel,
  PHOTO_TYPE_OPTIONS,
} from "@/lib/progress-photo-types"

export interface PackagedProgressPhoto {
  id: string | number
  date: string
  photo_url: string
  photo_type: string
  weight?: number
}

interface Props {
  photos: PackagedProgressPhoto[]
  weightByDate?: Record<string, number | null | undefined>
  onPhotoClick?: (photo: PackagedProgressPhoto) => void
  onDeletePhoto?: (photo: PackagedProgressPhoto) => void | Promise<void>
  onClassifyPhoto?: (photo: PackagedProgressPhoto, photoType: string) => void | Promise<void>
  showComparison?: boolean
}

const formatDate = (value: string) => {
  if (!value || value === "Sin fecha") return "Sin fecha"
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function ProgressPhotoPackages({
  photos,
  weightByDate,
  onPhotoClick,
  onDeletePhoto,
  onClassifyPhoto,
  showComparison = true,
}: Props) {
  const comparisons = buildComparisonsByType(photos)
  const packages = buildDayPackages(photos, weightByDate)
  const hasTypedComparison = comparisons.some(
    (c) => c.first && c.last && String(c.first.id) !== String(c.last.id),
  )

  if (!packages.length) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-5 w-5 text-indigo-600" />
          Línea temporal de revisiones
        </CardTitle>
        <CardDescription>
          Cada fecha agrupa peso y las cuatro posturas. Las fotos sin clasificar no entran en la comparación.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {showComparison && hasTypedComparison ? (
          <section className="space-y-3 rounded-xl border bg-gradient-to-br from-emerald-50 to-teal-50 p-3 sm:p-4">
            <div className="mb-1 flex items-center gap-2">
              <GitCompare className="h-4 w-4 text-emerald-700" />
              <h3 className="font-semibold text-emerald-950">Comparación por postura (primera vs última)</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {comparisons.map((cmp) => (
                <div key={cmp.type} className="rounded-lg border bg-white/80 p-2">
                  <p className="mb-2 text-xs font-semibold text-emerald-900">{cmp.label}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <ComparisonSlot photo={cmp.first} label="Primera" />
                    <ComparisonSlot photo={cmp.last} label="Última" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {packages.map((pkg) => (
          <section key={pkg.date} className="space-y-3 rounded-xl border bg-muted/20 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold capitalize">
                  {pkg.date === "Sin fecha" ? pkg.date : formatDate(pkg.date)}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Peso: {pkg.weight != null ? `${pkg.weight} kg` : "No registrado"} · {pkg.all.length} foto
                  {pkg.all.length !== 1 ? "s" : ""}
                </p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Camera className="h-3.5 w-3.5" />
                {pkg.all.length}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {COMPARABLE_PHOTO_TYPES.map((type) => {
                const photo = pkg.photosByType[type]
                return (
                  <PoseSlot
                    key={type}
                    label={getPhotoTypeLabel(type)}
                    photo={photo}
                    onPhotoClick={onPhotoClick}
                    onDeletePhoto={onDeletePhoto}
                    onClassifyPhoto={onClassifyPhoto}
                  />
                )
              })}
            </div>

            {pkg.unclassified.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-amber-700">Sin clasificar</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {pkg.unclassified.map((photo) => (
                    <PoseSlot
                      key={String(photo.id)}
                      label="Sin clasificar"
                      photo={photo}
                      onPhotoClick={onPhotoClick}
                      onDeletePhoto={onDeletePhoto}
                      onClassifyPhoto={onClassifyPhoto}
                      showClassify
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ))}
      </CardContent>
    </Card>
  )
}

function PoseSlot({
  label,
  photo,
  onPhotoClick,
  onDeletePhoto,
  onClassifyPhoto,
  showClassify = false,
}: {
  label: string
  photo: PackagedProgressPhoto | null
  onPhotoClick?: (photo: PackagedProgressPhoto) => void
  onDeletePhoto?: (photo: PackagedProgressPhoto) => void | Promise<void>
  onClassifyPhoto?: (photo: PackagedProgressPhoto, photoType: string) => void | Promise<void>
  showClassify?: boolean
}) {
  if (!photo) {
    return (
      <div className="flex aspect-[3/4] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/40 p-2 text-center">
        <Camera className="mb-2 h-6 w-6 text-muted-foreground" />
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">Foto no disponible</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card text-left shadow-sm">
      <button
        type="button"
        onClick={() => onPhotoClick?.(photo)}
        className={`block w-full text-left ${onPhotoClick ? "hover:-translate-y-0.5 hover:shadow-md" : "cursor-default"}`}
      >
        <div className="relative aspect-[3/4] bg-muted">
          {photo.photo_url ? (
            <Image
              src={photo.photo_url}
              alt={`${label} del ${photo.date}`}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <Camera className="absolute inset-0 m-auto h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div className="space-y-1 p-2">
          <p className="text-xs font-medium">{label}</p>
          {photo.weight != null ? (
            <p className="text-xs text-muted-foreground">{photo.weight} kg</p>
          ) : null}
        </div>
      </button>
      {(onDeletePhoto || (showClassify && onClassifyPhoto)) && (
        <div className="space-y-2 border-t p-2">
          {showClassify && onClassifyPhoto ? (
            <select
              className="w-full rounded-md border bg-background px-2 py-1 text-xs"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) void onClassifyPhoto(photo, e.target.value)
              }}
              aria-label="Clasificar postura"
            >
              <option value="" disabled>
                Clasificar…
              </option>
              {PHOTO_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : null}
          {onDeletePhoto ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-full gap-1 text-xs text-destructive"
              onClick={() => void onDeletePhoto(photo)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Borrar
            </Button>
          ) : null}
        </div>
      )}
    </div>
  )
}

function ComparisonSlot({
  photo,
  label,
}: {
  photo: PackagedProgressPhoto | null
  label: string
}) {
  if (!photo) {
    return (
      <div className="flex aspect-[3/4] flex-col items-center justify-center rounded-md border border-dashed bg-white/60 p-2 text-center">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">Foto no disponible</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-md border bg-white">
      <div className="relative aspect-[3/4] bg-muted">
        {photo.photo_url ? (
          <Image src={photo.photo_url} alt={label} fill className="object-cover" unoptimized />
        ) : (
          <Camera className="absolute inset-0 m-auto h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="p-1.5">
        <p className="text-[11px] font-medium">{label}</p>
        <p className="text-[10px] text-muted-foreground">{formatDate(photo.date)}</p>
      </div>
    </div>
  )
}
