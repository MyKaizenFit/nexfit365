"use client"

import { useState, useEffect, useCallback } from "react"
import { Heart, Moon, Zap, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { authenticatedFetch } from "@/lib/api"
import { format } from "date-fns"

// Mapeo sueño 1-5 ↔ horas reales
const SLEEP_SCORE_TO_HOURS: Record<number, number> = { 1: 4.5, 2: 6.0, 3: 7.0, 4: 8.0, 5: 9.0 }
function hoursToSleepScore(h: number): number {
  if (h < 5) return 1
  if (h < 6.5) return 2
  if (h < 7.5) return 3
  if (h < 8.5) return 4
  return 5
}

const ENERGY_STORAGE_KEY = () => `nexfit_energy_score_${format(new Date(), "yyyy-MM-dd")}`

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

export function MotivationWidget() {
  const [motivation, setMotivation] = useState(3)
  const [energy, setEnergy] = useState(3)
  const [sleep, setSleep] = useState(3)
  const [entryId, setEntryId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Cargar datos de hoy al montar
  useEffect(() => {
    const loadToday = async () => {
      try {
        const res = await authenticatedFetch("daily-wellness/today/")
        if (res.ok) {
          const data = await readJsonIfAvailable<any>(res)
          if (data) {
            if (data.motivation_score) setMotivation(data.motivation_score)
            if (data.sleep_hours != null) setSleep(hoursToSleepScore(Number(data.sleep_hours)))
            if (data.id) setEntryId(String(data.id))
          }
        }
      } catch {
        // Si falla la carga, usamos los valores por defecto
      }
      // Cargar energía desde localStorage (no tiene campo en backend)
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(ENERGY_STORAGE_KEY())
        if (stored) setEnergy(Number(stored))
      }
      setLoaded(true)
    }
    loadToday()
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setSaved(false)
    try {
      const payload = {
        date: format(new Date(), "yyyy-MM-dd"),
        motivation_score: motivation,
        sleep_hours: SLEEP_SCORE_TO_HOURS[sleep],
      }

      let res: Response
      if (entryId) {
        res = await authenticatedFetch(`daily-wellness/${entryId}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        res = await authenticatedFetch("daily-wellness/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }

      if (res.ok) {
        const data = await readJsonIfAvailable<any>(res)
        if (data?.id) setEntryId(String(data.id))
        // Guardar energía en localStorage (ephemeral por día)
        if (typeof window !== "undefined") {
          localStorage.setItem(ENERGY_STORAGE_KEY(), String(energy))
        }
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        throw new Error("Error al guardar")
      }
    } catch {
      toast({
        title: "Error",
        description: "No se pudieron guardar los datos. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }, [motivation, energy, sleep, entryId])

  const metrics = [
    {
      name: "Motivación",
      value: motivation,
      setValue: setMotivation,
      icon: Heart,
      color: "text-red-500",
    },
    {
      name: "Energía",
      value: energy,
      setValue: setEnergy,
      icon: Zap,
      color: "text-yellow-500",
    },
    {
      name: "Sueño",
      value: sleep,
      setValue: setSleep,
      icon: Moon,
      color: "text-blue-500",
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>¿Cómo te sientes hoy?</CardTitle>
        <CardDescription>Registra tu estado diario</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <div key={metric.name} className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${metric.color}`} />
                <span className="text-sm font-medium">{metric.name}</span>
                <span className="text-sm text-muted-foreground ml-auto">{metric.value}/5</span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <Button
                    key={level}
                    variant={level <= metric.value ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0 transition-all duration-300 hover:scale-110 hover:rotate-12 animate-in zoom-in-50"
                    onClick={() => { metric.setValue(level); setSaved(false) }}
                    style={{ animationDelay: `${level * 50}ms` }}
                  >
                    {level}
                  </Button>
                ))}
              </div>
            </div>
          )
        })}

        <Button
          onClick={handleSave}
          disabled={saving || !loaded}
          className="w-full mt-2"
          variant={saved ? "outline" : "default"}
        >
          {saving ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</>
          ) : saved ? (
            <><CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />Guardado</>
          ) : (
            "Guardar"
          )}
        </Button>

        <div className="mt-2 p-3 bg-muted rounded-lg">
          <p className="text-sm font-medium">Consejo del día</p>
          <p className="text-xs text-muted-foreground mt-1">
            "El progreso, no la perfección, es lo que cuenta. ¡Sigue adelante!"
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
