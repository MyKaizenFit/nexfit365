'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { 
  Calendar, 
  Dumbbell, 
  Clock, 
  Save,
  Info
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useWorkouts } from '@/hooks/use-workouts'
import { useAuth } from '@/contexts/auth-context'
import { useUserProfile } from '@/hooks/use-user-profile'
import { userService } from '@/lib/user-service'

interface WorkoutScheduleConfigProps {
  className?: string
}

const DAYS_OF_WEEK = [
  { id: 'monday', name: 'Lunes', short: 'L', number: 1 },
  { id: 'tuesday', name: 'Martes', short: 'M', number: 2 },
  { id: 'wednesday', name: 'Miércoles', short: 'X', number: 3 },
  { id: 'thursday', name: 'Jueves', short: 'J', number: 4 },
  { id: 'friday', name: 'Viernes', short: 'V', number: 5 },
  { id: 'saturday', name: 'Sábado', short: 'S', number: 6 },
  { id: 'sunday', name: 'Domingo', short: 'D', number: 7 },
]

export function WorkoutScheduleConfig({ className }: WorkoutScheduleConfigProps) {
  const { user } = useAuth()
  const { refreshData } = useWorkouts()
  const { profile, refreshProfile } = useUserProfile()
  
  const [workoutDays, setWorkoutDays] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // Configurar días cuando se carga el perfil
  useEffect(() => {
    if (profile) {
      
      // Si el perfil tiene training_days (array), usarlos
      if (profile.training_days && Array.isArray(profile.training_days) && profile.training_days.length > 0) {
        setWorkoutDays(profile.training_days)
      } else if (profile.training_days_per_week) {
        // Si no hay training_days pero hay training_days_per_week, usar días por defecto
        const defaultDays = [1, 3, 5, 6, 2, 4, 7] // Prioridad: Lun, Mié, Vie, Sáb, Mar, Jue, Dom
        const calculatedDays = defaultDays.slice(0, profile.training_days_per_week).sort((a, b) => a - b)
        setWorkoutDays(calculatedDays)
      } else {
      }
    }
  }, [profile])

  // Manejar toggle de día
  const handleToggleDay = (dayNumber: number) => {
    setWorkoutDays(prev => {
      if (prev.includes(dayNumber)) {
        return prev.filter(d => d !== dayNumber)
      } else {
        return [...prev, dayNumber].sort((a, b) => a - b)
      }
    })
  }

  // Guardar configuración
  const handleSave = async () => {
    if (workoutDays.length === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos un día de entrenamiento",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      // Actualizar el perfil del usuario con los días específicos y el número de días
      await userService.updateUserProfile({
        training_days: workoutDays,
        training_days_per_week: workoutDays.length
      })
      
      toast({
        title: "Configuración guardada",
        description: `Entrenamientos programados para ${workoutDays.length} días a la semana`,
      })
      
      await refreshProfile()
      await refreshData()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-purple-600" />
          Configurar Horario de Entrenamientos
        </CardTitle>
        <CardDescription>
          Selecciona los días de la semana en los que vas a entrenar
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Selector de días */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-600">Selecciona tus días de entrenamiento</Label>
          <div className="grid grid-cols-7 gap-1">
            {DAYS_OF_WEEK.map(day => {
              const isSelected = workoutDays.includes(day.number)
              return (
                <button
                  key={day.id}
                  onClick={() => handleToggleDay(day.number)}
                  disabled={isLoading}
                  className={`
                    relative p-2 rounded-lg border-2 transition-all
                    ${isSelected
                      ? 'bg-gradient-to-br from-purple-500 to-violet-500 border-purple-600 text-white shadow-md'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50'
                    }
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className="text-center">
                    <div className="text-xs font-semibold">{day.short}</div>
                  </div>
                  
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <Dumbbell className="h-2.5 w-2.5 text-purple-600" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Resumen compacto */}
        <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-3 border border-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total días:</p>
              <p className="text-2xl font-bold text-purple-600 mt-0.5">
                {workoutDays.length}
              </p>
            </div>
            {workoutDays.length > 0 && (
              <div className="flex flex-wrap gap-1 justify-end">
                {DAYS_OF_WEEK
                  .filter(day => workoutDays.includes(day.number))
                  .map(day => (
                    <Badge key={day.id} className="bg-purple-600 text-white text-xs">
                      {day.short}
                    </Badge>
                  ))
                }
              </div>
            )}
          </div>
        </div>

        {/* Botón de guardar */}
        <Button
          onClick={handleSave}
          disabled={isLoading || workoutDays.length === 0}
          className="w-full bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600"
          size="sm"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-3 w-3 mr-2" />
              Guardar
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
