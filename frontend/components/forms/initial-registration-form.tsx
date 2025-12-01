"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo, ChangeEvent, FormEvent, ReactNode } from 'react';
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
  const focusedInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const [formData, setFormData] = useState<FormData>({
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

  // Memoizar userData para evitar re-renders innecesarios
  const stableUserData = useMemo(() => userData, [
    userData?.first_name,
    userData?.last_name,
    userData?.email,
    userData?.phone_number,
  ]);

  // Cargar datos del usuario si existen (solo una vez al montar)
  const initialDataLoadedRef = useRef(false);
  useEffect(() => {
    if (stableUserData && !initialDataLoadedRef.current) {
      setFormData((prev: FormData) => ({
        ...prev,
        first_name: stableUserData.first_name || prev.first_name,
        last_name: stableUserData.last_name || prev.last_name,
        email: stableUserData.email || prev.email,
        phone_number: stableUserData.phone_number || prev.phone_number,
      }));
      initialDataLoadedRef.current = true;
    }
  }, [stableUserData]);

  // Memoizar updateField para evitar re-renders innecesarios
  const updateField = useCallback((field: keyof FormData, value: string | number | number[]) => {
    // Guardar el elemento activo antes de actualizar el estado
    const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
    const selectionStart = activeElement?.selectionStart;
    const selectionEnd = activeElement?.selectionEnd;
    
    setFormData((prev: FormData) => {
      // Solo actualizar si el valor realmente cambió
      if (prev[field] === value) {
        return prev;
      }
      return { ...prev, [field]: value };
    });
    // Limpiar error del campo cuando se modifica (solo si existe)
    setErrors((prev: Record<string, string>) => {
      if (prev[field]) {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      }
      return prev; // Retornar el mismo objeto si no hay cambios
    });
    
    // Restaurar el foco y la selección después del re-render
    requestAnimationFrame(() => {
      if (activeElement && activeElement.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA') {
        activeElement.focus();
        if (selectionStart !== null && selectionEnd !== null && activeElement.setSelectionRange) {
          activeElement.setSelectionRange(selectionStart, selectionEnd);
        }
      }
    });
  }, []);

  // Handlers memoizados para cada campo de texto
  const handleFirstNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    updateField('first_name', e.target.value);
  }, [updateField]);

  const handleLastNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    updateField('last_name', e.target.value);
  }, [updateField]);

  const handleEmailChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    updateField('email', e.target.value);
  }, [updateField]);

  const handlePhoneChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    updateField('phone_number', e.target.value);
  }, [updateField]);

  const handleBirthDateChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    updateField('birth_date', e.target.value);
  }, [updateField]);

  const handleHeightChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    updateField('height', value);
  }, [updateField]);

  const handleWeightChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    updateField('weight', value);
  }, [updateField]);

  const handleTargetWeightChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    updateField('target_weight', value);
  }, [updateField]);

  const handleAllergiesChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    updateField('allergies', e.target.value);
  }, [updateField]);

  const handleMedicalConditionsChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    updateField('medical_conditions', e.target.value);
  }, [updateField]);

  const handleDislikedFoodsChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    updateField('disliked_foods', e.target.value);
  }, [updateField]);

  const validateStep = (step: number): boolean => {
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
    const current = formData.training_days;
    const newDays = current.includes(day)
      ? current.filter((d: number) => d !== day)
      : [...current, day].sort((a: number, b: number) => a - b);
    updateField('training_days', newDays);
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

  // Componente de campo de entrada con error (memoizado para evitar re-renders)
  const FormField = React.memo(({
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
  ));
  FormField.displayName = 'FormField';

  // Renderizar paso 1: Datos personales
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Nombre" name="first_name" required error={errors.first_name}>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={handleFirstNameChange}
            placeholder="Tu nombre"
            className={cn(errors.first_name && "border-red-500")}
            disabled={!!stableUserData?.first_name}
          />
        </FormField>

        <FormField label="Apellidos" name="last_name" required error={errors.last_name}>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={handleLastNameChange}
            placeholder="Tus apellidos"
            className={cn(errors.last_name && "border-red-500")}
            disabled={!!stableUserData?.last_name}
          />
        </FormField>
      </div>

      <FormField label="Email" name="email" required error={errors.email}>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={handleEmailChange}
          placeholder="tu@email.com"
          className={cn(errors.email && "border-red-500")}
          disabled={!!stableUserData?.email}
        />
      </FormField>

      <FormField label="Teléfono" name="phone_number" error={errors.phone_number}>
        <Input
          id="phone_number"
          type="tel"
          value={formData.phone_number}
          onChange={handlePhoneChange}
          placeholder="+34 612 345 678"
        />
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Fecha de nacimiento" name="birth_date" required error={errors.birth_date}>
          <div className="relative">
            <Input
              id="birth_date"
              type="date"
              value={formData.birth_date}
              onChange={handleBirthDateChange}
              className={cn(errors.birth_date && "border-red-500")}
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 13)).toISOString().split('T')[0]}
              min={new Date(new Date().setFullYear(new Date().getFullYear() - 120)).toISOString().split('T')[0]}
            />
            {formData.birth_date && (
              <p className="text-xs text-gray-500 mt-1">
                Edad: {calculateAge(formData.birth_date)} años
              </p>
            )}
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
                onClick={() => updateField('gender', option.value)}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all",
                  formData.gender === option.value
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
            id="height"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={formData.height}
            onChange={handleHeightChange}
            placeholder="170"
            maxLength={3}
            className={cn(errors.height && "border-red-500")}
          />
          {formData.height && Number(formData.height) >= 100 && Number(formData.height) <= 250 && (
            <p className="text-xs text-gray-500 mt-1">
              {(Number(formData.height) / 100).toFixed(2)} m
            </p>
          )}
        </FormField>

        <FormField label="Peso actual (kg)" name="weight" required error={errors.weight}>
          <Input
            id="weight"
            type="text"
            inputMode="decimal"
            pattern="[0-9]*\.?[0-9]*"
            value={formData.weight}
            onChange={handleWeightChange}
            placeholder="70"
            maxLength={5}
            className={cn(errors.weight && "border-red-500")}
          />
          {formData.weight && Number(formData.weight) >= 30 && Number(formData.weight) <= 300 && (
            <p className="text-xs text-gray-500 mt-1">
              IMC: {formData.height && Number(formData.height) >= 100
                ? ((Number(formData.weight) / Math.pow(Number(formData.height) / 100, 2)).toFixed(1))
                : '...'
              }
            </p>
          )}
        </FormField>

        <FormField label="Peso objetivo (kg)" name="target_weight" error={errors.target_weight}>
          <Input
            id="target_weight"
            type="text"
            inputMode="decimal"
            pattern="[0-9]*\.?[0-9]*"
            value={formData.target_weight}
            onChange={handleTargetWeightChange}
            placeholder="65"
            maxLength={5}
            className={cn(errors.target_weight && "border-red-500")}
          />
          {formData.target_weight && formData.weight && (
            <p className="text-xs text-gray-500 mt-1">
              {Number(formData.target_weight) < Number(formData.weight)
                ? `Perder ${(Number(formData.weight) - Number(formData.target_weight)).toFixed(1)} kg`
                : Number(formData.target_weight) > Number(formData.weight)
                  ? `Ganar ${(Number(formData.target_weight) - Number(formData.weight)).toFixed(1)} kg`
                  : 'Mantener peso'
              }
            </p>
          )}
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
              onClick={() => updateField('activity_level', option.value)}
              className={cn(
                "py-3 px-2 rounded-lg border-2 text-center transition-all",
                formData.activity_level === option.value
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
            const isSelected = formData.training_days.includes(day.num);
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
        {formData.training_days.length > 0 && (
          <p className="text-sm text-gray-500 mt-2">
            {formData.training_days.length} día{formData.training_days.length !== 1 ? 's' : ''} seleccionado{formData.training_days.length !== 1 ? 's' : ''}
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
              onClick={() => updateField('training_location', option.value)}
              className={cn(
                "py-4 px-4 rounded-xl border-2 text-left transition-all",
                formData.training_location === option.value
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
              onClick={() => updateField('main_goal', option.value)}
              className={cn(
                "py-6 px-4 rounded-xl border-2 text-center transition-all",
                formData.main_goal === option.value
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
            value={formData.allergies}
            onChange={handleAllergiesChange}
            placeholder="Ej: Intolerancia a la lactosa, alergia a frutos secos..."
            rows={2}
            className="resize-none"
          />
        </FormField>

        <FormField label="Condiciones médicas" name="medical_conditions" error={errors.medical_conditions}>
          <Textarea
            id="medical_conditions"
            value={formData.medical_conditions}
            onChange={handleMedicalConditionsChange}
            placeholder="Ej: Diabetes, hipotiroidismo, lesiones previas..."
            rows={2}
            className="resize-none"
          />
        </FormField>

        <FormField label="Alimentos que no te gustan" name="disliked_foods" error={errors.disliked_foods}>
          <Textarea
            id="disliked_foods"
            value={formData.disliked_foods}
            onChange={handleDislikedFoodsChange}
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

// Memoizar el componente completo para evitar re-renders innecesarios
export const InitialRegistrationForm = React.memo(InitialRegistrationFormComponent, (prevProps, nextProps) => {
  // Solo re-renderizar si cambian props importantes
  return (
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.userData?.first_name === nextProps.userData?.first_name &&
    prevProps.userData?.last_name === nextProps.userData?.last_name &&
    prevProps.userData?.email === nextProps.userData?.email &&
    prevProps.userData?.phone_number === nextProps.userData?.phone_number
  );
});
