"use client";

import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ChevronLeft, ChevronRight, Check, User, Activity, Target, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

// Tipos para el formulario
interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  birth_date: string;
  gender: 'male' | 'female' | 'other' | '';
  height: string;
  weight: string;
  target_weight: string;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | '';
  training_days: number[];
  training_location: 'home' | 'gym' | '';
  main_goal: 'lose_weight' | 'gain_muscle' | 'body_recomposition' | '';
  allergies: string;
  medical_conditions: string;
  disliked_foods: string;
}

interface InitialRegistrationFormProps {
  onComplete: (data: any) => void;
  isLoading?: boolean;
  userData?: Partial<FormData> | null;
}

const STEPS = [
  { id: 1, title: 'Datos Personales', icon: User },
  { id: 2, title: 'Físico y Actividad', icon: Activity },
  { id: 3, title: 'Objetivos', icon: Target },
];

// Componente FormField fuera del componente principal para evitar re-creación
const FormField = ({
  label,
  name,
  required = false,
  children,
  error
}: {
  label: string;
  name: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}) => (
  <div className="space-y-2">
    <Label htmlFor={name} className="text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </Label>
    {children}
    {error && (
      <p className="text-sm text-red-500 flex items-center gap-1">
        <span>⚠️</span> {error}
      </p>
    )}
  </div>
);

