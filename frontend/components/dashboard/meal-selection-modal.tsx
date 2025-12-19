'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MealOption, nutritionService, Recipe, PersonalizedRecipeQuantities } from '@/lib/nutrition-service'
import { X, Clock, Zap, Leaf, ChefHat, Target, Users, BookOpen, Loader2 } from 'lucide-react'
import { formatMacro } from '@/lib/utils'

interface MealSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  mealName: string
  mealTime: string
  options: MealOption[]
  onSelectOption: (option: MealOption) => void
}

export function MealSelectionModal({
  isOpen,
  onClose,
  mealName,
  mealTime,
  options,
  onSelectOption
}: MealSelectionModalProps) {
  const [selectedOption, setSelectedOption] = useState<MealOption | null>(null)
  const [showRecipe, setShowRecipe] = useState(false)
  const [recipeData, setRecipeData] = useState<{
    recipe: Recipe
    personalized: PersonalizedRecipeQuantities
    userProfile: any
  } | null>(null)
  const [loadingRecipe, setLoadingRecipe] = useState(false)

  // Mapeo de nombres de comida a tipos de comida del backend
  const mealTypeMap: Record<string, string> = {
    "Desayuno": "breakfast",
    "Snack Mañana": "morning_snack",
    "Almuerzo": "lunch",
    "Snack Tarde": "afternoon_snack",
    "Cena": "dinner"
  }

  const handleViewRecipe = async (option: MealOption) => {
    if (!option.recipeId) {
      console.warn('No hay recipeId en la opción:', option)
      return
    }

    setLoadingRecipe(true)
    try {
      const mealType = mealTypeMap[mealName] || "lunch"
      // Asegurar que recipeId sea un número
      const recipeId = typeof option.recipeId === 'string' ? parseInt(option.recipeId, 10) : option.recipeId

      if (isNaN(recipeId)) {
        console.error('recipeId inválido:', option.recipeId)
        setLoadingRecipe(false)
        alert('Error: ID de receta inválido')
        return
      }

      console.log('🔍 Cargando receta personalizada:', { recipeId, mealType, mealName })
      
      const data = await nutritionService.getPersonalizedRecipe(recipeId, mealType)

      if (data && data.recipe) {
        console.log('✅ Receta cargada exitosamente:', data.recipe.name)
        setRecipeData({
          recipe: data.recipe,
          personalized: data.personalized_quantities,
          userProfile: data.user_profile
        })
        setShowRecipe(true)
      } else {
        console.warn('⚠️ No se recibieron datos de la receta personalizada, intentando receta básica...')
        // Intentar cargar la receta básica como fallback
        const basicRecipe = await nutritionService.getRecipe(recipeId)
        if (basicRecipe) {
          console.log('✅ Receta básica cargada:', basicRecipe.name)
          // Crear datos básicos de personalización
          // Mapear ingredientes al formato correcto
          const mappedIngredients = (basicRecipe.ingredients || []).map((ing: any) => ({
            name: ing.name || 'Ingrediente',
            amount: ing.amount || null,
            unit: ing.unit || null,
            note: typeof ing.amount === 'string' && !ing.unit ? ing.amount : undefined
          }))

          setRecipeData({
            recipe: basicRecipe,
            personalized: {
              scale_factor: 1,
              ingredients: mappedIngredients,
              macros: {
                calories: basicRecipe.calories || 0,
                protein: basicRecipe.protein || 0,
                carbs: basicRecipe.carbs || 0,
                fat: basicRecipe.fat || 0,
                fiber: basicRecipe.fiber || 0
              },
              servings: basicRecipe.servings || 1,
              target_calories: basicRecipe.calories || 0,
              original_calories: basicRecipe.calories || 0,
              meal_type: mealType,
              meal_percentage: 25
            },
            userProfile: {
              weight: 70,
              height: 170,
              age: 30,
              gender: 'male',
              main_goal: 'maintain',
              activity_level: 'moderate',
              daily_calories_target: 2000
            }
          })
          setShowRecipe(true)
        } else {
          console.error('❌ No se pudo cargar la receta básica')
          alert(`No se pudo cargar la receta. Por favor, verifica que la receta con ID ${recipeId} exista en la base de datos.`)
        }
      }
    } catch (error: any) {
      console.error('❌ Error cargando receta:', error)
      const errorMessage = error?.message || 'Error desconocido al cargar la receta'
      alert(`Error al cargar la receta: ${errorMessage}\n\nPor favor, verifica la consola para más detalles.`)
    } finally {
      setLoadingRecipe(false)
    }
  }

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!isOpen || !mounted) return null

  const handleSelectOption = (option: MealOption) => {
    setSelectedOption(option)
    onSelectOption(option)
    onClose()
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'protein-rich':
        return <Zap className="w-4 h-4 text-red-500" />
      case 'balanced':
        return <Leaf className="w-4 h-4 text-green-500" />
      case 'light':
        return <Clock className="w-4 h-4 text-blue-500" />
      default:
        return <Leaf className="w-4 h-4 text-gray-500" />
    }
  }

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'protein-rich':
        return 'Rico en proteínas'
      case 'balanced':
        return 'Equilibrado'
      case 'light':
        return 'Ligero'
      default:
        return 'General'
    }
  }

  const modalContent = (
    <>
      <div className="fixed inset-0 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-orange-500/20 backdrop-blur-sm z-[9998] flex items-center justify-center p-4">
        <div className="w-full max-w-md max-h-[90vh] overflow-y-auto z-[9999]">
          <div className="bg-white rounded-2xl w-full shadow-2xl border-2 border-purple-100">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-2xl">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{mealName}</h3>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {mealTime}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-600 mb-4">
                Selecciona una opción para {mealName.toLowerCase()}:
              </p>

              {options.map((option) => (
                <div
                  key={option.id}
                  onClick={() => handleSelectOption(option)}
                  className={`border rounded-lg p-3 cursor-pointer transition-all ${
                    option.recipeId 
                      ? 'border-orange-200 bg-gradient-to-br from-orange-50 to-pink-50 hover:border-orange-400 hover:shadow-md' 
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{option.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">{option.name}</h4>
                        {option.recipeId && (
                          <>
                            <span className="px-2 py-0.5 bg-gradient-to-r from-orange-100 to-pink-100 text-orange-700 text-xs font-medium rounded-full flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              Receta disponible
                            </span>
                            <span className="px-2 py-0.5 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 text-xs font-medium rounded-full flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              Recomendado
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{option.description}</p>

                      {/* Macros */}
                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-orange-500" />
                          {option.calories} kcal
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          {formatMacro(option.protein)}g proteína
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          {formatMacro(option.carbs)}g carbos
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-yellow-500" />
                          {formatMacro(option.fat)}g grasas
                        </span>
                      </div>

                      {/* Categoría */}
                      <div className="flex items-center gap-2 mb-2">
                        {getCategoryIcon(option.category || "balanced")}
                        <span className="text-xs text-gray-500">
                          {getCategoryName(option.category || "balanced")}
                        </span>
                        {option.cookTime && (
                          <span className="text-xs text-gray-400">
                            • {option.cookTime}
                          </span>
                        )}
                      </div>

                      {/* Botón Ver Receta - Solo si tiene recipeId */}
                      {option.recipeId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewRecipe(option)
                          }}
                          className="w-full mt-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 animate-pulse hover:animate-none"
                          disabled={loadingRecipe}
                        >
                          {loadingRecipe ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Cargando receta...
                            </>
                          ) : (
                            <>
                              <BookOpen className="w-4 h-4" />
                              📖 Ver Receta Completa
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      {typeof document !== 'undefined' && createPortal(modalContent, document.body)}

      {/* Modal de Receta Completa */}
      {showRecipe && recipeData && (
        <RecipeDetailModal
          recipe={recipeData.recipe}
          personalized={recipeData.personalized}
          userProfile={recipeData.userProfile}
          mealName={mealName}
          onClose={() => setShowRecipe(false)}
          onSelectRecipe={() => {
            // Convertir receta a MealOption y seleccionar
            const recipeOption: MealOption = {
              id: `recipe-${recipeData.recipe.id}`,
              name: recipeData.recipe.name,
              calories: recipeData.personalized.macros.calories,
              protein: recipeData.personalized.macros.protein,
              carbs: recipeData.personalized.macros.carbs,
              fat: recipeData.personalized.macros.fat,
              category: "balanced",
              icon: "🍽️",
              description: recipeData.recipe.description,
              recipeId: recipeData.recipe.id
            }
            handleSelectOption(recipeOption)
            setShowRecipe(false)
          }}
        />
      )}
    </>
  )
}

// Componente para mostrar detalles de la receta
interface RecipeDetailModalProps {
  recipe: Recipe
  personalized: PersonalizedRecipeQuantities
  userProfile: any
  mealName: string
  onClose: () => void
  onSelectRecipe: () => void
}

function RecipeDetailModal({
  recipe,
  personalized,
  userProfile,
  mealName,
  onClose,
  onSelectRecipe
}: RecipeDetailModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'hard': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Fácil'
      case 'medium': return 'Medio'
      case 'hard': return 'Difícil'
      default: return difficulty
    }
  }

  const modalContent = (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto z-[9999]">
        <div className="bg-white rounded-2xl w-full shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-orange-50 to-pink-50 border-b border-orange-100 p-6 rounded-t-2xl">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-pink-500 rounded-xl flex items-center justify-center">
                    <ChefHat className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900">{recipe.name}</h2>
                    <p className="text-sm text-gray-600 mt-1">{recipe.description}</p>
                  </div>
                </div>

                {/* Badge de personalización */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Ajustado a tu perfil
                  </div>
                  {recipe.difficulty && (
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(recipe.difficulty)}`}>
                      {getDifficultyLabel(recipe.difficulty)}
                    </div>
                  )}
                  <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {recipe.prep_time_minutes || 0} min prep + {recipe.cook_time_minutes || 0} min cocción
                  </div>
                  <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {personalized.servings} {personalized.servings === 1 ? 'porción' : 'porciones'}
                  </div>
                  {recipe.category && (
                    <div className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                      {recipe.category}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors ml-4"
                aria-label="Cerrar"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Información de personalización */}
            <div className="bg-white/60 rounded-lg p-3 mt-3">
              <p className="text-xs text-gray-600">
                <span className="font-semibold">Cantidades ajustadas:</span> Esta receta aporta{' '}
                <span className="font-bold text-orange-600">{personalized.meal_percentage}%</span> de tus calorías diarias objetivo ({userProfile.daily_calories_target} kcal).
                Las cantidades se han ajustado según tu peso ({userProfile.weight}kg), altura ({userProfile.height}cm) y objetivo ({userProfile.main_goal}).
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Macros personalizados */}
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center bg-orange-50 rounded-lg p-4 border border-orange-100">
                <div className="text-2xl font-bold text-orange-600 mb-1">
                  {personalized.macros.calories}
                </div>
                <div className="text-xs text-orange-500 font-medium">kcal</div>
                <div className="text-xs text-gray-400 mt-1">
                  Original: {personalized.original_calories}
                </div>
              </div>
              <div className="text-center bg-blue-50 rounded-lg p-4 border border-blue-100">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {formatMacro(personalized.macros.protein)}g
                </div>
                <div className="text-xs text-blue-500 font-medium">Proteína</div>
              </div>
              <div className="text-center bg-green-50 rounded-lg p-4 border border-green-100">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {formatMacro(personalized.macros.carbs)}g
                </div>
                <div className="text-xs text-green-500 font-medium">Carbos</div>
              </div>
              <div className="text-center bg-yellow-50 rounded-lg p-4 border border-yellow-100">
                <div className="text-2xl font-bold text-yellow-600 mb-1">
                  {formatMacro(personalized.macros.fat)}g
                </div>
                <div className="text-xs text-yellow-500 font-medium">Grasas</div>
              </div>
            </div>

            {/* Ingredientes personalizados */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-orange-500" />
                Ingredientes (Ajustados a tu perfil)
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                {personalized.ingredients.map((ingredient, index) => {
                  const amount = typeof ingredient.amount === 'string'
                    ? (parseFloat(ingredient.amount) || null)
                    : ingredient.amount

                  return (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                      <span className="text-gray-700 font-medium">{ingredient.name}</span>
                      <span className="text-gray-600 font-semibold">
                        {amount !== null && amount !== undefined ? `${amount} ${ingredient.unit || 'g'}` : ingredient.note || 'Ajustar según preferencia'}
                      </span>
                    </div>
                  )
                })}
              </div>
              {personalized.scale_factor !== 1 && (
                <p className="text-xs text-gray-500 mt-2">
                  Factor de ajuste: {personalized.scale_factor}x (cantidades multiplicadas por {personalized.scale_factor.toFixed(2)})
                </p>
              )}
            </div>

            {/* Instrucciones */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-orange-500" />
                Instrucciones de Preparación
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                {recipe.instructions ? (
                  (() => {
                    // Dividir instrucciones por líneas y numerarlas
                    const instructionsList = typeof recipe.instructions === 'string'
                      ? recipe.instructions.split('\n').filter(line => line.trim())
                      : Array.isArray(recipe.instructions)
                        ? recipe.instructions
                        : [recipe.instructions]

                    return instructionsList.map((instruction: string, index: number) => (
                      <div key={index} className="flex gap-3">
                        <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-orange-400 to-pink-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <p className="text-gray-700 flex-1 leading-relaxed">{instruction.trim()}</p>
                      </div>
                    ))
                  })()
                ) : (
                  <p className="text-gray-500 italic">No hay instrucciones disponibles para esta receta.</p>
                )}
              </div>
            </div>

            {/* Información nutricional adicional */}
            {(recipe.fiber || recipe.sugar || recipe.sodium) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Información Nutricional Adicional</h3>
                <div className="grid grid-cols-3 gap-4">
                  {recipe.fiber && (
                    <div className="text-center bg-purple-50 rounded-lg p-3 border border-purple-100">
                      <div className="text-lg font-bold text-purple-600">{formatMacro(recipe.fiber)}g</div>
                      <div className="text-xs text-purple-500 font-medium">Fibra</div>
                    </div>
                  )}
                  {recipe.sugar && (
                    <div className="text-center bg-pink-50 rounded-lg p-3 border border-pink-100">
                      <div className="text-lg font-bold text-pink-600">{formatMacro(recipe.sugar)}g</div>
                      <div className="text-xs text-pink-500 font-medium">Azúcar</div>
                    </div>
                  )}
                  {recipe.sodium && (
                    <div className="text-center bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                      <div className="text-lg font-bold text-indigo-600">{formatMacro(recipe.sodium)}mg</div>
                      <div className="text-xs text-indigo-500 font-medium">Sodio</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Imagen si está disponible */}
            {recipe.image_url && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Imagen de la Receta</h3>
                <img
                  src={recipe.image_url}
                  alt={recipe.name}
                  className="w-full rounded-lg object-cover shadow-md"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 rounded-b-2xl">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cerrar
              </button>
              <button
                onClick={onSelectRecipe}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg hover:from-orange-600 hover:to-pink-600 transition-colors font-medium shadow-lg"
              >
                Seleccionar esta Receta
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' && createPortal(modalContent, document.body)
}
