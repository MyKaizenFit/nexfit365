import { useState, useEffect } from 'react';
import { useToast } from './use-toast';

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

  // Cargar perfil del usuario
  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch('/api/accounts/profile/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        return data;
      } else {
        throw new Error('Error al cargar el perfil');
      }
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

  // Actualizar perfil del usuario
  const updateProfile = async (data: Partial<ProfileData>) => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch('/api/accounts/profile/', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        toast({
          title: 'Perfil actualizado',
          description: 'Tu perfil ha sido actualizado exitosamente.',
        });
        return updatedProfile;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al actualizar el perfil');
      }
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

  // Cargar perfil al montar el componente
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





