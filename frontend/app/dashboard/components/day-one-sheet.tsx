"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Target, Sparkles, Ruler, Weight, Calendar, TrendingUp, 
  CheckCircle, Circle, Edit, Camera, Upload, Image as ImageIcon,
  ArrowUp, ArrowDown, Minus, Heart, Award, Flame
} from 'lucide-react'
import { toast } from "@/hooks/use-toast"
import { useUserProfile } from "@/hooks/use-user-profile"
import { useProgressStats } from "@/hooks/use-progress-stats"
import { useProgressPhotos } from "@/hooks/use-progress-photos"
import { userService } from "@/lib/user-service"
import { format, differenceInDays, differenceInMonths, startOfMonth, subMonths } from "date-fns"
import { es } from "date-fns/locale"

export function DayOneSheet() {
  const { profile, loading: profileLoading, updateProfile } = useUserProfile()
  const { stats: progressStats, loading: statsLoading, refreshStats } = useProgressStats()
  const { photos, loading: photosLoading, uploadPhoto, refreshPhotos } = useProgressPhotos()
  
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

  const loading = profileLoading || statsLoading || photosLoading

  // Obtener datos iniciales
  const initialWeight = profile?.weight || progressStats?.weight?.initial
  const targetWeight = profile?.target_weight || progressStats?.weight?.goal
  const mainGoal = profile?.main_goal
  const startDate = profile?.created_at ? new Date(profile.created_at) : new Date()
  const daysSinceStart = Math.floor((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const monthsSinceStart = differenceInMonths(new Date(), startDate)
  
  // Obtener fotos ordenadas por fecha
  const sortedPhotos = [...photos].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const firstPhoto = sortedPhotos[sortedPhotos.length - 1] // Primera foto (más antigua)
  const latestPhoto = sortedPhotos[0] // Última foto (más reciente)
  
  // Obtener historial de pesos
  const [weightHistory, setWeightHistory] = useState<Array<{weight: number, date: string}>>([])
  useEffect(() => {
    const fetchWeightHistory = async () => {
      try {
        const history = await userService.getWeightHistory()
        // Asegurar que history sea un array
        if (Array.isArray(history)) {
          setWeightHistory(history.map(w => ({ weight: Number(w.weight), date: w.date })))
        } else if (history && typeof history === 'object' && 'results' in history) {
          // Si viene paginado (DRF)
          const results = Array.isArray(history.results) ? history.results : []
          setWeightHistory(results.map((w: any) => ({ weight: Number(w.weight), date: w.date })))
        } else {
          console.warn('Formato de historial de peso inesperado:', history)
          setWeightHistory([])
        }
      } catch (error) {
        console.error('Error fetching weight history:', error)
        setWeightHistory([])
      }
    }
    fetchWeightHistory()
  }, [])
  
  const firstWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1] : null
  const latestWeight = weightHistory.length > 0 ? weightHistory[0] : null
  // Prioridad: peso más reciente del historial > peso del perfil > peso inicial de stats > 0
  const currentWeight = latestWeight?.weight || profile?.weight || initialWeight || null
  const weightChange = firstWeight && currentWeight ? currentWeight - firstWeight.weight : 0
  
  // Calcular mejoras mensuales
  const monthlyImprovements = []
  if (weightHistory.length > 0 && monthsSinceStart > 0) {
    for (let i = 1; i <= Math.min(monthsSinceStart, 6); i++) {
      const monthStart = startOfMonth(subMonths(new Date(), i))
      const monthEnd = startOfMonth(subMonths(new Date(), i - 1))
      
      const monthWeights = weightHistory.filter(w => {
        const date = new Date(w.date)
        return date >= monthStart && date < monthEnd
      })
      
      if (monthWeights.length > 0) {
        const monthStartWeight = monthWeights[monthWeights.length - 1].weight
        const monthEndWeight = monthWeights[0].weight
        const monthChange = monthEndWeight - monthStartWeight
        
        monthlyImprovements.push({
          month: format(subMonths(new Date(), i), "MMMM yyyy", { locale: es }),
          change: monthChange,
          startWeight: monthStartWeight,
          endWeight: monthEndWeight
        })
      }
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
      
      // Registrar peso en el historial
      await userService.addWeightEntry(weight, weightNotes || undefined)
      
      // Actualizar peso en el perfil si es el primero
      if (!initialWeight) {
        await updateProfile({ weight })
      }
      
      toast({
        title: "✅ Peso registrado",
        description: `Tu peso de ${weight} kg ha sido registrado correctamente`,
      })
      
      setIsWeightDialogOpen(false)
      setWeightValue("")
      setWeightNotes("")
      
      // Refrescar datos
      await refreshStats()
      const history = await userService.getWeightHistory()
      // Asegurar que history sea un array
      if (Array.isArray(history)) {
        setWeightHistory(history.map(w => ({ weight: Number(w.weight), date: w.date })))
      } else if (history && typeof history === 'object' && 'results' in history) {
        const results = Array.isArray(history.results) ? history.results : []
        setWeightHistory(results.map((w: any) => ({ weight: Number(w.weight), date: w.date })))
      } else {
        setWeightHistory([])
      }
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

  // Manejar subida de foto
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
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mb-4 shadow-2xl animate-pulse">
            <Target className="h-12 w-12 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
            Day 1 🎯
          </CardTitle>
          <CardDescription className="text-base mt-2 text-gray-700">
            Tu punto de partida y tu transformación
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Datos Iniciales */}
      <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Ruler className="h-6 w-6 text-primary" />
            Medidas y Progreso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                    <Weight className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-blue-900">Peso Actual</span>
                </div>
                <Dialog open={isWeightDialogOpen} onOpenChange={setIsWeightDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4" />
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
                        className="w-full"
                      >
                        {uploading ? "Guardando..." : "Registrar Peso"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              {currentWeight ? (
                <div>
                  <p className="text-3xl font-bold text-blue-700 mb-1">{currentWeight.toFixed(1)}</p>
                  <p className="text-xs text-blue-600">kilogramos</p>
                  {weightChange !== 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      {weightChange > 0 ? (
                        <ArrowUp className="h-4 w-4 text-red-500" />
                      ) : (
                        <ArrowDown className="h-4 w-4 text-green-500" />
                      )}
                      <span className={`text-xs font-semibold ${weightChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {Math.abs(weightChange).toFixed(1)} kg
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-blue-600 mb-2">No registrado</p>
                  <Button onClick={() => setIsWeightDialogOpen(true)} size="sm" variant="outline" className="w-full">
                    Registrar
                  </Button>
                </div>
              )}
            </div>

            <div className="p-5 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border-2 border-purple-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-semibold text-purple-900">Peso Objetivo</span>
              </div>
              {targetWeight ? (
                <div>
                  <p className="text-3xl font-bold text-purple-700 mb-1">{targetWeight}</p>
                  <p className="text-xs text-purple-600">kilogramos</p>
                  {currentWeight && typeof currentWeight === 'number' && (
                    <p className="text-xs text-purple-600 mt-2">
                      {Math.abs(currentWeight - targetWeight).toFixed(1)} kg {currentWeight > targetWeight ? 'para perder' : 'para ganar'}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-purple-600 mb-2">No definido</p>
                  <Button onClick={() => updateProfile({ target_weight: currentWeight || 65 })} size="sm" variant="outline" className="w-full">
                    Establecer
                  </Button>
                </div>
              )}
            </div>

            <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-semibold text-emerald-900">Día de Inicio</span>
              </div>
              <div>
                <p className="text-xl font-bold text-emerald-700 mb-1">
                  {format(startDate, "dd MMM", { locale: es })}
                </p>
                <p className="text-lg font-semibold text-emerald-600 mb-1">
                  {format(startDate, "yyyy", { locale: es })}
                </p>
                <Badge variant="outline" className="text-xs">
                  Hace {daysSinceStart} días
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fotos de Progreso */}
      <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Camera className="h-6 w-6 text-primary" />
                Fotos de Progreso
              </CardTitle>
              <CardDescription>Documenta tu transformación con fotos</CardDescription>
            </div>
            <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Foto
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
                    <Input
                      id="photo-file"
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                    />
                    {photoPreview && (
                      <div className="mt-2">
                        <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
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
                    className="w-full"
                  >
                    {uploading ? "Subiendo..." : "Subir Foto"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {photos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {sortedPhotos.slice(0, 4).map((photo) => (
                <div key={photo.id} className="relative">
                  <img 
                    src={photo.photo_url || '/placeholder.svg'} 
                    alt={photo.photo_type}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <div className="absolute bottom-2 left-2 right-2 bg-black/70 text-white text-xs p-2 rounded">
                    <p>{format(new Date(photo.date), "dd MMM yyyy", { locale: es })}</p>
                    {photo.weight && <p>{photo.weight} kg</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay fotos aún. Sube tu primera foto para comenzar a documentar tu progreso.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparación Motivacional */}
      {(firstPhoto && latestPhoto) || (firstWeight && latestWeight) ? (
        <Card className="backdrop-blur-sm bg-gradient-to-r from-pink-50 via-purple-50 to-indigo-50 border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Heart className="h-6 w-6 text-pink-600" />
              Tu Transformación
            </CardTitle>
            <CardDescription>
              Compara tu progreso desde el día 1 hasta ahora
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {firstWeight && latestWeight && (
              <div className="p-6 bg-white/80 rounded-xl border-2 border-purple-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg">Progreso de Peso</h3>
                  <Badge className={weightChange < 0 ? "bg-green-500" : weightChange > 0 ? "bg-red-500" : "bg-gray-500"}>
                    {weightChange < 0 ? "↓" : weightChange > 0 ? "↑" : "→"} {Math.abs(weightChange).toFixed(1)} kg
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Día 1</p>
                    <p className="text-2xl font-bold text-purple-700">{firstWeight.weight.toFixed(1)} kg</p>
                    <p className="text-xs text-gray-500">{format(new Date(firstWeight.date), "dd MMM yyyy", { locale: es })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Ahora</p>
                    <p className="text-2xl font-bold text-indigo-700">{latestWeight.weight.toFixed(1)} kg</p>
                    <p className="text-xs text-gray-500">{format(new Date(latestWeight.date), "dd MMM yyyy", { locale: es })}</p>
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
            )}

            {firstPhoto && latestPhoto && (
              <div className="p-6 bg-white/80 rounded-xl border-2 border-pink-200">
                <h3 className="font-bold text-lg mb-4">Comparación Visual</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Día 1</p>
                    <img 
                      src={firstPhoto.photo_url || '/placeholder.svg'} 
                      alt="Día 1"
                      className="w-full h-64 object-cover rounded-lg border-2 border-pink-300"
                    />
                    <p className="text-xs text-gray-500 mt-2">{format(new Date(firstPhoto.date), "dd MMM yyyy", { locale: es })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Ahora</p>
                    <img 
                      src={latestPhoto.photo_url || '/placeholder.svg'} 
                      alt="Ahora"
                      className="w-full h-64 object-cover rounded-lg border-2 border-indigo-300"
                    />
                    <p className="text-xs text-gray-500 mt-2">{format(new Date(latestPhoto.date), "dd MMM yyyy", { locale: es })}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Mejoras Mensuales */}
      {monthlyImprovements.length > 0 && (
        <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Award className="h-6 w-6 text-yellow-600" />
              Progreso Mensual
            </CardTitle>
            <CardDescription>
              Revisa tus mejoras mes a mes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyImprovements.map((improvement, index) => (
                <div key={index} className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold capitalize">{improvement.month}</h4>
                    <Badge className={improvement.change < 0 ? "bg-green-500" : improvement.change > 0 ? "bg-red-500" : "bg-gray-500"}>
                      {improvement.change < 0 ? "↓" : improvement.change > 0 ? "↑" : "→"} {Math.abs(improvement.change).toFixed(1)} kg
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{improvement.startWeight.toFixed(1)} kg</span>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{improvement.endWeight.toFixed(1)} kg</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
