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
export function ProgressPhotos() {
  const [currentPhoto, setCurrentPhoto] = useState(0)
  const { photos, loading, error, uploadPhoto, deletePhoto } = useProgressPhotos()

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null)
  const [compareOpen, setCompareOpen] = useState(false)
  const [newPhotoWeight, setNewPhotoWeight] = useState("")
  const [newPhotoDate, setNewPhotoDate] = useState(() => new Date().toLocaleDateString('en-CA'))
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
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
    const file = event.target.files?.[0]
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedFile(file)
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
      } else {
        toast({
          title: "❌ Error",
          description: "Por favor selecciona un archivo de imagen válido.",
        })
      }
    }
  }

  const handleUploadPhoto = async () => {
    if (!selectedFile || !newPhotoWeight.trim()) {
      toast({
        title: "❌ Error",
        description: "Por favor selecciona una foto y especifica el peso actual.",
      })
      return
    }

    try {
      const weight = parseFloat(newPhotoWeight)

      await uploadPhoto(selectedFile, weight, `Peso: ${newPhotoWeight} kg`, 'front', newPhotoDate)

      // Reset form
      setSelectedFile(null)
      setNewPhotoWeight("")
      setIsUploadDialogOpen(false)
      setPreviewUrl(null)

      // Forzar re-render para actualizar la evolución del peso
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('weightUpdated', {
          detail: { weight }
        }))
      }, 100)

      toast({
        title: "✅ ¡Foto añadida!",
        description: "Tu nueva foto de progreso ha sido guardada correctamente.",
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
    setSelectedFile(null)
    // Solo revocar la URL de preview si existe
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setNewPhotoWeight("")
    setNewPhotoDate(new Date().toLocaleDateString('en-CA'))
  }

  const handlePhotoClick = (index: number) => {
    setCurrentPhoto(index)
    const photo = photos[index]
    if (photo) {
      toast({
        title: `Foto del ${photo.date}`,
        description: `${photo.photo_type === 'front' ? 'Frontal' :
          photo.photo_type === 'side' ? 'Lateral' :
            photo.photo_type === 'back' ? 'Espalda' : 'Detalle'} - ${photo.weight ? `${photo.weight} kg` : 'Sin peso'}`,
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
                        {photos[currentPhoto]?.photo_type === 'front' ? 'Frontal' :
                          photos[currentPhoto]?.photo_type === 'side' ? 'Lateral' :
                            photos[currentPhoto]?.photo_type === 'back' ? 'Espalda' : 'Detalle'}
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
                    {photos[currentPhoto]?.photo_type === 'front' ? 'Frontal' :
                      photos[currentPhoto]?.photo_type === 'side' ? 'Lateral' :
                        photos[currentPhoto]?.photo_type === 'back' ? 'Espalda' : 'Detalle'}
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
                        {selectedFile ? selectedFile.name : "Seleccionar archivo"}
                      </Button>
                    </div>
                  </div>

                  {/* Preview de la imagen */}
                  {previewUrl && (
                    <div className="relative">
                      <Label>Vista previa:</Label>
                      <div className="mt-2 relative inline-block">
                        <Image
                          src={previewUrl}
                          alt="Preview"
                          width={120}
                          height={160}
                          className="rounded-lg object-cover border"
                        />
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
                      disabled={!selectedFile || !newPhotoWeight.trim()}
                      className="flex-1"
                    >
                      Subir Foto
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
            <DialogDescription>Primera foto vs. foto más reciente</DialogDescription>
          </DialogHeader>
          {photos.length > 1 ? (
            <div className="grid grid-cols-2 gap-4 mt-2">
              {/* Primera foto */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Inicio</span>
                <Image
                  src={photos[photos.length - 1]?.photo_url || "/placeholder.svg"}
                  alt="Primera foto"
                  width={260}
                  height={340}
                  className="rounded-lg object-cover w-full max-h-72 shadow"
                />
                <p className="text-sm text-center text-muted-foreground">
                  {photos[photos.length - 1]?.date
                    ? new Date(photos[photos.length - 1].date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })
                    : "Sin fecha"}
                  {photos[photos.length - 1]?.weight ? ` · ${photos[photos.length - 1].weight} kg` : ""}
                </p>
              </div>
              {/* Foto más reciente */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">Ahora</span>
                <Image
                  src={photos[0]?.photo_url || "/placeholder.svg"}
                  alt="Foto reciente"
                  width={260}
                  height={340}
                  className="rounded-lg object-cover w-full max-h-72 shadow ring-2 ring-green-400"
                />
                <p className="text-sm text-center text-muted-foreground">
                  {photos[0]?.date
                    ? new Date(photos[0].date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })
                    : "Sin fecha"}
                  {photos[0]?.weight ? ` · ${photos[0].weight} kg` : ""}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Necesitas al menos 2 fotos para comparar</p>
          )}
          {photos.length > 1 && photos[0]?.weight && photos[photos.length - 1]?.weight && (
            <div className="mt-3 p-3 bg-green-50 rounded-lg text-center">
              <p className="text-green-700 font-semibold text-sm">
                Diferencia de peso:{" "}
                <span className="text-green-600 font-bold text-base">
                  {(photos[photos.length - 1].weight! - photos[0].weight!).toFixed(1)} kg
                </span>
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
