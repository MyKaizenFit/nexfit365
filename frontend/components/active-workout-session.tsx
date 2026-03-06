'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dumbbell, Play, Pause, Clock,
  Timer, Star, Video,
  Save, RotateCcw, Flame, Shield
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
// COMPONENTE DE ESTRELLAS DE CALIFICACIÓN
// =============================================
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
      <span className="ml-2 text-sm text-gray-600">
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
        <Badge variant="outline" className="bg-white">
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
  isOpen: boolean
  onClose: () => void
  onComplete: (data: {
    duration_minutes: number
    rating: number
    notes: string
    exercises_data: any[]
  }) => Promise<void>
}

export function ActiveWorkoutSession({
  workoutDay,
  initialSubstituteSelections = {},
  isOpen,
  onClose,
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
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set())
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [showRestTimer, setShowRestTimer] = useState(false)
  const [restTimerActive, setRestTimerActive] = useState(false)

  // Estado de cada serie por ejercicio
  const [exerciseSets, setExerciseSets] = useState<Record<string, {
    reps?: number
    weight?: number
    effort?: number
  }>>({})

  // Estado del formulario de finalización
  const [rating, setRating] = useState(0)
  const [notes, setNotes] = useState('')
  const [showFinishDialog, setShowFinishDialog] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [confirmMissingExercises, setConfirmMissingExercises] = useState(false)
  const [substituteSelections, setSubstituteSelections] = useState<Record<string, any>>(initialSubstituteSelections || {})

  const exercises = workoutDay?.exercises || []
  const hasMissingExercises = completedExercises.size < exercises.length

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

  const normalizeExerciseSets = (data: Record<string, any> = {}) => {
    const normalized: Record<string, { reps?: number; weight?: number; effort?: number }> = {}

    Object.entries(data || {}).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        const first = value[0] || {}
        normalized[key] = {
          reps: typeof first.reps === 'number' ? first.reps : undefined,
          weight: typeof first.weight === 'number' ? first.weight : undefined,
          effort: typeof first.effort === 'number' ? first.effort : undefined,
        }
      } else if (value && typeof value === 'object') {
        normalized[key] = {
          reps: typeof value.reps === 'number' ? value.reps : undefined,
          weight: typeof value.weight === 'number' ? value.weight : undefined,
          effort: typeof value.effort === 'number' ? value.effort : undefined,
        }
      }
    })

    return normalized
  }

  // Cargar estado guardado al montar el componente
  useEffect(() => {
    if (isOpen && workoutDay) {
      const savedState = loadWorkoutState()
      if (savedState) {
        setIsStarted(savedState.isStarted || false)
        setIsPaused(savedState.isPaused || false)
        setWorkoutStartTime(savedState.workoutStartTime || null)
        setCompletedExercises(new Set(savedState.completedExercises || []))
        setExerciseSets(normalizeExerciseSets(savedState.exerciseSets || {}))
        setRating(savedState.rating || 0)
        setNotes(savedState.notes || '')

        // Calcular tiempo transcurrido desde el inicio guardado
        if (savedState.workoutStartTime && savedState.isStarted && !savedState.isPaused) {
          const elapsed = Math.floor((Date.now() - savedState.workoutStartTime) / 1000)
          setElapsedSeconds(savedState.elapsedSeconds + elapsed)
        } else {
          setElapsedSeconds(savedState.elapsedSeconds || 0)
        }
      }
    }
  }, [isOpen, workoutDay, loadWorkoutState])

  // Inicializar sets de ejercicios
  useEffect(() => {
    if (exercises.length > 0 && Object.keys(exerciseSets).length === 0) {
      const initialSets: Record<string, { reps?: number; weight?: number; effort?: number }> = {}
      exercises.forEach((ex: any) => {
        const exerciseId = ex.id || ex.exercise?.id
        initialSets[exerciseId] = {
          reps: undefined,
          weight: undefined,
          effort: undefined
        }
      })
      setExerciseSets(initialSets)
    }
  }, [exercises])

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

  // Temporizador de entrenamiento
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isStarted && !isPaused) {
      // Si no hay tiempo de inicio, establecerlo ahora
      if (!workoutStartTime) {
        const startTime = Date.now()
        setWorkoutStartTime(startTime)
      }

      interval = setInterval(() => {
        setElapsedSeconds((prev) => {
          const newSeconds = prev + 1
          // Guardar estado cada 5 segundos para no saturar localStorage
          if (newSeconds % 5 === 0) {
            saveWorkoutState({
              isStarted,
              isPaused,
              elapsedSeconds: newSeconds,
              workoutStartTime,
              completedExercises: Array.from(completedExercises),
              exerciseSets,
              rating,
              notes
            })
          }
          return newSeconds
        })
      }, 1000)
    }

    return () => clearInterval(interval)
  }, [isStarted, isPaused, workoutStartTime, completedExercises, exerciseSets, rating, notes, saveWorkoutState])

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

  const updateExerciseData = (
    exerciseId: string,
    field: 'reps' | 'weight' | 'effort',
    value: number | undefined
  ) => {
    setExerciseSets((prev) => {
      const newSets = { ...prev }
      newSets[exerciseId] = {
        ...newSets[exerciseId],
        [field]: value
      }

      const updated = newSets[exerciseId] || {}
      const hasData =
        (updated.reps !== undefined && updated.reps !== null && updated.reps > 0) ||
        (updated.weight !== undefined && updated.weight !== null && updated.weight > 0) ||
        (updated.effort !== undefined && updated.effort !== null && updated.effort > 0)

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

  // Iniciar entrenamiento
  const handleStart = () => {
    const startTime = Date.now()
    setIsStarted(true)
    setIsPaused(false)
    setWorkoutStartTime(startTime)
    setElapsedSeconds(0)

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
    const newPausedState = !isPaused
    setIsPaused(newPausedState)

    // Guardar estado al pausar/reanudar
    saveWorkoutState({
      isStarted,
      isPaused: newPausedState,
      elapsedSeconds,
      workoutStartTime,
      completedExercises: Array.from(completedExercises),
      exerciseSets,
      rating,
      notes
    })
  }

  // Preparar finalización
  const handlePrepareFinish = () => {
    // Pausar el temporizador cuando se abre el diálogo de finalización
    setIsPaused(true)
    setConfirmMissingExercises(false)
    setShowFinishDialog(true)

    // Guardar estado al pausar
    saveWorkoutState({
      isStarted,
      isPaused: true,
      elapsedSeconds,
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

    try {
      const exercisesData = exercises.map((ex: any) => {
        const exerciseId = ex.id || ex.exercise?.id
        const baseExercise = ex.exercise || ex
        const selectedSubstitute = substituteSelections[String(baseExercise.id)]
        const mainExercise = selectedSubstitute || baseExercise
        const setData = exerciseSets[exerciseId] || {}
        const validSets = [
          {
            set_number: 1,
            completed: completedExercises.has(String(exerciseId)),
            reps: setData.reps !== undefined ? Number(setData.reps) : null,
            weight: setData.weight !== undefined ? Number(setData.weight) : null,
            duration: null,
            rest_seconds: ex.rest_seconds || ex.rest_time || null,
            effort: setData.effort !== undefined ? Number(setData.effort) : null
          }
        ]

        return {
          exercise_id: mainExercise.id,
          exercise_name: mainExercise.name,
          original_exercise_id: baseExercise.id,
          sets: validSets,
          completed: completedExercises.has(String(exerciseId)),
          effort: setData.effort !== undefined ? Number(setData.effort) : null
        }
      })
      
      // Log para depuración

      await onComplete({
        duration_minutes: Math.ceil(elapsedSeconds / 60),
        rating: rating,
        notes: notes,
        exercises_data: exercisesData
      })

      toast({
        title: "¡Entrenamiento completado! 🎉",
        description: `Duración: ${formatTime(elapsedSeconds)}`
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
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0">
        <DialogDescription className="sr-only">
          Sesión de entrenamiento activo - completa los ejercicios y guarda tu progreso
        </DialogDescription>
        {/* Header con temporizador */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-t-lg">
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
              const exerciseId = exerciseItem.id || exercise.id
              const isCompleted = completedExercises.has(String(exerciseId))
              const setData = exerciseSets[exerciseId] || {}
              const restSeconds = exerciseItem.rest_seconds || exerciseItem.rest_time || 60

              return (
                <Card
                  key={exerciseId}
                  className={cn(
                    'transition-all border-2',
                    isCompleted
                      ? 'bg-green-50 border-green-300'
                      : 'bg-white border-gray-200 hover:border-purple-300'
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
                              isCompleted ? 'text-green-700 line-through' : 'text-gray-900'
                            )}>
                              {index + 1}. {mainExercise.name || 'Ejercicio'}
                            </h4>
                            {selectedSubstitute && (
                              <Badge className="mt-1 bg-amber-100 text-amber-900 border border-amber-300" variant="secondary">
                                Respaldo activo para hoy
                              </Badge>
                            )}
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Timer className="h-4 w-4" />
                                {restSeconds}s descanso
                              </span>
                            </div>
                            {Array.isArray(exercise.substitutes) && exercise.substitutes.length > 0 && (
                              <div className="mt-3 pt-2 border-t border-amber-100 bg-amber-50/50 rounded-md p-2.5">
                                <p className="text-xs font-semibold text-amber-900 mb-1.5 flex items-center gap-1">
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
                                      className="h-6 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-900 border border-amber-300 text-[10px] px-2"
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
                                      className="h-6 text-[10px] text-amber-900"
                                      onClick={() => restorePrimaryExercise(String(exercise.id))}
                                    >
                                      Restaurar principal
                                    </Button>
                                  )}
                                </div>
                                <p className="text-[10px] text-amber-700 mt-1.5 italic">
                                  Usa estos ejercicios alternativos si no puedes realizar el principal.
                                </p>
                              </div>
                            )}

                            {/* Botones de video - VISIBLE Y ACCESIBLE */}
                            {(mainExercise.has_video || mainExercise.google_drive_file_id || mainExercise.video_url) && (
                              <div className="flex gap-2 flex-wrap mt-4">
                                <ExerciseVideoPlayer exercise={mainExercise}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                      'flex items-center gap-1',
                                      isCompleted
                                        ? 'bg-green-50 border-green-300 hover:bg-green-100 text-green-700'
                                        : 'bg-blue-50 border-blue-300 hover:bg-blue-100 text-blue-700'
                                    )}
                                  >
                                    {isCompleted ? (
                                      <>
                                        <Play className="h-4 w-4" />
                                        Ver cómo lo hiciste
                                      </>
                                    ) : (
                                      <>
                                        <Video className="h-4 w-4" />
                                        Ver técnica
                                      </>
                                    )}
                                  </Button>
                                </ExerciseVideoPlayer>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Registro rápido del ejercicio */}
                        <div className="mt-3 bg-gray-50 rounded-lg p-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                placeholder={exerciseItem.reps || 'Reps'}
                                className="h-8 text-sm"
                                value={setData.reps ?? ''}
                                onChange={(e) => updateExerciseData(
                                  exerciseId,
                                  'reps',
                                  e.target.value ? parseInt(e.target.value) : undefined
                                )}
                                disabled={!isStarted}
                              />
                              <span className="text-gray-500 text-sm">reps</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                placeholder="Kg"
                                className="h-8 text-sm"
                                value={setData.weight ?? ''}
                                onChange={(e) => updateExerciseData(
                                  exerciseId,
                                  'weight',
                                  e.target.value ? parseFloat(e.target.value) : undefined
                                )}
                                disabled={!isStarted}
                              />
                              <span className="text-gray-500 text-sm">kg</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={1}
                                max={10}
                                placeholder="Esfuerzo 1-10"
                                className="h-8 text-sm"
                                value={setData.effort ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value ? parseInt(e.target.value) : undefined
                                  updateExerciseData(exerciseId, 'effort', value)
                                }}
                                disabled={!isStarted}
                              />
                              <span className="text-gray-500 text-sm">1-10</span>
                            </div>
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
                  <span className="text-gray-600">Duración</span>
                  <span className="font-bold text-purple-700">{formatTime(elapsedSeconds)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ejercicios completados</span>
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
                <label className="text-sm font-medium text-gray-700">
                  ¿Cómo calificarías este entrenamiento?
                </label>
                <StarRating value={rating} onChange={setRating} size="lg" />
              </div>

              {/* Notas */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
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


