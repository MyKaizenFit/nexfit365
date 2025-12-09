"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo, FormEvent, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ChevronLeft, ChevronRight, Check, User, Activity, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

// Tipos para el formulario
interface FormData {
  // Paso 1: Datos personales
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  birth_date: string;
  gender: 'male' | 'female' | 'other' | '';

  // Paso 2: Datos físicos y actividad
  height: string;
  weight: string;
  target_weight: string;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | '';
  training_days: number[];
  training_location: 'home' | 'gym' | '';

  // Paso 3: Objetivos y preferencias
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

function InitialRegistrationFormComponent({
  onComplete,
  isLoading = false,
  userData
}: InitialRegistrationFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Usar refs para campos de texto para evitar re-renders
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const birthDateRef = useRef<HTMLInputElement>(null);
  const heightRef = useRef<HTMLInputElement>(null);
  const weightRef = useRef<HTMLInputElement>(null);
  const targetWeightRef = useRef<HTMLInputElement>(null);
  const allergiesRef = useRef<HTMLTextAreaElement>(null);
  const medicalConditionsRef = useRef<HTMLTextAreaElement>(null);
  const dislikedFoodsRef = useRef<HTMLTextAreaElement>(null);

  // Solo usar state para campos que no son texto (selects, radio, etc)
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | ''>('');
  const [trainingDays, setTrainingDays] = useState<number[]>([]);
  const [trainingLocation, setTrainingLocation] = useState<'home' | 'gym' | ''>('');
  const [mainGoal, setMainGoal] = useState<'lose_weight' | 'gain_muscle' | 'body_recomposition' | ''>('');

  // Cargar datos del usuario solo una vez
  const initialDataLoadedRef = useRef(false);
  useEffect(() => {
    if (userData && !initialDataLoadedRef.current) {
      if (firstNameRef.current && userData.first_name) firstNameRef.current.value = userData.first_name;
      if (lastNameRef.current && userData.last_name) lastNameRef.current.value = userData.last_name;
      if (emailRef.current && userData.email) emailRef.current.value = userData.email;
      if (phoneRef.current && userData.phone_number) phoneRef.current.value = userData.phone_number;
      initialDataLoadedRef.current = true;
    }
  }, [userData]);

  const getFormData = (): FormData => {
    return {
      first_name: firstNameRef.current?.value || '',
      last_name: lastNameRef.current?.value || '',
      email: emailRef.current?.value || '',
      phone_number: phoneRef.current?.value || '',
      birth_date: birthDateRef.current?.value || '',
      gender,
      height: heightRef.current?.value || '',
      weight: weightRef.current?.value || '',
      target_weight: targetWeightRef.current?.value || '',
      activity_level: activityLevel,
      training_days: trainingDays,
      training_location: trainingLocation,
      main_goal: mainGoal,
      allergies: allergiesRef.current?.value || '',
      medical_conditions: medicalConditionsRef.current?.value || '',
      disliked_foods: dislikedFoodsRef.current?.value || '',
    };
  };

  const validateStep = (step: number): boolean => {
    const formData = getFormData();
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.first_name.trim()) newErrors.first_name = 'El nombre es requerido';
      if (!formData.last_name.trim()) newErrors.last_name = 'El apellido es requerido';
      if (!formData.email.trim()) newErrors.email = 'El email es requerido';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Email inválido';
      }
      if (!formData.birth_date) newErrors.birth_date = 'La fecha de nacimiento es requerida';
      else {
        const age = calculateAge(formData.birth_date);
        if (age < 13 || age > 120) newErrors.birth_date = 'Debes tener entre 13 y 120 años';
      }
      if (!formData.gender) newErrors.gender = 'Selecciona tu género';
    }

    if (step === 2) {
      const height = Number(formData.height);
      const weight = Number(formData.weight);
      const targetWeight = formData.target_weight ? Number(formData.target_weight) : null;

      if (!formData.height || isNaN(height) || height < 100 || height > 250) {
        newErrors.height = 'Altura inválida (100-250 cm)';
      }
      if (!formData.weight || isNaN(weight) || weight < 30 || weight > 300) {
        newErrors.weight = 'Peso inválido (30-300 kg)';
      }
      if (targetWeight !== null && (isNaN(targetWeight) || targetWeight < 30 || targetWeight > 300)) {
        newErrors.target_weight = 'Peso objetivo inválido (30-300 kg)';
      }
      if (!formData.activity_level) newErrors.activity_level = 'Selecciona tu nivel de actividad';
      if (formData.training_days.length === 0) newErrors.training_days = 'Selecciona al menos un día';
      if (!formData.training_location) newErrors.training_location = 'Selecciona dónde entrenas';
    }

    if (step === 3) {
      if (!formData.main_goal) newErrors.main_goal = 'Selecciona tu objetivo principal';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev: number) => Math.min(prev + 1, 3));
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev: number) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateStep(3)) return;

    const formData = getFormData();

    // Preparar datos para enviar
    const submitData = {
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      email: formData.email.trim(),
      phone_number: formData.phone_number.trim() || undefined,
      birth_date: formData.birth_date,
      gender: formData.gender,
      height: Number(formData.height),
      weight: Number(formData.weight),
      target_weight: formData.target_weight ? Number(formData.target_weight) : undefined,
      activity_level: formData.activity_level,
      training_days: formData.training_days,
      training_days_per_week: formData.training_days.length,
      training_location: formData.training_location,
      main_goal: formData.main_goal,
      allergies: formData.allergies.trim() || undefined,
      medical_conditions: formData.medical_conditions.trim() || undefined,
      disliked_foods: formData.disliked_foods.trim() || undefined,
    };

    try {
      await onComplete(submitData);
    } catch (error) {
      console.error('Error al enviar formulario:', error);
    }
  };

  const toggleTrainingDay = (day: number) => {
    setTrainingDays(current => 
      current.includes(day)
        ? current.filter(d => d !== day)
        : [...current, day].sort((a, b) => a - b)
    );
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

  // Componente de campo de entrada con error
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
    children: ReactNode;
    error?: string;
  }): JSX.Element => (
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

  // Renderizar paso 1: Datos personales
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Nombre" name="first_name" required error={errors.first_name}>
          <Input
            ref={firstNameRef}
            id="first_name"
            placeholder="Tu nombre"
            className={cn(errors.first_name && "border-red-500")}
            disabled={!!userData?.first_name}
            defaultValue={userData?.first_name || ''}
          />
        </FormField>

        <FormField label="Apellidos" name="last_name" required error={errors.last_name}>
          <Input
            ref={lastNameRef}
            id="last_name"
            placeholder="Tus apellidos"
            className={cn(errors.last_name && "border-red-500")}
            disabled={!!userData?.last_name}
            defaultValue={userData?.last_name || ''}
          />
        </FormField>
      </div>

      <FormField label="Email" name="email" required error={errors.email}>
        <Input
          ref={emailRef}
          id="email"
          type="email"
          placeholder="tu@email.com"
          className={cn(errors.email && "border-red-500")}
          disabled={!!userData?.email}
          defaultValue={userData?.email || ''}
        />
      </FormField>

      <FormField label="Teléfono" name="phone_number" error={errors.phone_number}>
        <Input
          ref={phoneRef}
          id="phone_number"
          type="tel"
          placeholder="+34 612 345 678"
          defaultValue={userData?.phone_number || ''}
        />
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Fecha de nacimiento" name="birth_date" required error={errors.birth_date}>
          <Input
            ref={birthDateRef}
            id="birth_date"
            type="date"
            className={cn(errors.birth_date && "border-red-500")}
            max={new Date(new Date().setFullYear(new Date().getFullYear() - 13)).toISOString().split('T')[0]}
            min={new Date(new Date().setFullYear(new Date().getFullYear() - 120)).toISOString().split('T')[0]}
          />
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
                onClick={() => setGender(option.value as any)}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all",
                  gender === option.value
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
  );

  // Renderizar paso 2: Datos físicos y actividad
  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField label="Altura (cm)" name="height" required error={errors.height}>
          <Input
            ref={heightRef}
            id="height"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="170"
            maxLength={3}
            className={cn(errors.height && "border-red-500")}
          />
        </FormField>

        <FormField label="Peso actual (kg)" name="weight" required error={errors.weight}>
          <Input
            ref={weightRef}
            id="weight"
            type="text"
            inputMode="decimal"
            pattern="[0-9]*\.?[0-9]*"
            placeholder="70"
            maxLength={5}
            className={cn(errors.weight && "border-red-500")}
          />
        </FormField>

        <FormField label="Peso objetivo (kg)" name="target_weight" error={errors.target_weight}>
          <Input
            ref={targetWeightRef}
            id="target_weight"
            type="text"
            inputMode="decimal"
            pattern="[0-9]*\.?[0-9]*"
            placeholder="65"
            maxLength={5}
            className={cn(errors.target_weight && "border-red-500")}
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
              onClick={() => setActivityLevel(option.value as any)}
              className={cn(
                "py-3 px-2 rounded-lg border-2 text-center transition-all",
                activityLevel === option.value
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
            const isSelected = trainingDays.includes(day.num);
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
        {trainingDays.length > 0 && (
          <p className="text-sm text-gray-500 mt-2">
            {trainingDays.length} día{trainingDays.length !== 1 ? 's' : ''} seleccionado{trainingDays.length !== 1 ? 's' : ''}
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
              onClick={() => setTrainingLocation(option.value as any)}
              className={cn(
                "py-4 px-4 rounded-xl border-2 text-left transition-all",
                trainingLocation === option.value
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
  );

  // Renderizar paso 3: Objetivos
  const renderStep3 = () => (
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
              onClick={() => setMainGoal(option.value as any)}
              className={cn(
                "py-6 px-4 rounded-xl border-2 text-center transition-all",
                mainGoal === option.value
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
            ref={allergiesRef}
            id="allergies"
            placeholder="Ej: Intolerancia a la lactosa, alergia a frutos secos..."
            rows={2}
            className="resize-none"
          />
        </FormField>

        <FormField label="Condiciones médicas" name="medical_conditions" error={errors.medical_conditions}>
          <Textarea
            ref={medicalConditionsRef}
            id="medical_conditions"
            placeholder="Ej: Diabetes, hipotiroidismo, lesiones previas..."
            rows={2}
            className="resize-none"
          />
        </FormField>

        <FormField label="Alimentos que no te gustan" name="disliked_foods" error={errors.disliked_foods}>
          <Textarea
            ref={dislikedFoodsRef}
            id="disliked_foods"
            placeholder="Ej: Brócoli, mariscos, hígado..."
            rows={2}
            className="resize-none"
          />
        </FormField>
      </div>
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
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

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

// No necesitamos memo ya que usamos refs
export const InitialRegistrationForm = InitialRegistrationFormComponent;
