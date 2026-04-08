"use client"

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/auth-context'
import { userService } from '@/lib/user-service'
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Ruler, 
  Weight, 
  Target, 
  Activity,
  Home,
  Dumbbell,
  ChefHat,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

// Esquema de validación para el perfil del usuario
const userProfileSchema = z.object({
  // Información personal
  first_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  country_code: z.string().min(1, 'Selecciona un código de país'),
  phone_number: z.string().min(8, 'El número debe tener al menos 8 dígitos'),
  
  // Información física
  age: z.number().min(13, 'La edad mínima es 13 años').max(120, 'La edad máxima es 120 años'),
  gender: z.enum(['male', 'female', 'other'], { required_error: 'Selecciona tu sexo' }),
  height: z.number().min(50, 'La altura mínima es 50 cm').max(250, 'La altura máxima es 250 cm'),
  weight: z.number().min(20, 'El peso mínimo es 20 kg').max(300, 'El peso máximo es 300 kg'),
  
  // Objetivos y actividad
  main_goal: z.enum(['lose_weight', 'gain_muscle', 'body_recomposition'], { required_error: 'Selecciona tu objetivo principal' }),
  activity_level: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active'], { required_error: 'Selecciona tu nivel de actividad' }),
  training_days_per_week: z.number().min(1, 'Mínimo 1 día').max(7, 'Máximo 7 días'),
  training_location: z.enum(['home', 'gym'], { required_error: 'Selecciona dónde prefieres entrenar' }),
  
  // Preferencias dietéticas
  allergies: z.string().optional(),
  medical_conditions: z.string().optional(),
  disliked_foods: z.string().optional(),
  previous_obstacles: z.string().optional(),
  injuries_or_medical_issues: z.string().optional(),
})

type UserProfileFormData = z.infer<typeof userProfileSchema>

// Lista de códigos de país
const countryCodes = [
  { code: '+34', name: 'España', flag: '🇪🇸' },
  { code: '+1', name: 'Estados Unidos', flag: '🇺🇸' },
  { code: '+44', name: 'Reino Unido', flag: '🇬🇧' },
  { code: '+33', name: 'Francia', flag: '🇫🇷' },
  { code: '+49', name: 'Alemania', flag: '🇩🇪' },
  { code: '+39', name: 'Italia', flag: '🇮🇹' },
  { code: '+31', name: 'Países Bajos', flag: '🇳🇱' },
  { code: '+351', name: 'Portugal', flag: '🇵🇹' },
  { code: '+32', name: 'Bélgica', flag: '🇧🇪' },
  { code: '+41', name: 'Suiza', flag: '🇨🇭' },
  { code: '+43', name: 'Austria', flag: '🇦🇹' },
  { code: '+45', name: 'Dinamarca', flag: '🇩🇰' },
  { code: '+46', name: 'Suecia', flag: '🇸🇪' },
  { code: '+47', name: 'Noruega', flag: '🇳🇴' },
  { code: '+358', name: 'Finlandia', flag: '🇫🇮' },
  { code: '+54', name: 'Argentina', flag: '🇦🇷' },
  { code: '+52', name: 'México', flag: '🇲🇽' },
  { code: '+55', name: 'Brasil', flag: '🇧🇷' },
  { code: '+56', name: 'Chile', flag: '🇨🇱' },
  { code: '+57', name: 'Colombia', flag: '🇨🇴' },
  { code: '+51', name: 'Perú', flag: '🇵🇪' },
  { code: '+58', name: 'Venezuela', flag: '🇻🇪' },
  { code: '+598', name: 'Uruguay', flag: '🇺🇾' },
  { code: '+591', name: 'Bolivia', flag: '🇧🇴' },
  { code: '+595', name: 'Paraguay', flag: '🇵🇾' },
  { code: '+593', name: 'Ecuador', flag: '🇪🇨' },
]

interface UserProfileFormProps {
  onProfileUpdate?: (data: UserProfileFormData) => void
}

