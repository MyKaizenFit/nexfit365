"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Timer, Play, Pause, RotateCcw, X, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const PRESET_DURATIONS = [30, 60, 90, 120, 180, 240] as const

interface RestTimerProps {
  /** Duración inicial por defecto en segundos */
  defaultDuration?: number
  /** Si es `true`, el componente es un panel flotante / en línea */
  inline?: boolean
  /** Callback cuando llega a 0 */
  onComplete?: () => void
  className?: string
}

export function RestTimer({ defaultDuration = 90, inline = false, onComplete, className }: RestTimerProps) {
  const [duration, setDuration] = useState(defaultDuration)
  const [remaining, setRemaining] = useState(defaultDuration)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const [muted, setMuted] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Sintetizar pitido sin archivos externos
  const playBeep = useCallback((freq: number, duration_ms: number) => {
    if (muted) return
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioCtxRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = "sine"
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration_ms / 1000)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + duration_ms / 1000)
    } catch { /* silencia errores de audio */ }
  }, [muted])

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setRunning(false)
  }, [])

  const reset = useCallback((newDuration?: number) => {
    stop()
    const d = newDuration ?? duration
    setDuration(d)
    setRemaining(d)
    setFinished(false)
  }, [stop, duration])

  const start = useCallback(() => {
    if (finished) reset()
    setRunning(true)
    setFinished(false)
  }, [finished, reset])

  const pause = useCallback(() => {
    stop()
  }, [stop])

  // Tick del temporizador
  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          stop()
          setFinished(true)
          playBeep(880, 600)
          setTimeout(() => playBeep(880, 600), 700)
          setTimeout(() => playBeep(1100, 800), 1400)
          onComplete?.()
          return 0
        }
        // Pitido de alerta los últimos 3 segundos
        if (prev <= 4) playBeep(660, 200)
        return prev - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, stop, playBeep, onComplete])

  // Limpiar al desmontar
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  const progress = duration > 0 ? (remaining / duration) * 100 : 0
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`

  const circumference = 2 * Math.PI * 42 // r=42
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const ringColor = finished
    ? "text-green-500"
    : remaining <= 10
    ? "text-red-500 animate-pulse"
    : remaining <= 30
    ? "text-amber-500"
    : "text-blue-500"

  const containerClass = inline
    ? cn("bg-white border border-border rounded-2xl p-4 space-y-3", className)
    : cn("bg-white rounded-2xl shadow-xl border border-border p-5 space-y-4", className)

  return (
    <div className={containerClass}>
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-blue-500" />
          <span className="font-semibold text-sm text-foreground">Descanso</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-gray-400 hover:text-muted-foreground"
          onClick={() => setMuted(m => !m)}
          title={muted ? "Activar sonido" : "Silenciar"}
        >
          {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Anillo SVG + tiempo */}
      <div className="flex flex-col items-center gap-2">
        <div className={cn("relative flex items-center justify-center", ringColor)}>
          <svg width="100" height="100" className="-rotate-90">
            {/* Track */}
            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="opacity-10" />
            {/* Progress */}
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: "stroke-dashoffset 0.8s linear" }}
            />
          </svg>
          <div className="absolute text-center">
            <span className="text-2xl font-bold tabular-nums leading-none">{timeStr}</span>
            {finished && <p className="text-xs text-green-600 font-medium mt-0.5">¡Listo!</p>}
          </div>
        </div>
      </div>

      {/* Controles play/pausa/reset */}
      <div className="flex justify-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-full"
          onClick={() => reset()}
          title="Reiniciar"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>

        {running ? (
          <Button
            size="icon"
            className="h-9 w-9 rounded-full bg-amber-500 hover:bg-amber-600 text-white"
            onClick={pause}
            title="Pausar"
          >
            <Pause className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            className="h-9 w-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={start}
            title="Iniciar"
          >
            <Play className="h-4 w-4 ml-0.5" />
          </Button>
        )}
      </div>

      {/* Presets de duración */}
      <div className="flex gap-1 flex-wrap justify-center">
        {PRESET_DURATIONS.map((sec) => (
          <button
            key={sec}
            onClick={() => reset(sec)}
            className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium transition-colors",
              duration === sec && !running
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-muted-foreground hover:bg-gray-200"
            )}
          >
            {sec >= 60 ? `${sec / 60}m` : `${sec}s`}
          </button>
        ))}
      </div>
    </div>
  )
}
