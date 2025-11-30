"use client"

import { useState } from "react"
import { Heart, Moon, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function MotivationWidget() {
  const [motivation, setMotivation] = useState(4)
  const [energy, setEnergy] = useState(3)
  const [sleep, setSleep] = useState(5)

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
                    onClick={() => metric.setValue(level)}
                    style={{
                      animationDelay: `${level * 50}ms`,
                    }}
                  >
                    {level}
                  </Button>
                ))}
              </div>
            </div>
          )
        })}

        <div className="mt-4 p-3 bg-muted rounded-lg transform transition-all duration-300 hover:scale-105 hover:bg-muted/80 animate-in slide-in-from-bottom-4 delay-500">
          <p className="text-sm font-medium animate-in fade-in-0 duration-500">Consejo del día</p>
          <p className="text-xs text-muted-foreground mt-1 animate-in slide-in-from-left-2 duration-500 delay-200">
            "El progreso, no la perfección, es lo que cuenta. ¡Sigue adelante!"
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
