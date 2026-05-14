"use client";

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { InitialRegistrationForm } from '@/components/forms/initial-registration-form';
import { useInitialRegistration } from '@/hooks/use-initial-registration';
import { PersonalizedRecommendations } from '@/components/personalized-recommendations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowRight, Sparkles, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';

export default function InitialRegistrationPage() {
  const router = useRouter();
  const { completeRegistration, isLoading, isComplete, completionPercentage, userData, userDataLoaded, profile } = useInitialRegistration();
  const { logout } = useAuth();
  const [showRecommendations, setShowRecommendations] = useState(false);
  
  // Memoizar userData para evitar re-renders innecesarios
  const memoizedUserData = useMemo(() => userData, [
    userData?.first_name,
    userData?.last_name,
    userData?.email,
    userData?.phone_number,
  ]);
  
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
    }
  };

  // Si ya completó el formulario, redirigir al dashboard
  React.useEffect(() => {
    if (isComplete && !showRecommendations) {
      // Esperar un poco para que el usuario vea el mensaje de éxito
      const timer = setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isComplete, showRecommendations, router]);

  const handleComplete = async (data: any) => {
    try {
      await completeRegistration(data);
      setShowRecommendations(true);
      
      // Redirigir al dashboard después de completar
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000); // Dar tiempo para mostrar las recomendaciones
    } catch (error: any) {
      // El error ya se maneja en el hook, pero podemos agregar más información aquí si es necesario
      
      // Si es un error de conexión, mostrar mensaje adicional
      if (error?.message?.includes('Failed to fetch') || error?.message?.includes('No se pudo conectar')) {
        // El hook ya muestra el error, pero podemos agregar un mensaje más visible
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      }
    }
  };

  const handleCreatePlans = () => {
    // Redirigir al dashboard después de crear los planes
    router.push('/dashboard');
  };

  // Si ya está completo, mostrar recomendaciones o mensaje de éxito
  if (isComplete && showRecommendations) {
    return (
      <div className="min-h-screen bg-muted py-8">
        <div className="container mx-auto px-4">
          <PersonalizedRecommendations userProfile={profile} onComplete={handleCreatePlans} />
        </div>
      </div>
    );
  }

  if (isComplete && !showRecommendations) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">¡Registro Completado!</CardTitle>
            <CardDescription>
              Tu perfil ha sido configurado exitosamente. Ahora puedes acceder a todas las funcionalidades.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => setShowRecommendations(true)} className="w-full mb-2">
              <Sparkles className="mr-2 h-4 w-4" />
              Ver Recomendaciones Personalizadas
            </Button>
            <Button onClick={() => router.push('/dashboard')} variant="outline" className="w-full">
              Ir a Inicio
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Botón de cerrar sesión - Fijo en la esquina superior derecha */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          onClick={handleLogout}
          variant="outline"
          size="sm"
          className="bg-card/90 backdrop-blur-sm border-gray-300 text-gray-700 hover:bg-white hover:text-red-600 transition-all duration-300 shadow-lg"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </Button>
      </div>

      {/* Header Hero */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mx-auto w-20 h-20 rounded-3xl overflow-hidden flex items-center justify-center mb-6">
              <Image src="/icono.png" alt="NEXFIT" width={80} height={80} quality={100} priority />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-orange-400">NEX</span><span className="text-white">FIT</span> - ¡Configura tu Perfil!
            </h1>
            <p className="text-lg md:text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              Para crear un plan de entrenamiento y nutrición personalizado, 
              necesitamos conocer algunos datos sobre ti. Este proceso solo tomará unos minutos.
            </p>
            {completionPercentage > 0 && (
              <div className="mt-6">
                <p className="text-sm text-blue-200 mb-2">
                  Progreso: {completionPercentage}% completado
                </p>
                <div className="w-64 mx-auto bg-white/20 backdrop-blur-sm rounded-full h-2">
                  <div 
                    className={`bg-white h-2 rounded-full transition-all duration-300 ease-out`}
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {!userDataLoaded ? (
          <div className="flex justify-center items-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando datos del usuario...</p>
            </div>
          </div>
        ) : (
          <InitialRegistrationForm
            onComplete={handleComplete}
            isLoading={isLoading}
            userData={memoizedUserData as any}
          />
        )}
        
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Esta información nos ayuda a crear planes personalizados para ti.
            <br />
            Puedes modificar estos datos en cualquier momento desde tu perfil.
          </p>
        </div>
      </div>
    </div>
  );
}
