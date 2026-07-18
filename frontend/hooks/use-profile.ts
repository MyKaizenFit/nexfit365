import { useState, useEffect } from 'react';
import { useToast } from './use-toast';
import { authenticatedFetch, handleApiResponse } from '@/lib/api';
import { getAuthService } from '@/lib/auth-service';

interface ProfileData {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  height?: number;
  weight?: number;
  target_weight?: number;
  target_date?: string;
  main_goal?: 'lose_weight' | 'gain_muscle' | 'body_recomposition';
  previous_obstacles?: string;
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  training_days_per_week?: number;
  training_location?: 'home' | 'gym';
  allergies?: string;
  medical_conditions?: string;
  disliked_foods?: string;
  dietary_restrictions?: string[];
  injuries_or_medical_issues?: string;
  bmi?: number;
  calculated_age?: number;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      if (!getAuthService().isAuthenticated()) {
        throw new Error('No hay sesión de autenticación');
      }

      const response = await authenticatedFetch('profile/', {
        method: 'GET',
      });
      const result = await handleApiResponse<ProfileData>(response);
      if (result.error || !result.data) {
        throw new Error(result.error || 'Error al cargar el perfil');
      }
      setProfile(result.data);
      return result.data;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al cargar el perfil del usuario',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (data: Partial<ProfileData>) => {
    setIsSaving(true);
    try {
      if (!getAuthService().isAuthenticated()) {
        throw new Error('No hay sesión de autenticación');
      }

      const response = await authenticatedFetch('profile/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await handleApiResponse<ProfileData>(response);
      if (result.error || !result.data) {
        throw new Error(result.error || 'Error al actualizar el perfil');
      }
      setProfile(result.data);
      toast({
        title: 'Perfil actualizado',
        description: 'Tu perfil ha sido actualizado exitosamente.',
      });
      return result.data;
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al actualizar el perfil',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  return {
    profile,
    isLoading,
    isSaving,
    loadProfile,
    updateProfile,
  };
}