function InitialRegistrationFormComponent({
  onComplete,
  isLoading = false,
  userData
}: InitialRegistrationFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Usar un objeto para el estado del formulario
  const [formState, setFormState] = useState<FormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    birth_date: '',
    gender: '',
    height: '',
    weight: '',
    target_weight: '',
    activity_level: '',
    training_days: [],
    training_location: '',
    main_goal: '',
    allergies: '',
    medical_conditions: '',
    disliked_foods: '',
  });

  // Ref para evitar cargar datos más de una vez
  const initialDataLoadedRef = useRef(false);
  
  // Ref para el input de fecha
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Cargar datos del usuario solo una vez
  useEffect(() => {
    if (userData && !initialDataLoadedRef.current) {
      setFormState(prev => ({
        ...prev,
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || '',
        phone_number: userData.phone_number || '',
        birth_date: userData.birth_date || '',
        gender: userData.gender || '',
        height: userData.height ? String(userData.height) : '',
        weight: userData.weight ? String(userData.weight) : '',
        target_weight: userData.target_weight ? String(userData.target_weight) : '',
        activity_level: userData.activity_level || '',
        training_days: userData.training_days || [],
        training_location: userData.training_location || '',
        main_goal: userData.main_goal || '',
        allergies: userData.allergies || '',
        medical_conditions: userData.medical_conditions || '',
        disliked_foods: userData.disliked_foods || '',
      }));
      initialDataLoadedRef.current = true;
    }
  }, [userData]);

  // Handler genérico para campos de texto
  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormState(prev => ({ ...prev, [field]: e.target.value }));
  };

  // Handler específico para teléfono: solo números, máximo 9 caracteres
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Solo permitir números
    const numericValue = e.target.value.replace(/\D/g, '');
    // Limitar a 9 caracteres
    const limitedValue = numericValue.slice(0, 9);
    setFormState(prev => ({ ...prev, phone_number: limitedValue }));
  };

  // Handler para campos de selección
  const handleSelectChange = <T extends keyof FormData>(field: T, value: FormData[T]) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  // Handler para días de entrenamiento
  const toggleTrainingDay = (day: number) => {
    setFormState(prev => ({
      ...prev,
      training_days: prev.training_days.includes(day)
        ? prev.training_days.filter(d => d !== day)
        : [...prev.training_days, day].sort((a, b) => a - b)
    }));
  };

  // Abrir selector de fecha
  const openDatePicker = () => {
    if (dateInputRef.current) {
      dateInputRef.current.focus();
      // showPicker es un método moderno para abrir el selector nativo
      if (typeof dateInputRef.current.showPicker === 'function') {
        try {
          dateInputRef.current.showPicker();
        } catch (e) {
          // Algunos navegadores pueden bloquear showPicker si no es por interacción del usuario
        }
      }
    }
  };

  const calculateAge = (birthDate: string): number => {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formState.first_name.trim()) newErrors.first_name = 'El nombre es requerido';
      if (!formState.last_name.trim()) newErrors.last_name = 'El apellido es requerido';
      if (!formState.email.trim()) newErrors.email = 'El email es requerido';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) {
        newErrors.email = 'Email inválido';
      }
      if (!formState.phone_number.trim()) {
        newErrors.phone_number = 'El teléfono es requerido';
      } else {
        // Solo números, exactamente 9 dígitos
        const phoneDigits = formState.phone_number.replace(/\D/g, '');
        if (phoneDigits.length !== 9) {
          newErrors.phone_number = 'El teléfono debe tener exactamente 9 dígitos';
        } else if (!/^\d{9}$/.test(phoneDigits)) {
          newErrors.phone_number = 'El teléfono solo puede contener números';
        }
      }
      if (!formState.birth_date) newErrors.birth_date = 'La fecha de nacimiento es requerida';
      else {
        const age = calculateAge(formState.birth_date);
        if (age < 13 || age > 120) newErrors.birth_date = 'Debes tener entre 13 y 120 años';
      }
      if (!formState.gender) newErrors.gender = 'Selecciona tu género';
    }

    if (step === 2) {
      const height = Number(formState.height);
      const weight = Number(formState.weight);
      const targetWeight = formState.target_weight ? Number(formState.target_weight) : null;

      if (!formState.height || isNaN(height) || height < 100 || height > 210) {
        newErrors.height = 'Altura inválida (100-210 cm)';
      }
      if (!formState.weight || isNaN(weight) || weight < 30 || weight > 300) {
        newErrors.weight = 'Peso inválido (30-300 kg)';
      }
      if (targetWeight !== null && (isNaN(targetWeight) || targetWeight < 50 || targetWeight > 100)) {
        newErrors.target_weight = 'Peso objetivo inválido (50-100 kg)';
      }
      if (!formState.activity_level) newErrors.activity_level = 'Selecciona tu nivel de actividad';
      if (formState.training_days.length === 0) newErrors.training_days = 'Selecciona al menos un día';
      if (!formState.training_location) newErrors.training_location = 'Selecciona dónde entrenas';
    }

    if (step === 3) {
      if (!formState.main_goal) newErrors.main_goal = 'Selecciona tu objetivo principal';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateStep(3)) return;

    const submitData = {
      first_name: formState.first_name.trim(),
      last_name: formState.last_name.trim(),
      email: formState.email.trim(),
      // Asegurar que el teléfono solo contenga números
      phone_number: formState.phone_number.replace(/\D/g, ''),
      birth_date: formState.birth_date,
      gender: formState.gender,
      height: Number(formState.height),
      weight: Number(formState.weight),
      target_weight: formState.target_weight ? Number(formState.target_weight) : undefined,
      activity_level: formState.activity_level,
      training_days: formState.training_days,
      training_days_per_week: formState.training_days.length,
      training_location: formState.training_location,
      main_goal: formState.main_goal,
      allergies: formState.allergies.trim() || undefined,
      medical_conditions: formState.medical_conditions.trim() || undefined,
      disliked_foods: formState.disliked_foods.trim() || undefined,
    };

    try {
      await onComplete(submitData);
    } catch (error) {
    }
  };

  // Componente de paso del stepper
  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                  isCompleted && "bg-green-500 text-white",
                  isActive && "bg-blue-600 text-white ring-4 ring-blue-200",
                  !isActive && !isCompleted && "bg-gray-200 text-gray-500"
                )}
              >
                {isCompleted ? <Check className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
              </div>
              <span className={cn(
                "text-xs mt-2 font-medium",
                isActive && "text-blue-600",
                isCompleted && "text-green-600",
                !isActive && !isCompleted && "text-gray-400"
              )}>
                {step.title}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={cn(
                "w-16 h-1 mx-2 rounded transition-all duration-300",
                currentStep > step.id ? "bg-green-500" : "bg-gray-200"
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  return (
    <Card className="w-full max-w-3xl mx-auto border-0 shadow-xl bg-white/95 backdrop-blur">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-bold text-gray-800">
          Configura tu Perfil
        </CardTitle>
        <CardDescription>
          Completa estos datos para personalizar tu plan
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        <StepIndicator />

        <form onSubmit={handleSubmit}>
          {/* Paso 1: Datos personales */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Nombre" name="first_name" required error={errors.first_name}>
                  <Input
                    id="first_name"
                    placeholder="Tu nombre"
                    className={cn(errors.first_name && "border-red-500")}
                    disabled={!!userData?.first_name}
                    value={formState.first_name}
                    onChange={handleInputChange('first_name')}
                  />
                </FormField>

                <FormField label="Apellidos" name="last_name" required error={errors.last_name}>
                  <Input
                    id="last_name"
                    placeholder="Tus apellidos"
                    className={cn(errors.last_name && "border-red-500")}
                    disabled={!!userData?.last_name}
                    value={formState.last_name}
                    onChange={handleInputChange('last_name')}
                  />
                </FormField>
              </div>

              <FormField label="Email" name="email" required error={errors.email}>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  className={cn(errors.email && "border-red-500")}
                  disabled={!!userData?.email}
                  value={formState.email}
                  onChange={handleInputChange('email')}
                />
              </FormField>

              <FormField label="Teléfono" name="phone_number" required error={errors.phone_number}>
                <Input
                  id="phone_number"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="612345678"
                  maxLength={9}
                  className={cn(errors.phone_number && "border-red-500")}
                  value={formState.phone_number}
                  onChange={handlePhoneChange}
                />
                <p className="text-xs text-gray-500 mt-1">Ingresa 9 dígitos sin espacios ni guiones</p>
              </FormField>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Fecha de nacimiento" name="birth_date" required error={errors.birth_date}>
                  <div className="relative">
                    <Input
                      ref={dateInputRef}
                      id="birth_date"
                      type="date"
                      className={cn(
                        errors.birth_date && "border-red-500",
                        "w-full cursor-pointer"
                      )}
                      max={new Date(new Date().setFullYear(new Date().getFullYear() - 13)).toISOString().split('T')[0]}
                      min={new Date(new Date().setFullYear(new Date().getFullYear() - 120)).toISOString().split('T')[0]}
                      value={formState.birth_date}
                      onChange={handleInputChange('birth_date')}
                      onClick={openDatePicker}
                    />
                    {/* Botón de calendario clickeable */}
                    <button
                      type="button"
                      aria-label="Abrir calendario"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                      onClick={openDatePicker}
                      tabIndex={-1}
                    >
                      <Calendar className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </FormField>

                <FormField label="Género" name="gender" required error={errors.gender}>
                  <div className="flex gap-2">
                    {[
                      { value: 'male', label: '👨 Masculino' },
                      { value: 'female', label: '👩 Femenino' },
                      { value: 'other', label: '🧑 Otro' },
                    ].map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSelectChange('gender', option.value as any)}
                        className={cn(
                          "flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all",
                          formState.gender === option.value
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </FormField>
              </div>
            </div>
          )}

          {/* Paso 2: Datos físicos y actividad */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="Altura (cm)" name="height" required error={errors.height}>
                  <Input
                    id="height"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="170"
                    maxLength={3}
                    className={cn(errors.height && "border-red-500")}
                    value={formState.height}
                    onChange={handleInputChange('height')}
                  />
                </FormField>

                <FormField label="Peso actual (kg)" name="weight" required error={errors.weight}>
                  <Input
                    id="weight"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    placeholder="70"
                    maxLength={5}
                    className={cn(errors.weight && "border-red-500")}
                    value={formState.weight}
                    onChange={handleInputChange('weight')}
                  />
                </FormField>

                <FormField label="Peso objetivo (kg)" name="target_weight" error={errors.target_weight}>
                  <Input
                    id="target_weight"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    placeholder="65"
                    maxLength={5}
                    className={cn(errors.target_weight && "border-red-500")}
                    value={formState.target_weight}
                    onChange={handleInputChange('target_weight')}
                  />
                </FormField>
              </div>

              <FormField label="Nivel de actividad diaria" name="activity_level" required error={errors.activity_level}>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {[
                    { value: 'sedentary', label: 'Sedentario', emoji: '🪑' },
                    { value: 'light', label: 'Ligero', emoji: '🚶' },
                    { value: 'moderate', label: 'Moderado', emoji: '🏃' },
                    { value: 'active', label: 'Activo', emoji: '💪' },
                    { value: 'very_active', label: 'Muy activo', emoji: '🏆' },
                  ].map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelectChange('activity_level', option.value as any)}
                      className={cn(
                        "py-3 px-2 rounded-lg border-2 text-center transition-all",
                        formState.activity_level === option.value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                      )}
                    >
                      <div className="text-2xl mb-1">{option.emoji}</div>
                      <div className="text-xs font-medium">{option.label}</div>
                    </button>
                  ))}
                </div>
              </FormField>

              <FormField label="¿Qué días puedes entrenar?" name="training_days" required error={errors.training_days}>
                <div className="grid grid-cols-7 gap-2">
                  {[
                    { num: 1, short: 'L', full: 'Lun' },
                    { num: 2, short: 'M', full: 'Mar' },
                    { num: 3, short: 'X', full: 'Mié' },
                    { num: 4, short: 'J', full: 'Jue' },
                    { num: 5, short: 'V', full: 'Vie' },
                    { num: 6, short: 'S', full: 'Sáb' },
                    { num: 7, short: 'D', full: 'Dom' },
                  ].map(day => {
                    const isSelected = formState.training_days.includes(day.num);
                    return (
                      <button
                        key={day.num}
                        type="button"
                        onClick={() => toggleTrainingDay(day.num)}
                        className={cn(
                          "py-3 rounded-lg border-2 transition-all",
                          isSelected
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                        )}
                      >
                        <div className="text-lg font-bold">{day.short}</div>
                        <div className="text-xs hidden md:block">{day.full}</div>
                      </button>
                    );
                  })}
                </div>
                {formState.training_days.length > 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    {formState.training_days.length} día{formState.training_days.length !== 1 ? 's' : ''} seleccionado{formState.training_days.length !== 1 ? 's' : ''}
                  </p>
                )}
              </FormField>

              <FormField label="¿Dónde prefieres entrenar?" name="training_location" required error={errors.training_location}>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: 'home', label: 'En casa', emoji: '🏠', desc: 'Ejercicios sin equipamiento' },
                    { value: 'gym', label: 'Gimnasio', emoji: '🏋️', desc: 'Con máquinas y pesas' },
                  ].map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelectChange('training_location', option.value as any)}
                      className={cn(
                        "py-4 px-4 rounded-xl border-2 text-left transition-all",
                        formState.training_location === option.value
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      )}
                    >
                      <div className="text-3xl mb-2">{option.emoji}</div>
                      <div className="font-semibold text-gray-800">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </FormField>
            </div>
          )}

          {/* Paso 3: Objetivos */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <FormField label="¿Cuál es tu objetivo principal?" name="main_goal" required error={errors.main_goal}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { value: 'lose_weight', label: 'Perder peso', emoji: '🔥', desc: 'Quemar grasa y definir' },
                    { value: 'gain_muscle', label: 'Ganar músculo', emoji: '💪', desc: 'Aumentar masa muscular' },
                    { value: 'body_recomposition', label: 'Recomposición', emoji: '⚖️', desc: 'Perder grasa y ganar músculo' },
                  ].map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelectChange('main_goal', option.value as any)}
                      className={cn(
                        "py-6 px-4 rounded-xl border-2 text-center transition-all",
                        formState.main_goal === option.value
                          ? "border-green-500 bg-green-50 ring-2 ring-green-200"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      )}
                    >
                      <div className="text-4xl mb-2">{option.emoji}</div>
                      <div className="font-semibold text-gray-800">{option.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </FormField>

              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <p className="text-sm font-medium text-gray-700">
                  Información adicional (opcional)
                </p>

                <FormField label="Alergias o intolerancias alimentarias" name="allergies" error={errors.allergies}>
                  <Textarea
                    id="allergies"
                    placeholder="Ej: Intolerancia a la lactosa, alergia a frutos secos..."
                    rows={2}
                    className="resize-none"
                    value={formState.allergies}
                    onChange={handleInputChange('allergies')}
                  />
                </FormField>

                <FormField label="Condiciones médicas" name="medical_conditions" error={errors.medical_conditions}>
                  <Textarea
                    id="medical_conditions"
                    placeholder="Ej: Diabetes, hipotiroidismo, lesiones previas..."
                    rows={2}
                    className="resize-none"
                    value={formState.medical_conditions}
                    onChange={handleInputChange('medical_conditions')}
                  />
                </FormField>

                <FormField label="Alimentos que no te gustan" name="disliked_foods" error={errors.disliked_foods}>
                  <Textarea
                    id="disliked_foods"
                    placeholder="Ej: Brócoli, mariscos, hígado..."
                    rows={2}
                    className="resize-none"
                    value={formState.disliked_foods}
                    onChange={handleInputChange('disliked_foods')}
                  />
                </FormField>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>

            {currentStep < 3 ? (
              <Button
                type="button"
                onClick={handleNext}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isLoading}
                className="gap-2 bg-green-600 hover:bg-green-700 min-w-[200px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Completar Configuración
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export const InitialRegistrationForm = InitialRegistrationFormComponent;
