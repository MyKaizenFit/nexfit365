"use client"

import { useState } from "react"
import { ArrowLeft, Ruler, Weight, Target, Save, X, Calendar as CalendarIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "@/hooks/use-toast"

interface NewUserData {
  // Información personal
  name: string
  email: string
  phone: string
  birthDate: Date | null
  gender: string
  location: string

  // Datos físicos
  height: number | ""
  currentWeight: number | ""
  targetWeight: number | ""
  activityLevel: string

  // Objetivos y preferencias
  goals: string[]
  allergies: string[]
  customAllergy: string
  dietaryPreferences: string[]
  medicalConditions: string[]

  // Plan y configuración
  plan: string
  startDate: Date | null
  notes: string
}

export function NewUserForm({ onSave, onCancel }: { onSave: (userData: any) => void | Promise<void>; onCancel: () => void }) {
  const [userData, setUserData] = useState<NewUserData>({
    name: "",
    email: "",
    phone: "",
    birthDate: null,
    gender: "",
    location: "",
    height: "",
    currentWeight: "",
    targetWeight: "",
    activityLevel: "",
    goals: [],
    allergies: [],
    customAllergy: "",
    dietaryPreferences: [],
    medicalConditions: [],
    plan: "basic",
    startDate: new Date(),
    notes: "",
  })

  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const totalSteps = 4

  // Calcular edad mínima y máxima permitida
  const getMinDate = () => {
    const today = new Date()
    return new Date(today.getFullYear() - 100, today.getMonth(), today.getDate())
  }

  const getMaxDate = () => {
    const today = new Date()
    return new Date(today.getFullYear() - 14, today.getMonth(), today.getDate())
  }

  const calculateAge = (birthDate: Date | null): number | null => {
    if (!birthDate) return null
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const handleGoalChange = (goal: string, checked: boolean) => {
    setUserData((prev) => ({
      ...prev,
      goals: checked ? [...prev.goals, goal] : prev.goals.filter((g) => g !== goal),
    }))
  }

  const handleAllergyChange = (allergy: string, checked: boolean) => {
    setUserData((prev) => {
      const newAllergies = checked 
        ? [...prev.allergies, allergy] 
        : prev.allergies.filter((a) => a !== allergy)
      
      // Si se desmarca "otra", limpiar el campo personalizado
      if (allergy === "other" && !checked) {
        return { ...prev, allergies: newAllergies, customAllergy: "" }
      }
      
      return { ...prev, allergies: newAllergies }
    })
  }

  const handleDietaryPreferenceChange = (preference: string, checked: boolean) => {
    setUserData((prev) => ({
      ...prev,
      dietaryPreferences: checked
        ? [...prev.dietaryPreferences, preference]
        : prev.dietaryPreferences.filter((p) => p !== preference),
    }))
  }

  const handleMedicalConditionChange = (condition: string, checked: boolean) => {
    setUserData((prev) => ({
      ...prev,
      medicalConditions: checked
        ? [...prev.medicalConditions, condition]
        : prev.medicalConditions.filter((c) => c !== condition),
    }))
  }

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        return userData.name && userData.email && userData.birthDate && userData.gender
      case 2:
        return userData.height && userData.currentWeight && userData.activityLevel
      case 3:
        return userData.goals.length > 0
      case 4:
        return true
      default:
        return false
    }
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      // Validar edad en el paso 1
      if (currentStep === 1 && userData.birthDate) {
        const age = calculateAge(userData.birthDate)
        if (age !== null && (age < 14 || age > 100)) {
          toast({
            title: "❌ Edad no válida",
            description: "La edad debe estar entre 14 y 100 años",
            variant: "destructive",
          })
          return
        }
      }
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
    } else {
      toast({
        title: "❌ Campos requeridos",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive",
      })
    }
  }

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      toast({
        title: "❌ Formulario incompleto",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    // Validar edad antes de enviar
    if (userData.birthDate) {
      const age = calculateAge(userData.birthDate)
      if (age !== null && (age < 14 || age > 100)) {
        toast({
          title: "❌ Edad no válida",
          description: "La edad debe estar entre 14 y 100 años",
          variant: "destructive",
        })
        return
      }
    }

    // Separar nombre completo en first_name y last_name
    const nameParts = userData.name.trim().split(/\s+/)
    const first_name = nameParts[0] || ''
    const last_name = nameParts.slice(1).join(' ') || ''

    // Asegurar que first_name y last_name no estén vacíos
    if (!first_name) {
      toast({
        title: "❌ Nombre requerido",
        description: "El nombre no puede estar vacío",
        variant: "destructive",
      })
      return
    }

    // Generar contraseña temporal si no se proporciona
    const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`

    // Procesar alergias: incluir alergia personalizada si está marcada "otra"
    const allergies = [...userData.allergies]
    if (userData.allergies.includes("other") && userData.customAllergy.trim()) {
      // Reemplazar "other" con la alergia personalizada
      const otherIndex = allergies.indexOf("other")
      if (otherIndex > -1) {
        allergies[otherIndex] = userData.customAllergy.trim()
      }
    } else if (userData.allergies.includes("other") && !userData.customAllergy.trim()) {
      // Si está marcado "otra" pero no hay texto, quitar "other"
      const otherIndex = allergies.indexOf("other")
      if (otherIndex > -1) {
        allergies.splice(otherIndex, 1)
      }
    }

    // Transformar datos del formulario al formato esperado por la API
    const transformedData = {
      email: userData.email,
      password: tempPassword,
      password_confirm: tempPassword,
      first_name: first_name,
      last_name: last_name || first_name, // Si no hay apellido, usar el nombre
      phone_number: userData.phone || undefined,
      birth_date: userData.birthDate ? format(userData.birthDate, 'yyyy-MM-dd') : undefined,
      gender: userData.gender || undefined,
      height: userData.height !== "" ? Number(userData.height) : undefined,
      weight: userData.currentWeight !== "" ? Number(userData.currentWeight) : undefined,
      target_weight: userData.targetWeight !== "" ? Number(userData.targetWeight) : undefined,
      activity_level: userData.activityLevel || undefined,
      fitness_goals: userData.goals || [],
      allergies: allergies || [],
      medical_conditions: userData.medicalConditions || [],
      role: userData.plan === 'premium' ? 'premium' : userData.plan === 'pro' ? 'pro' : 'basic',
    }

    setIsSubmitting(true)
    try {
      const result = onSave(transformedData)
      // Si onSave retorna una Promise, esperarla
      if (result instanceof Promise) {
        await result
      }
      // Si onSave se completa sin errores, el componente padre manejará el cierre
    } catch (error) {
      toast({
        title: "❌ Error al crear usuario",
        description: error instanceof Error ? error.message : "Ocurrió un error inesperado",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1:
        return "Información Personal"
      case 2:
        return "Datos Físicos"
      case 3:
        return "Objetivos y Preferencias"
      case 4:
        return "Configuración Final"
      default:
        return ""
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={onCancel}
          className="hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 bg-transparent"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Crear Nuevo Usuario
          </h1>
          <p className="text-gray-600">Completa la información para crear una nueva cuenta de usuario</p>
        </div>
      </div>

      {/* Progress indicator */}
      <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{getStepTitle(currentStep)}</h2>
            <span className="text-sm text-gray-600">
              Paso {currentStep} de {totalSteps}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Step content */}
      <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
        <CardContent className="p-6">
          {/* Step 1: Información Personal */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Nombre completo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={userData.name}
                    onChange={(e) => setUserData((prev) => ({ ...prev, name: e.target.value }))}
                    className="border-2 border-gray-200 focus:border-blue-400"
                    placeholder="Juan Pérez"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={userData.email}
                    onChange={(e) => setUserData((prev) => ({ ...prev, email: e.target.value }))}
                    className="border-2 border-gray-200 focus:border-blue-400"
                    placeholder="juan@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={userData.phone}
                    onChange={(e) => setUserData((prev) => ({ ...prev, phone: e.target.value }))}
                    className="border-2 border-gray-200 focus:border-blue-400"
                    placeholder="+34 612 345 678"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Ubicación</Label>
                  <Input
                    id="location"
                    value={userData.location}
                    onChange={(e) => setUserData((prev) => ({ ...prev, location: e.target.value }))}
                    className="border-2 border-gray-200 focus:border-blue-400"
                    placeholder="Madrid, España"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthDate">
                    Fecha de nacimiento <span className="text-red-500">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`
                          w-full justify-start text-left font-normal border-2 border-gray-200 focus:border-blue-400
                          ${!userData.birthDate && "text-muted-foreground"}
                        `}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {userData.birthDate ? (
                          format(userData.birthDate, "PPP", { locale: es })
                        ) : (
                          <span>Selecciona una fecha</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={userData.birthDate || undefined}
                        onSelect={(date) => setUserData((prev) => ({ ...prev, birthDate: date || null }))}
                        disabled={(date) => date > getMaxDate() || date < getMinDate()}
                        initialFocus
                        locale={es}
                        captionLayout="dropdown"
                        fromYear={new Date().getFullYear() - 100}
                        toYear={new Date().getFullYear() - 14}
                      />
                    </PopoverContent>
                  </Popover>
                  {userData.birthDate && (
                    <p className="text-xs text-gray-500">
                      Edad: {calculateAge(userData.birthDate)} años
                      {(() => {
                        const age = calculateAge(userData.birthDate)
                        if (age !== null && (age < 14 || age > 100)) {
                          return <span className="text-red-500 ml-2">(Edad no válida: debe estar entre 14 y 100 años)</span>
                        }
                        return null
                      })()}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">
                    Género <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={userData.gender}
                    onValueChange={(value) => setUserData((prev) => ({ ...prev, gender: value }))}
                  >
                    <SelectTrigger className="border-2 border-gray-200 focus:border-blue-400">
                      <SelectValue placeholder="Selecciona género" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Femenino</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefiero no decir</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Datos Físicos */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height">
                    Altura (cm) <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Ruler className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="height"
                      type="number"
                      value={userData.height}
                      onChange={(e) => setUserData((prev) => ({ ...prev, height: Number(e.target.value) || "" }))}
                      className="pl-10 border-2 border-gray-200 focus:border-blue-400"
                      placeholder="175"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currentWeight">
                    Peso actual (kg) <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Weight className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="currentWeight"
                      type="number"
                      step="0.1"
                      value={userData.currentWeight}
                      onChange={(e) =>
                        setUserData((prev) => ({ ...prev, currentWeight: Number(e.target.value) || "" }))
                      }
                      className="pl-10 border-2 border-gray-200 focus:border-blue-400"
                      placeholder="70.5"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetWeight">Peso objetivo (kg)</Label>
                  <div className="relative">
                    <Target className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="targetWeight"
                      type="number"
                      step="0.1"
                      value={userData.targetWeight}
                      onChange={(e) => setUserData((prev) => ({ ...prev, targetWeight: Number(e.target.value) || "" }))}
                      className="pl-10 border-2 border-gray-200 focus:border-blue-400"
                      placeholder="65.0"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="activityLevel">
                  Nivel de actividad <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={userData.activityLevel}
                  onValueChange={(value) => setUserData((prev) => ({ ...prev, activityLevel: value }))}
                >
                  <SelectTrigger className="border-2 border-gray-200 focus:border-blue-400">
                    <SelectValue placeholder="Selecciona tu nivel de actividad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentary">Sedentario (poco o ningún ejercicio)</SelectItem>
                    <SelectItem value="light">Ligero (ejercicio ligero 1-3 días/semana)</SelectItem>
                    <SelectItem value="moderate">Moderado (ejercicio moderado 3-5 días/semana)</SelectItem>
                    <SelectItem value="active">Activo (ejercicio intenso 6-7 días/semana)</SelectItem>
                    <SelectItem value="very_active">Muy activo (ejercicio muy intenso, trabajo físico)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* IMC Calculator */}
              {userData.height && userData.currentWeight && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2">Índice de Masa Corporal (IMC)</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-blue-700">
                      IMC calculado:{" "}
                      {((userData.currentWeight as number) / Math.pow((userData.height as number) / 100, 2)).toFixed(1)}
                    </span>
                    <span className="text-sm text-blue-600">
                      {(() => {
                        const bmi = (userData.currentWeight as number) / Math.pow((userData.height as number) / 100, 2)
                        if (bmi < 18.5) return "Bajo peso"
                        if (bmi < 25) return "Peso normal"
                        if (bmi < 30) return "Sobrepeso"
                        return "Obesidad"
                      })()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Objetivos y Preferencias */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">
                    Objetivos principales <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-sm text-gray-600 mb-3">Selecciona uno o más objetivos</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { id: "weight_loss", label: "Pérdida de peso" },
                      { id: "muscle_gain", label: "Ganancia muscular" },
                      { id: "strength_building", label: "Aumento de fuerza" },
                      { id: "endurance", label: "Mejorar resistencia" },
                      { id: "general_fitness", label: "Fitness general" },
                      { id: "body_recomposition", label: "Recomposición corporal" },
                    ].map((goal) => (
                      <div key={goal.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={goal.id}
                          checked={userData.goals.includes(goal.id)}
                          onCheckedChange={(checked) => handleGoalChange(goal.id, checked as boolean)}
                        />
                        <Label htmlFor={goal.id} className="text-sm font-normal">
                          {goal.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium">Alergias alimentarias</Label>
                  <p className="text-sm text-gray-600 mb-3">Selecciona las alergias que apliquen</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { id: "nuts", label: "Frutos secos" },
                      { id: "dairy", label: "Lácteos" },
                      { id: "gluten", label: "Gluten" },
                      { id: "eggs", label: "Huevos" },
                      { id: "seafood", label: "Mariscos" },
                      { id: "soy", label: "Soja" },
                      { id: "other", label: "Otra" },
                    ].map((allergy) => (
                      <div key={allergy.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={allergy.id}
                          checked={userData.allergies.includes(allergy.id)}
                          onCheckedChange={(checked) => handleAllergyChange(allergy.id, checked as boolean)}
                        />
                        <Label htmlFor={allergy.id} className="text-sm font-normal">
                          {allergy.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {userData.allergies.includes("other") && (
                    <div className="mt-3">
                      <Label htmlFor="customAllergy" className="text-sm font-medium">
                        Especifica la alergia <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="customAllergy"
                        value={userData.customAllergy}
                        onChange={(e) => setUserData((prev) => ({ ...prev, customAllergy: e.target.value }))}
                        className="mt-1 border-2 border-gray-200 focus:border-blue-400"
                        placeholder="Ej: Alergia al polen, Alergia a los gatos, etc."
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-base font-medium">Preferencias dietéticas</Label>
                  <p className="text-sm text-gray-600 mb-3">Selecciona tu estilo de alimentación</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { id: "vegetarian", label: "Vegetariano" },
                      { id: "vegan", label: "Vegano" },
                      { id: "keto", label: "Cetogénica" },
                      { id: "paleo", label: "Paleo" },
                      { id: "mediterranean", label: "Mediterránea" },
                      { id: "low_carb", label: "Baja en carbohidratos" },
                    ].map((preference) => (
                      <div key={preference.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={preference.id}
                          checked={userData.dietaryPreferences.includes(preference.id)}
                          onCheckedChange={(checked) =>
                            handleDietaryPreferenceChange(preference.id, checked as boolean)
                          }
                        />
                        <Label htmlFor={preference.id} className="text-sm font-normal">
                          {preference.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium">Condiciones médicas</Label>
                  <p className="text-sm text-gray-600 mb-3">Información importante para personalizar el plan</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { id: "diabetes", label: "Diabetes" },
                      { id: "hypertension", label: "Hipertensión" },
                      { id: "heart_disease", label: "Enfermedad cardíaca" },
                      { id: "thyroid", label: "Problemas de tiroides" },
                      { id: "arthritis", label: "Artritis" },
                      { id: "back_problems", label: "Problemas de espalda" },
                    ].map((condition) => (
                      <div key={condition.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={condition.id}
                          checked={userData.medicalConditions.includes(condition.id)}
                          onCheckedChange={(checked) => handleMedicalConditionChange(condition.id, checked as boolean)}
                        />
                        <Label htmlFor={condition.id} className="text-sm font-normal">
                          {condition.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Configuración Final */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plan">Plan de suscripción</Label>
                  <Select
                    value={userData.plan}
                    onValueChange={(value) => setUserData((prev) => ({ ...prev, plan: value }))}
                  >
                    <SelectTrigger className="border-2 border-gray-200 focus:border-blue-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Básico - Gratis</SelectItem>
                      <SelectItem value="premium">Premium - €19.99/mes</SelectItem>
                      <SelectItem value="pro">Pro - €39.99/mes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startDate">Fecha de inicio</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`
                          w-full justify-start text-left font-normal border-2 border-gray-200 focus:border-blue-400
                          ${!userData.startDate && "text-muted-foreground"}
                        `}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {userData.startDate ? (
                          format(userData.startDate, "PPP", { locale: es })
                        ) : (
                          <span>Selecciona una fecha</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={userData.startDate || undefined}
                        onSelect={(date) => setUserData((prev) => ({ ...prev, startDate: date || null }))}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                        locale={es}
                        captionLayout="dropdown"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas adicionales</Label>
                <Textarea
                  id="notes"
                  value={userData.notes}
                  onChange={(e) => setUserData((prev) => ({ ...prev, notes: e.target.value }))}
                  className="border-2 border-gray-200 focus:border-blue-400"
                  rows={4}
                  placeholder="Información adicional sobre el usuario, objetivos específicos, limitaciones, etc."
                />
              </div>

              {/* Resumen */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-800 mb-3">Resumen del usuario</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Nombre:</span> {userData.name}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {userData.email}
                  </div>
                  <div>
                    <span className="font-medium">Edad:</span>{" "}
                    {userData.birthDate ? calculateAge(userData.birthDate) : "N/A"}{" "}
                    años
                  </div>
                  <div>
                    <span className="font-medium">Plan:</span> {userData.plan}
                  </div>
                  <div>
                    <span className="font-medium">Objetivos:</span> {userData.goals.length} seleccionados
                  </div>
                  <div>
                    <span className="font-medium">Alergias:</span> {userData.allergies.length} identificadas
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
        <CardContent className="p-6">
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-slate-50 bg-transparent"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>

              {currentStep < totalSteps ? (
                <Button
                  onClick={nextStep}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"
                >
                  Siguiente
                  <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Crear Usuario
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
