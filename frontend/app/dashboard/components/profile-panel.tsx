"use client"

import { useState, useEffect, useMemo, memo } from "react"
import { User, Mail, Phone, MapPin, Calendar, Ruler, Weight, Target, Edit, Save, X, Camera, Plus, Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"
import { useUserProfile } from "@/hooks/use-user-profile"
import { NutritionPreview } from "./nutrition-preview"
import { calculateNutritionPlan, type CalculatedMacros } from "@/lib/nutrition-calculator"
import { nutritionService } from "@/lib/nutrition-service"

export const ProfilePanel = memo(function ProfilePanel() {
  const [isEditing, setIsEditing] = useState(false)
  const [localProfile, setLocalProfile] = useState<any>(null)
  const [currentPlan, setCurrentPlan] = useState<CalculatedMacros | null>(null)
  const { profile, updateProfile, loading, error, refreshProfile } = useUserProfile()
  const [recipeExclusions, setRecipeExclusions] = useState<Array<{ id: string; recipe_name: string; image_url?: string }>>([])
  const [ingredientExclusions, setIngredientExclusions] = useState<Array<{ id: string; term: string }>>([])
  const [newIngredientTerm, setNewIngredientTerm] = useState('')
  const [loadingExclusions, setLoadingExclusions] = useState(false)

  // Sincronizar perfil local cuando cambia el perfil del hook
  useEffect(() => {
    if (profile) {
      setLocalProfile(profile)
    }
  }, [profile])

  // Cargar plan actual al montar
  useEffect(() => {
    if (profile && isEditing) {
      loadCurrentPlan()
    }
  }, [profile, isEditing])

  useEffect(() => {
    loadExclusions()
  }, [])

  const loadExclusions = async () => {
    setLoadingExclusions(true)
    try {
      const [recipes, ingredients] = await Promise.all([
        nutritionService.getRecipeExclusions(),
        nutritionService.getIngredientExclusions(),
      ])
      setRecipeExclusions(recipes)
      setIngredientExclusions(ingredients)
    } finally {
      setLoadingExclusions(false)
    }
  }

  const handleAddIngredientExclusion = async () => {
    const term = newIngredientTerm.trim().toLowerCase()
    if (!term) return
    const created = await nutritionService.addIngredientExclusion(term)
    if (created) {
      setNewIngredientTerm('')
      await loadExclusions()
    }
  }

  const handleRemoveIngredientExclusion = async (id: string) => {
    const ok = await nutritionService.removeIngredientExclusion(id)
    if (ok) {
      await loadExclusions()
    }
  }

  const handleRemoveRecipeExclusion = async (id: string) => {
    const ok = await nutritionService.removeRecipeExclusion(id)
    if (ok) {
      await loadExclusions()
    }
  }

  const handleClearAllRecipeExclusions = async () => {
    if (recipeExclusions.length === 0) return
    const okResults = await Promise.all(
      recipeExclusions.map((item) => nutritionService.removeRecipeExclusion(item.id))
    )
    if (okResults.some(Boolean)) {
      await loadExclusions()
      toast({
        title: 'Exclusiones limpiadas',
        description: 'Se quitaron todas las recetas marcadas como no-como.',
      })
    }
  }

  const loadCurrentPlan = async () => {
    try {
      const plan = await nutritionService.getCurrentPlan()
      if (plan && plan.daily_calories && plan.target_macros) {
        setCurrentPlan({
          calories: plan.daily_calories,
          protein: plan.target_macros.protein || 0,
          carbs: plan.target_macros.carbs || 0,
          fat: plan.target_macros.fat || 0,
          protein_percentage: 0,
          carbs_percentage: 0,
          fat_percentage: 0,
        })
      } else {
        // Calcular desde el perfil actual si no hay plan
        const calculated = calculateNutritionPlan({
          weight: profile?.weight,
          height: profile?.height,
          age: profile?.age || calculateAge(profile?.birth_date || profile?.date_of_birth),
          gender: profile?.gender as any,
          activity_level: profile?.activity_level as any,
          main_goal: profile?.main_goal as any,
        })
        setCurrentPlan(calculated)
      }
    } catch (error) {
    }
  }

  const calculateAge = (birthDate: string | null | undefined): number | null => {
    if (!birthDate) return null
    const birth = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const formatPreferenceValue = (value: string | string[] | null | undefined) => {
    if (Array.isArray(value)) {
      return value.join(', ')
    }
    return value || ''
  }

  const parsePreferenceList = (value: string | string[] | null | undefined) => {
    if (Array.isArray(value)) {
      return value.map((item) => item.trim()).filter(Boolean)
    }

    if (!value) {
      return []
    }

    return value
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  const handleLocalUpdate = (updates: any) => {
    setLocalProfile((prev: any) => {
      const updated = { ...prev, ...updates }
      // Asegurar que los valores numéricos nunca sean undefined para inputs controlados
      if (updated.weight === undefined) updated.weight = prev?.weight ?? profile?.weight ?? null
      if (updated.target_weight === undefined) updated.target_weight = prev?.target_weight ?? profile?.target_weight ?? null
      if (updated.height === undefined) updated.height = prev?.height ?? profile?.height ?? null
      if (updated.activity_level === undefined) updated.activity_level = prev?.activity_level ?? profile?.activity_level ?? ''
      if (updated.main_goal === undefined) updated.main_goal = prev?.main_goal ?? profile?.main_goal ?? ''
      return updated
    })
  }

  const handleSave = async () => {
    try {
      if (localProfile) {
        // Crear objeto con solo campos editables desde localProfile
        const editableFields: any = {}
        
        // Campos básicos editables
        if (localProfile.first_name !== undefined) editableFields.first_name = localProfile.first_name
        if (localProfile.last_name !== undefined) editableFields.last_name = localProfile.last_name
        // phone puede venir como phone o phone_number del backend
        const phoneValue = localProfile.phone_number || localProfile.phone
        if (phoneValue !== undefined) editableFields.phone_number = phoneValue
        // birth_date puede venir como birth_date o date_of_birth
        const birthDateValue = localProfile.birth_date || localProfile.date_of_birth
        if (birthDateValue !== undefined) editableFields.birth_date = birthDateValue
        if (localProfile.gender !== undefined) editableFields.gender = localProfile.gender
        
        // Campos físicos
        if (localProfile.height !== undefined) editableFields.height = localProfile.height
        if (localProfile.weight !== undefined) editableFields.weight = localProfile.weight
        if (localProfile.target_weight !== undefined) editableFields.target_weight = localProfile.target_weight
        
        // Preferencias
        if (localProfile.activity_level !== undefined) editableFields.activity_level = localProfile.activity_level
        if (localProfile.dietary_restrictions !== undefined) editableFields.dietary_restrictions = parsePreferenceList(localProfile.dietary_restrictions)
        if (localProfile.allergies !== undefined) editableFields.allergies = parsePreferenceList(localProfile.allergies)
        if (localProfile.medical_conditions !== undefined) editableFields.medical_conditions = localProfile.medical_conditions
        if (localProfile.additional_info_for_admin !== undefined) editableFields.additional_info_for_admin = localProfile.additional_info_for_admin
        
        // Entrenamiento
        if (localProfile.training_days_per_week !== undefined) editableFields.training_days_per_week = localProfile.training_days_per_week
        if (localProfile.training_days !== undefined) editableFields.training_days = localProfile.training_days
        if (localProfile.training_location !== undefined) editableFields.training_location = localProfile.training_location
        if (localProfile.main_goal !== undefined) editableFields.main_goal = localProfile.main_goal
        
        // Otros campos
        if (localProfile.injuries_or_medical_issues !== undefined) editableFields.injuries_or_medical_issues = localProfile.injuries_or_medical_issues
        if (localProfile.disliked_foods !== undefined) editableFields.disliked_foods = formatPreferenceValue(localProfile.disliked_foods)
        
        const response = await updateProfile(editableFields)
        
        // Verificar si el plan fue actualizado automáticamente
        const planUpdated = (response as any)?.plan_updated || false
        const planUpdateMessage = (response as any)?.plan_update_message
        
        if (planUpdated && planUpdateMessage) {
          toast({
            title: "✅ Perfil actualizado",
            description: planUpdateMessage,
            duration: 5000,
          })
        } else {
          toast({
            title: "✅ Perfil actualizado",
            description: "Tus cambios han sido guardados correctamente",
          })
        }
        
        setIsEditing(false)
        // Refrescar el perfil para obtener los datos actualizados
        await refreshProfile()
        
        // Si se actualizó el peso, refrescar también el historial de peso y estadísticas
        if (editableFields.weight !== undefined) {
          try {
            // Disparar evento personalizado para refrescar componentes que muestran peso
            window.dispatchEvent(new CustomEvent('weightUpdated', { 
              detail: { weight: editableFields.weight } 
            }))
            
            // Refrescar también los hooks relacionados si están disponibles
            // Esto se hace a través del evento para evitar dependencias circulares
          } catch (error) {
          }
        }
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudo actualizar el perfil. Inténtalo de nuevo.",
        variant: "destructive",
      })
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    // Revertir cambios locales al perfil original
    setLocalProfile(profile)
  }

  const handleEdit = () => {
    setIsEditing(true)
    setLocalProfile(profile)
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
            onClick={() => (isEditing ? handleSave() : handleEdit())}
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
                value={localProfile?.first_name ?? profile.first_name ?? ''}
                onChange={(e) => handleLocalUpdate({ first_name: e.target.value })}
                disabled={!isEditing}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="last_name">Apellidos</Label>
              <Input
                id="last_name"
                value={localProfile?.last_name ?? profile.last_name ?? ''}
                onChange={(e) => handleLocalUpdate({ last_name: e.target.value })}
                disabled={!isEditing}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email || ''}
                disabled
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="phone_number">Teléfono</Label>
              <Input
                id="phone_number"
                value={localProfile?.phone_number ?? localProfile?.phone ?? profile.phone_number ?? profile.phone ?? ''}
                onChange={(e) => handleLocalUpdate({ phone_number: e.target.value })}
                disabled={!isEditing}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="birth_date">Fecha de nacimiento</Label>
              <Input
                id="birth_date"
                type="date"
                value={localProfile?.birth_date ?? localProfile?.date_of_birth ?? profile.birth_date ?? profile.date_of_birth ?? ''}
                onChange={(e) => handleLocalUpdate({ birth_date: e.target.value })}
                disabled={!isEditing}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="activity_level">Nivel de actividad</Label>
              <Select
                value={localProfile?.activity_level ?? profile.activity_level ?? ''}
                onValueChange={(value) => handleLocalUpdate({ activity_level: value })}
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
              value={localProfile?.bio ?? profile.bio ?? ''}
              onChange={(e) => handleLocalUpdate({ bio: e.target.value })}
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
                value={localProfile?.height ?? profile.height ?? ''}
                onChange={(e) => handleLocalUpdate({ height: e.target.value ? parseInt(e.target.value, 10) : null })}
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
                value={localProfile?.weight ?? profile.weight ?? ''}
                onChange={(e) => handleLocalUpdate({ weight: e.target.value ? parseFloat(e.target.value) : null })}
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
                value={localProfile?.target_weight ?? profile.target_weight ?? ''}
                onChange={(e) => handleLocalUpdate({ target_weight: e.target.value ? parseFloat(e.target.value) : null })}
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
                value={localProfile?.activity_level ?? profile?.activity_level ?? ''}
                onValueChange={(value) => handleLocalUpdate({ activity_level: value })}
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
              <Label htmlFor="main_goal">Objetivo principal</Label>
              <Select
                value={localProfile?.main_goal ?? profile?.main_goal ?? ''}
                onValueChange={(value) => handleLocalUpdate({ main_goal: value })}
                disabled={!isEditing}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecciona tu objetivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lose_weight">Perder peso</SelectItem>
                  <SelectItem value="gain_muscle">Ganar músculo</SelectItem>
                  <SelectItem value="body_recomposition">Recomposición corporal</SelectItem>
                  <SelectItem value="maintain">Mantener</SelectItem>
                  <SelectItem value="performance">Rendimiento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview de cambios nutricionales */}
          {isEditing && localProfile && (
            <NutritionPreview
              currentProfile={{
                weight: profile?.weight,
                height: profile?.height,
                age: profile?.age || calculateAge(profile?.birth_date || profile?.date_of_birth),
                gender: profile?.gender as any,
                activity_level: profile?.activity_level as any,
                main_goal: profile?.main_goal as any,
              }}
              proposedProfile={{
                weight: localProfile?.weight || profile?.weight,
                height: localProfile?.height || profile?.height,
                age: localProfile?.age || profile?.age || calculateAge(localProfile?.birth_date || localProfile?.date_of_birth || profile?.birth_date || profile?.date_of_birth),
                gender: (localProfile?.gender || profile?.gender) as any,
                activity_level: (localProfile?.activity_level || profile?.activity_level) as any,
                main_goal: (localProfile?.main_goal || profile?.main_goal) as any,
              }}
              currentPlan={currentPlan}
            />
          )}
        </CardContent>
      </Card>

      <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-lime-600 bg-clip-text text-transparent">
            <Target className="h-5 w-5" />
            Preferencias Alimentarias
          </CardTitle>
          <CardDescription>Estas preferencias se usan para adaptar automáticamente tu plan de alimentación</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dietary_restrictions">Restricciones dietéticas</Label>
              <Textarea
                id="dietary_restrictions"
                value={formatPreferenceValue(localProfile?.dietary_restrictions ?? profile.dietary_restrictions)}
                onChange={(e) => handleLocalUpdate({ dietary_restrictions: e.target.value })}
                disabled={!isEditing}
                className="mt-1"
                rows={3}
                placeholder="Ej: vegetariano, sin gluten, sin lactosa"
              />
              <p className="mt-2 text-xs text-gray-500">Sepáralas con comas o saltos de línea.</p>
            </div>
            <div>
              <Label htmlFor="allergies">Alergias</Label>
              <Textarea
                id="allergies"
                value={formatPreferenceValue(localProfile?.allergies ?? profile.allergies)}
                onChange={(e) => handleLocalUpdate({ allergies: e.target.value })}
                disabled={!isEditing}
                className="mt-1"
                rows={3}
                placeholder="Ej: huevos, frutos secos, marisco"
              />
              <p className="mt-2 text-xs text-gray-500">Si cambias estas alergias, el sistema intentará excluir recetas incompatibles.</p>
            </div>
          </div>

          <div>
            <Label htmlFor="disliked_foods">Alimentos que no comes</Label>
            <Textarea
              id="disliked_foods"
              value={formatPreferenceValue(localProfile?.disliked_foods ?? profile.disliked_foods)}
              onChange={(e) => handleLocalUpdate({ disliked_foods: e.target.value })}
              disabled={!isEditing}
              className="mt-1"
              rows={4}
              placeholder="Ej: brócoli, hígado, atún"
            />
            <p className="mt-2 text-xs text-gray-500">Úsalo para excluir ingredientes o comidas que no quieres ver en tu plan.</p>
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-medium">Ingredientes excluidos (no como)</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={newIngredientTerm}
                  onChange={(e) => setNewIngredientTerm(e.target.value)}
                  placeholder="Ej: tomate"
                  className="h-8 w-40"
                />
                <Button type="button" size="sm" variant="outline" onClick={handleAddIngredientExclusion}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Añadir
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {ingredientExclusions.map((item) => (
                <div key={item.id} className="inline-flex items-center gap-2 px-2 py-1 rounded-md border bg-white text-xs">
                  <span>{item.term}</span>
                  <button type="button" onClick={() => handleRemoveIngredientExclusion(item.id)} className="text-red-500 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {!loadingExclusions && ingredientExclusions.length === 0 ? (
                <p className="text-xs text-gray-500">No hay ingredientes excluidos.</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-medium">Recetas marcadas como "no como"</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleClearAllRecipeExclusions}
                disabled={recipeExclusions.length === 0}
              >
                Quitar todas
              </Button>
            </div>
            <div className="space-y-2">
              {recipeExclusions.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 border rounded-md p-2 bg-white">
                  <div className="flex items-center gap-2 min-w-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.recipe_name} className="w-8 h-8 rounded object-cover border" />
                    ) : null}
                    <span className="text-sm truncate">{item.recipe_name}</span>
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={() => handleRemoveRecipeExclusion(item.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              {!loadingExclusions && recipeExclusions.length === 0 ? (
                <p className="text-xs text-gray-500">No hay recetas excluidas.</p>
              ) : null}
            </div>
          </div>

          <div>
            <Label htmlFor="additional_info_for_admin">Información adicional para el equipo</Label>
            <Textarea
              id="additional_info_for_admin"
              value={formatPreferenceValue(localProfile?.additional_info_for_admin ?? profile.additional_info_for_admin)}
              onChange={(e) => handleLocalUpdate({ additional_info_for_admin: e.target.value })}
              disabled={!isEditing}
              className="mt-1"
              rows={3}
              placeholder="Ej: horarios complicados, alimentos que prefieres, observaciones para tu seguimiento"
            />
            <p className="mt-2 text-xs text-gray-500">Este campo lo verá el equipo administrador para ayudarte mejor y generará una alerta de cambio.</p>
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
})
