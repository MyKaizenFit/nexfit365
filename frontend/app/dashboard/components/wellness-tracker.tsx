"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Moon, Heart, Save, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { authenticatedFetch, buildApiUrl } from "@/lib/api"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface DailyWellness {
  id?: string
  date: string
  sleep_hours: number
  motivation_score: number
  notes?: string
}

export function WellnessTracker() {
  const [sleepHours, setSleepHours] = useState<string>("")
  const [motivationScore, setMotivationScore] = useState<number>(3)
  const [notes, setNotes] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [todayEntry, setTodayEntry] = useState<DailyWellness | null>(null)

  const today = format(new Date(), "yyyy-MM-dd")

  // Cargar registro de hoy
  useEffect(() => {
    loadTodayEntry()
  }, [])

  const loadTodayEntry = async () => {
    setLoading(true)
    try {
      const response = await authenticatedFetch("progress/daily-wellness/today/")
      if (response.ok) {
        const data = await response.json()
        setTodayEntry(data)
        setSleepHours(data.sleep_hours?.toString() || "")
        setMotivationScore(data.motivation_score || 3)
        setNotes(data.notes || "")
      } else if (response.status === 404) {
        // No hay registro para hoy, está bien
        setTodayEntry(null)
      }
    } catch (error) {
      console.error("Error cargando registro de hoy:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!sleepHours || parseFloat(sleepHours) < 0 || parseFloat(sleepHours) > 24) {
      toast({
        title: "Error",
        description: "Por favor ingresa horas de sueño válidas (0-24)",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const data: DailyWellness = {
        date: today,
        sleep_hours: parseFloat(sleepHours),
        motivation_score: motivationScore,
        notes: notes.trim(),
      }

      let response
      if (todayEntry?.id) {
        // Actualizar registro existente
        response = await authenticatedFetch(
          `progress/daily-wellness/${todayEntry.id}/`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          }
        )
      } else {
        // Crear nuevo registro
        response = await authenticatedFetch("progress/daily-wellness/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        })
      }

      if (response.ok) {
        const savedData = await response.json()
        setTodayEntry(savedData)
        toast({
          title: "¡Registro guardado! ✅",
          description: `Sueño: ${savedData.sleep_hours}h | Motivación: ${savedData.motivation_score}/5`,
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Error al guardar")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el registro",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const getMotivationEmoji = (score: number) => {
    const emojis = ["😢", "😕", "😐", "🙂", "😄"]
    return emojis[score - 1] || "😐"
  }

  const getMotivationLabel = (score: number) => {
    const labels = ["Muy baja", "Baja", "Regular", "Buena", "Muy alta"]
    return labels[score - 1] || "Regular"
  }

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-400 to-pink-400 p-6 sm:p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Moon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                Bienestar Diario
              </h1>
              <p className="text-white/80 text-sm sm:text-base">
                Registra tu sueño y motivación de hoy
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
            <p className="text-white/90 text-sm sm:text-base flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-300 flex-shrink-0" />
              <span>
                {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
        <CardHeader>
          <CardTitle>Registro de Hoy</CardTitle>
          <CardDescription>
            Completa tu registro diario de bienestar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Horas de Sueño */}
          <div className="space-y-2">
            <Label htmlFor="sleep-hours" className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-indigo-600" />
              Horas de Sueño
            </Label>
            <Input
              id="sleep-hours"
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              placeholder="Ej: 7.5"
              className="text-lg"
            />
            <p className="text-xs text-muted-foreground">
              Ingresa las horas de sueño que tuviste anoche (0-24 horas)
            </p>
          </div>

          {/* Motivación */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-pink-600" />
              Nivel de Motivación
            </Label>
            <div className="flex items-center gap-4">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setMotivationScore(score)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 ${
                    motivationScore === score
                      ? "bg-gradient-to-br from-pink-500 to-purple-500 text-white shadow-lg scale-105"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  <span className="text-3xl">{getMotivationEmoji(score)}</span>
                  <span className="text-xs font-medium">
                    {getMotivationLabel(score)}
                  </span>
                  {motivationScore === score && (
                    <span className="text-xs opacity-80">{score}/5</span>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Selecciona cómo te sientes de motivado hoy
            </p>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Añade cualquier observación sobre tu día..."
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Botón Guardar */}
          <Button
            onClick={handleSave}
            disabled={saving || !sleepHours}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all"
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Registro
              </>
            )}
          </Button>

          {todayEntry && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                ✅ Registro guardado correctamente
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}