export function UserProfileForm({ onProfileUpdate }: UserProfileFormProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<UserProfileFormData>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      country_code: '+34',
      phone_number: user?.phone || '',
      age: undefined,
      gender: undefined,
      height: undefined,
      weight: undefined,
      main_goal: undefined,
      activity_level: undefined,
      training_days_per_week: undefined,
      training_location: undefined,
      allergies: '',
      medical_conditions: '',
      disliked_foods: '',
      previous_obstacles: '',
      injuries_or_medical_issues: '',
    },
  })

  // Cargar datos del perfil cuando el usuario esté disponible
  useEffect(() => {
    if (!user) return
    userService.getUserProfile().then((profile) => {
      const toStr = (v: string | string[] | undefined) =>
        Array.isArray(v) ? v.join(', ') : v || ''
      form.reset({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        country_code: '+34',
        phone_number: profile.phone_number || profile.phone || '',
        age: (profile as any).age || undefined,
        gender: (profile as any).gender || undefined,
        height: profile.height || undefined,
        weight: profile.weight || undefined,
        main_goal: (profile as any).main_goal || undefined,
        activity_level: (profile.activity_level as any) || undefined,
        training_days_per_week: profile.training_days_per_week || undefined,
        training_location: profile.training_location || undefined,
        allergies: toStr(profile.allergies),
        medical_conditions: toStr((profile as any).medical_conditions),
        disliked_foods: toStr(profile.disliked_foods),
        previous_obstacles: (profile as any).previous_obstacles || '',
        injuries_or_medical_issues: profile.injuries_or_medical_issues || '',
      })
    }).catch(() => {
      form.reset({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        country_code: '+34',
        phone_number: user.phone || '',
      })
    })
  }, [user, form])

  const onSubmit = async (data: UserProfileFormData) => {
    setIsLoading(true)
    try {
      await userService.updateUserProfile({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone_number: data.phone_number,
        height: data.height,
        weight: data.weight,
        activity_level: data.activity_level,
        training_days_per_week: data.training_days_per_week,
        training_location: data.training_location,
        allergies: data.allergies,
        disliked_foods: data.disliked_foods,
        medical_conditions: data.medical_conditions as any,
        injuries_or_medical_issues: data.injuries_or_medical_issues,
        ...(data.main_goal ? { main_goal: data.main_goal } as any : {}),
      } as any)

      toast({
        title: "Perfil actualizado",
        description: "Tu perfil se ha actualizado correctamente.",
        variant: "default",
      })

      if (onProfileUpdate) {
        onProfileUpdate(data)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un error al actualizar tu perfil. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <User className="w-6 h-6 text-blue-600" />
          Configuración de Perfil
        </CardTitle>
        <p className="text-gray-600">
          Actualiza tu información personal y preferencias para personalizar tu experiencia
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Información Personal */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Información Personal</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nombre *</Label>
                <Input
                  id="first_name"
                  {...form.register('first_name')}
                  placeholder="Tu nombre"
                />
                {form.formState.errors.first_name && (
                  <p className="text-sm text-red-500">{form.formState.errors.first_name.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="last_name">Apellidos *</Label>
                <Input
                  id="last_name"
                  {...form.register('last_name')}
                  placeholder="Tus apellidos"
                />
                {form.formState.errors.last_name && (
                  <p className="text-sm text-red-500">{form.formState.errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico *</Label>
              <Input
                id="email"
                {...form.register('email')}
                placeholder="tu@email.com"
                type="email"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country_code">Código de país *</Label>
                <Select
                  value={form.watch('country_code')}
                  onValueChange={(value) => form.setValue('country_code', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona tu país" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {countryCodes.map((country) => (
                      <SelectItem 
                        key={country.code} 
                        value={country.code}
                        className="flex items-center gap-2"
                      >
                        <span>{country.flag}</span>
                        <span className="font-medium">{country.code}</span>
                        <span className="text-gray-500">{country.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.country_code && (
                  <p className="text-sm text-red-500">{form.formState.errors.country_code.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone_number">Número de teléfono *</Label>
                <Input
                  id="phone_number"
                  {...form.register('phone_number')}
                  placeholder="123 456 789"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
                {form.formState.errors.phone_number && (
                  <p className="text-sm text-red-500">{form.formState.errors.phone_number.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Información Física */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold">Información Física</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Edad *</Label>
                <Input
                  id="age"
                  {...form.register('age', { valueAsNumber: true })}
                  placeholder="25"
                  type="number"
                  min="13"
                  max="120"
                />
                {form.formState.errors.age && (
                  <p className="text-sm text-red-500">{form.formState.errors.age.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Sexo *</Label>
                <Select
                  value={form.watch('gender')}
                  onValueChange={(value) => form.setValue('gender', value as any)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona tu sexo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Femenino</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.gender && (
                  <p className="text-sm text-red-500">{form.formState.errors.gender.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height">Altura (cm) *</Label>
                <Input
                  id="height"
                  {...form.register('height', { valueAsNumber: true })}
                  placeholder="175"
                  type="number"
                  min="50"
                  max="250"
                />
                {form.formState.errors.height && (
                  <p className="text-sm text-red-500">{form.formState.errors.height.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="weight">Peso (kg) *</Label>
                <Input
                  id="weight"
                  {...form.register('weight', { valueAsNumber: true })}
                  placeholder="70"
                  type="number"
                  min="20"
                  max="300"
                />
                {form.formState.errors.weight && (
                  <p className="text-sm text-red-500">{form.formState.errors.weight.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Objetivos y Actividad */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold">Objetivos y Actividad</h3>
            </div>
            
            <div className="space-y-2">
              <Label>Objetivo principal *</Label>
              <Select
                value={form.watch('main_goal')}
                onValueChange={(value) => form.setValue('main_goal', value as any)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona tu objetivo principal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lose_weight">Perder peso</SelectItem>
                  <SelectItem value="gain_muscle">Ganar masa muscular</SelectItem>
                  <SelectItem value="body_recomposition">Recomposición corporal</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.main_goal && (
                <p className="text-sm text-red-500">{form.formState.errors.main_goal.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nivel de actividad *</Label>
                <Select
                  value={form.watch('activity_level')}
                  onValueChange={(value) => form.setValue('activity_level', value as any)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona tu nivel de actividad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentary">Sedentario</SelectItem>
                    <SelectItem value="light">Ligero</SelectItem>
                    <SelectItem value="moderate">Moderado</SelectItem>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="very_active">Muy activo</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.activity_level && (
                  <p className="text-sm text-red-500">{form.formState.errors.activity_level.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="training_days_per_week">Días de entrenamiento por semana *</Label>
                <Input
                  id="training_days_per_week"
                  {...form.register('training_days_per_week', { valueAsNumber: true })}
                  placeholder="4"
                  type="number"
                  min="1"
                  max="7"
                />
                {form.formState.errors.training_days_per_week && (
                  <p className="text-sm text-red-500">{form.formState.errors.training_days_per_week.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dónde prefieres entrenar *</Label>
              <Select
                value={form.watch('training_location')}
                onValueChange={(value) => form.setValue('training_location', value as any)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona dónde prefieres entrenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">En casa</SelectItem>
                  <SelectItem value="gym">En el gimnasio</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.training_location && (
                <p className="text-sm text-red-500">{form.formState.errors.training_location.message}</p>
              )}
            </div>
          </div>

          {/* Preferencias Dietéticas */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <ChefHat className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-semibold">Preferencias Dietéticas</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="allergies">Intolerancias o alergias alimentarias</Label>
                <Textarea
                  id="allergies"
                  {...form.register('allergies')}
                  placeholder="Ej: nueces, mariscos, lácteos..."
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="disliked_foods">Alimentos que no te gustan</Label>
                <Textarea
                  id="disliked_foods"
                  {...form.register('disliked_foods')}
                  placeholder="Ej: brócoli, espinacas, pescado..."
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="previous_obstacles">Qué te ha impedido lograrlo hasta ahora</Label>
                <Textarea
                  id="previous_obstacles"
                  {...form.register('previous_obstacles')}
                  placeholder="Ej: falta de tiempo, motivación, conocimiento..."
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="medical_conditions">Problemas hormonales o metabólicos</Label>
                <Textarea
                  id="medical_conditions"
                  {...form.register('medical_conditions')}
                  placeholder="Describe cualquier condición médica relevante..."
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="injuries_or_medical_issues">Lesiones o intervenciones médicas importantes</Label>
                <Textarea
                  id="injuries_or_medical_issues"
                  {...form.register('injuries_or_medical_issues')}
                  placeholder="Describe cualquier lesión o intervención médica..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Botón de envío */}
          <div className="flex justify-end pt-6">
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Actualizando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Actualizar Perfil
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

