'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ArrowLeft,
  Dumbbell, Play, Pause, Clock,
  Timer, Star, Video,
  Save, RotateCcw, Flame, Shield, CheckCircle2, Copy
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { ExerciseVideoPlayer } from './exercise-video-player'
import { cn } from '@/lib/utils'

// =============================================
// INPUT NUMÉRICO PARA MÓVIL
// Evita el problema de type="number" en iOS que impide borrar el valor
// =============================================
interface NumericInputProps {
  value: number | undefined
  onChange: (value: number | undefined) => void
  onBlurMin?: number
  placeholder?: string
  className?: string
  disabled?: boolean
  allowDecimal?: boolean
}

function NumericInput({ value, onChange, onBlurMin, placeholder, className, disabled = false, allowDecimal = false }: NumericInputProps) {
  const [display, setDisplay] = useState(value != null ? String(value) : '')
  const lastExternal = useRef(value)

  useEffect(() => {
    if (value !== lastExternal.current) {
      lastExternal.current = value
      setDisplay(value != null ? String(value) : '')
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value
    if (allowDecimal) {
      raw = raw.replace(/[^0-9.,]/g, '').replace(',', '.')
    } else {
      raw = raw.replace(/[^0-9]/g, '')
    }
    setDisplay(raw)
    const num = allowDecimal ? parseFloat(raw) : parseInt(raw, 10)
    if (!isNaN(num)) {
      lastExternal.current = num
      onChange(num)
    } else if (raw === '') {
      onChange(undefined)
    }
  }

  const handleBlur = () => {
    if (onBlurMin !== undefined) {
      const num = allowDecimal ? parseFloat(display) : parseInt(display, 10)
      const final = isNaN(num) || num < onBlurMin ? onBlurMin : num
      setDisplay(String(final))
      lastExternal.current = final
      onChange(final)
    }
  }

  return (
    <Input
      type="text"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      pattern={allowDecimal ? '[0-9]*[.,]?[0-9]*' : '[0-9]*'}
      className={className}
      placeholder={placeholder}
      disabled={disabled}
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  )
}


interface StarRatingProps {
  value: number
  onChange: (value: number) => void
  size?: 'sm' | 'md' | 'lg'
}

function StarRating({ value, onChange, size = 'md' }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0)

  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  }

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHoverValue(star)}
          onMouseLeave={() => setHoverValue(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={cn(
              sizeClasses[size],
              'transition-colors',
              (hoverValue || value) >= star
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-200 text-gray-300'
            )}
          />
        </button>
      ))}
      <span className="ml-2 text-sm text-muted-foreground">
        {value > 0 ? `${value}/5` : 'Sin calificar'}
      </span>
    </div>
  )
}

// =============================================
// COMPONENTE DE TEMPORIZADOR DE DESCANSO
// =============================================
interface RestTimerProps {
  defaultSeconds: number
  onComplete: () => void
  isActive: boolean
  setIsActive: (active: boolean) => void
}

