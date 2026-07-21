"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Camera, Plus, ChevronLeft, ChevronRight, RefreshCw, Calendar, Weight, X } from "lucide-react"
import Image from "next/image"
import { ProgressPhoto } from "@/lib/user-service"
import { ProgressPhotoPackages } from "@/components/progress-photo-packages"
import { getPhotoTypeLabel } from "@/lib/progress-photo-types"

interface PhotoCarouselProps {
  photos: ProgressPhoto[]
  loading: boolean
  onUploadPhoto: () => void
  onRefreshPhotos: () => void
  className?: string
}

export function PhotoCarousel({
  photos,
  loading,
  onUploadPhoto,
  onRefreshPhotos,
  className = ""
}: PhotoCarouselProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(false)
  const [compareBeforeIndex, setCompareBeforeIndex] = useState(0)
  const [compareAfterIndex, setCompareAfterIndex] = useState(0)

  // Asegurar que el índice esté dentro del rango válido
  useEffect(() => {
    if (photos.length > 0 && currentPhotoIndex >= photos.length) {
      setCurrentPhotoIndex(0)
    }
  }, [photos.length, currentPhotoIndex])

  useEffect(() => {
    if (photos.length > 0) {
      setCompareAfterIndex(0)
      setCompareBeforeIndex(Math.max(photos.length - 1, 0))
    }
  }, [photos.length])

  // Auto-play cuando hay más de una foto
  useEffect(() => {
    if (photos.length <= 1) {
      setIsAutoPlaying(false)
      return
    }

    let interval: NodeJS.Timeout
    if (isAutoPlaying) {
      interval = setInterval(() => {
        setCurrentPhotoIndex((prev) => (prev + 1) % photos.length)
      }, 3000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isAutoPlaying, photos.length])

  const nextPhoto = () => {
    if (photos.length > 1) {
      setCurrentPhotoIndex((prev) => (prev + 1) % photos.length)
    }
  }

  const prevPhoto = () => {
    if (photos.length > 1) {
      setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length)
    }
  }

  const goToPhoto = (index: number) => {
    if (index >= 0 && index < photos.length) {
      setCurrentPhotoIndex(index)
    }
  }

  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle>Cargando fotos...</CardTitle>
                <CardDescription>Obteniendo tu progreso fotográfico</CardDescription>
              </div>
            </div>
            <div className="animate-spin">
              <RefreshCw className="h-4 w-4" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-pulse space-y-4">
              <div className="mx-auto w-32 h-48 bg-muted rounded-lg"></div>
              <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
              <div className="h-3 bg-muted rounded w-3/4 mx-auto"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`${className} overflow-hidden`}>
      <CardHeader className="border-b dark:bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Camera className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl text-blue-900">Progreso Fotográfico</CardTitle>
              <CardDescription className="text-blue-700">Tu transformación visual documentada</CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Indicador de estado mejorado */}
            <div className="flex items-center gap-2 px-3 py-2 bg-card/80 backdrop-blur-sm rounded-full border border-blue-200 shadow-sm">
              <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
              <span className="text-sm font-medium text-blue-800">
                {photos.length} foto{photos.length !== 1 ? 's' : ''}
              </span>
            </div>

            {photos.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAutoPlay}
                className={`transition-all duration-300 ${isAutoPlaying
                    ? 'bg-green-500 text-white border-green-500 hover:bg-green-600'
                    : 'bg-card/80 hover:bg-card border-blue-200 dark:border-blue-700/50 text-blue-700 dark:text-blue-400'
                  }`}
              >
                {isAutoPlaying ? '⏸️ Pausar' : '▶️ Auto-play'}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onRefreshPhotos}
              disabled={loading}
              className="flex items-center gap-2 bg-card/80 hover:bg-card border-blue-200 dark:border-blue-700/50 text-blue-700 dark:text-blue-400 transition-all duration-300"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Cargando...' : 'Refrescar'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {photos.length === 0 ? (
          <div className="text-center py-12 px-6">
            <div className="relative mb-6">
              <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
                <Camera className="h-12 w-12 text-blue-400" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <Plus className="h-5 w-5 text-white" />
              </div>
            </div>

            <h3 className="text-xl font-semibold text-foreground mb-3">Comienza tu transformación visual</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Documenta tu progreso con fotos para ver cómo tu dedicación se convierte en resultados visibles
            </p>

            <Button
              onClick={onUploadPhoto}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <Plus className="h-5 w-5 mr-2" />
              Subir Primera Foto
            </Button>

            <div className="mt-6 text-sm text-muted-foreground">
              📸 Tip: Toma fotos desde el mismo ángulo y con la misma iluminación para mejor comparación
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Foto Principal */}
            <div className="relative bg-muted/30 rounded-2xl p-6 overflow-hidden group">
              <div className="flex items-center justify-center min-h-[320px]">
                <div className="relative transform transition-all duration-500 group-hover:scale-105">
                  <div className="relative">
                    <Image
                      src={photos[currentPhotoIndex]?.photo_url || "/placeholder.svg"}
                      alt={`Progreso ${photos[currentPhotoIndex]?.date || 'Sin fecha'}`}
                      width={240}
                      height={360}
                      className="rounded-xl object-cover shadow-2xl border-4 border-white/30 transition-all duration-500 hover:shadow-3xl cursor-pointer"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.svg"
                      }}
                      priority={currentPhotoIndex === 0}
                    />

                    {/* Overlay con información mejorado */}
                    <div className="absolute bottom-3 left-3 right-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent backdrop-blur-sm rounded-xl p-3 transform transition-all duration-500 translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
                      <div className="text-white text-center">
                        <div className="font-semibold text-sm mb-1">
                          {getPhotoTypeLabel(photos[currentPhotoIndex]?.photo_type || 'other')}
                        </div>
                        {photos[currentPhotoIndex]?.weight && (
                          <div className="text-white/90 text-xs flex items-center justify-center gap-1">
                            <Weight className="h-3 w-3" />
                            {photos[currentPhotoIndex].weight} kg
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Indicador de progreso */}
                  <div className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm rounded-full px-3 py-1 shadow-lg">
                    <span className="text-xs font-semibold text-blue-700">
                      {currentPhotoIndex + 1} / {photos.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Controles de navegación mejorados */}
              {photos.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={prevPhoto}
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-card/95 hover:bg-muted shadow-xl transform transition-all duration-500 -translate-x-3 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 hover:scale-110 border border-border"
                    aria-label="Foto anterior"
                    title="Foto anterior"
                  >
                    <ChevronLeft className="h-6 w-6 text-blue-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={nextPhoto}
                    className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-card/95 hover:bg-muted shadow-xl transform transition-all duration-500 translate-x-3 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 hover:scale-110 border border-border"
                    aria-label="Foto siguiente"
                    title="Foto siguiente"
                  >
                    <ChevronRight className="h-6 w-6 text-blue-600" />
                  </Button>
                </>
              )}
            </div>

            {/* Información de la foto mejorada */}
            <div className="flex items-center justify-between p-4 bg-blue-500/5 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800/30">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-semibold text-blue-900">
                    {photos[currentPhotoIndex]?.date ? formatDate(photos[currentPhotoIndex].date) : 'Sin fecha'}
                  </span>
                </div>

                <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
                  {getPhotoTypeLabel(photos[currentPhotoIndex]?.photo_type || 'other')}
                </Badge>

                {photos[currentPhotoIndex]?.weight && (
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Weight className="h-3 w-3 text-green-600" />
                    </div>
                    <span className="text-sm font-semibold text-green-700">
                      {photos[currentPhotoIndex].weight} kg
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-blue-700">
                  {currentPhotoIndex + 1} de {photos.length}
                </span>
              </div>
            </div>

            {/* Miniaturas mejoradas */}
            {photos.length > 1 && (
              <div className="space-y-3">
                <div className="text-center">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">Navegación Rápida</h4>
                  <div className="w-16 h-0.5 bg-gradient-to-r from-blue-400 to-indigo-400 mx-auto rounded-full"></div>
                </div>

                <div className="flex gap-3 justify-center flex-wrap">
                  {photos.map((photo, index) => (
                    <button
                      key={photo.id}
                      onClick={() => goToPhoto(index)}
                      className={`relative w-20 h-24 rounded-xl overflow-hidden border-3 transition-all duration-300 hover:scale-110 group ${index === currentPhotoIndex
                          ? "border-blue-500 shadow-lg scale-110 ring-4 ring-blue-200"
                          : "border-border hover:border-blue-300 hover:shadow-md"
                        }`}
                      aria-label={`Ver foto ${index + 1} de ${photos.length}`}
                      title={`Ver foto ${index + 1} de ${photos.length}`}
                    >
                      <Image
                        src={photo.photo_url || "/placeholder.svg"}
                        alt={`Miniatura ${photo.date || 'Sin fecha'}`}
                        width={80}
                        height={96}
                        className="object-cover transition-all duration-300 group-hover:brightness-110"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = "/placeholder.svg"
                        }}
                      />

                      {/* Indicador de foto activa */}
                      {index === currentPhotoIndex && (
                        <div className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-card rounded-full"></div>
                        </div>
                      )}

                      {/* Overlay de información */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="text-white text-xs text-center">
                          <div className="font-medium">{getPhotoTypeLabel(photo.photo_type)}</div>
                          {photo.weight && (
                            <div className="text-white/80">{photo.weight} kg</div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Botón para añadir foto mejorado */}
            <Button
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl border-0"
              onClick={onUploadPhoto}
            >
              <Plus className="h-5 w-5 mr-2" />
              Añadir Nueva Foto
            </Button>

            {/* Comparativa visual antes / después */}
            {photos.length > 1 && (
              <div className="p-4 bg-violet-500/5 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800/30 rounded-xl space-y-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h4 className="text-base font-semibold text-violet-900">Comparativa visual antes / después</h4>
                    <p className="text-sm text-violet-700">Compara dos momentos de tu proceso lado a lado.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCompareBeforeIndex(currentPhotoIndex)}>
                      Usar actual como ANTES
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCompareAfterIndex(currentPhotoIndex)}>
                      Usar actual como DESPUÉS
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {[
                    { label: "ANTES", index: compareBeforeIndex, setter: setCompareBeforeIndex },
                    { label: "DESPUÉS", index: compareAfterIndex, setter: setCompareAfterIndex },
                  ].map((slot) => {
                    const photo = photos[slot.index]
                    return (
                      <div key={slot.label} className="rounded-xl border bg-card p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <Badge className={slot.label === "ANTES" ? "bg-slate-100 text-slate-700" : "bg-violet-100 text-violet-700"}>
                            {slot.label}
                          </Badge>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => slot.setter((prev) => (prev - 1 + photos.length) % photos.length)}>
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => slot.setter((prev) => (prev + 1) % photos.length)}>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex justify-center">
                          <Image
                            src={photo?.photo_url || "/placeholder.svg"}
                            alt={`${slot.label} ${photo?.date || ""}`}
                            width={200}
                            height={280}
                            className="rounded-xl object-cover border"
                          />
                        </div>
                        <div className="mt-3 text-sm text-muted-foreground space-y-1">
                          <div><span className="font-medium">Fecha:</span> {photo?.date ? formatDate(photo.date) : "—"}</div>
                          <div><span className="font-medium">Tipo:</span> {getPhotoTypeLabel(photo?.photo_type || "other")}</div>
                          <div><span className="font-medium">Peso:</span> {photo?.weight ? `${photo.weight} kg` : "—"}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Comparativa rápida mejorada */}
            {photos.length > 1 && (
              <div className="p-4 bg-green-500/5 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Weight className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-green-700 font-semibold">Progreso Total</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-green-600">
                      {(() => {
                        if (photos.length > 1 && photos[0]?.weight && photos[photos.length - 1]?.weight) {
                          const firstWeight = photos[0].weight
                          const lastWeight = photos[photos.length - 1].weight
                          if (firstWeight && lastWeight) {
                            const change = firstWeight - lastWeight
                            return `${change > 0 ? '-' : '+'}${Math.abs(change).toFixed(1)} kg`
                          }
                        }
                        return '0.0 kg'
                      })()}
                    </span>
                    <div className="text-xs text-green-600 font-medium">
                      {(() => {
                        if (photos.length > 1 && photos[0]?.weight && photos[photos.length - 1]?.weight) {
                          const firstWeight = photos[0].weight
                          const lastWeight = photos[photos.length - 1].weight
                          if (firstWeight && lastWeight) {
                            const change = firstWeight - lastWeight
                            return change > 0 ? 'Perdidos' : 'Ganados'
                          }
                        }
                        return 'Sin cambios'
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <ProgressPhotoPackages
              photos={photos}
              onPhotoClick={(photo) => goToPhoto(photos.findIndex((item) => String(item.id) === String(photo.id)))}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
