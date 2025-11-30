"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ChefHat, 
  Dumbbell, 
  Target, 
  Clock, 
  Users, 
  Flame,
  Apple,
  TrendingUp,
  Star,
  Heart
} from 'lucide-react'

interface UserProfile {
  main_goal: string
  activity_level: string
  training_location: string
  training_days_per_week: number
  allergies?: string
  disliked_foods?: string
  height: number
  weight: number
  age: number
  gender: string
}

interface PersonalizedRecommendationsProps {
  userProfile?: UserProfile
  onComplete: () => void
}

export function PersonalizedRecommendations({ userProfile, onComplete }: PersonalizedRecommendationsProps) {
  const [activeTab, setActiveTab] = useState<'recipes' | 'workouts'>('recipes')

  // Validar que userProfile esté disponible
  if (!userProfile || !userProfile.main_goal || !userProfile.activity_level || !userProfile.training_location) {
    console.error('❌ PersonalizedRecommendations: userProfile is undefined or incomplete', userProfile)
    return (
      <div className="w-full">
        <Card className="border-0 bg-white/90 backdrop-blur-sm shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-800">⚠️ Error al cargar recomendaciones</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">No se pudieron cargar los datos del perfil. Por favor, completa el formulario de registro.</p>
            <Button onClick={onComplete} className="w-full">
              Ir al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Generar recetas personalizadas basadas en el perfil
  const getPersonalizedRecipes = () => {
    const goalRecipes = {
      lose_weight: [
        {
          id: 1,
          name: "Ensalada de Quinoa y Pollo",
          calories: 320,
          protein: 28,
          carbs: 25,
          fat: 12,
          time: "15 min",
          difficulty: "Fácil",
          description: "Perfecta para tu objetivo de pérdida de peso, rica en proteínas y fibra",
          ingredients: ["Quinoa", "Pechuga de pollo", "Espinacas", "Tomate", "Aguacate", "Aceite de oliva"],
          tags: ["Alto en proteína", "Bajo en calorías", "Rico en fibra"]
        },
        {
          id: 2,
          name: "Salmón al Horno con Verduras",
          calories: 280,
          protein: 32,
          carbs: 15,
          fat: 10,
          time: "25 min",
          difficulty: "Fácil",
          description: "Rica en omega-3 y proteínas magras para mantener la masa muscular",
          ingredients: ["Salmón", "Brócoli", "Zanahorias", "Limón", "Ajo", "Hierbas"],
          tags: ["Omega-3", "Alto en proteína", "Antiinflamatorio"]
        }
      ],
      gain_muscle: [
        {
          id: 3,
          name: "Batido de Proteína Post-Entrenamiento",
          calories: 450,
          protein: 35,
          carbs: 40,
          fat: 15,
          time: "5 min",
          difficulty: "Fácil",
          description: "Ideal para la recuperación y crecimiento muscular después del entrenamiento",
          ingredients: ["Proteína en polvo", "Plátano", "Avena", "Leche", "Mantequilla de almendras", "Miel"],
          tags: ["Post-entrenamiento", "Alto en proteína", "Recuperación"]
        },
        {
          id: 4,
          name: "Pechuga de Pollo con Arroz Integral",
          calories: 520,
          protein: 42,
          carbs: 55,
          fat: 8,
          time: "30 min",
          difficulty: "Medio",
          description: "Combinación perfecta de proteínas y carbohidratos complejos para el crecimiento muscular",
          ingredients: ["Pechuga de pollo", "Arroz integral", "Brócoli", "Aceite de coco", "Especias"],
          tags: ["Alto en proteína", "Carbohidratos complejos", "Comida completa"]
        }
      ],
      body_recomposition: [
        {
          id: 5,
          name: "Bowl de Açaí con Granola",
          calories: 380,
          protein: 18,
          carbs: 45,
          fat: 16,
          time: "10 min",
          difficulty: "Fácil",
          description: "Desayuno equilibrado perfecto para recomposición corporal",
          ingredients: ["Açaí", "Granola", "Plátano", "Bayas", "Mantequilla de almendras", "Leche de almendras"],
          tags: ["Antioxidantes", "Energía sostenida", "Equilibrado"]
        }
      ]
    }

    return goalRecipes[userProfile.main_goal as keyof typeof goalRecipes] || goalRecipes.lose_weight
  }

  // Generar entrenamientos personalizados basados en el perfil
  const getPersonalizedWorkouts = () => {
    console.log('🏋️ Generando entrenamientos para:', userProfile.training_location, userProfile.main_goal)
    
    const locationWorkouts = {
      home: [
        {
          id: 1,
          name: "HIIT en Casa - Quema de Grasa",
          duration: "25 min",
          difficulty: "Medio",
          calories: 300,
          description: "Entrenamiento de alta intensidad perfecto para perder peso en casa",
          exercises: ["Burpees", "Mountain Climbers", "Jump Squats", "Push-ups", "Plank"],
          equipment: ["Ninguno"],
          target: "Pérdida de peso",
          days: "3-4 días/semana"
        },
        {
          id: 2,
          name: "Yoga Flow para Principiantes",
          duration: "30 min",
          difficulty: "Fácil",
          calories: 150,
          description: "Rutina de yoga suave para mejorar flexibilidad y reducir estrés",
          exercises: ["Saludo al Sol", "Posturas de equilibrio", "Flexiones hacia atrás", "Relajación"],
          equipment: ["Esterilla de yoga"],
          target: "Flexibilidad y relajación",
          days: "Diario"
        },
        {
          id: 5,
          name: "Rutina de Fuerza en Casa",
          duration: "35 min",
          difficulty: "Medio",
          calories: 250,
          description: "Entrenamiento de fuerza usando solo el peso corporal y objetos domésticos",
          exercises: ["Flexiones", "Sentadillas", "Lunges", "Plancha", "Burpees"],
          equipment: ["Silla", "Botellas de agua"],
          target: "Tonificación muscular",
          days: "4-5 días/semana"
        }
      ],
      gym: [
        {
          id: 3,
          name: "Rutina de Fuerza Completa",
          duration: "45 min",
          difficulty: "Avanzado",
          calories: 400,
          description: "Entrenamiento de fuerza para ganar masa muscular y fuerza",
          exercises: ["Press de banca", "Sentadillas", "Peso muerto", "Remo con barra", "Press militar"],
          equipment: ["Barra", "Discos", "Mancuernas", "Banco"],
          target: "Ganancia de masa muscular",
          days: "4-5 días/semana"
        },
        {
          id: 4,
          name: "Cardio Intenso con Pesas",
          duration: "35 min",
          difficulty: "Medio",
          calories: 350,
          description: "Combinación de cardio y fuerza para máxima quema de calorías",
          exercises: ["Thruster", "Kettlebell Swing", "Box Jumps", "Battle Ropes", "Burpees con peso"],
          equipment: ["Kettlebell", "Caja", "Battle Ropes"],
          target: "Pérdida de peso y tonificación",
          days: "3-4 días/semana"
        },
        {
          id: 6,
          name: "Rutina de Hipertrofia",
          duration: "60 min",
          difficulty: "Avanzado",
          calories: 450,
          description: "Entrenamiento enfocado en ganancia de masa muscular con ejercicios compuestos",
          exercises: ["Sentadillas con barra", "Press de banca", "Peso muerto", "Remo con barra", "Press militar"],
          equipment: ["Barra olímpica", "Discos", "Banco", "Rack"],
          target: "Ganancia de masa muscular",
          days: "5-6 días/semana"
        }
      ]
    }

    const workouts = locationWorkouts[userProfile.training_location as keyof typeof locationWorkouts] || locationWorkouts.home
    console.log('🏋️ Entrenamientos generados:', workouts.length)
    return workouts
  }

  const recipes = getPersonalizedRecipes()
  const workouts = getPersonalizedWorkouts()

  const getGoalText = (goal: string) => {
    switch (goal) {
      case 'lose_weight': return 'Pérdida de Peso'
      case 'gain_muscle': return 'Ganancia de Masa Muscular'
      case 'body_recomposition': return 'Recomposición Corporal'
      default: return 'Fitness General'
    }
  }

  const getActivityText = (activity: string) => {
    switch (activity) {
      case 'sedentary': return 'Sedentario'
      case 'light': return 'Ligero'
      case 'moderate': return 'Moderado'
      case 'active': return 'Activo'
      case 'very_active': return 'Muy Activo'
      default: return 'Moderado'
    }
  }

  return (
    <div className="w-full">
      <Card className="border-0 bg-white/90 backdrop-blur-sm shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-800 flex items-center justify-center gap-3">
            <Star className="w-8 h-8 text-yellow-500" />
            Recomendaciones Personalizadas para Ti
          </CardTitle>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              <Target className="w-4 h-4 mr-2" />
              {getGoalText(userProfile.main_goal)}
            </Badge>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <TrendingUp className="w-4 h-4 mr-2" />
              Actividad {getActivityText(userProfile.activity_level)}
            </Badge>
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              <Dumbbell className="w-4 h-4 mr-2" />
              {userProfile.training_location === 'home' ? 'En Casa' : 'En Gimnasio'}
            </Badge>
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              <Clock className="w-4 h-4 mr-2" />
              {userProfile.training_days_per_week} días/semana
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <div className="flex justify-center mb-8">
            <div className="bg-gray-100 rounded-lg p-1">
              <Button
                variant={activeTab === 'recipes' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('recipes')}
                className={`${
                  activeTab === 'recipes' 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                    : 'text-gray-600'
                }`}
              >
                <ChefHat className="w-4 h-4 mr-2" />
                Recetas Personalizadas
              </Button>
              <Button
                variant={activeTab === 'workouts' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('workouts')}
                className={`${
                  activeTab === 'workouts' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white' 
                    : 'text-gray-600'
                }`}
              >
                <Dumbbell className="w-4 h-4 mr-2" />
                Entrenamientos Personalizados
              </Button>
            </div>
          </div>

          {/* Contenido de Recetas */}
          {activeTab === 'recipes' && (
    <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  🍽️ Recetas Adaptadas a tu Objetivo
                </h3>
        <p className="text-gray-600">
                  Recetas seleccionadas especialmente para ayudarte a alcanzar tu meta de <strong>{getGoalText(userProfile.main_goal)}</strong>
        </p>
      </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {recipes.map((recipe) => (
                  <Card key={recipe.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl">{recipe.name}</CardTitle>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          {recipe.difficulty}
                        </Badge>
                      </div>
                      <p className="text-gray-600">{recipe.description}</p>
                </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <Flame className="w-5 h-5 text-red-500 mx-auto mb-1" />
                          <p className="text-sm font-medium">{recipe.calories} cal</p>
                        </div>
                        <div className="text-center">
                          <Apple className="w-5 h-5 text-green-500 mx-auto mb-1" />
                          <p className="text-sm font-medium">{recipe.protein}g proteína</p>
                        </div>
                        <div className="text-center">
                          <TrendingUp className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                          <p className="text-sm font-medium">{recipe.carbs}g carbos</p>
                    </div>
                        <div className="text-center">
                          <Heart className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                          <p className="text-sm font-medium">{recipe.fat}g grasa</p>
                  </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">{recipe.time}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-4">
                        {recipe.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      
                      <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white">
                        Ver Receta Completa
                      </Button>
                </CardContent>
              </Card>
                ))}
              </div>
            </div>
          )}

          {/* Contenido de Entrenamientos */}
          {activeTab === 'workouts' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  💪 Entrenamientos Adaptados a tu Nivel
                </h3>
                <p className="text-gray-600">
                  Rutinas diseñadas para entrenar <strong>{userProfile.training_location === 'home' ? 'en casa' : 'en el gimnasio'}</strong> 
                  con tu nivel de actividad <strong>{getActivityText(userProfile.activity_level)}</strong>
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {workouts.map((workout) => (
                  <Card key={workout.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl">{workout.name}</CardTitle>
                        <Badge variant="outline" className="bg-purple-50 text-purple-700">
                          {workout.difficulty}
                        </Badge>
                      </div>
                      <p className="text-gray-600">{workout.description}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <Clock className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                          <p className="text-sm font-medium">{workout.duration}</p>
                        </div>
                        <div className="text-center">
                          <Flame className="w-5 h-5 text-red-500 mx-auto mb-1" />
                          <p className="text-sm font-medium">{workout.calories} cal</p>
                        </div>
                        <div className="text-center">
                          <Users className="w-5 h-5 text-green-500 mx-auto mb-1" />
                          <p className="text-sm font-medium">{workout.days}</p>
                    </div>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Ejercicios incluidos:</p>
                        <div className="flex flex-wrap gap-1">
                          {workout.exercises.map((exercise, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {exercise}
                            </Badge>
                          ))}
                    </div>
                  </div>
                  
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-1">Equipamiento necesario:</p>
                        <p className="text-sm text-gray-600">{workout.equipment.join(', ')}</p>
                    </div>
                      
                      <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white">
                        Comenzar Entrenamiento
                      </Button>
                </CardContent>
              </Card>
                ))}
              </div>
            </div>
          )}

          {/* Botón de acción */}
          <div className="text-center mt-8">
        <Button
              onClick={onComplete}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 text-lg"
            >
              ¡Empezar Mi Plan Personalizado!
        </Button>
      </div>
        </CardContent>
      </Card>
    </div>
  )
}