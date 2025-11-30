"use client";

import React, { useState, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, User, Target, Activity, Utensils } from 'lucide-react';

// Esquema de validación
const profileEditSchema = z.object({
  // Información personal
  first_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  phone_number: z.string().optional(),
  age: z.number().min(13, 'La edad mínima es 13 años').max(120, 'La edad máxima es 120 años').optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  height: z.number().min(50, 'La altura mínima es 50 cm').max(250, 'La altura máxima es 250 cm').optional(),
  weight: z.number().min(20, 'El peso mínimo es 20 kg').max(300, 'El peso máximo es 300 kg').optional(),
  
  // Objetivos
  target_weight: z.number().min(20, 'El peso objetivo mínimo es 20 kg').max(300, 'El peso objetivo máximo es 300 kg').optional(),
  target_date: z.string().optional(),
  main_goal: z.enum(['lose_weight', 'gain_muscle', 'body_recomposition']).optional(),
  previous_obstacles: z.string().optional(),
  
  // Actividad
  activity_level: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional(),
  training_days_per_week: z.number().min(1, 'Mínimo 1 día').max(7, 'Máximo 7 días').optional(),
  training_location: z.enum(['home', 'gym']).optional(),
  
  // Información dietética
  allergies: z.string().optional(),
  medical_conditions: z.string().optional(),
  disliked_foods: z.string().optional(),
  dietary_restrictions: z.array(z.string()).optional(),
  
  // Lesiones
  injuries_or_medical_issues: z.string().optional(),
});

type ProfileEditFormData = z.infer<typeof profileEditSchema>;

