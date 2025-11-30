"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Camera, Calendar, Eye, Trash2, Upload, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"

interface ProgressPhoto {
  id: string
  date: string
  url: string
  type: "front" | "side" | "back" | "detail"
  weight?: number
  notes?: string
  measurements?: {
    chest?: number
    waist?: number
    hips?: number
    arms?: number
    thighs?: number
  }
}

export function ProgressPhotosCarousel({ userId }: { userId: string }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAddPhoto, setShowAddPhoto] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null)
  const [newPhoto, setNewPhoto] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "front" as const,
    weight: "",
    notes: "",
  })

  const [photos, setPhotos] = useState<ProgressPhoto[]>([
    {
      id: "1",
      date: "2024-01-01",
      url: "/placeholder.svg?height=400&width=300&text=Foto+Frontal",
      type: "front",
      weight: 75.2,
      notes: "Foto inicial del programa",
      measurements: { chest: 95, waist: 85, hips: 98, arms: 32, thighs: 58 },
    },
    {
      id: "2",
      date: "2024-01-15",
      url: "/placeholder.svg?height=400&width=300&text=Foto+Lateral",
      type: "side",
      weight: 74.8,
      notes: "Después de 2 semanas",
      measurements: { chest: 94, waist: 84, hips: 97, arms: 32, thighs: 57 },
    },
    {
      id: "3",
      date: "2024-01-29",
      url: "/placeholder.svg?height=400&width=300&text=Foto+Espalda",
      type: "back",
      weight: 74.1,
      notes: "Un mes de progreso",
      measurements: { chest: 93, waist: 83, hips: 96, arms: 31, thighs: 56 },
    },
    {
      id: "4",
      date: "2024-02-15",
      url: "/placeholder.svg?height=400&width=300&text=Foto+Detalle",
      type: "detail",
      weight: 73.5,
      notes: "Definición abdominal mejorada",
    },
    {
      id: "5",
      date: "2024-02-29",
      url: "/placeholder.svg?height=400&width=300&text=Foto+Frontal+2",
      type: "front",
      weight: 72.5,
      notes: "2 meses de transformación",
      measurements: { chest: 92, waist: 81, hips: 94, arms: 31, thighs: 55 },
    },
  ])

  const nextPhoto = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length)
  }

  const prevPhoto = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length)
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "front":
        return "Frontal"
      case "side":
        return "Lateral"
      case "back":
        return "Espalda"
      case "detail":
        return "Detalle"
      default:
        return type
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "front":
        return <Badge className="bg-blue-100 text-blue-800 border-0">Frontal</Badge>
      case "side":
        return <Badge className="bg-green-100 text-green-800 border-0">Lateral</Badge>
      case "back":
        return <Badge className="bg-purple-100 text-purple-800 border-0">Espalda</Badge>
      case "detail":
        return <Badge className="bg-orange-100 text-orange-800 border-0">Detalle</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const handleAddPhoto = () => {
    const photo: ProgressPhoto = {
      id: Date.now().toString(),
      date: newPhoto.date,
      type: newPhoto.type,
      url: `/placeholder.svg?height=400&width=300&text=Nueva+Foto+${getTypeLabel(newPhoto.type)}`,
      weight: newPhoto.weight ? Number(newPhoto.weight) : undefined,
      notes: newPhoto.notes,
    }

    setPhotos((prev) => [...prev, photo].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()))
    setNewPhoto({ date: new Date().toISOString().split("T")[0], type: "front", weight: "", notes: "" })
    setShowAddPhoto(false)

    toast({
      title: "✅ Foto añadida",
      description: "La foto de progreso ha sido añadida correctamente",
    })
  }

  const handleDeletePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((photo) => photo.id !== photoId))
    if (currentIndex >= photos.length - 1) {
      setCurrentIndex(Math.max(0, photos.length - 2))
    }
    toast({
      title: "🗑️ Foto eliminada",
      description: "La foto ha sido eliminada correctamente",
    })
  }

  const currentPhoto = photos[currentIndex]

  return (
    <div className="space-y-6">
      <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
                <Camera className="h-5 w-5" />
                Fotos de Progreso
              </CardTitle>
              <CardDescription>Galería de transformación del usuario ({photos.length} fotos)</CardDescription>
            </div>
            <Button
              onClick={() => setShowAddPhoto(true)}
              className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              Añadir foto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <div className="text-center py-12">
              <Camera className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No hay fotos de progreso</h3>
              <p className="text-gray-500 mb-4">Añade la primera foto para comenzar a documentar el progreso</p>
              <Button
                onClick={() => setShowAddPhoto(true)}
                className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0"
              >
                <Plus className="h-4 w-4 mr-2" />
                Añadir primera foto
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Carrusel principal */}
              <div className="relative">
                <div className="aspect-[3/4] max-w-md mx-auto bg-gray-100 rounded-lg overflow-hidden shadow-lg">
                  <img
                    src={currentPhoto.url || "/placeholder.svg"}
                    alt={`Progreso ${currentPhoto.date}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4">{getTypeBadge(currentPhoto.type)}</div>
                  <div className="absolute top-4 right-4 flex gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 bg-white/80 backdrop-blur-sm"
                      onClick={() => setSelectedPhoto(currentPhoto)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 bg-white/80 backdrop-blur-sm text-red-600 hover:bg-red-50"
                      onClick={() => handleDeletePhoto(currentPhoto.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Controles de navegación */}
                {photos.length > 1 && (
                  <>
                    <Button
                      size="icon"
                      variant="outline"
                      className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 bg-white/80 backdrop-blur-sm"
                      onClick={prevPhoto}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 bg-white/80 backdrop-blur-sm"
                      onClick={nextPhoto}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </>
                )}
              </div>

              {/* Información de la foto actual */}
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{new Date(currentPhoto.date).toLocaleDateString("es-ES")}</span>
                </div>
                {currentPhoto.weight && <p className="text-sm text-gray-600">Peso: {currentPhoto.weight} kg</p>}
                {currentPhoto.notes && <p className="text-sm text-gray-700 italic">"{currentPhoto.notes}"</p>}
              </div>

              {/* Miniaturas */}
              {photos.length > 1 && (
                <div className="flex justify-center gap-2 overflow-x-auto pb-2">
                  {photos.map((photo, index) => (
                    <button
                      key={photo.id}
                      onClick={() => setCurrentIndex(index)}
                      className={`flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                        index === currentIndex
                          ? "border-pink-500 shadow-lg scale-105"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <img
                        src={photo.url || "/placeholder.svg"}
                        alt={`Miniatura ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Indicador de posición */}
              <div className="text-center text-sm text-gray-500">
                {currentIndex + 1} de {photos.length}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline de progreso */}
      {photos.length > 0 && (
        <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Timeline de Progreso
            </CardTitle>
            <CardDescription>Evolución cronológica de las fotos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className={`flex items-center gap-4 p-3 rounded-lg border transition-all cursor-pointer ${
                    index === currentIndex
                      ? "bg-gradient-to-r from-pink-50 to-rose-50 border-pink-200"
                      : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                  }`}
                  onClick={() => setCurrentIndex(index)}
                >
                  <div className="w-12 h-16 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                    <img
                      src={photo.url || "/placeholder.svg"}
                      alt={`Timeline ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{new Date(photo.date).toLocaleDateString("es-ES")}</span>
                      {getTypeBadge(photo.type)}
                    </div>
                    {photo.weight && <p className="text-sm text-gray-600">Peso: {photo.weight} kg</p>}
                    {photo.notes && <p className="text-sm text-gray-700 truncate">{photo.notes}</p>}
                  </div>
                  <div className="text-sm text-gray-500">#{index + 1}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog para añadir foto */}
      <Dialog open={showAddPhoto} onOpenChange={setShowAddPhoto}>
        <DialogContent className="backdrop-blur-sm bg-white/90 border-0 shadow-xl">
          <DialogHeader>
            <DialogTitle>Añadir Nueva Foto de Progreso</DialogTitle>
            <DialogDescription>Documenta el progreso del usuario con una nueva foto</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="photo-date">Fecha</Label>
              <Input
                id="photo-date"
                type="date"
                value={newPhoto.date}
                onChange={(e) => setNewPhoto((prev) => ({ ...prev, date: e.target.value }))}
                className="border-2 border-gray-200 focus:border-pink-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="photo-type">Tipo de foto</Label>
              <Select
                value={newPhoto.type}
                onValueChange={(value: any) => setNewPhoto((prev) => ({ ...prev, type: value }))}
              >
                <SelectTrigger className="border-2 border-gray-200 focus:border-pink-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="front">Frontal</SelectItem>
                  <SelectItem value="side">Lateral</SelectItem>
                  <SelectItem value="back">Espalda</SelectItem>
                  <SelectItem value="detail">Detalle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="photo-weight">Peso (kg) - Opcional</Label>
              <Input
                id="photo-weight"
                type="number"
                step="0.1"
                value={newPhoto.weight}
                onChange={(e) => setNewPhoto((prev) => ({ ...prev, weight: e.target.value }))}
                className="border-2 border-gray-200 focus:border-pink-400"
                placeholder="ej: 72.5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="photo-notes">Notas - Opcional</Label>
              <Input
                id="photo-notes"
                value={newPhoto.notes}
                onChange={(e) => setNewPhoto((prev) => ({ ...prev, notes: e.target.value }))}
                className="border-2 border-gray-200 focus:border-pink-400"
                placeholder="Observaciones sobre esta foto..."
              />
            </div>

            <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">Arrastra una imagen aquí o haz clic para seleccionar</p>
              <p className="text-xs text-gray-500 mt-1">JPG, PNG hasta 5MB</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPhoto(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddPhoto}
              className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0"
            >
              Añadir foto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para ver detalles de foto */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-2xl backdrop-blur-sm bg-white/90 border-0 shadow-xl">
          {selectedPhoto && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Detalles de la Foto
                </DialogTitle>
                <DialogDescription>
                  {getTypeLabel(selectedPhoto.type)} - {new Date(selectedPhoto.date).toLocaleDateString("es-ES")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="aspect-[3/4] max-w-sm mx-auto bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={selectedPhoto.url || "/placeholder.svg"}
                    alt={`Progreso ${selectedPhoto.date}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Fecha:</span>
                    <p>{new Date(selectedPhoto.date).toLocaleDateString("es-ES")}</p>
                  </div>
                  <div>
                    <span className="font-medium">Tipo:</span>
                    <p>{getTypeLabel(selectedPhoto.type)}</p>
                  </div>
                  {selectedPhoto.weight && (
                    <div>
                      <span className="font-medium">Peso:</span>
                      <p>{selectedPhoto.weight} kg</p>
                    </div>
                  )}
                </div>

                {selectedPhoto.notes && (
                  <div>
                    <span className="font-medium text-sm">Notas:</span>
                    <p className="text-sm text-gray-700 mt-1">{selectedPhoto.notes}</p>
                  </div>
                )}

                {selectedPhoto.measurements && (
                  <div>
                    <span className="font-medium text-sm">Medidas corporales:</span>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      {selectedPhoto.measurements.chest && <div>Pecho: {selectedPhoto.measurements.chest} cm</div>}
                      {selectedPhoto.measurements.waist && <div>Cintura: {selectedPhoto.measurements.waist} cm</div>}
                      {selectedPhoto.measurements.hips && <div>Caderas: {selectedPhoto.measurements.hips} cm</div>}
                      {selectedPhoto.measurements.arms && <div>Brazos: {selectedPhoto.measurements.arms} cm</div>}
                      {selectedPhoto.measurements.thighs && <div>Muslos: {selectedPhoto.measurements.thighs} cm</div>}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
