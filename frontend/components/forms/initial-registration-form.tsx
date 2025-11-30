"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// Esquema de validación - Formulario de inicio con 16 campos
const initialRegistrationSchema = z.object({
  // 1. Nombre y apellidos
  first_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  
  // 2. Correo electrónico
  email: z.string().email('Email inválido'),
  
  // 3. Código de país
  country_code: z.string().min(1, 'Selecciona un código de país'),
  
  // 4. Número de teléfono
  phone_number: z.string()
    .min(8, 'El número de teléfono debe tener al menos 8 dígitos')
    .regex(/^\d+$/, 'El número de teléfono solo puede contener números'),
  
  // 5. Fecha de nacimiento
  birth_date: z.string().refine((val) => {
    if (!val) return false;
    const date = new Date(val);
    const today = new Date();
    const age = today.getFullYear() - date.getFullYear() - 
      (today.getMonth() < date.getMonth() || (today.getMonth() === date.getMonth() && today.getDate() < date.getDate()) ? 1 : 0);
    return age >= 13 && age <= 120;
  }, 'Debes tener entre 13 y 120 años'),
  
  // 6. Sexo
  gender: z.enum(['male', 'female', 'other'], {
    required_error: 'Selecciona tu sexo',
  }),
  
  // 7. Altura (en cm)
  height: z.number().min(50, 'La altura mínima es 50 cm').max(250, 'La altura máxima es 250 cm'),
  
  // 8. Peso actual (en kg)
  weight: z.number().min(20, 'El peso mínimo es 20 kg').max(300, 'El peso máximo es 300 kg'),
  
  // 8b. Peso objetivo (en kg) - opcional
  target_weight: z.number().min(20, 'El peso objetivo mínimo es 20 kg').max(300, 'El peso objetivo máximo es 300 kg').optional(),
  
  // 9. Nivel de actividad diaria
  activity_level: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active'], {
    required_error: 'Selecciona tu nivel de actividad',
  }),
  
  // 10. Días de entrenamiento por semana (calculado automáticamente)
  training_days_per_week: z.number().min(1, 'Mínimo 1 día').max(7, 'Máximo 7 días').optional(),
  // 10b. Días específicos de entrenamiento
  training_days: z.array(z.number().min(1).max(7)).min(1, 'Debes seleccionar al menos un día'),
  
  // 11. Dónde prefieres entrenar
  training_location: z.enum(['home', 'gym'], {
    required_error: 'Selecciona dónde prefieres entrenar',
  }),
  
  // 12. Intolerancias o alergias alimentarias
  allergies: z.string().optional(),
  
  // 13. Problemas hormonales o metabólicos
  medical_conditions: z.string().optional(),
  
  // 14. Alimentos que no te gustan
  disliked_foods: z.string().optional(),
  
  // 15. Objetivo principal
  main_goal: z.enum(['lose_weight', 'gain_muscle', 'body_recomposition'], {
    required_error: 'Selecciona tu objetivo principal',
  }),
  
  // 16. Qué te ha impedido lograrlo hasta ahora
  previous_obstacles: z.string().optional(),
  
  // 17. Lesiones o intervenciones médicas importantes
  injuries_or_medical_issues: z.string().optional(),
});

type InitialRegistrationFormData = z.infer<typeof initialRegistrationSchema>;

interface InitialRegistrationFormProps {
  onComplete: (data: InitialRegistrationFormData) => void;
  initialData?: Partial<InitialRegistrationFormData>;
  isLoading?: boolean;
  userData?: Partial<InitialRegistrationFormData> | null;
}

const activityLevelOptions = [
  { value: 'sedentary', label: 'Sedentario' },
  { value: 'light', label: 'Ligero' },
  { value: 'moderate', label: 'Moderado' },
  { value: 'active', label: 'Activo' },
  { value: 'very_active', label: 'Muy activo' },
];

const genderOptions = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Femenino' },
  { value: 'other', label: 'Otro' },
];

const trainingLocationOptions = [
  { value: 'home', label: 'Casa' },
  { value: 'gym', label: 'Gimnasio' },
];

const mainGoalOptions = [
  { value: 'lose_weight', label: 'Perder peso o Definir' },
  { value: 'gain_muscle', label: 'Ganar músculo o Subir de peso' },
  { value: 'body_recomposition', label: 'Recomposición corporal' },
];