function RestTimer({ defaultSeconds, onComplete, isActive, setIsActive }: RestTimerProps) {
  const [timeLeft, setTimeLeft] = useState(defaultSeconds)
  const [customTime, setCustomTime] = useState(defaultSeconds)

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsActive(false)
            onComplete()
            // Reproducir sonido de notificación
            if (typeof window !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate([200, 100, 200])
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => clearInterval(interval)
  }, [isActive, timeLeft, onComplete, setIsActive])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleStart = () => {
    setTimeLeft(customTime)
    setIsActive(true)
  }

  const handlePause = () => {
    setIsActive(false)
  }

  const handleReset = () => {
    setIsActive(false)
    setTimeLeft(customTime)
  }

  const progressPercent = ((customTime - timeLeft) / customTime) * 100

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-4 border-2 border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-blue-800 flex items-center gap-2">
          <Timer className="h-5 w-5" />
          Temporizador de Descanso
        </h4>
        <Badge variant="outline" className="bg-card">
          {formatTime(timeLeft)}
        </Badge>
      </div>

      <Progress value={progressPercent} className="h-3 mb-4" />

      <div className="flex items-center gap-2">
        {/* Ajustar tiempo */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const newTime = Math.max(15, customTime - 15)
              setCustomTime(newTime)
              if (!isActive) setTimeLeft(newTime)
            }}
            disabled={isActive}
          >
            -15s
          </Button>
          <span className="text-sm font-medium w-16 text-center">
            {formatTime(customTime)}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const newTime = customTime + 15
              setCustomTime(newTime)
              if (!isActive) setTimeLeft(newTime)
            }}
            disabled={isActive}
          >
            +15s
          </Button>
        </div>

        <div className="flex-1" />

        {/* Controles */}
        {!isActive ? (
          <Button
            onClick={handleStart}
            className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
          >
            <Play className="h-4 w-4 mr-1" />
            Iniciar
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={handlePause}>
              <Pause className="h-4 w-4 mr-1" />
              Pausar
            </Button>
            <Button variant="ghost" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

// =============================================
// COMPONENTE PRINCIPAL DE SESIÓN DE ENTRENAMIENTO
// =============================================
interface ActiveWorkoutSessionProps {
  workoutDay: any
  initialSubstituteSelections?: Record<string, any>
  initialDraftLog?: any | null
  workoutLogs?: any[]
  isOpen: boolean
  onClose: () => void
  onSaveProgress?: (data: {
    duration_minutes: number
    rating: number
    notes: string
    exercises_data: any[]
    completed?: boolean
  }) => Promise<void>
  onComplete: (data: {
    duration_minutes: number
    rating: number
    notes: string
    exercises_data: any[]
  }) => Promise<void>
}

interface ExerciseSetEntry {
  reps?: number
  weight?: number
  effort?: number
}

interface ExerciseSetState {
  seriesCount: number
  base: ExerciseSetEntry
  overrides: Record<string, ExerciseSetEntry>
}

function getTargetRpe(exerciseItem: any, exercise: any): string {
  const explicitRpe = exerciseItem?.target_rpe ?? exerciseItem?.rpe ?? exercise?.target_rpe ?? exercise?.rpe
  if (explicitRpe !== undefined && explicitRpe !== null && String(explicitRpe).trim() !== '') {
    return String(explicitRpe).trim().replace(/^rpe\s*/i, '')
  }

  const weight = String(exerciseItem?.weight ?? exercise?.weight ?? '').trim()
  const match = weight.match(/\brpe\s*[:=-]?\s*([0-9]+(?:[.,][0-9]+)?)/i)
  return match ? match[1].replace(',', '.') : ''
}

function formatPlanTarget(exerciseItem: any, exercise: any): string {
  const sets = exerciseItem?.sets ?? exercise?.sets ?? '—'
  const reps = exerciseItem?.reps ?? exercise?.reps ?? '—'
  const weight = String(exerciseItem?.weight ?? exercise?.weight ?? '').trim()
  const targetRpe = getTargetRpe(exerciseItem, exercise)
  const suffix = targetRpe
    ? ` @ RPE ${targetRpe}`
    : weight
      ? ` @ ${weight}`
      : ''

  return `${sets} × ${reps} reps${suffix}`
}

export function ActiveWorkoutSession({
  workoutDay,
  initialSubstituteSelections = {},
  initialDraftLog = null,
  workoutLogs = [],
  isOpen,
  onClose,
  onSaveProgress,
  onComplete
}: ActiveWorkoutSessionProps) {
  // Clave para localStorage basada en el día de entrenamiento
  const workoutStorageKey = workoutDay?.id
    ? `active_workout_${workoutDay.id}_${new Date().toISOString().split('T')[0]}`
    : null
  const substituteStorageKey = workoutDay?.id
    ? `workout_substitutes_${workoutDay.id}_${new Date().toISOString().split('T')[0]}`
    : null

  // Función para guardar estado en localStorage
  const saveWorkoutState = useCallback((state: any) => {
    if (!workoutStorageKey || typeof window === 'undefined') return
    try {
      localStorage.setItem(workoutStorageKey, JSON.stringify({
        ...state,
        savedAt: Date.now()
      }))
    } catch (error) {
    }
  }, [workoutStorageKey])

  // Función para cargar estado desde localStorage
  const loadWorkoutState = useCallback(() => {
    if (!workoutStorageKey || typeof window === 'undefined') return null
    try {
      const saved = localStorage.getItem(workoutStorageKey)
      if (saved) {
        const state = JSON.parse(saved)
        // Solo cargar si es del mismo día
        const savedDate = new Date(state.savedAt).toISOString().split('T')[0]
        const today = new Date().toISOString().split('T')[0]
        if (savedDate === today) {
          return state
        }
      }
    } catch (error) {
    }
    return null
  }, [workoutStorageKey])

  // Estado del entrenamiento
  const [isStarted, setIsStarted] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null)
  const runningStartedAtRef = useRef<number | null>(null)
  const elapsedAtRunningStartRef = useRef(0)
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set())
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [showRestTimer, setShowRestTimer] = useState(false)
  const [restTimerActive, setRestTimerActive] = useState(false)

  // Estado de cada serie por ejercicio
  const [exerciseSets, setExerciseSets] = useState<Record<string, ExerciseSetState>>({})

  // Estado del formulario de finalización
  const [rating, setRating] = useState(0)
  const [notes, setNotes] = useState('')
  const [showFinishDialog, setShowFinishDialog] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [autosaveState, setAutosaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [confirmMissingExercises, setConfirmMissingExercises] = useState(false)
  const [substituteSelections, setSubstituteSelections] = useState<Record<string, any>>(initialSubstituteSelections || {})

  const exercises = workoutDay?.exercises || []
  const hasMissingExercises = completedExercises.size < exercises.length

  const getExerciseStateKey = useCallback((exerciseItem: any) => {
    return String(exerciseItem?.id || exerciseItem?.exercise?.id || '')
  }, [])

  const normalizeCompletedExercises = useCallback((savedCompleted: any[] = []) => {
    const savedSet = new Set((savedCompleted || []).map((value) => String(value)))
    const normalized = new Set<string>()

    exercises.forEach((exerciseItem: any) => {
      const workoutExerciseId = getExerciseStateKey(exerciseItem)
      const baseExerciseId = String(exerciseItem?.exercise?.id || exerciseItem?.id || '')

      if (savedSet.has(workoutExerciseId) || savedSet.has(baseExerciseId)) {
        normalized.add(workoutExerciseId)
      }
    })

    return normalized
  }, [exercises, getExerciseStateKey])

  useEffect(() => {
    if (!isOpen) return

    if (!substituteStorageKey || typeof window === 'undefined') {
      setSubstituteSelections(initialSubstituteSelections || {})
      return
    }

    try {
      const saved = localStorage.getItem(substituteStorageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        setSubstituteSelections({
          ...(initialSubstituteSelections || {}),
          ...(parsed && typeof parsed === 'object' ? parsed : {}),
        })
      } else {
        setSubstituteSelections(initialSubstituteSelections || {})
      }
    } catch {
      setSubstituteSelections(initialSubstituteSelections || {})
    }
  }, [isOpen, substituteStorageKey])

  const persistSubstituteSelections = useCallback((nextState: Record<string, any>) => {
    setSubstituteSelections(nextState)
    if (!substituteStorageKey || typeof window === 'undefined') return
    try {
      localStorage.setItem(substituteStorageKey, JSON.stringify(nextState))
    } catch {
    }
  }, [substituteStorageKey])

  const selectSubstitute = (baseExerciseId: string, substitute: any) => {
    const key = String(baseExerciseId)
    persistSubstituteSelections({
      ...substituteSelections,
      [key]: substitute,
    })
  }

  const restorePrimaryExercise = (baseExerciseId: string) => {
    const key = String(baseExerciseId)
    const next = { ...substituteSelections }
    delete next[key]
    persistSubstituteSelections(next)
  }

  const normalizeSeriesCount = (value: any, fallback = 1) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed < 1) return fallback
    return Math.max(1, Math.floor(parsed))
  }

  const findNextAvailableSeriesNumber = (
    preferredNumber: number,
    usedNumbers: Set<number>,
    maxSeries: number
  ) => {
    const normalizedPreferred = Math.min(maxSeries, Math.max(1, normalizeSeriesCount(preferredNumber, 1)))

    for (let candidate = normalizedPreferred; candidate <= maxSeries; candidate += 1) {
      if (!usedNumbers.has(candidate)) {
        return candidate
      }
    }

    for (let candidate = 1; candidate < normalizedPreferred; candidate += 1) {
      if (!usedNumbers.has(candidate)) {
        return candidate
      }
    }

    return null
  }

  const hasSetData = (setData?: ExerciseSetEntry) => {
    if (!setData) return false
    return (
      (setData.reps !== undefined && setData.reps !== null && setData.reps > 0) ||
      (setData.weight !== undefined && setData.weight !== null && setData.weight > 0) ||
      (setData.effort !== undefined && setData.effort !== null && setData.effort > 0)
    )
  }

  const exerciseHasAnyData = (exerciseData?: ExerciseSetState) => {
    if (!exerciseData) return false
    if (hasSetData(exerciseData.base)) return true
    return Object.values(exerciseData.overrides || {}).some((entry) => hasSetData(entry))
  }

  const getEffectiveSetData = (exerciseData: ExerciseSetState | undefined, setNumber: number): ExerciseSetEntry => {
    if (!exerciseData) return {}
    return exerciseData.overrides?.[String(setNumber)] || exerciseData.base || {}
  }

  const normalizeExerciseSets = (data: Record<string, any> = {}) => {
    const normalized: Record<string, ExerciseSetState> = {}

    Object.entries(data || {}).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        const first = value[0] || {}
        normalized[key] = {
          seriesCount: normalizeSeriesCount(value.length || 1),
          base: {
            reps: typeof first.reps === 'number' ? first.reps : undefined,
            weight: typeof first.weight === 'number' ? first.weight : undefined,
            effort: typeof first.effort === 'number' ? first.effort : undefined,
          },
          overrides: {},
        }
      } else if (value && typeof value === 'object') {
        if (
          'seriesCount' in value ||
          'base' in value ||
          'overrides' in value
        ) {
          const parsedBase = value.base && typeof value.base === 'object' ? value.base : {}
          const parsedOverrides = value.overrides && typeof value.overrides === 'object' ? value.overrides : {}

          normalized[key] = {
            seriesCount: normalizeSeriesCount(value.seriesCount, 1),
            base: {
              reps: typeof parsedBase.reps === 'number' ? parsedBase.reps : undefined,
              weight: typeof parsedBase.weight === 'number' ? parsedBase.weight : undefined,
              effort: typeof parsedBase.effort === 'number' ? parsedBase.effort : undefined,
            },
            overrides: Object.entries(parsedOverrides).reduce((acc, [setNumber, setValue]) => {
              if (!setValue || typeof setValue !== 'object') return acc
              acc[String(setNumber)] = {
                reps: typeof (setValue as any).reps === 'number' ? (setValue as any).reps : undefined,
                weight: typeof (setValue as any).weight === 'number' ? (setValue as any).weight : undefined,
                effort: typeof (setValue as any).effort === 'number' ? (setValue as any).effort : undefined,
              }
              return acc
            }, {} as Record<string, ExerciseSetEntry>),
          }
          return
        }

        normalized[key] = {
          seriesCount: normalizeSeriesCount(1),
          base: {
            reps: typeof value.reps === 'number' ? value.reps : undefined,
            weight: typeof value.weight === 'number' ? value.weight : undefined,
            effort: typeof value.effort === 'number' ? value.effort : undefined,
          },
          overrides: {},
        }
      }
    })

    return normalized
  }

  const hydrateExerciseSetsFromLog = useCallback((exercisesData: any[] = []) => {
    const normalized: Record<string, ExerciseSetState> = {}
    const restoredCompleted = new Set<string>()

    exercises.forEach((exerciseItem: any) => {
      const exerciseId = getExerciseStateKey(exerciseItem)
      const baseExercise = exerciseItem?.exercise || exerciseItem
      const baseExerciseId = String(baseExercise?.id || '')
      const plannedSeries = normalizeSeriesCount(exerciseItem?.sets || exerciseItem?.series || baseExercise?.sets, 1)
      const draftExercise = exercisesData.find((entry: any) => {
        const ids = [
          entry?.exercise_id,
          entry?.original_exercise_id,
          entry?.id,
        ].filter((value) => value !== undefined && value !== null).map((value) => String(value))
        return ids.includes(exerciseId) || ids.includes(baseExerciseId)
      })

      const draftSets = Array.isArray(draftExercise?.sets) ? draftExercise.sets : []
      const seriesCount = normalizeSeriesCount(draftSets.length || plannedSeries, plannedSeries)

      normalized[exerciseId] = {
        seriesCount,
        base: {},
        overrides: draftSets.reduce((acc: Record<string, ExerciseSetEntry>, set: any, index: number) => {
          const setNumber = normalizeSeriesCount(set?.set_number || index + 1, index + 1)
          acc[String(setNumber)] = {
            reps: set?.reps !== null && set?.reps !== undefined ? Number(set.reps) : undefined,
            weight: set?.weight !== null && set?.weight !== undefined ? Number(set.weight) : undefined,
            effort: set?.effort !== null && set?.effort !== undefined ? Number(set.effort) : undefined,
          }
          return acc
        }, {}),
      }

      if (draftExercise?.completed || exerciseHasAnyData(normalized[exerciseId])) {
        restoredCompleted.add(exerciseId)
      }
    })

    return { sets: normalized, completed: restoredCompleted }
  }, [exercises, getExerciseStateKey])

  const buildExercisesData = useCallback(() => {
    return exercises.map((ex: any) => {
      const exerciseId = getExerciseStateKey(ex)
      const baseExercise = ex.exercise || ex
      const selectedSubstitute = substituteSelections[String(baseExercise.id)]
      const mainExercise = selectedSubstitute || baseExercise
      const setData = exerciseSets[exerciseId] || {
        seriesCount: normalizeSeriesCount(ex?.sets || ex?.series || 1, 1),
        base: {},
        overrides: {},
      }
      const totalSeries = normalizeSeriesCount(setData.seriesCount, 1)

      const validSets = Array.from({ length: totalSeries }, (_, index) => {
        const setNumber = index + 1
        const resolvedSet = getEffectiveSetData(setData, setNumber)

        return {
          set_number: setNumber,
          completed: completedExercises.has(String(exerciseId)),
          reps: resolvedSet.reps !== undefined ? Number(resolvedSet.reps) : null,
          weight: resolvedSet.weight !== undefined ? Number(resolvedSet.weight) : null,
          duration: null,
          rest_seconds: ex.rest_seconds || ex.rest_time || null,
          effort: resolvedSet.effort !== undefined ? Number(resolvedSet.effort) : null
        }
      })

      const firstSet = getEffectiveSetData(setData, 1)

      return {
        exercise_id: mainExercise.id,
        exercise_name: mainExercise.name,
        original_exercise_id: baseExercise.id,
        sets: validSets,
        completed: completedExercises.has(String(exerciseId)),
        effort: firstSet.effort !== undefined ? Number(firstSet.effort) : null
      }
    })
  }, [completedExercises, exerciseSets, exercises, getExerciseStateKey, substituteSelections])

  const getLastExercisePerformance = useCallback((exercise: any) => {
    const exerciseId = String(exercise?.id || '')
    if (!exerciseId) return null

    const today = new Date().toISOString().split('T')[0]
    for (const log of workoutLogs || []) {
      if (!log?.completed || log?.date === today || !Array.isArray(log?.exercises_data)) continue
      const match = log.exercises_data.find((entry: any) => {
        const ids = [entry?.exercise_id, entry?.original_exercise_id, entry?.id]
          .filter((value) => value !== undefined && value !== null)
          .map((value) => String(value))
        return ids.includes(exerciseId)
      })
      if (match) {
        return { ...match, date: log.date }
      }
    }
    return null
  }, [workoutLogs])

  const formatLastPerformance = (performance: any) => {
    if (!performance || !Array.isArray(performance.sets)) return ''
    const sets = performance.sets
      .filter((set: any) => set?.reps || set?.weight || set?.effort)
      .slice(0, 3)
      .map((set: any) => {
        const parts = []
        if (set.reps) parts.push(`${set.reps} rep`)
        if (set.weight) parts.push(`${set.weight} kg`)
        if (set.effort) parts.push(`RPE ${set.effort}`)
        return parts.join(' · ')
      })
      .filter(Boolean)

    if (sets.length === 0) return ''
    const extra = performance.sets.length > sets.length ? ` +${performance.sets.length - sets.length}` : ''
    return `${performance.date}: ${sets.join(' | ')}${extra}`
  }

  // Cargar estado guardado al montar el componente
  useEffect(() => {
    if (isOpen && workoutDay) {
      const savedState = loadWorkoutState()
      if (savedState) {
        setIsStarted(savedState.isStarted || false)
        setIsPaused(savedState.isPaused || false)
        setWorkoutStartTime(savedState.workoutStartTime || null)
        setCompletedExercises(normalizeCompletedExercises(savedState.completedExercises || []))
        setExerciseSets(normalizeExerciseSets(savedState.exerciseSets || {}))
        setRating(savedState.rating || 0)
        setNotes(savedState.notes || '')

        if (savedState.isStarted && !savedState.isPaused) {
          const restoredElapsed = Math.max(0, Number(savedState.elapsedSeconds || 0))
          const lastSavedAt = typeof savedState.savedAt === 'number' ? savedState.savedAt : Date.now()
          const deltaSinceSave = Math.max(0, Math.floor((Date.now() - lastSavedAt) / 1000))
          const nextElapsed = restoredElapsed + deltaSinceSave
          setElapsedSeconds(nextElapsed)
          elapsedAtRunningStartRef.current = nextElapsed
          runningStartedAtRef.current = Date.now()
        } else {
          const restoredElapsed = Math.max(0, Number(savedState.elapsedSeconds || 0))
          setElapsedSeconds(restoredElapsed)
          elapsedAtRunningStartRef.current = restoredElapsed
          runningStartedAtRef.current = null
        }
      } else if (initialDraftLog) {
        const restored = hydrateExerciseSetsFromLog(initialDraftLog.exercises_data)
        const restoredElapsed = Math.max(0, Number(initialDraftLog.duration_minutes || 0) * 60)
        const startTime = Date.now()

        setIsStarted(true)
        setIsPaused(false)
        setWorkoutStartTime(startTime)
        setCompletedExercises(restored.completed)
        setExerciseSets(restored.sets)
        setRating(initialDraftLog.rating || 0)
        setNotes(initialDraftLog.notes || '')
        setElapsedSeconds(restoredElapsed)
        elapsedAtRunningStartRef.current = restoredElapsed
        runningStartedAtRef.current = startTime
      }
    }
  }, [isOpen, workoutDay, loadWorkoutState, normalizeCompletedExercises, initialDraftLog, hydrateExerciseSetsFromLog])

  // Inicializar sets de ejercicios
  useEffect(() => {
    if (exercises.length > 0 && Object.keys(exerciseSets).length === 0) {
      const initialSets: Record<string, ExerciseSetState> = {}
      exercises.forEach((ex: any) => {
        const exerciseId = getExerciseStateKey(ex)
        initialSets[exerciseId] = {
          seriesCount: normalizeSeriesCount(ex?.sets || ex?.series || ex?.exercise?.sets, 1),
          base: {
            reps: undefined,
            weight: undefined,
            effort: undefined,
          },
          overrides: {},
        }
      })
      setExerciseSets(initialSets)
    }
  }, [exercises, exerciseSets, getExerciseStateKey])

  // Guardar estado cuando cambian rating o notes (con debounce para evitar demasiadas escrituras)
  useEffect(() => {
    if (!isStarted || !workoutStorageKey) return

    const timeoutId = setTimeout(() => {
      saveWorkoutState({
        isStarted,
        isPaused,
        elapsedSeconds,
        workoutStartTime,
        completedExercises: Array.from(completedExercises),
        exerciseSets,
        rating,
        notes
      })
    }, 500) // Debounce de 500ms

    return () => clearTimeout(timeoutId)
  }, [rating, notes]) // Solo cuando cambian rating o notes

  const getCurrentElapsedSeconds = useCallback(() => {
    const savedElapsed = Math.max(elapsedSeconds, elapsedAtRunningStartRef.current || 0)

    if (!isStarted || isPaused || !runningStartedAtRef.current) {
      return savedElapsed
    }

    const delta = Math.max(0, Math.floor((Date.now() - runningStartedAtRef.current) / 1000))
    return elapsedAtRunningStartRef.current + delta
  }, [elapsedSeconds, isPaused, isStarted])

  const syncElapsedFromClock = useCallback(() => {
    const nextElapsed = getCurrentElapsedSeconds()
    setElapsedSeconds(nextElapsed)
    return nextElapsed
  }, [getCurrentElapsedSeconds])

  // Temporizador de entrenamiento basado en hora real.
  // En móviles el navegador pausa JS al bloquear pantalla, así que no podemos fiarnos de +1s por tick.
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isStarted && !isPaused) {
      runningStartedAtRef.current = Date.now()
      elapsedAtRunningStartRef.current = elapsedSeconds

      interval = setInterval(() => {
        const startedAt = runningStartedAtRef.current
        if (!startedAt) return

        const nextElapsed = elapsedAtRunningStartRef.current + Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
        setElapsedSeconds(nextElapsed)

        // Guardar estado cada 5 segundos para no saturar localStorage.
        if (nextElapsed % 5 === 0) {
          saveWorkoutState({
            isStarted,
            isPaused,
            elapsedSeconds: nextElapsed,
            workoutStartTime,
            completedExercises: Array.from(completedExercises),
            exerciseSets,
            rating,
            notes
          })
        }
      }, 1000)
    }

    return () => clearInterval(interval)
  }, [isStarted, isPaused])

  useEffect(() => {
    if (!isStarted || typeof document === 'undefined') return

    const persistCurrentElapsed = () => {
      const nextElapsed = syncElapsedFromClock()
      saveWorkoutState({
        isStarted,
        isPaused,
        elapsedSeconds: nextElapsed,
        workoutStartTime,
        completedExercises: Array.from(completedExercises),
        exerciseSets,
        rating,
        notes
      })
    }

    window.addEventListener('focus', persistCurrentElapsed)
    window.addEventListener('blur', persistCurrentElapsed)
    window.addEventListener('pagehide', persistCurrentElapsed)
    document.addEventListener('visibilitychange', persistCurrentElapsed)
    return () => {
      window.removeEventListener('focus', persistCurrentElapsed)
      window.removeEventListener('blur', persistCurrentElapsed)
      window.removeEventListener('pagehide', persistCurrentElapsed)
      document.removeEventListener('visibilitychange', persistCurrentElapsed)
    }
  }, [completedExercises, exerciseSets, isPaused, isStarted, notes, rating, saveWorkoutState, syncElapsedFromClock, workoutStartTime])

  useEffect(() => {
    if (!isStarted || !onSaveProgress) return

    const hasProgress =
      completedExercises.size > 0 ||
      Object.values(exerciseSets).some((setData) => exerciseHasAnyData(setData)) ||
      notes.trim().length > 0 ||
      rating > 0

    if (!hasProgress) return

    const timeoutId = setTimeout(async () => {
      setAutosaveState('saving')
      try {
        await onSaveProgress({
          duration_minutes: Math.ceil(getCurrentElapsedSeconds() / 60),
          rating,
          notes,
          exercises_data: buildExercisesData(),
          completed: false,
        })
        setAutosaveState('saved')
      } catch {
        setAutosaveState('error')
      }
    }, 900)

    return () => clearTimeout(timeoutId)
  }, [
    buildExercisesData,
    completedExercises,
    exerciseSets,
    getCurrentElapsedSeconds,
    isStarted,
    notes,
    onSaveProgress,
    rating,
  ])

  // Formatear tiempo
  const formatTime = useCallback((seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  const updateExerciseBaseData = (
    exerciseId: string,
    field: 'reps' | 'weight' | 'effort',
    value: number | undefined
  ) => {
    setExerciseSets((prev) => {
      const newSets = { ...prev }
      const current = newSets[exerciseId] || {
        seriesCount: 1,
        base: {},
        overrides: {},
      }

      newSets[exerciseId] = {
        ...current,
        base: {
          ...(current.base || {}),
          [field]: value,
        },
      }

      const updated = newSets[exerciseId]
      const hasData = exerciseHasAnyData(updated)

      setCompletedExercises((prevCompleted) => {
        const next = new Set(prevCompleted)
        if (hasData) {
          next.add(String(exerciseId))
        } else {
          next.delete(String(exerciseId))
        }

        saveWorkoutState({
          isStarted,
          isPaused,
          elapsedSeconds,
          workoutStartTime,
          completedExercises: Array.from(next),
          exerciseSets: newSets,
          rating,
          notes
        })

        return next
      })

      return newSets
    })
  }

  const updateSeriesCount = (exerciseId: string, value: number | undefined) => {
    const nextCount = Math.min(6, normalizeSeriesCount(value, 1))

    setExerciseSets((prev) => {
      const newSets = { ...prev }
      const current = newSets[exerciseId] || {
        seriesCount: 1,
        base: {},
        overrides: {},
      }

      const filteredOverrides = Object.entries(current.overrides || {}).reduce((acc, [setNumber, setData]) => {
        const parsed = normalizeSeriesCount(setNumber, 1)
        if (parsed <= nextCount) {
          acc[String(parsed)] = setData
        }
        return acc
      }, {} as Record<string, ExerciseSetEntry>)

      newSets[exerciseId] = {
        ...current,
        seriesCount: nextCount,
        overrides: filteredOverrides,
      }

      const updated = newSets[exerciseId]
      const hasData = exerciseHasAnyData(updated)

      setCompletedExercises((prevCompleted) => {
        const next = new Set(prevCompleted)
        if (hasData) {
          next.add(String(exerciseId))
        } else {
          next.delete(String(exerciseId))
        }

        saveWorkoutState({
          isStarted,
          isPaused,
          elapsedSeconds,
          workoutStartTime,
          completedExercises: Array.from(next),
          exerciseSets: newSets,
          rating,
          notes
        })

        return next
      })

      return newSets
    })
  }

  const addDifferentSeries = (exerciseId: string) => {
    setExerciseSets((prev) => {
      const newSets = { ...prev }
      const current = newSets[exerciseId] || {
        seriesCount: 1,
        base: {},
        overrides: {},
      }

      const totalSeries = normalizeSeriesCount(current.seriesCount, 1)
      const used = new Set(Object.keys(current.overrides || {}).map((key) => normalizeSeriesCount(key, 1)))
  const preferredNext = used.size > 0 ? Math.max(...Array.from(used)) + 1 : 1
  const nextSeries = findNextAvailableSeriesNumber(preferredNext, used, totalSeries)

      if (!nextSeries) return prev

      newSets[exerciseId] = {
        ...current,
        overrides: {
          ...(current.overrides || {}),
          [String(nextSeries)]: {},
        },
      }

      return newSets
    })
  }

  const removeDifferentSeries = (exerciseId: string, setNumber: number) => {
    setExerciseSets((prev) => {
      const newSets = { ...prev }
      const current = newSets[exerciseId]
      if (!current) return prev

      const nextOverrides = { ...(current.overrides || {}) }
      delete nextOverrides[String(setNumber)]

      newSets[exerciseId] = {
        ...current,
        overrides: nextOverrides,
      }

      return newSets
    })
  }

  const updateDifferentSeriesNumber = (exerciseId: string, currentSetNumber: number, nextSetNumberRaw: number | undefined) => {
    const nextSetNumber = normalizeSeriesCount(nextSetNumberRaw, currentSetNumber)

    setExerciseSets((prev) => {
      const newSets = { ...prev }
      const current = newSets[exerciseId]
      if (!current) return prev

      const seriesCount = normalizeSeriesCount(current.seriesCount, 1)
      const boundedSetNumber = Math.min(seriesCount, Math.max(1, nextSetNumber))
      const nextOverrides = { ...(current.overrides || {}) }
      const movingData = nextOverrides[String(currentSetNumber)] || {}

      const usedWithoutCurrent = new Set(
        Object.keys(nextOverrides)
          .map((key) => normalizeSeriesCount(key, 1))
          .filter((setNumber) => setNumber !== currentSetNumber)
      )

      const targetSetNumber = usedWithoutCurrent.has(boundedSetNumber)
        ? findNextAvailableSeriesNumber(boundedSetNumber, usedWithoutCurrent, seriesCount)
        : boundedSetNumber

      if (!targetSetNumber || targetSetNumber === currentSetNumber) return prev

      delete nextOverrides[String(currentSetNumber)]
      nextOverrides[String(targetSetNumber)] = movingData

      newSets[exerciseId] = {
        ...current,
        overrides: nextOverrides,
      }

      return newSets
    })
  }

  const updateDifferentSeriesData = (
    exerciseId: string,
    setNumber: number,
    field: 'reps' | 'weight' | 'effort',
    value: number | undefined
  ) => {
    setExerciseSets((prev) => {
      const newSets = { ...prev }
      const current = newSets[exerciseId] || {
        seriesCount: 1,
        base: {},
        overrides: {},
      }

      const currentSetData = current.overrides?.[String(setNumber)] || {}

      newSets[exerciseId] = {
        ...current,
        overrides: {
          ...(current.overrides || {}),
          [String(setNumber)]: {
            ...currentSetData,
            [field]: value,
          },
        },
      }

      const updated = newSets[exerciseId]
      const hasData = exerciseHasAnyData(updated)

      setCompletedExercises((prevCompleted) => {
        const next = new Set(prevCompleted)
        if (hasData) {
          next.add(String(exerciseId))
        } else {
          next.delete(String(exerciseId))
        }

        saveWorkoutState({
          isStarted,
          isPaused,
          elapsedSeconds,
          workoutStartTime,
          completedExercises: Array.from(next),
          exerciseSets: newSets,
          rating,
          notes
        })

        return next
      })

      return newSets
    })
  }

  const toggleExerciseCompletion = (exerciseId: string) => {
    setCompletedExercises((prevCompleted) => {
      const next = new Set(prevCompleted)
      if (next.has(exerciseId)) {
        next.delete(exerciseId)
      } else {
        next.add(exerciseId)
      }

      saveWorkoutState({
        isStarted,
        isPaused,
        elapsedSeconds,
        workoutStartTime,
        completedExercises: Array.from(next),
        exerciseSets,
        rating,
        notes
      })

      return next
    })
  }

  // Iniciar entrenamiento
  const handleStart = () => {
    const startTime = Date.now()
    setIsStarted(true)
    setIsPaused(false)
    setWorkoutStartTime(startTime)
    setElapsedSeconds(0)
    runningStartedAtRef.current = startTime
    elapsedAtRunningStartRef.current = 0

    // Guardar estado inicial
    saveWorkoutState({
      isStarted: true,
      isPaused: false,
      elapsedSeconds: 0,
      workoutStartTime: startTime,
      completedExercises: Array.from(completedExercises),
      exerciseSets,
      rating,
      notes
    })

    toast({
      title: "¡Entrenamiento iniciado! 💪",
      description: "El temporizador está corriendo. ¡Vamos!"
    })
  }

  // Pausar entrenamiento
  const handlePause = () => {
    const currentElapsed = syncElapsedFromClock()
    const newPausedState = !isPaused
    setIsPaused(newPausedState)
    if (newPausedState) {
      runningStartedAtRef.current = null
      elapsedAtRunningStartRef.current = currentElapsed
    } else {
      runningStartedAtRef.current = Date.now()
      elapsedAtRunningStartRef.current = currentElapsed
    }

    // Guardar estado al pausar/reanudar
    saveWorkoutState({
      isStarted,
      isPaused: newPausedState,
      elapsedSeconds: currentElapsed,
      workoutStartTime,
      completedExercises: Array.from(completedExercises),
      exerciseSets,
      rating,
      notes
    })
  }

  // Preparar finalización
  const handlePrepareFinish = () => {
    const currentElapsed = syncElapsedFromClock()
    // Pausar el temporizador cuando se abre el diálogo de finalización
    setIsPaused(true)
    runningStartedAtRef.current = null
    elapsedAtRunningStartRef.current = currentElapsed
    setConfirmMissingExercises(false)
    setShowFinishDialog(true)

    // Guardar estado al pausar
    saveWorkoutState({
      isStarted,
      isPaused: true,
      elapsedSeconds: currentElapsed,
      workoutStartTime,
      completedExercises: Array.from(completedExercises),
      exerciseSets,
      rating,
      notes
    })
  }

  // Finalizar entrenamiento
  const handleFinish = async () => {
    if (hasMissingExercises && !confirmMissingExercises) {
      setConfirmMissingExercises(true)
      return
    }
    setIsSaving(true)
    const finalElapsedSeconds = syncElapsedFromClock()

    try {
      const exercisesData = buildExercisesData()

      // Log para depuración

      await onComplete({
        duration_minutes: Math.ceil(finalElapsedSeconds / 60),
        rating: rating,
        notes: notes,
        exercises_data: exercisesData
      })

      toast({
        title: "¡Entrenamiento completado! 🎉",
        description: `Duración: ${formatTime(finalElapsedSeconds)}`
      })

      // Limpiar estado guardado
      if (workoutStorageKey && typeof window !== 'undefined') {
        localStorage.removeItem(workoutStorageKey)
      }
      if (substituteStorageKey && typeof window !== 'undefined') {
        localStorage.removeItem(substituteStorageKey)
      }

      // Reset y cerrar
      setIsStarted(false)
      setElapsedSeconds(0)
      setWorkoutStartTime(null)
      setCompletedExercises(new Set())
      setExerciseSets({})
      setRating(0)
      setNotes('')
      setShowFinishDialog(false)
      onClose()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar el entrenamiento",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Callback cuando termina el descanso
  const handleRestComplete = () => {
    toast({
      title: "⏰ ¡Descanso terminado!",
      description: "Es hora de la siguiente serie"
    })
    setShowRestTimer(false)
  }

  const progressPercent = exercises.length > 0
    ? (completedExercises.size / exercises.length) * 100
    : 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-0 overflow-y-auto rounded-none inset-0 translate-x-0 translate-y-0 w-full max-w-none max-h-none sm:rounded-lg sm:right-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[95vw] sm:max-w-4xl sm:max-h-[95vh]">
        <DialogDescription className="sr-only">
          Sesión de entrenamiento activo - completa los ejercicios y guarda tu progreso
        </DialogDescription>
        {/* Header con temporizador */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 sm:rounded-t-lg">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="mb-3 h-9 px-2 text-white hover:bg-white/20 md:hidden"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Dumbbell className="h-6 w-6" />
                {workoutDay?.day_name || workoutDay?.name || 'Entrenamiento'}
              </DialogTitle>
              <p className="text-purple-200 text-sm mt-1">
                {exercises.length} ejercicios
              </p>
            </div>

            {/* Temporizador principal */}
            <div className="text-center">
              <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2">
                <Clock className="h-5 w-5" />
                <span className="text-2xl font-mono font-bold">
                  {formatTime(elapsedSeconds)}
                </span>
              </div>
              {isStarted && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePause}
                  className="text-white hover:bg-white/20 mt-1"
                >
                  {isPaused ? <Play className="h-4 w-4 mr-1" /> : <Pause className="h-4 w-4 mr-1" />}
                  {isPaused ? 'Reanudar' : 'Pausar'}
                </Button>
              )}
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Progreso</span>
              <span>{completedExercises.size}/{exercises.length} ejercicios</span>
            </div>
            <Progress value={progressPercent} className="h-2 bg-white/30" />
            {isStarted && autosaveState !== 'idle' && (
              <p className="mt-1 text-xs text-purple-100">
                {autosaveState === 'saving' && 'Guardando progreso...'}
                {autosaveState === 'saved' && 'Progreso guardado'}
                {autosaveState === 'error' && 'Guardado local activo. Se sincronizará al volver a conectar.'}
              </p>
            )}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Botón de inicio */}
          {!isStarted && (
            <Button
              onClick={handleStart}
              className="w-full h-16 text-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              <Play className="h-6 w-6 mr-2" />
              Comenzar Entrenamiento
            </Button>
          )}

          {/* Temporizador de descanso */}
          {showRestTimer && isStarted && (
            <RestTimer
              defaultSeconds={60}
              onComplete={handleRestComplete}
              isActive={restTimerActive}
              setIsActive={setRestTimerActive}
            />
          )}

          {/* Lista de ejercicios */}
          <div className="space-y-3">
            {exercises.map((exerciseItem: any, index: number) => {
              const exercise = exerciseItem.exercise || exerciseItem
              const selectedSubstitute = substituteSelections[String(exercise.id)]
              const mainExercise = selectedSubstitute || exercise
              const exerciseId = getExerciseStateKey(exerciseItem)
              const isCompleted = completedExercises.has(String(exerciseId))
              const targetRpe = getTargetRpe(exerciseItem, exercise)
              const targetLabel = formatPlanTarget(exerciseItem, exercise)
              const lastPerformance = getLastExercisePerformance(exercise)
              const lastPerformanceLabel = formatLastPerformance(lastPerformance)
              const exerciseSetData = exerciseSets[exerciseId] || {
                seriesCount: normalizeSeriesCount(exerciseItem?.sets || exercise?.sets || 1, 1),
                base: {},
                overrides: {},
              }
              const baseSetData = exerciseSetData.base || {}
              const seriesCount = normalizeSeriesCount(exerciseSetData.seriesCount, 1)
              const differentSeries = Object.entries(exerciseSetData.overrides || {})
                .map(([setNumber, data]) => ({
                  setNumber: normalizeSeriesCount(setNumber, 1),
                  data,
                }))
                .sort((a, b) => a.setNumber - b.setNumber)
              const restSeconds = exerciseItem.rest_seconds || exerciseItem.rest_time || 60

              return (
                <Card
                  key={exerciseId}
                  className={cn(
                    'transition-all border-2',
                    isCompleted
                      ? 'bg-green-500/10 border-green-500/50 dark:bg-green-900/20 dark:border-green-700/50'
                      : 'bg-card border-border hover:border-purple-400/60'
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Info del ejercicio */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className={cn(
                              'font-semibold text-lg',
                              isCompleted ? 'text-green-700 line-through' : 'text-foreground'
                            )}>
                              {index + 1}. {mainExercise.name || 'Ejercicio'}
                            </h4>
                            {selectedSubstitute && (
                              <Badge className="mt-1 bg-amber-100 text-amber-900 border border-amber-300" variant="secondary">
                                Respaldo activo para hoy
                              </Badge>
                            )}
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Timer className="h-4 w-4" />
                                {restSeconds}s descanso
                              </span>
                            </div>
                            {Array.isArray(exercise.substitutes) && exercise.substitutes.length > 0 && (
                              <div className="mt-3 pt-2 border-t border-amber-500/20 bg-amber-500/10 dark:bg-amber-900/20 rounded-md p-2.5">
                                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1">
                                  <Shield className="h-3.5 w-3.5" />
                                  Ejercicios de respaldo disponibles ({exercise.substitutes.length})
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {exercise.substitutes.map((sub: any) => (
                                    <Button
                                      key={sub.id}
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-6 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] px-2"
                                      onClick={() => selectSubstitute(String(exercise.id), sub)}
                                    >
                                      <Shield className="h-2.5 w-2.5 mr-1 inline" />
                                      {sub.substitute_name || sub.name}
                                    </Button>
                                  ))}
                                  {selectedSubstitute && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 text-[10px] text-amber-700 dark:text-amber-400"
                                      onClick={() => restorePrimaryExercise(String(exercise.id))}
                                    >
                                      Restaurar principal
                                    </Button>
                                  )}
                                </div>
                                <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-1.5 italic">
                                  Usa estos ejercicios alternativos si no puedes realizar el principal.
                                </p>
                              </div>
                            )}

                            {/* Botón Ver técnica - siempre visible, deshabilitado si no hay contenido */}
                            {(() => {
                              const hasContent = !!(mainExercise.has_video || mainExercise.google_drive_file_id || mainExercise.video_url || mainExercise.description || mainExercise.instructions)
                              const btn = (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={!hasContent}
                                  className={cn(
                                    'flex items-center gap-1',
                                    hasContent
                                      ? isCompleted
                                        ? 'bg-green-500/10 border-green-500/40 hover:bg-green-500/20 text-green-600 dark:text-green-400'
                                        : 'bg-blue-500/10 border-blue-500/40 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                                      : 'opacity-40 cursor-not-allowed'
                                  )}
                                >
                                  <Video className="h-4 w-4" />
                                  Ver técnica
                                </Button>
                              )
                              return (
                                <div className="flex gap-2 flex-wrap mt-4">
                                  {hasContent
                                    ? <ExerciseVideoPlayer exercise={mainExercise}>{btn}</ExerciseVideoPlayer>
                                    : btn}
                                </div>
                              )
                            })()}
                          </div>
                        </div>

                        {/* Registro por series */}
                        <div className="mt-3 bg-muted rounded-lg p-3">
                          {/* Cabecera: objetivo del plan + control de nº series */}
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="text-xs text-muted-foreground">
                              Objetivo: <span className="font-semibold text-foreground">{targetLabel}</span>
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">Series:</span>
                              <NumericInput
                                value={seriesCount}
                                onBlurMin={1}
                                className="h-7 w-12 text-xs text-center"
                                onChange={(v) => updateSeriesCount(exerciseId, Math.min(6, v ?? 1))}
                                disabled={!isStarted}
                              />
                              <span className="text-[10px] text-muted-foreground">/6</span>
                            </div>
                          </div>
                          {lastPerformanceLabel && (
                            <p className="mb-2 text-[11px] text-muted-foreground">
                              Última vez: <span className="font-medium text-foreground">{lastPerformanceLabel}</span>
                            </p>
                          )}

                          {/* Filas de series */}
                          <div className="space-y-1.5">
                            {/* Cabecera columnas */}
                            <div className="grid grid-cols-[1.5rem_1fr_1fr_1fr_1.5rem] gap-1 px-0.5">
                              <span />
                              <span className="text-[10px] text-center text-muted-foreground font-medium">Reps</span>
                              <span className="text-[10px] text-center text-muted-foreground font-medium">Kg</span>
                              <span className="text-[10px] text-center text-muted-foreground font-medium">RPE</span>
                              <span />
                            </div>
                            {Array.from({ length: seriesCount }, (_, i) => i + 1).map((setNum) => {
                              const setData: ExerciseSetEntry = exerciseSetData.overrides?.[String(setNum)] ?? exerciseSetData.base ?? {}
                              const prevData: ExerciseSetEntry | undefined = setNum > 1
                                ? (exerciseSetData.overrides?.[String(setNum - 1)] ?? exerciseSetData.base)
                                : undefined
                              const canCopy = !!prevData && (prevData.reps !== undefined || prevData.weight !== undefined || prevData.effort !== undefined)
                              return (
                                <div key={`${exerciseId}_s${setNum}`} className="grid grid-cols-[1.5rem_1fr_1fr_1fr_1.5rem] gap-1 items-center">
                                  <span className={`text-xs font-bold text-center ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>{setNum}</span>
                                  <NumericInput
                                    value={setData.reps}
                                    placeholder={String(exerciseItem.reps ?? exerciseItem.exercise?.reps ?? '')}
                                    className="h-8 text-sm text-center"
                                    onChange={(v) => updateDifferentSeriesData(exerciseId, setNum, 'reps', v)}
                                    disabled={!isStarted}
                                  />
                                  <NumericInput
                                    value={setData.weight}
                                    placeholder="Kg"
                                    className="h-8 text-sm text-center"
                                    allowDecimal
                                    onChange={(v) => updateDifferentSeriesData(exerciseId, setNum, 'weight', v)}
                                    disabled={!isStarted}
                                  />
                                  <NumericInput
                                    value={setData.effort}
                                    placeholder={targetRpe || 'RPE'}
                                    className="h-8 text-sm text-center"
                                    onChange={(v) => updateDifferentSeriesData(exerciseId, setNum, 'effort', v)}
                                    disabled={!isStarted}
                                  />
                                  {/* Copiar serie anterior */}
                                  {canCopy && isStarted ? (
                                    <button
                                      type="button"
                                      title="Copiar serie anterior"
                                      className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
                                      onClick={() => {
                                        if (!prevData) return
                                        if (prevData.reps !== undefined) updateDifferentSeriesData(exerciseId, setNum, 'reps', prevData.reps)
                                        if (prevData.weight !== undefined) updateDifferentSeriesData(exerciseId, setNum, 'weight', prevData.weight)
                                        if (prevData.effort !== undefined) updateDifferentSeriesData(exerciseId, setNum, 'effort', prevData.effort)
                                      }}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </button>
                                  ) : <span />}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Botón de finalizar */}
          {isStarted && (
            <Button
              onClick={handlePrepareFinish}
              className="w-full h-14 text-lg bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
              disabled={completedExercises.size === 0}
            >
              <Flame className="h-5 w-5 mr-2" />
              Finalizar Entrenamiento
            </Button>
          )}
        </div>

        {/* Dialog de finalización */}
        <Dialog
          open={showFinishDialog}
          onOpenChange={(open) => {
            setShowFinishDialog(open)
            if (!open) {
              setConfirmMissingExercises(false)
            }
            // Si se cierra el diálogo sin completar, reanudar el temporizador
            if (!open && isStarted && !isSaving) {
              setIsPaused(false)
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Resumen del Entrenamiento
              </DialogTitle>
              <DialogDescription>
                Completa la información de tu entrenamiento para guardarlo
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Resumen */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duración</span>
                  <span className="font-bold text-purple-700">{formatTime(elapsedSeconds)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ejercicios completados</span>
                  <span className="font-bold text-purple-700">{completedExercises.size}/{exercises.length}</span>
                </div>
              </div>

              {hasMissingExercises && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Faltan ejercicios por completar. ¿Seguro que quieres guardar?
                </div>
              )}

              {/* Calificación con estrellas */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  ¿Cómo calificarías este entrenamiento?
                </label>
                <StarRating value={rating} onChange={setRating} size="lg" />
              </div>

              {/* Notas */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Notas (opcional)
                </label>
                <Textarea
                  placeholder="¿Cómo te sentiste? ¿Alguna observación?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowFinishDialog(false)}
                  className="flex-1"
                >
                  Volver
                </Button>
                <Button
                  onClick={handleFinish}
                  disabled={isSaving}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Guardando...' : (hasMissingExercises && !confirmMissingExercises ? 'Guardar de todos modos' : 'Guardar')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
