"use client"

import { useState, useEffect } from "react"
import { WellnessSectionSkeleton } from "@/components/dashboard/dashboard-skeletons"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Moon, Heart, Save, Loader2, ChevronUp, ChevronDown } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { authenticatedFetch } from "@/lib/api"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface DailyWellness {
  id?: string
  date: string
  sleep_hours: number
  motivation_score: number
  notes?: string
}

const readJsonIfAvailable = async <T,>(response: Response): Promise<T | null> => {
  const contentType = response.headers.get("content-type") || ""
  if (!contentType.toLowerCase().includes("application/json")) {
    return null
  }

  try {
    return await response.json()
  } catch {
    return null
  }
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
      const response = await authenticatedFetch("daily-wellness/today/")
      if (response.ok) {
        const data = await readJsonIfAvailable<DailyWellness>(response)
        if (!data) return
        setTodayEntry(data)
        setSleepHours(data.sleep_hours?.toString() || "")
        setMotivationScore(data.motivation_score || 3)
        setNotes(data.notes || "")
      } else if (response.status === 404) {
        // No hay registro para hoy, está bien
        setTodayEntry(null)
      }
    } catch (error) {
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
          `daily-wellness/${todayEntry.id}/`,
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
        response = await authenticatedFetch("daily-wellness/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        })
      }

      if (response.ok) {
        const savedData = await readJsonIfAvailable<DailyWellness>(response) || data
        setTodayEntry(savedData)
        toast({
          title: "¡Registro guardado! ✅",
          description: `Sueño: ${savedData.sleep_hours}h | Motivación: ${savedData.motivation_score}/5`,
        })
      } else {
        const errorData = await readJsonIfAvailable<{ detail?: string }>(response)
        throw new Error(errorData?.detail || "Error al guardar")
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
    return <WellnessSectionSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-400 to-pink-400 p-5 md:p-6 lg:p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-white/20 backdrop-blur-sm rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0">
              <Moon className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold">
                Bienestar Diario
              </h1>
              <p className="text-white/80 text-xs md:text-sm lg:text-base mt-0.5">
                Registra tu sueño y motivación de hoy
              </p>
            </div>
          </div>

          <div className="mt-3 md:mt-4 p-3 md:p-4 bg-white/10 backdrop-blur-sm rounded-xl md:rounded-2xl">
            <p className="text-white/90 text-xs md:text-sm lg:text-base flex items-center gap-2">
              <Heart className="h-4 w-4 md:h-5 md:w-5 text-pink-300 flex-shrink-0" />
              <span className="truncate">
                {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <Card className="border shadow-xl">
        <CardHeader className="px-4 md:px-6 pt-5 md:pt-6 pb-4 md:pb-5">
          <CardTitle className="text-xl md:text-2xl">Registro de Hoy</CardTitle>
          <CardDescription className="text-sm md:text-base mt-1">
            Completa tu registro diario de bienestar
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6 pb-5 md:pb-6 space-y-5 md:space-y-6">
          {/* Horas de Sueño */}
          <div className="space-y-2.5 md:space-y-3">
            <Label htmlFor="sleep-hours" className="flex items-center gap-2 text-base md:text-lg">
              <Moon className="h-5 w-5 md:h-5 md:w-5 text-indigo-600 flex-shrink-0" />
              Horas de Sueño
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="sleep-hours"
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
                placeholder="Ej: 7.5"
                className="text-lg md:text-xl h-14 md:h-12 flex-1 text-center font-medium"
              />
              <div className="flex flex-col gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-10 md:h-8 md:w-10 rounded-md touch-manipulation active:scale-95"
                  onClick={() => {
                    const current = parseFloat(sleepHours) || 0
                    if (current < 24) {
                      setSleepHours(Math.min(24, current + 0.5).toString())
                    }
                  }}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-10 md:h-8 md:w-10 rounded-md touch-manipulation active:scale-95"
                  onClick={() => {
                    const current = parseFloat(sleepHours) || 0
                    if (current > 0) {
                      setSleepHours(Math.max(0, current - 0.5).toString())
                    }
                  }}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">
              Ingresa las horas de sueño que tuviste anoche (0-24 horas)
            </p>
          </div>

          {/* Motivación */}
          <div className="space-y-3 md:space-y-4">
            <Label className="flex items-center gap-2 text-base md:text-lg">
              <Heart className="h-5 w-5 md:h-5 md:w-5 text-pink-600 flex-shrink-0" />
              Nivel de Motivación
            </Label>
            <div className="grid grid-cols-5 gap-2 md:gap-3">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setMotivationScore(score)}
                  className={`flex flex-col items-center justify-center gap-1.5 md:gap-2 p-2.5 md:p-4 rounded-xl transition-all duration-200 touch-manipulation active:scale-95 ${
                    motivationScore === score
                      ? "bg-gradient-to-br from-pink-500 to-purple-500 text-white shadow-lg scale-105"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  }`}
                >
                  <span className="text-2xl md:text-4xl">{getMotivationEmoji(score)}</span>
                  <span className="text-[10px] md:text-xs font-medium text-center leading-tight px-0.5">
                    {getMotivationLabel(score)}
                  </span>
                  {motivationScore === score && (
                    <span className="text-[9px] md:text-xs opacity-80">{score}/5</span>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">
              Selecciona cómo te sientes de motivado hoy
            </p>
          </div>

          {/* Notas */}
          <div className="space-y-2 md:space-y-2.5">
            <Label htmlFor="notes" className="text-base md:text-lg">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Añade cualquier observación sobre tu día..."
              rows={4}
              className="resize-none text-base md:text-sm min-h-[100px]"
            />
          </div>

          {/* Botón Guardar */}
          <Button
            onClick={handleSave}
            disabled={saving || !sleepHours}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all h-12 md:h-11 text-base md:text-sm font-medium touch-manipulation active:scale-[0.98]"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 md:h-4 md:w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 md:h-4 md:w-4 mr-2" />
                Guardar Registro
              </>
            )}
          </Button>

          {todayEntry && (
            <div className="p-3 md:p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm md:text-base text-green-700">
                ✅ Registro guardado correctamente
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}




