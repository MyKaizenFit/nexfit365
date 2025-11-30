"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingDown } from "lucide-react"
import { useState, useEffect } from "react"

export function WeightChart() {
  const [weightData, setWeightData] = useState([
    { date: "Ene 1", weight: 75.2 },
    { date: "Ene 8", weight: 74.8 },
    { date: "Ene 15", weight: 74.1 },
    { date: "Ene 22", weight: 73.5 },
    { date: "Ene 29", weight: 72.5 },
  ])

  // Escuchar actualizaciones de peso desde las fotos de progreso
  useEffect(() => {
    const handleWeightUpdate = (event: CustomEvent) => {
      const newWeight = event.detail.weight
      const today = new Date()
      const dateStr = today.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
      
      setWeightData(prev => [...prev, { date: dateStr, weight: newWeight }])
    }

    window.addEventListener('weightUpdated', handleWeightUpdate as EventListener)
    
    return () => {
      window.removeEventListener('weightUpdated', handleWeightUpdate as EventListener)
    }
  }, [])

  // Calcular el rango de peso para centrar el gráfico
  const maxWeight = Math.max(...weightData.map((d) => d.weight))
  const minWeight = Math.min(...weightData.map((d) => d.weight))
  const range = maxWeight - minWeight
  
  // Añadir padding para centrar mejor el gráfico
  const padding = range * 0.2 // 20% de padding
  const adjustedMaxWeight = maxWeight + padding
  const adjustedMinWeight = Math.max(0, minWeight - padding) // No permitir pesos negativos
  const adjustedRange = adjustedMaxWeight - adjustedMinWeight

  // Generar fechas de los últimos 30 días para mostrar en el eje X
  const generateDateLabels = () => {
    const dates = []
    const today = new Date()
    
    for (let i = 29; i >= 0; i -= 7) { // Mostrar cada 7 días
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
      dates.push(dateStr)
    }
    
    return dates
  }

  const dateLabels = generateDateLabels()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-green-600" />
          Evolución del Peso
        </CardTitle>
        <CardDescription>Progreso de los últimos 30 días</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Gráfico mejorado */}
          <div className="weight-chart-container relative h-64 bg-gradient-to-t from-muted/50 to-transparent rounded-lg p-4 overflow-hidden">
            {/* Grid de fondo */}
            <div className="absolute inset-4 grid grid-rows-4 opacity-20">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="border-b border-muted-foreground/20" />
              ))}
            </div>

            {/* Línea de tendencia */}
            <svg className="weight-chart-svg" viewBox="0 0 400 160">
              <defs>
                <linearGradient id="weightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {/* Área bajo la curva */}
              <path
                d={`M 0 ${160 - ((weightData[0].weight - adjustedMinWeight) / adjustedRange) * 140} 
                   ${weightData
                     .map(
                       (data, index) =>
                         `L ${(index * 400) / (weightData.length - 1)} ${160 - ((data.weight - adjustedMinWeight) / adjustedRange) * 140}`,
                     )
                     .join(" ")} 
                   L 400 160 L 0 160 Z`}
                fill="url(#weightGradient)"
              />

              {/* Línea principal */}
              <path
                d={`M 0 ${160 - ((weightData[0].weight - adjustedMinWeight) / adjustedRange) * 140} 
                   ${weightData
                     .map(
                       (data, index) =>
                         `L ${(index * 400) / (weightData.length - 1)} ${160 - ((data.weight - adjustedMinWeight) / adjustedRange) * 140}`,
                     )
                     .join(" ")}`}
                stroke="hsl(var(--primary))"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-in duration-2000 ease-out animate-draw-line"
              />

              {/* Puntos de datos */}
              {weightData.map((data, index) => (
                <circle
                  key={index}
                  cx={(index * 400) / (weightData.length - 1)}
                  cy={160 - ((data.weight - adjustedMinWeight) / adjustedRange) * 140}
                  r="4"
                  fill="hsl(var(--primary))"
                  stroke="hsl(var(--background))"
                  strokeWidth="2"
                  className={`animate-in duration-500 hover:r-6 transition-all cursor-pointer delay-[${index * 200 + 1000}ms] origin-center`}
                />
              ))}
            </svg>

            {/* Etiquetas del eje X - Mostrar fechas de los últimos 30 días */}
            <div className="x-axis-labels">
              {dateLabels.map((date, index) => (
                <div key={index} className="chart-label text-muted-foreground">
                  <div className="text-xs">{date}</div>
                </div>
              ))}
            </div>

            {/* Etiquetas del eje Y - Centradas en el rango de pesos */}
            <div className="y-axis-labels">
              <span className="chart-label">{adjustedMaxWeight.toFixed(1)} kg</span>
              <span className="chart-label">{(adjustedMaxWeight - adjustedRange * 0.25).toFixed(1)} kg</span>
              <span className="chart-label">{(adjustedMaxWeight - adjustedRange * 0.5).toFixed(1)} kg</span>
              <span className="chart-label">{(adjustedMaxWeight - adjustedRange * 0.75).toFixed(1)} kg</span>
              <span className="chart-label">{adjustedMinWeight.toFixed(1)} kg</span>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="text-center p-3 bg-muted/50 rounded-lg transform transition-all duration-300 hover:scale-105 hover:bg-muted/70 animate-in slide-in-from-bottom-4 delay-500">
              <p className="text-xs text-muted-foreground">Peso inicial</p>
              <p className="text-sm font-bold">{weightData[0]?.weight || 0} kg</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200 transform transition-all duration-300 hover:scale-105 hover:shadow-md animate-in slide-in-from-bottom-4 delay-700">
              <p className="text-xs text-muted-foreground">Perdidos</p>
              <p className="text-sm font-bold text-green-600 animate-pulse">
                {weightData.length > 1 ? (weightData[0].weight - weightData[weightData.length - 1].weight).toFixed(1) : 0} kg
              </p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg transform transition-all duration-300 hover:scale-105 hover:bg-muted/70 animate-in slide-in-from-bottom-4 delay-900">
              <p className="text-xs text-muted-foreground">Objetivo</p>
              <p className="text-sm font-bold">70.0 kg</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