interface ProfileEditFormProps {
  initialData?: Partial<ProfileEditFormData>;
  onSave: (data: ProfileEditFormData) => void;
  isLoading?: boolean;
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

const dietaryRestrictionOptions = [
  { value: 'vegetarian', label: 'Vegetariano' },
  { value: 'vegan', label: 'Vegano' },
  { value: 'gluten_free', label: 'Sin gluten' },
  { value: 'lactose_free', label: 'Sin lactosa' },
  { value: 'keto', label: 'Cetogénica' },
  { value: 'paleo', label: 'Paleo' },
  { value: 'mediterranean', label: 'Mediterránea' },
];

export function ProfileEditForm({ 
  initialData = {}, 
  onSave, 
  isLoading = false 
}: ProfileEditFormProps) {
  const { toast } = useToast();
  
  const form = useForm<ProfileEditFormData>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      first_name: initialData.first_name || '',
      last_name: initialData.last_name || '',
      phone_number: initialData.phone_number || '',
      age: initialData.age || undefined,
      gender: initialData.gender || undefined,
      height: initialData.height || undefined,
      weight: initialData.weight || undefined,
      target_weight: initialData.target_weight || undefined,
      target_date: initialData.target_date || '',
      main_goal: initialData.main_goal || undefined,
      previous_obstacles: initialData.previous_obstacles || '',
      activity_level: initialData.activity_level || undefined,
      training_days_per_week: initialData.training_days_per_week || undefined,
      training_location: initialData.training_location || undefined,
      allergies: initialData.allergies || '',
      medical_conditions: initialData.medical_conditions || '',
      disliked_foods: initialData.disliked_foods || '',
      dietary_restrictions: initialData.dietary_restrictions || [],
      injuries_or_medical_issues: initialData.injuries_or_medical_issues || '',
    },
  });

  const onSubmit = (data: ProfileEditFormData) => {
    onSave(data);
  };

  const renderPersonalInfo = () => (
    <div className="space-y-4">
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
        <Label htmlFor="phone_number">Número de teléfono</Label>
        <Input
          id="phone_number"
          {...form.register('phone_number')}
          placeholder="+34 123 456 789"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="age">Edad</Label>
          <Input
            id="age"
            type="number"
            {...form.register('age', { valueAsNumber: true })}
            placeholder="25"
            min="13"
            max="120"
          />
          {form.formState.errors.age && (
            <p className="text-sm text-red-500">{form.formState.errors.age.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Sexo</Label>
          <Select
            value={form.watch('gender')}
            onValueChange={(value) => form.setValue('gender', value as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona tu sexo" />
            </SelectTrigger>
            <SelectContent>
              {genderOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="height">Altura (cm)</Label>
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
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="weight">Peso actual (kg)</Label>
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
    </div>
  );

  const renderGoals = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Objetivo principal</Label>
        <RadioGroup
          value={form.watch('main_goal')}
          onValueChange={(value) => form.setValue('main_goal', value as any)}
        >
          {mainGoalOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={option.value} />
              <Label htmlFor={option.value}>{option.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="target_weight">Peso objetivo (kg)</Label>
          <Input
            id="target_weight"
            type="number"
            {...form.register('target_weight', { valueAsNumber: true })}
            placeholder="65"
            min="20"
            max="300"
            step="0.1"
          />
          {form.formState.errors.target_weight && (
            <p className="text-sm text-red-500">{form.formState.errors.target_weight.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="target_date">Fecha objetivo</Label>
          <Input
            id="target_date"
            type="date"
            {...form.register('target_date')}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="previous_obstacles">¿Qué te ha impedido lograr tu objetivo hasta ahora?</Label>
        <Textarea
          id="previous_obstacles"
          {...form.register('previous_obstacles')}
          placeholder="Ej: falta de constancia, motivación, tiempo, conocimiento..."
          rows={3}
        />
      </div>
    </div>
  );

  const renderActivity = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nivel de actividad diaria</Label>
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
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="training_days_per_week">Días de entrenamiento por semana</Label>
        <Input
          id="training_days_per_week"
          type="number"
          {...form.register('training_days_per_week', { valueAsNumber: true })}
          placeholder="3"
          min="1"
          max="7"
        />
        {form.formState.errors.training_days_per_week && (
          <p className="text-sm text-red-500">{form.formState.errors.training_days_per_week.message}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label>Lugar de entrenamiento preferido</Label>
        <RadioGroup
          value={form.watch('training_location')}
          onValueChange={(value) => form.setValue('training_location', value as any)}
        >
          {trainingLocationOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={option.value} />
              <Label htmlFor={option.value}>{option.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  );

  const renderDietary = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="allergies">Alergias o intolerancias alimentarias</Label>
        <Textarea
          id="allergies"
          {...form.register('allergies')}
          placeholder="Ej: Intolerancia a la lactosa, alergia a los frutos secos..."
          rows={3}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="medical_conditions">Problemas hormonales o metabólicos</Label>
        <Textarea
          id="medical_conditions"
          {...form.register('medical_conditions')}
          placeholder="Ej: hipotiroidismo, diabetes..."
          rows={3}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="disliked_foods">Alimentos que no te gustan</Label>
        <Textarea
          id="disliked_foods"
          {...form.register('disliked_foods')}
          placeholder="Ej: No me gusta el brócoli, nunca como marisco..."
          rows={3}
        />
      </div>
      
      <div className="space-y-2">
        <Label>Restricciones dietéticas</Label>
        <div className="grid grid-cols-2 gap-2">
          {dietaryRestrictionOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={option.value}
                checked={form.watch('dietary_restrictions')?.includes(option.value) || false}
                onChange={(e) => {
                  const current = form.watch('dietary_restrictions') || [];
                  if (e.target.checked) {
                    form.setValue('dietary_restrictions', [...current, option.value]);
                  } else {
                    form.setValue('dietary_restrictions', current.filter(item => item !== option.value));
                  }
                }}
                className="rounded"
                aria-label={`Seleccionar restricción dietética: ${option.label}`}
              />
              <Label htmlFor={option.value} className="text-sm">
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="injuries_or_medical_issues">Lesiones o problemas médicos</Label>
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Editar Perfil
        </CardTitle>
        <CardDescription>
          Actualiza tu información personal y preferencias
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="personal" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Personal
              </TabsTrigger>
              <TabsTrigger value="goals" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Objetivos
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Actividad
              </TabsTrigger>
              <TabsTrigger value="dietary" className="flex items-center gap-2">
                <Utensils className="h-4 w-4" />
                Nutrición
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="personal" className="space-y-4">
              {renderPersonalInfo()}
            </TabsContent>
            
            <TabsContent value="goals" className="space-y-4">
              {renderGoals()}
            </TabsContent>
            
            <TabsContent value="activity" className="space-y-4">
              {renderActivity()}
            </TabsContent>
            
            <TabsContent value="dietary" className="space-y-4">
              {renderDietary()}
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Guardar Cambios
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
