"use client"

import React, { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  ChefHat, 
  Dumbbell, 
  Target, 
  Clock, 
  Flame,
  TrendingUp,
  Star,
  Heart,
  Sparkles,
  ArrowRight,
  Award,
  Users,
  CheckCircle
} from 'lucide-react'
import { usePersonalizedRecommendations } from '@/hooks/use-personalized-recommendations'

interface UserProfile {
  main_goal?: string
  activity_level?: string
  training_location?: string
  training_days_per_week?: number
}

interface PersonalizedRecommendationsProps {
  userProfile?: UserProfile
  onComplete: () => void
}

export function PersonalizedRecommendations({ userProfile: externalProfile, onComplete }: PersonalizedRecommendationsProps) {
  const [activeTab, setActiveTab] = useState<'recipes' | 'workouts' | 'tips'>('tips')
  const { recommendations, loading, error } = usePersonalizedRecommendations()

  const getGoalText = (goal: string) => {
    switch (goal) {
      case 'lose_weight': return 'Pérdida de Peso'
      case 'gain_muscle': return 'Ganancia Muscular'
      case 'body_recomposition': return 'Recomposición'
      default: return 'Fitness'
    }
  }

  const getGoalIcon = (goal: string) => {
    switch (goal) {
      case 'lose_weight': return '🔥'
      case 'gain_muscle': return '💪'
      case 'body_recomposition': return '⚖️'
      default: return '🎯'
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="w-full space-y-6">
        <Card className="border-0 bg-white shadow-xl">
          <CardHeader className="text-center space-y-4">
            <Skeleton className="w-16 h-16 mx-auto rounded-2xl" />
            <Skeleton className="h-8 w-64 mx-auto" />
            <div className="flex gap-2 justify-center">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-24" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error || !recommendations) {
    return (
      <Card className="border-0 bg-white shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-red-600">⚠️ Error al cargar recomendaciones</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 mb-4">{error || 'No se pudieron cargar las recomendaciones'}</p>
          <Button onClick={onComplete}>Ir a Inicio</Button>
        </CardContent>
      </Card>
    )
  }

  const profile = recommendations.user_profile || externalProfile

  return (
    <div className="w-full space-y-6">
      {/* Header con branding NEXFIT */}
      <Card className="border-0 bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <CardHeader className="relative z-10 text-center space-y-4 py-8">
          <div className="mx-auto w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <Image src="/icono.png" alt="NEXFIT" width={64} height={64} quality={100} />
          </div>
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3">
            <Sparkles className="w-8 h-8" />
            Tus Recomendaciones Personalizadas
          </CardTitle>
          {profile?.main_goal && (
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              <Badge className="bg-white/20 hover:bg-white/30 border-0 text-white px-4 py-2">
                {getGoalIcon(profile.main_goal)} {getGoalText(profile.main_goal)}
              </Badge>
              {profile.training_location && (
                <Badge className="bg-white/20 hover:bg-white/30 border-0 text-white px-4 py-2">
                  {profile.training_location === 'home' ? '🏠 En Casa' : '🏋️ Gimnasio'}
                </Badge>
              )}
              {profile.training_days_per_week && (
                <Badge className="bg-white/20 hover:bg-white/30 border-0 text-white px-4 py-2">
                  📅 {profile.training_days_per_week} días/semana
                </Badge>
              )}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Tabs */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
        <Button
          onClick={() => setActiveTab('tips')}
          className={activeTab === 'tips' 
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' 
            : 'bg-white text-gray-700 hover:bg-gray-50'
          }
        >
          <Sparkles className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Consejos</span>
        </Button>
        <Button
          onClick={() => setActiveTab('recipes')}
          className={activeTab === 'recipes' 
            ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' 
            : 'bg-white text-gray-700 hover:bg-gray-50'
          }
        >
          <ChefHat className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Recetas</span>
        </Button>
        <Button
          onClick={() => setActiveTab('workouts')}
          className={activeTab === 'workouts' 
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
            : 'bg-white text-gray-700 hover:bg-gray-50'
          }
        >
          <Dumbbell className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Entrenamientos</span>
        </Button>
      </div>

      {/* Contenido de Tips */}
      {activeTab === 'tips' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendations.wellness_tips.slice(0, 6).map((tip: any) => (
            <Card key={tip.id} className="border-0 bg-white hover:shadow-xl transition-all hover:-translate-y-1">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge className="bg-emerald-100 text-emerald-700 border-0">
                    {tip.category === 'nutrition' ? '🥗' : 
                     tip.category === 'training' ? '💪' :
                     tip.category === 'mindset' ? '🧠' :
                     tip.category === 'recovery' ? '😴' : '✨'}
                  </Badge>
                  {tip.is_highlighted && (
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
                <CardTitle className="text-lg line-clamp-2">{tip.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 line-clamp-3">{tip.summary || tip.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Contenido de Recetas */}
      {activeTab === 'recipes' && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
              <ChefHat className="w-6 h-6 text-orange-500" />
              Recetas para tu Objetivo
            </h3>
            <p className="text-gray-600">
              {profile?.main_goal && `Seleccionadas para ${getGoalText(profile.main_goal)}`}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.recipes.slice(0, 6).map((recipe: any) => (
              <Card key={recipe.id} className="border-0 bg-white hover:shadow-xl transition-all hover:-translate-y-1">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-base line-clamp-2">{recipe.name}</CardTitle>
                    <Badge className="bg-orange-100 text-orange-700 border-0 text-xs flex-shrink-0">
                      {recipe.difficulty || 'Fácil'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <Flame className="w-4 h-4 text-red-500 mx-auto mb-1" />
                      <p className="text-xs font-medium">{recipe.calories}</p>
                    </div>
                    <div>
                      <span className="text-red-600 text-sm mx-auto block mb-1">🥩</span>
                      <p className="text-xs font-medium">{recipe.protein}g</p>
                    </div>
                    <div>
                      <span className="text-amber-600 text-sm mx-auto block mb-1">🍞</span>
                      <p className="text-xs font-medium">{recipe.carbs}g</p>
                    </div>
                    <div>
                      <span className="text-green-600 text-sm mx-auto block mb-1">🥑</span>
                      <p className="text-xs font-medium">{recipe.fat}g</p>
                    </div>
                  </div>
                  {recipe.prep_time_minutes && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {recipe.prep_time_minutes} min
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Contenido de Entrenamientos */}
      {activeTab === 'workouts' && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
              <Dumbbell className="w-6 h-6 text-purple-500" />
              Programas de Entrenamiento
            </h3>
            <p className="text-gray-600">
              {profile?.training_location && `Para entrenar ${profile.training_location === 'home' ? 'en casa' : 'en gimnasio'}`}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.workout_programs.slice(0, 6).map((program: any) => (
              <Card key={program.id} className="border-0 bg-white hover:shadow-xl transition-all hover:-translate-y-1">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-base line-clamp-2">{program.name}</CardTitle>
                    <Badge className="bg-purple-100 text-purple-700 border-0 text-xs flex-shrink-0">
                      {program.difficulty || 'Medio'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600 line-clamp-2">{program.description}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <Clock className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                      <p className="text-xs font-medium">{program.estimated_duration_minutes || program.duration_weeks}min</p>
                    </div>
                    <div>
                      <Target className="w-4 h-4 text-orange-500 mx-auto mb-1" />
                      <p className="text-xs font-medium">{program.goal || 'General'}</p>
                    </div>
                    <div>
                      <Users className="w-4 h-4 text-green-500 mx-auto mb-1" />
                      <p className="text-xs font-medium">{program.days_per_week || 3}x/sem</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* CTA Final */}
      <Card className="border-0 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
        <CardContent className="p-6 sm:p-8 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-white" />
          <h3 className="text-2xl font-bold mb-3">¡Tu Plan Personalizado está Listo!</h3>
          <p className="text-white/90 mb-6 max-w-2xl mx-auto">
            Hemos seleccionado las mejores recetas, entrenamientos y consejos basados en tu perfil. 
            ¡Comienza hoy tu transformación!
          </p>
          <Button
            onClick={onComplete}
            size="lg"
            className="bg-white text-emerald-600 hover:bg-white/90 px-8 py-6 text-lg font-bold shadow-xl"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Ir a Inicio
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
