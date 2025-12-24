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
  const [showAllRecipes, setShowAllRecipes] = useState(false)
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([])
  const [loadingRecipes, setLoadingRecipes] = useState(false)
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

  // Cargar recetas recomendadas o todas las disponibles
  const handleViewAllRecipes = async () => {
    setLoadingRecipes(true)
    setShowAllRecipes(true)
    try {
      // Extraer todos los recipeId de las opciones recomendadas (pueden ser números o UUIDs)
      const recipeIds = options
        .map(option => option.recipeId)
        .filter((id): id is number | string => id !== undefined && id !== null)
      
      let loadedRecipes: Recipe[] = []

      if (recipeIds.length > 0) {
        // Cargar las recetas específicas de las opciones
        const recipePromises = recipeIds.map(async (recipeId) => {
          try {
            const recipe = await nutritionService.getRecipe(recipeId)
            return recipe
          } catch (error) {
            console.warn(`Error cargando receta ${recipeId}:`, error)
            return null
          }
        })

        const loaded = await Promise.all(recipePromises)
        loadedRecipes = loaded.filter((recipe): recipe is Recipe => recipe !== null)
      }

      // Si no hay recetas específicas o hay pocas, cargar todas las recetas disponibles
      // y filtrarlas por tipo de comida
      if (loadedRecipes.length === 0) {
        console.log('📚 Cargando todas las recetas disponibles...')
        const allRecipes = await nutritionService.listRecipes()
        
        // Filtrar recetas por tipo de comida si es posible
        const mealType = mealTypeMap[mealName] || "lunch"
        const filteredRecipes = allRecipes.filter(r => {
          // Si la receta tiene meal_types, verificar que coincida
          if (r.meal_types && Array.isArray(r.meal_types)) {
            return r.meal_types.includes(mealType) || r.meal_types.length === 0
          }
          // Si no tiene meal_types, incluirla de todas formas
          return true
        })
        
        loadedRecipes = filteredRecipes.length > 0 ? filteredRecipes : allRecipes
        console.log(`✅ Cargadas ${loadedRecipes.length} recetas para ${mealName}`)
      }
      
      setAllRecipes(loadedRecipes)
    } catch (error) {
      console.error('Error cargando recetas:', error)
      alert('Error al cargar las recetas. Por favor, intenta de nuevo.')
      setAllRecipes([])
    } finally {
      setLoadingRecipes(false)
    }
  }

  const handleViewRecipe = async (option: MealOption) => {
    setLoadingRecipe(true)
    try {
      const mealType = mealTypeMap[mealName] || "lunch"
      let recipe: Recipe | null = null
      let recipeId: number | null = null

      // Validar y obtener recipeId
      if (option.recipeId) {
        // El ID puede ser un número o un UUID (string)
        // Si es string, verificar si es UUID o número
        if (typeof option.recipeId === 'string') {
          // Verificar si es un UUID (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          if (uuidRegex.test(option.recipeId)) {
            // Es un UUID, usarlo como string
            recipeId = option.recipeId
            console.log('✅ recipeId es UUID:', recipeId)
          } else {
            // Intentar convertir a número
            const parsed = parseInt(option.recipeId, 10)
            if (!isNaN(parsed) && parsed > 0) {
              recipeId = parsed
              console.log('✅ recipeId convertido a número:', recipeId)
            } else {
              console.error('❌ recipeId inválido (no es UUID ni número):', option.recipeId)
              setLoadingRecipe(false)
              alert(`Error: ID de receta inválido (${option.recipeId}). Esta opción no tiene una receta específica asociada.`)
              handleViewAllRecipes()
              return
            }
          }
        } else {
          // Es un número
          recipeId = option.recipeId
          console.log('✅ recipeId es número:', recipeId)
        }
        
        console.log('✅ recipeId válido:', { 
          original: option.recipeId, 
          final: recipeId, 
          tipo: typeof recipeId,
          optionName: option.name,
          optionId: option.id 
        })
      } else {
        // Si no hay recipeId, buscar la primera receta recomendada de otras opciones
        console.log('⚠️ Esta opción no tiene receta asociada:', option.name)
        console.log('🔍 Buscando primera receta recomendada de otras opciones...')
        
        // Buscar la primera opción que tenga recipeId
        const optionWithRecipe = options.find(opt => opt.recipeId !== undefined && opt.recipeId !== null)
        
        if (optionWithRecipe && optionWithRecipe.recipeId) {
          console.log('✅ Encontrada opción con receta:', optionWithRecipe.name, optionWithRecipe.recipeId)
          // Usar el recipeId de esa opción
          if (typeof optionWithRecipe.recipeId === 'string') {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            if (uuidRegex.test(optionWithRecipe.recipeId)) {
              recipeId = optionWithRecipe.recipeId
            } else {
              const parsed = parseInt(optionWithRecipe.recipeId, 10)
              if (!isNaN(parsed) && parsed > 0) {
                recipeId = parsed
              }
            }
          } else {
            recipeId = optionWithRecipe.recipeId
          }
        } else {
          // Si ninguna opción tiene recipeId, buscar la primera receta disponible para este tipo de comida
          console.log('📚 Ninguna opción tiene receta, buscando primera receta disponible para:', mealType)
          try {
            const allRecipes = await nutritionService.listRecipes()
            // Filtrar recetas por tipo de comida si es posible
            const filteredRecipes = allRecipes.filter(r => {
              if (r.meal_types && Array.isArray(r.meal_types)) {
                return r.meal_types.includes(mealType) || r.meal_types.length === 0
              }
              return true
            })
            
            if (filteredRecipes.length > 0) {
              const firstRecipe = filteredRecipes[0]
              console.log('✅ Encontrada primera receta disponible:', firstRecipe.name, firstRecipe.id)
              recipeId = firstRecipe.id
            } else if (allRecipes.length > 0) {
              const firstRecipe = allRecipes[0]
              console.log('✅ Encontrada primera receta disponible (sin filtro):', firstRecipe.name, firstRecipe.id)
              recipeId = firstRecipe.id
            } else {
              console.error('❌ No hay recetas disponibles')
              setLoadingRecipe(false)
              alert('No hay recetas disponibles para esta comida. Por favor, intenta más tarde.')
              return
            }
          } catch (error) {
            console.error('❌ Error buscando recetas:', error)
            setLoadingRecipe(false)
            alert('Error al buscar recetas. Por favor, intenta de nuevo.')
            return
          }
        }
        
        // Continuar con el flujo normal usando el recipeId encontrado
        console.log('✅ Usando recipeId encontrado:', recipeId)
      }

      console.log('🔍 Cargando receta personalizada:', { 
        recipeId, 
        mealType, 
        mealName,
        optionName: option.name,
        optionId: option.id
      })
      
      const data = await nutritionService.getPersonalizedRecipe(recipeId, mealType)
      
      // Validar que la receta cargada corresponde a la opción seleccionada
      if (data && data.recipe) {
        // Comparar IDs (pueden ser string o number, así que convertimos ambos a string para comparar)
        const loadedId = String(data.recipe.id)
        const expectedId = String(recipeId)
        
        console.log('✅ Receta cargada:', { 
          loadedRecipeId: data.recipe.id, 
          loadedRecipeName: data.recipe.name,
          expectedRecipeId: recipeId,
          optionName: option.name,
          idsMatch: loadedId === expectedId
        })
        
        // Verificar que el ID de la receta cargada coincide con el esperado
        if (loadedId !== expectedId) {
          console.error('❌ ERROR: La receta cargada no coincide con el ID esperado!', {
            expected: recipeId,
            expectedString: expectedId,
            received: data.recipe.id,
            receivedString: loadedId,
            optionName: option.name
          })
          setLoadingRecipe(false)
          alert(`Error: Se cargó una receta diferente (${data.recipe.name}) a la esperada. Por favor, intenta de nuevo.`)
          return
        }
      }

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
        // Si ya tenemos la receta de la búsqueda, usarla directamente
        if (recipe) {
          console.log('✅ Usando receta encontrada por búsqueda:', recipe.name)
          const mappedIngredients = (recipe.ingredients || []).map((ing: any) => ({
            name: ing.name || 'Ingrediente',
            amount: ing.amount || null,
            unit: ing.unit || null,
            note: typeof ing.amount === 'string' && !ing.unit ? ing.amount : undefined
          }))

          setRecipeData({
            recipe: recipe,
            personalized: {
              scale_factor: 1,
              ingredients: mappedIngredients,
              macros: {
                calories: recipe.calories || 0,
                protein: recipe.protein || 0,
                carbs: recipe.carbs || 0,
                fat: recipe.fat || 0,
                fiber: recipe.fiber || 0
              },
              servings: recipe.servings || 1,
              target_calories: recipe.calories || 0,
              original_calories: recipe.calories || 0,
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
        } else if (recipeId) {
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
            console.error('❌ No se pudo cargar la receta básica (404), abriendo modal de todas las recetas')
            // Si no se puede cargar la receta básica, abrir el modal de todas las recetas
            handleViewAllRecipes()
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Error cargando receta:', error)
      const errorMessage = error?.message || 'Error desconocido al cargar la receta'
      
      // Si es un error 404 (receta no encontrada), abrir el modal de todas las recetas
      if (errorMessage.includes('404') || errorMessage.includes('Not Found') || errorMessage.includes('No Recipe matches')) {
        console.log('⚠️ Receta no encontrada (404), abriendo modal de todas las recetas disponibles')
        setLoadingRecipe(false)
        handleViewAllRecipes()
        return
      }
      
      // Para otros errores, mostrar alerta pero también ofrecer ver todas las recetas
      const shouldOpenAllRecipes = confirm(
        `Error al cargar la receta: ${errorMessage}\n\n¿Deseas ver todas las recetas disponibles?`
      )
      
      if (shouldOpenAllRecipes) {
        setLoadingRecipe(false)
        handleViewAllRecipes()
      }
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
        <div className="w-full max-w-md h-[90vh] z-[9999] rounded-2xl overflow-hidden shadow-2xl bg-white border-2 border-purple-100 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-2xl flex-shrink-0">
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

            {/* Content - Scrollable */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  Selecciona una opción para {mealName.toLowerCase()}:
                </p>
                <button
                  onClick={handleViewAllRecipes}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-1.5"
                  disabled={loadingRecipes}
                >
                  {loadingRecipes ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Cargando...
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-3 h-3" />
                      Ver Recetas Disponibles
                    </>
                  )}
                </button>
              </div>

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

                      {/* Botón Ver Receta - Siempre disponible */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewRecipe(option)
                        }}
                        className="w-full mt-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                        disabled={loadingRecipe}
                      >
                        {loadingRecipe ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Buscando receta...
                          </>
                        ) : (
                          <>
                            <BookOpen className="w-4 h-4" />
                            📖 Ver Receta
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={onClose}
                className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
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

      {/* Modal de Todas las Recetas */}
      {showAllRecipes && (
        <AllRecipesModal
          recipes={allRecipes}
          mealName={mealName}
          mealTime={mealTime}
          loading={loadingRecipes}
          onClose={() => setShowAllRecipes(false)}
          onSelectRecipe={async (recipe: Recipe) => {
            console.log('📋 Seleccionando receta del modal:', recipe.name, recipe.id)
            try {
              setLoadingRecipe(true)
              const mealType = mealTypeMap[mealName] || "lunch"
              
              // Cerrar el modal de todas las recetas PRIMERO
              console.log('🔒 Cerrando modal de todas las recetas')
              setShowAllRecipes(false)
              
              // Pequeño delay para asegurar que el modal se cierre antes de mostrar el nuevo
              await new Promise(resolve => setTimeout(resolve, 100))
              
              // Intentar obtener receta personalizada
              let data = null
              try {
                console.log('🔍 Intentando cargar receta personalizada:', recipe.id, mealType)
                data = await nutritionService.getPersonalizedRecipe(recipe.id, mealType)
                console.log('✅ Receta personalizada cargada:', data?.recipe?.name)
              } catch (error: any) {
                console.warn('⚠️ No se pudo obtener receta personalizada, intentando básica:', error)
                // Si es 404, usar la receta básica directamente
                if (error?.message?.includes('404') || error?.message?.includes('Not Found')) {
                  console.log('⚠️ Receta personalizada no encontrada (404), usando receta básica')
                }
              }
              
              if (data && data.recipe && data.personalized_quantities) {
                // Mostrar modal de detalle con receta personalizada
                console.log('📝 Configurando datos de receta personalizada')
                setRecipeData({
                  recipe: data.recipe,
                  personalized: data.personalized_quantities,
                  userProfile: data.user_profile
                })
                console.log('✅ Abriendo modal de detalle de receta')
                setShowRecipe(true)
              } else {
                // Fallback a receta básica
                try {
                  console.log('🔍 Cargando receta básica:', recipe.id)
                  const basicRecipe = await nutritionService.getRecipe(recipe.id)
                  if (basicRecipe) {
                    console.log('✅ Receta básica cargada:', basicRecipe.name)
                    // Mapear ingredientes al formato correcto
                    const mappedIngredients = (basicRecipe.ingredients || []).map((ing: any) => ({
                      name: ing.name || 'Ingrediente',
                      amount: ing.amount || null,
                      unit: ing.unit || null,
                      note: typeof ing.amount === 'string' && !ing.unit ? ing.amount : undefined
                    }))
                    
                    // Crear datos básicos para el modal de detalle
                    const basicPersonalized = {
                      macros: {
                        calories: basicRecipe.calories || 0,
                        protein: basicRecipe.protein || 0,
                        carbs: basicRecipe.carbs || 0,
                        fat: basicRecipe.fat || 0
                      },
                      ingredients: mappedIngredients,
                      servings: basicRecipe.servings || 1,
                      scale_factor: 1,
                      meal_percentage: 0,
                      original_calories: basicRecipe.calories || 0
                    }
                    
                    console.log('📝 Configurando datos de receta básica')
                    setRecipeData({
                      recipe: basicRecipe,
                      personalized: basicPersonalized,
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
                    console.log('✅ Abriendo modal de detalle de receta')
                    setShowRecipe(true)
                  } else {
                    console.error('❌ No se pudo cargar la receta básica')
                    alert('No se pudo cargar la receta. Por favor, intenta de nuevo.')
                  }
                } catch (basicError: any) {
                  console.error('❌ Error cargando receta básica:', basicError)
                  // Si también falla la receta básica, mostrar error pero no abrir modal de todas las recetas
                  alert('Error al cargar la receta. Por favor, intenta de nuevo.')
                }
              }
            } catch (error) {
              console.error('❌ Error general cargando receta:', error)
              alert('Error al cargar la receta. Por favor, intenta de nuevo.')
            } finally {
              setLoadingRecipe(false)
            }
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
      <div className="w-full max-w-3xl h-[90vh] z-[9999] rounded-2xl overflow-hidden shadow-2xl bg-white flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-50 to-pink-50 border-b border-orange-100 p-6 rounded-t-2xl flex-shrink-0">
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

          {/* Content - Scrollable */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
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
            </div>

            {/* Instrucciones */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-orange-500" />
                Instrucciones de Preparación
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                {(() => {
                  // Verificar si hay instrucciones válidas (no vacías ni genéricas)
                  const hasValidInstructions = recipe.instructions && 
                    recipe.instructions.trim() !== '' && 
                    !recipe.instructions.toLowerCase().includes('seguir preparación indicada') &&
                    !recipe.instructions.toLowerCase().includes('seguir preparación')

                  if (hasValidInstructions) {
                    // Dividir instrucciones por líneas y numerarlas
                    const instructionsList = typeof recipe.instructions === 'string'
                      ? recipe.instructions.split('\n').filter(line => line.trim() && 
                          !line.toLowerCase().includes('seguir preparación indicada') &&
                          !line.toLowerCase().includes('seguir preparación'))
                      : Array.isArray(recipe.instructions)
                        ? recipe.instructions.filter(inst => 
                            typeof inst === 'string' && 
                            inst.trim() !== '' &&
                            !inst.toLowerCase().includes('seguir preparación indicada') &&
                            !inst.toLowerCase().includes('seguir preparación'))
                        : []

                    if (instructionsList.length > 0) {
                      return instructionsList.map((instruction: string, index: number) => (
                        <div key={index} className="flex gap-3">
                          <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-orange-400 to-pink-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <p className="text-gray-700 flex-1 leading-relaxed">{instruction.trim()}</p>
                        </div>
                      ))
                    }
                  }
                  
                  // Si no hay instrucciones válidas, mostrar mensaje
                  return (
                    <div className="text-center py-4">
                      <p className="text-gray-500 italic mb-2">No hay instrucciones detalladas disponibles para esta receta.</p>
                      <p className="text-sm text-gray-400">Las instrucciones se agregarán próximamente.</p>
                    </div>
                  )
                })()}
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
          <div className="bg-white border-t border-gray-200 p-6 rounded-b-2xl flex-shrink-0">
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
  )

  return typeof document !== 'undefined' && createPortal(modalContent, document.body)
}

// Componente para mostrar todas las recetas disponibles
interface AllRecipesModalProps {
  recipes: Recipe[]
  mealName: string
  mealTime: string
  loading: boolean
  onClose: () => void
  onSelectRecipe: (recipe: Recipe) => void | Promise<void>
}

function AllRecipesModal({
  recipes,
  mealName,
  mealTime,
  loading,
  onClose,
  onSelectRecipe
}: AllRecipesModalProps) {
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  // Filtrar recetas por búsqueda y categoría
  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         recipe.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || 
                           recipe.category?.toLowerCase() === selectedCategory.toLowerCase() ||
                           (recipe.meal_types && recipe.meal_types.includes(selectedCategory))
    return matchesSearch && matchesCategory
  })

  // Obtener categorías únicas
  const categories = Array.from(new Set(recipes.map(r => r.category).filter(Boolean)))

  const modalContent = (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[90vh] z-[9999] rounded-2xl overflow-hidden shadow-2xl bg-white flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100 p-6 rounded-t-2xl flex-shrink-0">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-purple-600" />
                  Recetas Recomendadas
                </h2>
                <p className="text-sm text-gray-600">
                  Recetas sugeridas para {mealName} ({mealTime}) según tu plan de nutrición
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors ml-4"
                aria-label="Cerrar"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Búsqueda y Filtros */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <input
                type="text"
                placeholder="Buscar recetas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                aria-label="Filtrar por categoría"
                title="Filtrar por categoría"
              >
                <option value="all">Todas las categorías</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="p-6 overflow-y-auto flex-1 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                <span className="ml-3 text-gray-600">Cargando recetas...</span>
              </div>
            ) : filteredRecipes.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">
                  {searchQuery || selectedCategory !== "all" 
                    ? "No se encontraron recetas con los filtros seleccionados"
                    : "No hay recetas recomendadas disponibles para esta comida"}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Las recetas se muestran según las recomendaciones de tu plan de nutrición activo
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRecipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer group"
                    onClick={async () => {
                      console.log('🔘 Tarjeta de receta clickeada:', recipe.name)
                      await onSelectRecipe(recipe)
                    }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <ChefHat className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-purple-600">
                          {recipe.name}
                        </h3>
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {recipe.description}
                        </p>
                      </div>
                    </div>

                    {/* Macros */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      <div className="text-center">
                        <div className="text-sm font-bold text-orange-600">{recipe.calories}</div>
                        <div className="text-xs text-gray-500">kcal</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-blue-600">{formatMacro(recipe.protein)}</div>
                        <div className="text-xs text-gray-500">P</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-green-600">{formatMacro(recipe.carbs)}</div>
                        <div className="text-xs text-gray-500">C</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-yellow-600">{formatMacro(recipe.fat)}</div>
                        <div className="text-xs text-gray-500">G</div>
                      </div>
                    </div>

                    {/* Info adicional */}
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                      {recipe.prep_time_minutes > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {recipe.prep_time_minutes} min
                        </span>
                      )}
                      {recipe.difficulty && (
                        <span className="px-2 py-0.5 bg-gray-100 rounded">
                          {recipe.difficulty}
                        </span>
                      )}
                    </div>

                    {/* Botón seleccionar */}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        console.log('🔘 Botón Seleccionar clickeado para:', recipe.name)
                        await onSelectRecipe(recipe)
                      }}
                      className="w-full mt-3 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 rounded-lg transition-all"
                    >
                      Seleccionar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-white border-t border-gray-200 p-4 rounded-b-2xl flex-shrink-0">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cerrar
            </button>
          </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' && createPortal(modalContent, document.body)
}
