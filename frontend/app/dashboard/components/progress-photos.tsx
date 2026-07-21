"use client"

import { useState, useRef } from "react"
import { Camera, ChevronLeft, ChevronRight, Plus, Calendar, Upload, X, ZoomIn, GitCompare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { useProgressPhotos } from "@/hooks/use-progress-photos"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ProgressPhotoPackages } from "@/components/progress-photo-packages"
import { getPhotoTypeLabel, PHOTO_TYPE_OPTIONS, type ProgressPhotoType } from "@/lib/progress-photo-types"
import { buildComparisonsByType } from "@/lib/progress-photo-compare"

export function ProgressPhotos() {
  const [currentPhoto, setCurrentPhoto] = useState(0)
  const { photos, loading, uploading, error, uploadPhotos, deletePhoto, refreshPhotos } = useProgressPhotos()

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null)
  const [compareOpen, setCompareOpen] = useState(false)
  const [newPhotoWeight, setNewPhotoWeight] = useState("")
  const [newPhotoDate, setNewPhotoDate] = useState(() => new Date().toLocaleDateString('en-CA'))
  const [selectedPhotoType, setSelectedPhotoType] = useState<ProgressPhotoType>('front')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const nextPhoto = () => {
    if (photos.length > 1) {
      setCurrentPhoto((prev) => (prev + 1) % photos.length)
    }
  }

  const prevPhoto = () => {
    if (photos.length > 1) {
      setCurrentPhoto((prev) => (prev - 1 + photos.length) % photos.length)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      if (files.every((file) => file.type.startsWith('image/'))) {
        previewUrls.forEach((url) => URL.revokeObjectURL(url))
        setSelectedFiles(files)
        setPreviewUrls(files.map((file) => URL.createObjectURL(file)))
      } else {
        toast({
          title: "❌ Error",
          description: "Por favor selecciona un archivo de imagen válido.",
        })
      }
    }
  }

  const handleUploadPhoto = async () => {
    if (uploading) return
    if (selectedFiles.length === 0 || !newPhotoWeight.trim()) {
      toast({
        title: "❌ Error",
        description: "Por favor selecciona una foto y especifica el peso actual.",
      })
      return
    }

    try {
      const weight = parseFloat(newPhotoWeight)

      await uploadPhotos(selectedFiles, weight, `Peso: ${newPhotoWeight} kg`, selectedPhotoType, newPhotoDate)

      // Reset form
      setSelectedFiles([])
      setNewPhotoWeight("")
      setSelectedPhotoType('front')
      setIsUploadDialogOpen(false)
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
      setPreviewUrls([])

      // Forzar re-render para actualizar la evolución del peso
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('weightUpdated', {
          detail: { weight }
        }))
      }, 100)

      toast({
        title: "✅ ¡Foto añadida!",
        description: `${selectedFiles.length} foto${selectedFiles.length === 1 ? "" : "s"} de progreso guardada${selectedFiles.length === 1 ? "" : "s"} correctamente.`,
      })
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudo subir la foto. Inténtalo de nuevo.",
        variant: "destructive",
      })
    }
  }

  const resetUploadForm = () => {
    setSelectedFiles([])
    // Solo revocar la URL de preview si existe
    previewUrls.forEach((url) => URL.revokeObjectURL(url))
    setPreviewUrls([])
    setNewPhotoWeight("")
    setSelectedPhotoType('front')
    setNewPhotoDate(new Date().toLocaleDateString('en-CA'))
  }

  const handleDeletePhoto = async (photoId: string | number) => {
    if (!window.confirm("¿Quieres borrar esta foto? Esta acción no se puede deshacer.")) return
    try {
      await deletePhoto(photoId)
      await refreshPhotos()
      toast({
        title: "✅ Foto eliminada",
        description: "La foto se ha borrado correctamente.",
      })
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "No se pudo borrar la foto.",
        variant: "destructive",
      })
    }
  }

  const handlePhotoClick = (index: number) => {
    setCurrentPhoto(index)
    const photo = photos[index]
    if (photo) {
      toast({
        title: `Foto del ${photo.date}`,
        description: `${getPhotoTypeLabel(photo.photo_type)} - ${photo.weight ? `${photo.weight} kg` : 'Sin peso'}`,
      })
    }
  }

  // Si no hay fotos, mostrar mensaje de estado vacío
  if (!loading && photos.length === 0) {
    return (
      <Card className="h-fit">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Camera className="h-4 w-4" />
            Progreso Fotográfico
          </CardTitle>
          <CardDescription className="text-sm">Tu transformación visual</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="text-center py-8">
            <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Aún no tienes fotos de progreso</p>
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Subir Primera Foto
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-fit">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Camera className="h-4 w-4" />
          Progreso Fotográfico
        </CardTitle>
        <CardDescription className="text-sm">Tu transformación visual</CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        {/* Indicador de carga */}
        {loading && (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            <span className="ml-2 text-muted-foreground">Cargando fotos...</span>
          </div>
        )}

        {/* Mensaje de error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm">Error: {error}</p>
          </div>
        )}

        {/* Contenido principal */}
        {!loading && photos.length > 0 && (
          <div className="space-y-3 sm:space-y-4">
            {/* Foto principal con overlay mejorado */}
            <div className="relative bg-gradient-to-br from-muted/30 to-muted/60 rounded-xl p-3 sm:p-4 overflow-hidden group">
              <div className="flex items-center justify-center min-h-[180px] sm:min-h-[220px] lg:min-h-[240px]">
                <div className="relative transform transition-all duration-500 group-hover:scale-105">
                  <Image
                    src={photos[currentPhoto]?.photo_url || "/placeholder.svg"}
                    alt={`Progreso ${photos[currentPhoto]?.date || 'Sin fecha'}`}
                    width={120}
                    height={160}
                    className="sm:w-[140px] sm:h-[180px] lg:w-[150px] lg:h-[200px] rounded-lg object-cover shadow-lg border-2 border-border transition-all duration-500 hover:shadow-2xl animate-in fade-in-0 duration-700 cursor-zoom-in"
                    onClick={() => setZoomPhoto(photos[currentPhoto]?.photo_url || null)}
                  />
                  {/* Overlay con información */}
                  <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-sm rounded-md p-2 transform transition-all duration-500 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="text-white text-xs text-center">
                      <div className="font-medium animate-in slide-in-from-bottom-2 duration-300">
                        {getPhotoTypeLabel(photos[currentPhoto]?.photo_type)}
                      </div>
                      <div className="text-white/80 animate-in slide-in-from-bottom-2 duration-300 delay-100">
                        {photos[currentPhoto]?.weight ? `${photos[currentPhoto].weight} kg` : 'Sin peso'}
                      </div>
                    </div>
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
                    className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-card/90 hover:bg-white shadow-md transform transition-all duration-500 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 hover:scale-110"
                    aria-label="Foto anterior"
                  >
                    <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 text-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={nextPhoto}
                    className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-card/90 hover:bg-white shadow-md transform transition-all duration-500 translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 hover:scale-110"
                    aria-label="Foto siguiente"
                  >
                    <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-foreground" />
                  </Button>
                </>
              )}
            </div>

            {/* Información de la foto actual */}
            {photos.length > 0 && (
              <div className="flex items-center justify-between p-2 sm:p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  <span className="text-xs sm:text-sm font-medium">{photos[currentPhoto]?.date || 'Sin fecha'}</span>
                  <Badge variant="outline" className="text-xs">
                    {getPhotoTypeLabel(photos[currentPhoto]?.photo_type)}
                  </Badge>
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {currentPhoto + 1} de {photos.length}
                </span>
              </div>
            )}

            {/* Miniaturas */}
            {photos.length > 0 && (
              <div className="flex gap-1.5 sm:gap-2 justify-center animate-in fade-in-0 duration-800 delay-400">
                {photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    onClick={() => handlePhotoClick(index)}
                    className={`relative w-10 h-12 sm:w-12 sm:h-16 rounded-md overflow-hidden border-2 transition-all duration-500 hover:scale-110 ${index === currentPhoto
                        ? "border-primary shadow-md scale-105 ring-2 ring-primary/20"
                        : "border-muted hover:border-muted-foreground"
                      }`}
                    aria-label={`Ver foto ${index + 1} de ${photos.length}`}
                  >
                    <Image
                      src={photo.photo_url || "/placeholder.svg"}
                      alt={`Miniatura ${photo.date || 'Sin fecha'}`}
                      width={48}
                      height={64}
                      className="object-cover transition-all duration-300 hover:brightness-110"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Botón para añadir foto */}
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="w-full bg-transparent hover:bg-primary hover:text-primary-foreground transition-all duration-300 text-sm"
                  variant="outline"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Añadir Nueva Foto
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Subir Nueva Foto de Progreso</DialogTitle>
                  <DialogDescription>
                    Selecciona una foto y especifica tu peso actual para registrar tu progreso.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Selección de archivo */}
                  <div>
                    <Label htmlFor="photo-upload">Seleccionar Foto</Label>
                    <div className="mt-2">
                      <input
                        ref={fileInputRef}
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        aria-label="Seleccionar foto de progreso"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {selectedFiles.length > 0
                          ? `${selectedFiles.length} foto${selectedFiles.length === 1 ? "" : "s"} seleccionada${selectedFiles.length === 1 ? "" : "s"}`
                          : "Seleccionar una o varias fotos"}
                      </Button>
                    </div>
                  </div>

                  {/* Preview de la imagen */}
                  {previewUrls.length > 0 && (
                    <div className="relative">
                      <Label>Vista previa:</Label>
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {previewUrls.map((url, index) => (
                          <div key={url} className="relative aspect-[3/4] overflow-hidden rounded-lg border">
                            <Image
                              src={url}
                              alt={`Preview ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={resetUploadForm}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white hover:bg-red-600"
                          aria-label="Eliminar foto"
                          title="Eliminar foto"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Fecha de la foto */}
                  <div>
                    <Label htmlFor="photo-date">Fecha de la foto</Label>
                    <Input
                      id="photo-date"
                      type="date"
                      max={new Date().toLocaleDateString('en-CA')}
                      value={newPhotoDate}
                      onChange={(e) => setNewPhotoDate(e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="photo-type">Postura</Label>
                    <select
                      id="photo-type"
                      value={selectedPhotoType}
                      onChange={(e) => setSelectedPhotoType(e.target.value as ProgressPhotoType)}
                      className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      {PHOTO_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Sube una postura por lote. Repite para frontal, espalda y laterales.
                    </p>
                  </div>

                  {/* Campo de peso */}
                  <div>
                    <Label htmlFor="weight">Peso Actual (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      placeholder="Ej: 75.5"
                      value={newPhotoWeight}
                      onChange={(e) => setNewPhotoWeight(e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        resetUploadForm()
                        setIsUploadDialogOpen(false)
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={handleUploadPhoto}
                      disabled={uploading || selectedFiles.length === 0 || !newPhotoWeight.trim()}
                      className="flex-1"
                    >
                      {uploading
                        ? "Subiendo…"
                        : selectedFiles.length > 1
                          ? "Subir fotos"
                          : "Subir foto"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Comparativa rápida */}
            {photos.length > 1 && (
              <button
                className="w-full p-2 sm:p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-left"
                onClick={() => setCompareOpen(true)}
              >
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-green-700 font-medium flex items-center gap-1.5">
                    <GitCompare className="h-3.5 w-3.5" />
                    Comparar primera y última foto
                  </span>
                  <span className="text-green-600 font-bold">
                    {(() => {
                      if (photos.length > 1 && photos[0]?.weight && photos[photos.length - 1]?.weight) {
                        const firstWeight = photos[0].weight
                        const lastWeight = photos[photos.length - 1].weight
                        if (firstWeight && lastWeight) {
                          return `${(firstWeight - lastWeight).toFixed(1)} kg`
                        }
                      }
                      return '—'
                    })()}
                  </span>
                </div>
              </button>
            )}

            <ProgressPhotoPackages
              photos={photos}
              onPhotoClick={(photo) => {
                const index = photos.findIndex((item) => String(item.id) === String(photo.id))
                if (index >= 0) setCurrentPhoto(index)
              }}
              onDeletePhoto={(photo) => handleDeletePhoto(photo.id)}
            />
          </div>
        )}
      </CardContent>

      {/* Dialog: Zoom de foto */}
      <Dialog open={!!zoomPhoto} onOpenChange={(open) => { if (!open) setZoomPhoto(null) }}>
        <DialogContent className="max-w-3xl p-2 bg-black/95 border-white/10">
          <DialogHeader className="sr-only">
            <DialogTitle>Foto ampliada</DialogTitle>
            <DialogDescription>Vista ampliada de la foto de progreso</DialogDescription>
          </DialogHeader>
          <button
            className="absolute top-2 right-2 z-10 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 transition"
            onClick={() => setZoomPhoto(null)}
          >
            <X className="h-5 w-5" />
          </button>
          {zoomPhoto && (
            <div className="flex items-center justify-center w-full">
              <Image
                src={zoomPhoto}
                alt="Foto de progreso ampliada"
                width={700}
                height={900}
                className="rounded-lg object-contain max-h-[80vh] w-auto"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Comparación lado a lado */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5 text-green-600" />
              Comparación de progreso
            </DialogTitle>
            <DialogDescription>Primera vs última foto por cada postura</DialogDescription>
          </DialogHeader>
          {photos.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 max-h-[70vh] overflow-y-auto">
              {buildComparisonsByType(photos).map((cmp) => (
                <div key={cmp.type} className="rounded-lg border p-2">
                  <p className="mb-2 text-xs font-semibold">{cmp.label}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[cmp.first, cmp.last].map((photo, idx) => (
                      <div key={`${cmp.type}-${idx}`} className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {idx === 0 ? "Primera" : "Última"}
                        </span>
                        {photo?.photo_url ? (
                          <Image
                            src={photo.photo_url}
                            alt={`${cmp.label} ${idx === 0 ? "primera" : "última"}`}
                            width={140}
                            height={180}
                            className="rounded-md object-cover aspect-[3/4] w-full"
                          />
                        ) : (
                          <div className="flex aspect-[3/4] w-full items-center justify-center rounded-md border border-dashed text-[10px] text-muted-foreground">
                            Foto no disponible
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay fotos para comparar.</p>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