export function InitialRegistrationForm({ 
  onComplete, 
  initialData = {}, 
  isLoading = false,
  userData 
}: InitialRegistrationFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();
  
  // Combinar datos del usuario con datos iniciales (solo una vez al montar)
  const combinedData = useMemo(() => {
    const data = { ...initialData, ...userData };
    return data;
  }, [
    initialData?.first_name,
    initialData?.last_name,
    initialData?.email,
    userData?.first_name,
    userData?.last_name,
    userData?.email,
    userData?.phone_number
  ]);

  const form = useForm<InitialRegistrationFormData>({
    resolver: zodResolver(initialRegistrationSchema),
    defaultValues: {
      first_name: combinedData.first_name || '',
      last_name: combinedData.last_name || '',
      email: combinedData.email || '',
      country_code: combinedData.country_code || '+34',
      phone_number: combinedData.phone_number || '',
      birth_date: combinedData.birth_date || (combinedData.age ? 
        // Si hay age pero no birth_date, calcular una fecha aproximada (hoy - age años)
        (() => {
          const today = new Date();
          const approxDate = new Date(today.getFullYear() - (combinedData.age as number), today.getMonth(), today.getDate());
          return approxDate.toISOString().split('T')[0];
        })() : undefined),
      training_days: combinedData.training_days || 
        (combinedData.training_days_per_week ? 
          // Si hay training_days_per_week pero no training_days, usar días por defecto
          [1, 3, 5].slice(0, combinedData.training_days_per_week as number) : undefined),
      gender: combinedData.gender || undefined,
      height: combinedData.height || undefined,
      weight: combinedData.weight || undefined,
      activity_level: combinedData.activity_level || undefined,
      training_days_per_week: combinedData.training_days_per_week || undefined,
      training_location: combinedData.training_location || undefined,
      allergies: combinedData.allergies || '',
      medical_conditions: combinedData.medical_conditions || '',
      disliked_foods: combinedData.disliked_foods || '',
      main_goal: combinedData.main_goal || undefined,
      previous_obstacles: combinedData.previous_obstacles || '',
      injuries_or_medical_issues: combinedData.injuries_or_medical_issues || '',
    },
  });

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const nextStep = async () => {
    // Validar campos del paso actual antes de avanzar
    const currentStepFields = getCurrentStepFields();
    const isValid = await validateCurrentStep(currentStepFields);
    
    if (isValid && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else if (!isValid) {
      toast({
        title: "Campos requeridos",
        description: "Por favor, completa todos los campos obligatorios antes de continuar.",
        variant: "destructive",
      });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Obtener los campos del paso actual
  const getCurrentStepFields = () => {
    switch (currentStep) {
      case 1:
        return ['first_name', 'last_name', 'email', 'country_code', 'phone_number'];
      case 2:
        return ['birth_date', 'gender', 'height', 'weight'];
      case 3:
        return ['activity_level', 'training_days', 'training_location'];
      case 4:
        return ['main_goal'];
      default:
        return [];
    }
  };

  // Validar campos del paso actual
  const validateCurrentStep = async (fields: string[]) => {
    // Trigger validation for current step fields
    const validationResult = await form.trigger(fields as any);
    
    // Verificar campos específicos según el paso
    const errors = form.formState.errors;
    const hasErrors = fields.some(field => errors[field as keyof typeof errors]);
    
    if (hasErrors) {
      console.log('Errores de validación encontrados:', errors);
    }
    
    return validationResult && !hasErrors;
  };

  // Verificar si el paso actual es válido
  const isCurrentStepValid = () => {
    const currentFields = getCurrentStepFields();
    const errors = form.formState.errors;
    const values = form.getValues();
    
    // Verificar que no haya errores Y que los valores estén presentes
    const hasErrors = currentFields.some(field => errors[field as keyof typeof errors]);
    if (hasErrors) {
      return false;
    }
    
    // Verificar que los valores requeridos estén presentes
    const missingValues = currentFields.filter(field => {
      const value = values[field as keyof typeof values];
      // Para arrays, verificar que tengan al menos un elemento
      if (Array.isArray(value)) {
        return value.length === 0;
      }
      // Para otros valores, verificar que no sean undefined, null o string vacío
      return value === undefined || value === null || value === '';
    });
    
    if (missingValues.length > 0) {
      console.log('🔍 Campos sin valor en el paso actual:', missingValues);
      return false;
    }
    
    return true;
  };

  const onSubmit = async (data: InitialRegistrationFormData) => {
    console.log('✅ onSubmit llamado con datos:', data);
    
    // Validar que todos los campos requeridos estén presentes
    const requiredFields = ['first_name', 'last_name', 'email', 'birth_date', 'gender', 'height', 'weight', 'activity_level', 'training_days', 'training_location', 'main_goal'];
    const missingFields = requiredFields.filter(field => {
      const value = data[field as keyof InitialRegistrationFormData];
      return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
    });
    
    if (missingFields.length > 0) {
      console.error('❌ Campos faltantes:', missingFields);
      console.error('❌ Datos recibidos:', data);
      toast({
        title: "Campos requeridos faltantes",
        description: `Por favor completa: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }
    
    // Calcular training_days_per_week desde training_days si no está presente
    if (data.training_days && data.training_days.length > 0 && !data.training_days_per_week) {
      data.training_days_per_week = data.training_days.length;
    }
    
    console.log('✅ Datos validados, llamando a onComplete:', data);
    console.log('✅ onComplete es una función?', typeof onComplete);
    
    try {
      if (typeof onComplete !== 'function') {
        console.error('❌ onComplete no es una función:', onComplete);
        toast({
          title: "Error",
          description: "Error interno: función de callback no disponible",
          variant: "destructive",
        });
        return;
      }
      
      await onComplete(data);
      console.log('✅ onComplete ejecutado exitosamente');
    } catch (error) {
      console.error('❌ Error en onComplete:', error);
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack available');
      toast({
        title: "Error al guardar",
        description: error instanceof Error ? error.message : "Error desconocido al guardar los datos",
        variant: "destructive",
      });
    }
  };

  // Lista de códigos de país (simplificada y ordenada)
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
  ];

  // Detectar ubicación del usuario para establecer código de país por defecto
  React.useEffect(() => {
    const detectUserLocation = async () => {
      try {
        // Usar la API de geolocalización del navegador
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        // Mapear códigos de país a códigos de teléfono
        const countryCodeMap: { [key: string]: string } = {
          'ES': '+34',
          'US': '+1',
          'GB': '+44',
          'FR': '+33',
          'DE': '+49',
          'IT': '+39',
          'NL': '+31',
          'PT': '+351',
          'BE': '+32',
          'CH': '+41',
          'AT': '+43',
          'DK': '+45',
          'SE': '+46',
          'NO': '+47',
          'FI': '+358',
          'AR': '+54',
          'MX': '+52',
          'BR': '+55',
          'CL': '+56',
          'CO': '+57',
          'PE': '+51',
          'VE': '+58',
          'UY': '+598',
          'BO': '+591',
          'PY': '+595',
          'EC': '+593',
        };
        
        const detectedCode = countryCodeMap[data.country_code];
        if (detectedCode && !form.getValues('country_code')) {
          form.setValue('country_code', detectedCode);
          console.log('🌍 Ubicación detectada:', data.country_name, detectedCode);
        }
      } catch (error) {
        console.log('No se pudo detectar la ubicación, usando España por defecto');
      }
    };
    
    detectUserLocation();
  }, []);

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          1-3. Información Personal
        </h3>
        <p className="text-gray-600 mt-2">Datos básicos para tu perfil</p>
        <p className="text-sm text-red-500 mt-1">Los campos marcados con * son obligatorios</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">Nombre *</Label>
          <Input
            id="first_name"
            {...form.register('first_name')}
            placeholder="Tu nombre"
            disabled={!!userData?.first_name}
            className={userData?.first_name ? "bg-gray-100 text-gray-600 cursor-not-allowed" : ""}
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
            disabled={!!userData?.last_name}
            className={userData?.last_name ? "bg-gray-100 text-gray-600 cursor-not-allowed" : ""}
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
          type="email"
          {...form.register('email')}
          placeholder="tu@email.com"
          disabled={!!userData?.email}
          className={userData?.email ? "bg-gray-100 text-gray-600 cursor-not-allowed" : ""}
        />
        {form.formState.errors.email && (
          <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
        )}
      </div>
      
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
            disabled={!!userData?.phone_number}
            className={userData?.phone_number ? "bg-gray-100 text-gray-600 cursor-not-allowed" : ""}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
          />
          {form.formState.errors.phone_number && (
            <p className="text-sm text-red-500">{form.formState.errors.phone_number.message}</p>
          )}
        </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          4-7. Información Física
        </h3>
        <p className="text-gray-600 mt-2">Características físicas para cálculos precisos</p>
        <p className="text-sm text-red-500 mt-1">Los campos marcados con * son obligatorios</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="birth_date">Fecha de Nacimiento *</Label>
          <Input
            id="birth_date"
            type="date"
            {...form.register('birth_date')}
            max={(() => {
              const today = new Date();
              const maxDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
              return maxDate.toISOString().split('T')[0];
            })()}
            min={(() => {
              const today = new Date();
              const minDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
              return minDate.toISOString().split('T')[0];
            })()}
          />
          {form.formState.errors.birth_date && (
            <p className="text-sm text-red-500">{form.formState.errors.birth_date.message}</p>
          )}
          {form.watch('birth_date') && (
            <p className="text-xs text-gray-500">
              Edad: {(() => {
                const birth = new Date(form.watch('birth_date')!);
                const today = new Date();
                let age = today.getFullYear() - birth.getFullYear();
                const monthDiff = today.getMonth() - birth.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                  age--;
                }
                return age;
              })()} años
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Sexo *</Label>
          <RadioGroup
            value={form.watch('gender')}
            onValueChange={(value) => form.setValue('gender', value as 'male' | 'female' | 'other')}
          >
            {genderOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={option.value} />
                <Label htmlFor={option.value}>{option.label}</Label>
              </div>
            ))}
          </RadioGroup>
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
            type="number"
            {...form.register('height', { valueAsNumber: true })}
            placeholder="170"
            min="50"
            max="250"
          />
          {form.formState.errors.height && (
            <p className="text-sm text-red-500">{form.formState.errors.height.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="weight">Peso actual (kg) *</Label>
          <Input
            id="weight"
            type="number"
            {...form.register('weight', { valueAsNumber: true })}
            placeholder="70"
            min="20"
            max="300"
            step="0.1"
          />
          {form.formState.errors.weight && (
            <p className="text-sm text-red-500">{form.formState.errors.weight.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="target_weight">Peso objetivo (kg) (opcional)</Label>
          <Input
            id="target_weight"
            type="number"
            {...form.register('target_weight', { valueAsNumber: true })}
            placeholder="65"
            min="20"
            max="300"
            step="0.1"
          />
          <p className="text-xs text-gray-500">
            Si no especificas un peso objetivo, podrás configurarlo más tarde en tu perfil
          </p>
          {form.formState.errors.target_weight && (
            <p className="text-sm text-red-500">{form.formState.errors.target_weight.message}</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          8-10. Actividad y Entrenamiento
        </h3>
        <p className="text-gray-600 mt-2">Preferencias de actividad y entrenamiento</p>
        <p className="text-sm text-red-500 mt-1">Los campos marcados con * son obligatorios</p>
      </div>
      <div className="space-y-2">
        <Label>¿Cuál es tu nivel de actividad diaria? *</Label>
        <Select
          value={form.watch('activity_level')}
          onValueChange={(value) => form.setValue('activity_level', value as any)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona tu nivel de actividad" />
          </SelectTrigger>
          <SelectContent>
            {activityLevelOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.activity_level && (
          <p className="text-sm text-red-500">{form.formState.errors.activity_level.message}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label>¿Qué días de la semana puedes entrenar? *</Label>
        <div className="grid grid-cols-7 gap-2">
          {[
            { id: 'monday', name: 'Lunes', short: 'L', number: 1 },
            { id: 'tuesday', name: 'Martes', short: 'M', number: 2 },
            { id: 'wednesday', name: 'Miércoles', short: 'X', number: 3 },
            { id: 'thursday', name: 'Jueves', short: 'J', number: 4 },
            { id: 'friday', name: 'Viernes', short: 'V', number: 5 },
            { id: 'saturday', name: 'Sábado', short: 'S', number: 6 },
            { id: 'sunday', name: 'Domingo', short: 'D', number: 7 },
          ].map((day) => {
            const trainingDays = form.watch('training_days') || [];
            const isSelected = trainingDays.includes(day.number);
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => {
                  const current = form.getValues('training_days') || [];
                  const newDays = isSelected
                    ? current.filter((d) => d !== day.number)
                    : [...current, day.number].sort((a, b) => a - b);
                  form.setValue('training_days', newDays);
                  form.setValue('training_days_per_week', newDays.length);
                  form.trigger('training_days');
                }}
                className={`
                  relative p-3 rounded-lg border-2 transition-all text-center
                  ${isSelected
                    ? 'bg-gradient-to-br from-purple-500 to-violet-500 border-purple-600 text-white shadow-md'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50'
                  }
                `}
              >
                <div className="text-xs font-semibold">{day.short}</div>
                <div className="text-xs mt-1 opacity-75">{day.name}</div>
                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-purple-600 text-xs">✓</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {form.watch('training_days') && form.watch('training_days')!.length > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            Total: {form.watch('training_days')!.length} día{form.watch('training_days')!.length !== 1 ? 's' : ''} seleccionado{form.watch('training_days')!.length !== 1 ? 's' : ''}
          </p>
        )}
        {form.formState.errors.training_days && (
          <p className="text-sm text-red-500">{form.formState.errors.training_days.message}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label>¿Dónde prefieres entrenar? *</Label>
        <RadioGroup
          value={form.watch('training_location')}
          onValueChange={(value) => form.setValue('training_location', value as 'home' | 'gym')}
        >
          {trainingLocationOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={option.value} />
              <Label htmlFor={option.value}>{option.label}</Label>
            </div>
          ))}
        </RadioGroup>
        {form.formState.errors.training_location && (
          <p className="text-sm text-red-500">{form.formState.errors.training_location.message}</p>
        )}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          11-16. Información Dietética y Objetivos
        </h3>
        <p className="text-gray-600 mt-2">Información adicional para personalizar tu plan</p>
        <p className="text-sm text-red-500 mt-1">Los campos marcados con * son obligatorios</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="allergies">¿Tienes alguna intolerancia o alergia alimentaria que deba saber?</Label>
        <Textarea
          id="allergies"
          {...form.register('allergies')}
          placeholder="Ej: Intolerancia a la lactosa, alergia a los frutos secos..."
          rows={3}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="medical_conditions">¿Tienes algún problema hormonal o metabólico diagnosticado?</Label>
        <Textarea
          id="medical_conditions"
          {...form.register('medical_conditions')}
          placeholder="Ejemplo: hipotiroidismo, diabetes..."
          rows={3}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="disliked_foods">¿Hay algún alimento que no te guste o que nunca comas?</Label>
        <Textarea
          id="disliked_foods"
          {...form.register('disliked_foods')}
          placeholder="Ej: No me gusta el brócoli, nunca como marisco..."
          rows={3}
        />
      </div>
      
      <div className="space-y-2">
        <Label>¿Cuál es tu objetivo principal? *</Label>
        <RadioGroup
          value={form.watch('main_goal') || ''}
          onValueChange={(value) => {
            form.setValue('main_goal', value as any, { shouldValidate: true });
            // Forzar validación inmediata
            form.trigger('main_goal');
          }}
        >
          {mainGoalOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={option.value} />
              <Label htmlFor={option.value}>{option.label}</Label>
            </div>
          ))}
        </RadioGroup>
        {form.formState.errors.main_goal && (
          <p className="text-sm text-red-500">{form.formState.errors.main_goal.message}</p>
        )}
        {!form.watch('main_goal') && !form.formState.errors.main_goal && (
          <p className="text-sm text-red-500">Selecciona tu objetivo principal</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="previous_obstacles">¿Qué crees que te ha impedido lograrlo hasta ahora?</Label>
        <Textarea
          id="previous_obstacles"
          {...form.register('previous_obstacles')}
          placeholder="Ejemplo: falta de constancia, motivación, tiempo, conocimiento..."
          rows={3}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="injuries_or_medical_issues">¿Has tenido alguna lesión o intervención médica importante? ¿Actualmente te molesta algo?</Label>
        <Textarea
          id="injuries_or_medical_issues"
          {...form.register('injuries_or_medical_issues')}
          placeholder="Describe brevemente y fecha aproximada..."
          rows={3}
        />
      </div>
    </div>
  );

  return (
    <Card className="w-full max-w-4xl mx-auto border-0 bg-white/80 backdrop-blur-sm shadow-2xl">
      <CardHeader className="text-center bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-lg">
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Formulario de Configuración Inicial
        </CardTitle>
        <CardDescription className="text-gray-600">
          Completa tu perfil para personalizar tu experiencia
        </CardDescription>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Paso {currentStep} de {totalSteps}</span>
            <span>{Math.round(progress)}% completado</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`${
                isCurrentStepValid() 
                  ? "bg-gradient-to-r from-blue-500 to-purple-500" 
                  : "bg-gradient-to-r from-red-500 to-pink-500"
              } h-2 rounded-full transition-all duration-300 ease-out`}
              style={{ width: `${progress}%` }}
            />
          </div>
          {!isCurrentStepValid() && (
            <p className="text-xs text-red-500 text-center">
              ⚠️ Completa todos los campos obligatorios para continuar
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="bg-white/50 hover:bg-white/70 border-gray-300 text-gray-700 hover:text-gray-900"
            >
              Anterior
            </Button>
            
            {currentStep < totalSteps ? (
              <Button 
                type="button" 
                onClick={nextStep}
                className={`${
                  isCurrentStepValid() 
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600" 
                    : "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                } text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300`}
              >
                {isCurrentStepValid() ? "Siguiente" : "Completa los campos requeridos"}
              </Button>
            ) : (
              <Button 
                type="submit" 
                disabled={isLoading}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Guardando...' : 'Completar Configuración'}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

