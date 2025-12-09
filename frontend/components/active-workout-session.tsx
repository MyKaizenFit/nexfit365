'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dumbbell, Play, Pause, CheckCircle2, Circle, Clock,
  Target, Timer, Star, Video, ChevronDown, ChevronUp,
  Save, RotateCcw, Flame
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
  isOpen,
  onClose,
  onComplete
}: ActiveWorkoutSessionProps) {
  // Clave para localStorage basada en el día de entrenamiento
  const workoutStorageKey = workoutDay?.id
    ? `active_workout_${workoutDay.id}_${new Date().toISOString().split('T')[0]}`
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
      console.error('Error guardando estado del entrenamiento:', error)
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
      console.error('Error cargando estado del entrenamiento:', error)
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
  const [exerciseSets, setExerciseSets] = useState<Record<string, Array<{
    completed: boolean
    reps?: number
    weight?: number
    duration?: number
  }>>>({})

  // Estado del formulario de finalización
  const [rating, setRating] = useState(0)
  const [notes, setNotes] = useState('')
  const [showFinishDialog, setShowFinishDialog] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Ejercicios expandidos para ver detalles
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null)

  const exercises = workoutDay?.exercises || []

  // Cargar estado guardado al montar el componente
  useEffect(() => {
    if (isOpen && workoutDay) {
      const savedState = loadWorkoutState()
      if (savedState) {
        setIsStarted(savedState.isStarted || false)
        setIsPaused(savedState.isPaused || false)
        setWorkoutStartTime(savedState.workoutStartTime || null)
        setCompletedExercises(new Set(savedState.completedExercises || []))
        setExerciseSets(savedState.exerciseSets || {})
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
      const initialSets: Record<string, Array<any>> = {}
      exercises.forEach((ex: any) => {
        const exerciseId = ex.id || ex.exercise?.id
        const numSets = ex.sets || 3
        initialSets[exerciseId] = Array(numSets).fill(null).map(() => ({
          completed: false,
          reps: undefined,
          weight: undefined,
          duration: undefined
        }))
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

  // Toggle ejercicio completado
  const toggleExerciseCompleted = (exerciseId: string) => {
    setCompletedExercises((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId)
      } else {
        newSet.add(exerciseId)
        // Mostrar temporizador de descanso si no es el último ejercicio
        const currentIndex = exercises.findIndex((ex: any) =>
          (ex.id || ex.exercise?.id) === exerciseId
        )
        if (currentIndex < exercises.length - 1) {
          setShowRestTimer(true)
        }
      }

      // Guardar estado después de cambiar ejercicios completados
      saveWorkoutState({
        isStarted,
        isPaused,
        elapsedSeconds,
        workoutStartTime,
        completedExercises: Array.from(newSet),
        exerciseSets,
        rating,
        notes
      })

      return newSet
    })
  }

  // Marcar serie como completada
  const toggleSetCompleted = (exerciseId: string, setIndex: number) => {
    setExerciseSets((prev) => {
      const newSets = { ...prev }
      if (newSets[exerciseId]) {
        newSets[exerciseId] = [...newSets[exerciseId]]
        newSets[exerciseId][setIndex] = {
          ...newSets[exerciseId][setIndex],
          completed: !newSets[exerciseId][setIndex].completed
        }
      }
      return newSets
    })

    // Activar temporizador de descanso después de completar una serie
    setShowRestTimer(true)
  }

  // Actualizar datos de serie
  const updateSetData = (
    exerciseId: string,
    setIndex: number,
    field: 'reps' | 'weight' | 'duration',
    value: number | undefined
  ) => {
    setExerciseSets((prev) => {
      const newSets = { ...prev }
      if (newSets[exerciseId]) {
        newSets[exerciseId] = [...newSets[exerciseId]]
        newSets[exerciseId][setIndex] = {
          ...newSets[exerciseId][setIndex],
          [field]: value
        }
      }

      // Guardar estado después de actualizar series
      saveWorkoutState({
        isStarted,
        isPaused,
        elapsedSeconds,
        workoutStartTime,
        completedExercises: Array.from(completedExercises),
        exerciseSets: newSets,
        rating,
        notes
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
    setIsSaving(true)

    try {
      const exercisesData = exercises.map((ex: any) => {
        const exerciseId = ex.id || ex.exercise?.id
        return {
          exercise_id: ex.exercise?.id || ex.id,
          exercise_name: ex.exercise?.name || ex.name,
          sets: exerciseSets[exerciseId] || [],
          completed: completedExercises.has(exerciseId)
        }
      })

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
              const exerciseId = exerciseItem.id || exercise.id
              const isCompleted = completedExercises.has(String(exerciseId))
              const isExpanded = expandedExercise === exerciseId
              const sets = exerciseSets[exerciseId] || []
              const completedSetsCount = sets.filter(s => s.completed).length
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
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleExerciseCompleted(String(exerciseId))}
                        className={cn(
                          'mt-1 transition-all',
                          isCompleted
                            ? 'text-green-600'
                            : 'text-gray-400 hover:text-purple-600'
                        )}
                        disabled={!isStarted}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-7 w-7" />
                        ) : (
                          <Circle className="h-7 w-7" />
                        )}
                      </button>

                      {/* Info del ejercicio */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className={cn(
                              'font-semibold text-lg',
                              isCompleted ? 'text-green-700 line-through' : 'text-gray-900'
                            )}>
                              {index + 1}. {exercise.name || 'Ejercicio'}
                            </h4>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Target className="h-4 w-4" />
                                {exerciseItem.sets || 3} series
                              </span>
                              <span>×</span>
                              <span>{exerciseItem.reps || '10'} reps</span>
                              <span className="flex items-center gap-1">
                                <Timer className="h-4 w-4" />
                                {restSeconds}s descanso
                              </span>
                            </div>
                          </div>

                          {/* Botón de video */}
                          {(exercise.has_video || exercise.google_drive_file_id || exercise.video_url) && (
                            <ExerciseVideoPlayer exercise={exercise}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1"
                              >
                                <Video className="h-4 w-4" />
                                Ver
                              </Button>
                            </ExerciseVideoPlayer>
                          )}
                        </div>

                        {/* Expandir/Colapsar series */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedExercise(isExpanded ? null : exerciseId)}
                          className="mt-2 text-purple-600 hover:text-purple-700"
                          disabled={!isStarted}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-1" />
                              Ocultar series
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-1" />
                              Registrar series ({completedSetsCount}/{sets.length})
                            </>
                          )}
                        </Button>

                        {/* Detalle de series */}
                        {isExpanded && (
                          <div className="mt-3 space-y-2 bg-gray-50 rounded-lg p-3">
                            {sets.map((set, setIdx) => (
                              <div
                                key={setIdx}
                                className={cn(
                                  'flex items-center gap-3 p-2 rounded-lg transition-colors',
                                  set.completed ? 'bg-green-100' : 'bg-white border'
                                )}
                              >
                                <button
                                  onClick={() => toggleSetCompleted(exerciseId, setIdx)}
                                  className={cn(
                                    'transition-colors',
                                    set.completed ? 'text-green-600' : 'text-gray-400'
                                  )}
                                >
                                  {set.completed ? (
                                    <CheckCircle2 className="h-5 w-5" />
                                  ) : (
                                    <Circle className="h-5 w-5" />
                                  )}
                                </button>

                                <span className="font-medium w-16">
                                  Serie {setIdx + 1}
                                </span>

                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    placeholder="Reps"
                                    className="w-20 h-8 text-sm"
                                    value={set.reps || ''}
                                    onChange={(e) => updateSetData(
                                      exerciseId,
                                      setIdx,
                                      'reps',
                                      e.target.value ? parseInt(e.target.value) : undefined
                                    )}
                                  />
                                  <span className="text-gray-500 text-sm">×</span>
                                  <Input
                                    type="number"
                                    placeholder="Kg"
                                    className="w-20 h-8 text-sm"
                                    value={set.weight || ''}
                                    onChange={(e) => updateSetData(
                                      exerciseId,
                                      setIdx,
                                      'weight',
                                      e.target.value ? parseFloat(e.target.value) : undefined
                                    )}
                                  />
                                  <span className="text-gray-500 text-sm">kg</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
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
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}


