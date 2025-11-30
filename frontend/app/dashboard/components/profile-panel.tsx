"use client"

import { useState } from "react"
import { User, Mail, Phone, MapPin, Calendar, Ruler, Weight, Target, Edit, Save, X, Camera } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"
import { useUserProfile } from "@/hooks/use-user-profile"

export function ProfilePanel() {
  const [isEditing, setIsEditing] = useState(false)
  const { profile, updateProfile, loading, error, refreshProfile } = useUserProfile()

  const handleSave = async () => {
    try {
      if (profile) {
        // Crear objeto con solo campos editables
        const editableFields: any = {}
        
        // Campos básicos editables
        if (profile.first_name !== undefined) editableFields.first_name = profile.first_name
        if (profile.last_name !== undefined) editableFields.last_name = profile.last_name
        // phone puede venir como phone o phone_number del backend
        const phoneValue = profile.phone_number || profile.phone
        if (phoneValue !== undefined) editableFields.phone_number = phoneValue
        // birth_date puede venir como birth_date o date_of_birth
        const birthDateValue = profile.birth_date || profile.date_of_birth
        if (birthDateValue !== undefined) editableFields.birth_date = birthDateValue
        if (profile.gender !== undefined) editableFields.gender = profile.gender
        
        // Campos físicos
        if (profile.height !== undefined) editableFields.height = profile.height
        if (profile.weight !== undefined) editableFields.weight = profile.weight
        if (profile.target_weight !== undefined) editableFields.target_weight = profile.target_weight
        if (profile.target_date !== undefined) editableFields.target_date = profile.target_date
        
        // Preferencias
        if (profile.activity_level !== undefined) editableFields.activity_level = profile.activity_level
        if (profile.fitness_goals !== undefined) editableFields.fitness_goals = profile.fitness_goals
        if (profile.dietary_restrictions !== undefined) editableFields.dietary_restrictions = profile.dietary_restrictions
        if (profile.allergies !== undefined) editableFields.allergies = profile.allergies
        if (profile.medical_conditions !== undefined) editableFields.medical_conditions = profile.medical_conditions
        
        // Entrenamiento
        if (profile.training_days_per_week !== undefined) editableFields.training_days_per_week = profile.training_days_per_week
        if (profile.training_days !== undefined) editableFields.training_days = profile.training_days
        if (profile.training_location !== undefined) editableFields.training_location = profile.training_location
        if (profile.main_goal !== undefined) editableFields.main_goal = profile.main_goal
        
        // Otros campos
        if (profile.previous_obstacles !== undefined) editableFields.previous_obstacles = profile.previous_obstacles
        if (profile.injuries_or_medical_issues !== undefined) editableFields.injuries_or_medical_issues = profile.injuries_or_medical_issues
        if (profile.disliked_foods !== undefined) editableFields.disliked_foods = profile.disliked_foods
        
        await updateProfile(editableFields)
        toast({
          title: "✅ Perfil actualizado",
          description: "Tus cambios han sido guardados correctamente",
        })
        setIsEditing(false)
        // Refrescar el perfil para obtener los datos actualizados
        await refreshProfile()
      }
    } catch (error) {
      console.error('Error al actualizar perfil:', error)
      toast({
        title: "❌ Error",
        description: "No se pudo actualizar el perfil. Inténtalo de nuevo.",
        variant: "destructive",
      })
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    // Aquí podrías revertir los cambios si fuera necesario
  }

  const progressToGoal = profile?.weight && profile?.target_weight 
    ? Math.round(
        ((profile.weight - profile.target_weight) / (profile.weight - profile.target_weight)) * 100
      )
    : 0

  // Mostrar loading mientras se cargan los datos
  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Cargando perfil...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              <span className="ml-2 text-gray-600">Cargando datos del perfil...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Mostrar error si no se pudo cargar el perfil
  if (error || !profile) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Error al cargar perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center p-8">
              <p className="text-red-600 mb-4">
                {error || 'No se pudo cargar la información del perfil'}
              </p>
              <Button onClick={() => window.location.reload()}>
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Información Personal */}
      <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              <User className="h-5 w-5" />
              Información Personal
            </CardTitle>
            <CardDescription>Gestiona tu información básica y de contacto</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
            className="hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50"
          >
            {isEditing ? <Save className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {profile.profile_picture_url || profile.profile_picture ? (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center overflow-hidden ring-2 ring-teal-200">
                  <img
                    src={profile.profile_picture_url || profile.profile_picture || ''}
                    alt={`${profile.first_name || ''} ${profile.last_name || ''}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Si la imagen falla, mostrar las iniciales
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        parent.classList.remove('overflow-hidden')
                        parent.classList.add('bg-gradient-to-br', 'from-teal-400', 'to-cyan-500')
                        parent.innerHTML = `<span class="text-white text-2xl font-bold">${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}</span>`
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold ring-2 ring-teal-200">
                  {`${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}` || 'U'}
                </div>
              )}
              {isEditing && (
                <label htmlFor="profile-picture-input">
                  <input
                    id="profile-picture-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        try {
                          await updateProfile({ profile_picture: file } as any)
                          toast({
                            title: "✅ Foto actualizada",
                            description: "Tu foto de perfil se ha actualizado correctamente",
                          })
                        } catch (error) {
                          toast({
                            title: "❌ Error",
                            description: "No se pudo actualizar la foto de perfil",
                            variant: "destructive",
                          })
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-white shadow-md hover:bg-gray-50 cursor-pointer"
                    onClick={() => document.getElementById('profile-picture-input')?.click()}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </label>
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">{`${profile.first_name || ''} ${profile.last_name || ''}`.trim()}</h3>
              <p className="text-gray-600">{profile.email}</p>
              <p className="text-sm text-gray-500">
                {(profile.birth_date || profile.date_of_birth) ? `${new Date().getFullYear() - new Date(profile.birth_date || profile.date_of_birth || '').getFullYear()} años` : 'Edad no especificada'} • 
                {profile.activity_level || 'Nivel no especificado'}
              </p>
            </div>
          </div>

          {/* Campos editables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">Nombre</Label>
              <Input
                id="first_name"
                value={profile.first_name || ''}
                onChange={(e) => updateProfile({ first_name: e.target.value })}
                disabled={!isEditing}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="last_name">Apellidos</Label>
              <Input
                id="last_name"
                value={profile.last_name || ''}
                onChange={(e) => updateProfile({ last_name: e.target.value })}
                disabled={!isEditing}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => updateProfile({ email: e.target.value })}
                disabled={!isEditing}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="phone_number">Teléfono</Label>
              <Input
                id="phone_number"
                value={profile.phone_number || profile.phone || ''}
                onChange={(e) => updateProfile({ phone_number: e.target.value })}
                disabled={!isEditing}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="birth_date">Fecha de nacimiento</Label>
              <Input
                id="birth_date"
                type="date"
                value={profile.birth_date || profile.date_of_birth || ''}
                onChange={(e) => updateProfile({ birth_date: e.target.value })}
                disabled={!isEditing}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="activity_level">Nivel de actividad</Label>
              <Select
                value={profile.activity_level || ''}
                onValueChange={(value) => updateProfile({ activity_level: value })}
                disabled={!isEditing}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecciona tu nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentario</SelectItem>
                  <SelectItem value="light">Ligero</SelectItem>
                  <SelectItem value="moderate">Moderado</SelectItem>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="very_active">Muy activo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="bio">Biografía</Label>
            <Textarea
              id="bio"
              value={profile.bio || ''}
              onChange={(e) => updateProfile({ bio: e.target.value })}
              disabled={!isEditing}
              className="mt-1"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Información Física */}
      <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
            <Ruler className="h-5 w-5" />
            Información Física
          </CardTitle>
          <CardDescription>Tu altura, peso actual y objetivo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="height">Altura (cm)</Label>
              <Input
                id="height"
                type="number"
                value={profile.height || ''}
                onChange={(e) => updateProfile({ height: parseInt(e.target.value) })}
                disabled={!isEditing}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="weight">Peso actual (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={profile.weight || ''}
                onChange={(e) => updateProfile({ weight: parseFloat(e.target.value) })}
                disabled={!isEditing}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="target_weight">Peso objetivo (kg)</Label>
              <Input
                id="target_weight"
                type="number"
                step="0.1"
                value={profile.target_weight || ''}
                onChange={(e) => updateProfile({ target_weight: parseFloat(e.target.value) })}
                disabled={!isEditing}
                className="mt-1"
              />
            </div>
          </div>

          {/* Progreso hacia el objetivo */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progreso hacia el objetivo</span>
              <span>{profile.weight && profile.target_weight ? Math.abs(profile.weight - profile.target_weight).toFixed(1) : '0'} kg restantes</span>
            </div>
            <Progress 
              value={profile.weight && profile.target_weight ? Math.min(100, Math.max(0, 100 - Math.abs(profile.weight - profile.target_weight) * 10)) : 0} 
              className="h-2" 
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{profile.weight || '0'} kg</span>
              <span>{profile.target_weight || '0'} kg</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferencias y Objetivos */}
      <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            <Target className="h-5 w-5" />
            Preferencias y Objetivos
          </CardTitle>
          <CardDescription>Tu nivel de actividad y objetivos de fitness</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="activity_level">Nivel de actividad</Label>
              <Select
                value={profile.activity_level || ''}
                onValueChange={(value) => updateProfile({ activity_level: value })}
                disabled={!isEditing}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentario</SelectItem>
                  <SelectItem value="light">Ligero</SelectItem>
                  <SelectItem value="moderate">Moderado</SelectItem>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="very_active">Muy activo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Objetivos principales</Label>
              <div className="mt-2 space-y-2">
                {["weight_loss", "muscle_gain", "endurance", "flexibility"].map((goal) => (
                  <label key={goal} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={
                        Array.isArray(profile.fitness_goals) 
                          ? profile.fitness_goals.includes(goal)
                          : false
                      }
                      onChange={(e) => {
                        const currentGoals = Array.isArray(profile.fitness_goals) 
                          ? profile.fitness_goals 
                          : []
                        if (e.target.checked) {
                          updateProfile({ fitness_goals: [...currentGoals, goal] })
                        } else {
                          updateProfile({ fitness_goals: currentGoals.filter((g: string) => g !== goal) })
                        }
                      }}
                      disabled={!isEditing}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">
                      {goal === "weight_loss" && "Pérdida de peso"}
                      {goal === "muscle_gain" && "Ganancia de músculo"}
                      {goal === "endurance" && "Resistencia"}
                      {goal === "flexibility" && "Flexibilidad"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botones de acción */}
      {isEditing && (
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white border-0">
            <Save className="h-4 w-4 mr-2" />
            Guardar cambios
          </Button>
        </div>
      )}
    </div>
  )
}
