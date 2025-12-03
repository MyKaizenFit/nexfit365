"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Target, Sparkles, Ruler, Weight, Calendar, TrendingUp, 
  CheckCircle, Circle, Edit, Camera, Upload, Image as ImageIcon,
  ArrowUp, ArrowDown, Minus, Heart, Award, Flame, Scale,
  Plus, Trash2, ChevronLeft, ChevronRight, X, RefreshCw
} from 'lucide-react'
import { toast } from "@/hooks/use-toast"
import { useUserProfile } from "@/hooks/use-user-profile"
import { useProgressStats } from "@/hooks/use-progress-stats"
import { useProgressPhotos } from "@/hooks/use-progress-photos"
import { useWeightHistory } from "@/hooks/use-weight-history"
import { userService } from "@/lib/user-service"
import { format, differenceInDays, differenceInMonths, startOfMonth, subMonths } from "date-fns"
import { es } from "date-fns/locale"
import Image from "next/image"

export function DayOneSheet() {
  const { profile, loading: profileLoading, updateProfile } = useUserProfile()
  const { stats: progressStats, loading: statsLoading, refreshStats } = useProgressStats()
  const { photos, loading: photosLoading, uploadPhoto, refreshPhotos } = useProgressPhotos()
  const { entries: weightEntries, loading: weightLoading, addEntry: addWeightEntry, refresh: refreshWeight } = useWeightHistory()
  
  // Estados para modales
  const [isWeightDialogOpen, setIsWeightDialogOpen] = useState(false)
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false)
  
  // Estados para formularios
  const [weightValue, setWeightValue] = useState("")
  const [weightNotes, setWeightNotes] = useState("")
  const [selectedPhotoType, setSelectedPhotoType] = useState<'front' | 'side' | 'back' | 'other'>('front')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoWeight, setPhotoWeight] = useState("")
  const [photoNotes, setPhotoNotes] = useState("")
  const [uploading, setUploading] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loading = profileLoading || statsLoading || photosLoading || weightLoading

  // Obtener datos iniciales
  const targetWeight = profile?.target_weight || progressStats?.weight?.goal
  const mainGoal = profile?.main_goal
  const startDate = profile?.created_at ? new Date(profile.created_at) : new Date()
  const daysSinceStart = Math.max(0, Math.floor((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
  const monthsSinceStart = differenceInMonths(new Date(), startDate)
  
  // Obtener fotos ordenadas por fecha
  const sortedPhotos = [...photos].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const firstPhoto = sortedPhotos[sortedPhotos.length - 1] // Primera foto (más antigua)
  const latestPhoto = sortedPhotos[0] // Última foto (más reciente)
  
  // Obtener peso del historial (más preciso)
  const firstWeightEntry = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1] : null
  const latestWeightEntry = weightEntries.length > 0 ? weightEntries[0] : null
  const currentWeight = latestWeightEntry?.weight || profile?.weight || null
  const initialWeight = firstWeightEntry?.weight || profile?.weight || null
  const weightChange = (currentWeight && initialWeight) ? currentWeight - initialWeight : 0

  // Refrescar todos los datos
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        refreshStats(),
        refreshPhotos(),
        refreshWeight()
      ])
      toast({
        title: "✅ Datos actualizados",
        description: "Tu progreso ha sido actualizado correctamente",
      })
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudieron actualizar los datos",
        variant: "destructive"
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Manejar registro de peso
  const handleSubmitWeight = async () => {
    if (!weightValue || parseFloat(weightValue) <= 0) {
      toast({
        title: "❌ Error",
        description: "Por favor, ingresa un peso válido",
        variant: "destructive"
      })
      return
    }

    try {
      setUploading(true)
      const weight = parseFloat(weightValue)
      const today = new Date().toISOString().split('T')[0]
      
      await addWeightEntry(weight, today, weightNotes || undefined)
      
      toast({
        title: "✅ Peso registrado",
        description: `Tu peso de ${weight} kg ha sido registrado correctamente`,
      })
      
      setIsWeightDialogOpen(false)
      setWeightValue("")
      setWeightNotes("")
      
      // Refrescar datos
      await Promise.all([refreshStats(), refreshWeight()])
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "No se pudo registrar el peso",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  // Manejar selección de archivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "❌ Error",
          description: "La imagen es demasiado grande. Máximo 10MB",
          variant: "destructive"
        })
        return
      }
      
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Manejar subida de foto
  const handleSubmitPhoto = async () => {
    if (!selectedFile) {
      toast({
        title: "❌ Error",
        description: "Por favor, selecciona una imagen",
        variant: "destructive"
      })
      return
    }

    try {
      setUploading(true)
      const weight = photoWeight ? parseFloat(photoWeight) : undefined
      
      await uploadPhoto(
        selectedFile,
        weight,
        photoNotes || undefined,
        selectedPhotoType
      )
      
      toast({
        title: "✅ Foto subida",
        description: "Tu foto de progreso ha sido guardada correctamente",
      })
      
      setIsPhotoDialogOpen(false)
      setSelectedFile(null)
      setPhotoPreview(null)
      setPhotoWeight("")
      setPhotoNotes("")
      setSelectedPhotoType('front')
      
      // Refrescar fotos
      await refreshPhotos()
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "No se pudo subir la foto",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  // Navegación de fotos
  const nextPhoto = () => {
    if (sortedPhotos.length > 1) {
      setCurrentPhotoIndex((prev) => (prev + 1) % sortedPhotos.length)
    }
  }

  const prevPhoto = () => {
    if (sortedPhotos.length > 1) {
      setCurrentPhotoIndex((prev) => (prev - 1 + sortedPhotos.length) % sortedPhotos.length)
    }
  }

  // Reset form de upload
  const resetUploadForm = () => {
    setSelectedFile(null)
    setPhotoPreview(null)
    setPhotoWeight("")
    setPhotoNotes("")
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <Target className="h-6 w-6" />
            Day 1
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card className="backdrop-blur-sm bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-0 shadow-xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-200/20 to-teal-200/20"></div>
        <CardHeader className="text-center relative z-10">
          <div className="flex justify-end mb-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-gray-600 hover:text-gray-900"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mb-4 shadow-2xl animate-pulse">
            <Target className="h-12 w-12 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
            Day 1 🎯
          </CardTitle>
          <CardDescription className="text-base mt-2 text-gray-700">
            Tu punto de partida y tu transformación
          </CardDescription>
          {daysSinceStart > 0 && (
            <Badge className="mt-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
              🔥 {daysSinceStart} días en tu transformación
            </Badge>
          )}
        </CardHeader>
      </Card>

      {/* Tabs para Fotos y Peso */}
      <Tabs defaultValue="photos" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="photos" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Fotos
          </TabsTrigger>
          <TabsTrigger value="weight" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Peso
          </TabsTrigger>
        </TabsList>

        {/* Tab Fotos */}
        <TabsContent value="photos" className="space-y-4">
          <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Camera className="h-6 w-6 text-primary" />
                    Fotos de Progreso
                  </CardTitle>
                  <CardDescription>Documenta tu transformación visual</CardDescription>
                </div>
                <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
                      <Plus className="h-4 w-4 mr-2" />
                      Nueva Foto
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Subir Foto de Progreso</DialogTitle>
                      <DialogDescription>
                        Selecciona una foto para documentar tu progreso
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="photo-type">Tipo de Foto</Label>
                        <Select value={selectedPhotoType} onValueChange={(v: any) => setSelectedPhotoType(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="front">Frontal</SelectItem>
                            <SelectItem value="side">Lateral</SelectItem>
                            <SelectItem value="back">Espalda</SelectItem>
                            <SelectItem value="other">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="photo-file">Imagen</Label>
                        <input
                          ref={fileInputRef}
                          id="photo-file"
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full mt-2"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {selectedFile ? selectedFile.name : "Seleccionar archivo"}
                        </Button>
                        {photoPreview && (
                          <div className="mt-2 relative">
                            <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={resetUploadForm}
                              className="absolute top-2 right-2 h-6 w-6 rounded-full bg-red-500 text-white hover:bg-red-600"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="photo-weight">Peso (opcional)</Label>
                        <Input
                          id="photo-weight"
                          type="number"
                          step="0.1"
                          value={photoWeight}
                          onChange={(e) => setPhotoWeight(e.target.value)}
                          placeholder="70.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="photo-notes">Notas (opcional)</Label>
                        <Textarea
                          id="photo-notes"
                          value={photoNotes}
                          onChange={(e) => setPhotoNotes(e.target.value)}
                          placeholder="Notas sobre esta foto..."
                        />
                      </div>
                      <Button 
                        onClick={handleSubmitPhoto} 
                        disabled={uploading || !selectedFile}
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                      >
                        {uploading ? "Subiendo..." : "Subir Foto"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {sortedPhotos.length > 0 ? (
                <div className="space-y-4">
                  {/* Galería de fotos */}
                  <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 overflow-hidden group">
                    <div className="flex items-center justify-center min-h-[280px]">
                      <div className="relative">
                        <Image
                          src={sortedPhotos[currentPhotoIndex]?.photo_url || "/placeholder.svg"}
                          alt={`Progreso ${sortedPhotos[currentPhotoIndex]?.date || 'Sin fecha'}`}
                          width={200}
                          height={280}
                          className="rounded-lg object-cover shadow-lg border-2 border-white/50 transition-all duration-500"
                        />
                        {/* Overlay con info */}
                        <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-sm rounded-md p-2">
                          <div className="text-white text-sm text-center">
                            <div className="font-medium">
                              {format(new Date(sortedPhotos[currentPhotoIndex]?.date || new Date()), "dd MMM yyyy", { locale: es })}
                            </div>
                            <div className="text-white/80 text-xs">
                              {sortedPhotos[currentPhotoIndex]?.photo_type === 'front' ? 'Frontal' : 
                               sortedPhotos[currentPhotoIndex]?.photo_type === 'side' ? 'Lateral' : 
                               sortedPhotos[currentPhotoIndex]?.photo_type === 'back' ? 'Espalda' : 'Otro'}
                              {sortedPhotos[currentPhotoIndex]?.weight && ` • ${sortedPhotos[currentPhotoIndex].weight} kg`}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Controles de navegación */}
                    {sortedPhotos.length > 1 && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={prevPhoto}
                          className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-md"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={nextPhoto}
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-md"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Indicador de posición */}
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-gray-600">
                      {currentPhotoIndex + 1} de {sortedPhotos.length}
                    </span>
                  </div>

                  {/* Miniaturas */}
                  {sortedPhotos.length > 1 && (
                    <div className="flex gap-2 justify-center overflow-x-auto pb-2">
                      {sortedPhotos.slice(0, 6).map((photo, index) => (
                        <button
                          key={photo.id}
                          onClick={() => setCurrentPhotoIndex(index)}
                          className={`relative w-14 h-18 rounded-md overflow-hidden border-2 transition-all ${
                            index === currentPhotoIndex
                              ? "border-primary shadow-md scale-105"
                              : "border-gray-200 hover:border-gray-400"
                          }`}
                        >
                          <Image
                            src={photo.photo_url || "/placeholder.svg"}
                            alt={`Miniatura ${index + 1}`}
                            width={56}
                            height={72}
                            className="object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Camera className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-2">No hay fotos aún</p>
                  <p className="text-sm mb-4">Sube tu primera foto para comenzar a documentar tu progreso</p>
                  <Button onClick={() => setIsPhotoDialogOpen(true)} className="bg-gradient-to-r from-emerald-500 to-teal-500">
                    <Plus className="h-4 w-4 mr-2" />
                    Subir Primera Foto
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comparación Antes/Después */}
          {firstPhoto && latestPhoto && sortedPhotos.length > 1 && (
            <Card className="backdrop-blur-sm bg-gradient-to-r from-pink-50 via-purple-50 to-indigo-50 border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Heart className="h-6 w-6 text-pink-600" />
                  Tu Transformación Visual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2 text-center">Día 1</p>
                    <Image 
                      src={firstPhoto.photo_url || '/placeholder.svg'} 
                      alt="Día 1"
                      width={200}
                      height={280}
                      className="w-full h-64 object-cover rounded-lg border-2 border-pink-300"
                    />
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      {format(new Date(firstPhoto.date), "dd MMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2 text-center">Ahora</p>
                    <Image 
                      src={latestPhoto.photo_url || '/placeholder.svg'} 
                      alt="Ahora"
                      width={200}
                      height={280}
                      className="w-full h-64 object-cover rounded-lg border-2 border-indigo-300"
                    />
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      {format(new Date(latestPhoto.date), "dd MMM yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab Peso */}
        <TabsContent value="weight" className="space-y-4">
          <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Scale className="h-6 w-6 text-blue-600" />
                    Seguimiento de Peso
                  </CardTitle>
                  <CardDescription>Tu evolución y progreso hacia el objetivo</CardDescription>
                </div>
                <Dialog open={isWeightDialogOpen} onOpenChange={setIsWeightDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600">
                      <Plus className="h-4 w-4 mr-2" />
                      Registrar Peso
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Registrar Peso</DialogTitle>
                      <DialogDescription>
                        Registra tu peso actual para hacer seguimiento de tu progreso
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="weight">Peso (kg)</Label>
                        <Input
                          id="weight"
                          type="number"
                          step="0.1"
                          value={weightValue}
                          onChange={(e) => setWeightValue(e.target.value)}
                          placeholder={currentWeight ? currentWeight.toString() : "Ej: 70.5"}
                        />
                      </div>
                      <div>
                        <Label htmlFor="weight-notes">Notas (opcional)</Label>
                        <Textarea
                          id="weight-notes"
                          value={weightNotes}
                          onChange={(e) => setWeightNotes(e.target.value)}
                          placeholder="Ej: Después del entrenamiento..."
                        />
                      </div>
                      <Button 
                        onClick={handleSubmitWeight} 
                        disabled={uploading}
                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                      >
                        {uploading ? "Guardando..." : "Registrar Peso"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Tarjeta de peso actual */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                      <Weight className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-blue-900">Peso Actual</span>
                  </div>
                  {currentWeight ? (
                    <div>
                      <p className="text-3xl font-bold text-blue-700 mb-1">{currentWeight.toFixed(1)} kg</p>
                      {weightChange !== 0 && (
                        <div className="flex items-center gap-1 mt-2">
                          {weightChange > 0 ? (
                            <ArrowUp className="h-4 w-4 text-red-500" />
                          ) : (
                            <ArrowDown className="h-4 w-4 text-green-500" />
                          )}
                          <span className={`text-sm font-semibold ${weightChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {Math.abs(weightChange).toFixed(1)} kg desde el inicio
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500">No registrado</p>
                  )}
                </div>

                <div className="p-5 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border-2 border-purple-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-purple-900">Peso Objetivo</span>
                  </div>
                  {targetWeight ? (
                    <div>
                      <p className="text-3xl font-bold text-purple-700 mb-1">{targetWeight} kg</p>
                      {currentWeight && (
                        <p className="text-sm text-purple-600">
                          {Math.abs(currentWeight - targetWeight).toFixed(1)} kg para {currentWeight > targetWeight ? 'perder' : 'ganar'}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500">No definido</p>
                  )}
                </div>

                <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-emerald-900">Día de Inicio</span>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-emerald-700 mb-1">
                      {format(startDate, "dd MMM yyyy", { locale: es })}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      Hace {daysSinceStart} días
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Historial de peso */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-gray-600" />
                  Historial Reciente
                </h3>
                {weightEntries.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {weightEntries.slice(0, 10).map((entry, index) => (
                      <div 
                        key={entry.id} 
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          index === 0 ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            index === 0 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                          }`}>
                            <Weight className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold">{entry.weight.toFixed(1)} kg</p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(entry.date), "dd MMM yyyy", { locale: es })}
                            </p>
                          </div>
                        </div>
                        {index > 0 && (
                          <div className={`text-sm font-medium ${
                            entry.weight < weightEntries[index - 1].weight ? 'text-green-600' : 
                            entry.weight > weightEntries[index - 1].weight ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            {entry.weight < weightEntries[index - 1].weight ? '↓' : 
                             entry.weight > weightEntries[index - 1].weight ? '↑' : '='} 
                            {Math.abs(entry.weight - weightEntries[index - 1].weight).toFixed(1)} kg
                          </div>
                        )}
                        {index === 0 && (
                          <Badge className="bg-blue-500">Más reciente</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Scale className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No hay registros de peso</p>
                    <p className="text-sm">Comienza registrando tu peso actual</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Progreso de Peso */}
          {firstWeightEntry && latestWeightEntry && weightEntries.length > 1 && (
            <Card className="backdrop-blur-sm bg-gradient-to-r from-purple-50 to-indigo-50 border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Award className="h-6 w-6 text-purple-600" />
                  Progreso de Peso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-6 bg-white/80 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg">Tu Evolución</h3>
                    <Badge className={weightChange < 0 ? "bg-green-500" : weightChange > 0 ? "bg-red-500" : "bg-gray-500"}>
                      {weightChange < 0 ? "↓" : weightChange > 0 ? "↑" : "→"} {Math.abs(weightChange).toFixed(1)} kg
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-gray-600">Día 1</p>
                      <p className="text-2xl font-bold text-purple-700">{firstWeightEntry.weight.toFixed(1)} kg</p>
                      <p className="text-xs text-gray-500">{format(new Date(firstWeightEntry.date), "dd MMM yyyy", { locale: es })}</p>
                    </div>
                    <div className="text-center p-4 bg-indigo-50 rounded-lg">
                      <p className="text-sm text-gray-600">Ahora</p>
                      <p className="text-2xl font-bold text-indigo-700">{latestWeightEntry.weight.toFixed(1)} kg</p>
                      <p className="text-xs text-gray-500">{format(new Date(latestWeightEntry.date), "dd MMM yyyy", { locale: es })}</p>
                    </div>
                  </div>
                  {weightChange !== 0 && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-lg">
                      <p className="text-center font-semibold text-purple-900">
                        {weightChange < 0 
                          ? `🎉 ¡Has perdido ${Math.abs(weightChange).toFixed(1)} kg! ¡Sigue así!`
                          : `📈 Has ganado ${weightChange.toFixed(1)} kg. ¡Continúa tu progreso!`
                        }
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Mensaje Motivacional */}
      {daysSinceStart > 0 && (
        <Card className="backdrop-blur-sm bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 shadow-xl">
          <CardContent className="p-6 text-center">
            <Flame className="h-12 w-12 mx-auto mb-4 text-orange-500" />
            <p className="text-lg font-bold text-emerald-900 mb-2">
              ¡Llevas {daysSinceStart} días en tu transformación! 🔥
            </p>
            <p className="text-sm text-emerald-700">
              Cada día es una oportunidad para mejorar. Sigue registrando tu progreso y verás los resultados.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
