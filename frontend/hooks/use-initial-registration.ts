import { useState, useEffect } from 'react';
import { useToast } from './use-toast';
import { useAuth } from '@/contexts/auth-context';
import { buildApiUrl, getAuthHeaders, USER_ENDPOINTS } from '@/lib/api';

interface InitialRegistrationData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  birth_date: string; // Fecha de nacimiento en formato YYYY-MM-DD
  gender: 'male' | 'female' | 'other';
  height: number;
  weight: number;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  training_days_per_week?: number; // Calculado automáticamente desde training_days
  training_days: number[]; // Array de números 1-7 (1=Lunes, 7=Domingo)
  training_location: 'home' | 'gym';
  allergies?: string;
  medical_conditions?: string;
  disliked_foods?: string;
  main_goal: 'lose_weight' | 'gain_muscle' | 'body_recomposition';
  injuries_or_medical_issues?: string;
}

interface InitialRegistrationStatus {
  is_complete: boolean;
  completion_percentage: number;
  completed_fields: string[];
  missing_fields: string[];
  profile?: any;
}

export function useInitialRegistration() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<InitialRegistrationStatus | null>(null);
  const [userData, setUserData] = useState<Partial<InitialRegistrationData> | null>(null);
  const [userDataLoaded, setUserDataLoaded] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Cargar datos del usuario y verificar estado del formulario al montar el componente
  useEffect(() => {
    const loadData = async () => {
      if (user) {
        await getUserData();
        await checkRegistrationStatus();
      } else {
        // Si no hay usuario, marcar como cargado de todas formas
        setUserDataLoaded(true);
      }
    };
    loadData();
  }, [user]);

  // Obtener datos del usuario para prellenar el formulario
  const getUserData = async () => {
    if (user) {
      const data: Partial<InitialRegistrationData> = {
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone_number: user.phone || '',
      };
      setUserData(data);
      setUserDataLoaded(true);
    } else {
      setUserDataLoaded(true);
    }
  };

  // Verificar el estado del registro inicial
  const checkRegistrationStatus = async () => {
    try {
      // SIEMPRE verificar en el backend usando el userId del token
      // Esto previene que datos de localStorage de otra cuenta interfieran
      try {
        const response = await fetch(
          buildApiUrl(USER_ENDPOINTS.INITIAL_REGISTRATION_STATUS),
          {
            method: 'GET',
            headers: getAuthHeaders(),
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          
          // Obtener userId del token para validar
          let currentUserId = null;
          try {
            const token = localStorage.getItem('accessToken') || 
                         document.cookie.split('; ').find(row => row.startsWith('accessToken='))?.split('=')[1];
            if (token && !token.startsWith('offline_token_')) {
              const payload = JSON.parse(atob(token.split('.')[1]));
              currentUserId = payload.user_id || payload.id;
            }
          } catch (e) {
          }
          
          // Verificar que el localStorage corresponde al usuario actual
          const storedProfile = localStorage.getItem('user_profile');
          const storedUserId = storedProfile ? JSON.parse(storedProfile)?.id : null;
          
          if (data.is_complete) {
            // Verificar que el userId coincide antes de usar localStorage
            if (currentUserId && storedUserId && currentUserId !== storedUserId) {
              localStorage.removeItem('initial_form_completed');
              localStorage.removeItem('user_profile');
              localStorage.removeItem('form_version');
              // No usar localStorage, seguir con datos del backend
            } else {
              // Guardar en localStorage y cookie solo si el userId coincide
              localStorage.setItem('initial_form_completed', 'true');
              localStorage.setItem('user_profile', JSON.stringify(data.profile || {}));
              if (data.form_version) {
                localStorage.setItem('form_version', data.form_version.toString());
              }
              document.cookie = `initial_form_completed=true; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
            }
          } else {
            // Si no está completo, limpiar localStorage para este usuario
            if (currentUserId && storedUserId && currentUserId !== storedUserId) {
              localStorage.removeItem('initial_form_completed');
              localStorage.removeItem('user_profile');
              localStorage.removeItem('form_version');
            }
          }
          
          setStatus({
            is_complete: data.is_complete,
            completion_percentage: data.completion_percentage,
            completed_fields: data.completed_fields,
            missing_fields: data.missing_fields,
            profile: data.profile,
          });
        } else {
          // Si falla la verificación en el backend, asumir que no está completo
          setStatus({
            is_complete: false,
            completion_percentage: 0,
            completed_fields: [],
            missing_fields: ['first_name', 'last_name', 'email', 'birth_date', 'gender', 'height', 'weight', 'activity_level', 'training_days_per_week', 'training_days', 'training_location', 'main_goal'],
            profile: null,
          });
        }
      } catch (apiError) {
        // Si falla, asumir que no está completo
        setStatus({
          is_complete: false,
          completion_percentage: 0,
          completed_fields: [],
          missing_fields: ['first_name', 'last_name', 'email', 'birth_date', 'gender', 'height', 'weight', 'activity_level', 'training_days_per_week', 'training_days', 'training_location', 'main_goal'],
          profile: null,
        });
      }
    } catch (error) {
    }
  };

  // Completar el registro inicial
  const completeRegistration = async (data: InitialRegistrationData & { country_code?: string }) => {
    setIsLoading(true);
    try {
      // Combinar country_code con phone_number si existe
      const processedData = { ...data };
      if (processedData.country_code && processedData.phone_number) {
        processedData.phone_number = `${processedData.country_code}${processedData.phone_number}`;
      }
      // Eliminar campos que no existen en el modelo
      delete (processedData as any).country_code;
      delete (processedData as any).previous_obstacles; // Campo no existe en el modelo
      
      // Asegurar que phone_number sea string y tenga formato correcto
      if (processedData.phone_number) {
        processedData.phone_number = String(processedData.phone_number).replace(/\D/g, '');
      }
      
      
      // Llamar al endpoint del backend
      const apiUrl = buildApiUrl(USER_ENDPOINTS.COMPLETE_INITIAL_REGISTRATION);
      const headers = getAuthHeaders();
      
      
      let response: Response;
      try {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(processedData),
        });
      } catch (fetchError) {
        // Capturar errores de red (Failed to fetch)
        const errorMessage = fetchError instanceof Error 
          ? `No se pudo conectar con el servidor: ${fetchError.message}. Verifica que el backend esté corriendo en ${apiUrl}`
          : 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo.';
        throw new Error(errorMessage);
      }
      
      
      if (!response.ok) {
        let errorData: any = {};
        const contentType = response.headers.get('content-type');
        
        try {
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
          } else {
            // Si no es JSON, intentar leer como texto
            const text = await response.text();
            errorData = { detail: text || 'Error al completar el registro' };
          }
        } catch (parseError) {
          errorData = { detail: 'Error al completar el registro' };
        }
        
          status: response.status,
          statusText: response.statusText,
          errorData,
          contentType
        });
        
        // Construir mensaje de error más detallado
        let errorMessage = 'Error al completar el registro';
        
        // Si hay errores de validación por campo (formato del backend)
        if (errorData.errors && typeof errorData.errors === 'object') {
          const fieldErrors = Object.entries(errorData.errors)
            .map(([field, errors]: [string, any]) => {
              const errorList = Array.isArray(errors) ? errors : [errors];
              return `${field}: ${errorList.join(', ')}`;
            })
            .join('; ');
          errorMessage = errorData.detail || `Errores de validación: ${fieldErrors}`;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (typeof errorData === 'object' && Object.keys(errorData).length > 0) {
          // Si hay errores de validación por campo (formato directo)
          const fieldErrors = Object.entries(errorData)
            .map(([field, errors]: [string, any]) => {
              const errorList = Array.isArray(errors) ? errors : [errors];
              return `${field}: ${errorList.join(', ')}`;
            })
            .join('; ');
          errorMessage = `Errores de validación: ${fieldErrors}`;
        }
        
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      
      // Guardar en localStorage que el formulario está completo
      localStorage.setItem('initial_form_completed', 'true');
      localStorage.setItem('user_profile', JSON.stringify(result.profile));
      // Guardar versión del formulario si está disponible
      if (result.form_version) {
        localStorage.setItem('form_version', result.form_version.toString());
      }
      
      // También guardar en cookie para que el middleware pueda verificarlo
      document.cookie = `initial_form_completed=true; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
      
        setStatus({
          is_complete: true,
          completion_percentage: 100,
          completed_fields: Object.keys(processedData),
          missing_fields: [],
          profile: result.profile,
        });
      
      // Mostrar mensaje sobre el plan asignado
      const planMessage = result.nutrition_plan?.assigned 
        ? `Plan nutricional "${result.nutrition_plan.plan_name}" asignado automáticamente`
        : result.nutrition_plan?.message || '';
      
      toast({
        title: '¡Formulario completado!',
        description: planMessage || 'Tu perfil ha sido configurado exitosamente.',
      });
      
      return result;
    } catch (error) {
      
      // Mensaje de error más descriptivo
      let errorMessage = 'Error al completar el registro';
      if (error instanceof Error) {
        errorMessage = error.message;
        // Si es un error de red, proporcionar más contexto
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMessage = 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo y accesible.';
        }
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Ya no es necesario este useEffect separado, ahora se llama desde el useEffect principal cuando hay usuario

  return {
    status,
    isLoading,
    completeRegistration,
    checkRegistrationStatus,
    isComplete: status?.is_complete || false,
    completionPercentage: status?.completion_percentage || 0,
    userData,
    userDataLoaded,
    profile: status?.profile,
  };
}

