'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { MealOption, nutritionService, Recipe, PersonalizedRecipeQuantities } from '@/lib/nutrition-service'
import { X, Clock, Zap, Leaf, ChefHat, Target, Users, BookOpen, Loader2 } from 'lucide-react'
import { formatMacro } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

interface MealSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  mealName: string
  mealTime: string
  mealType?: string
  options: MealOption[]
  currentSelection?: {
    optionId?: string | null
    recipeId?: string | null
  }
  onSelectOption: (option: MealOption) => void
}

export function MealSelectionModal({
  isOpen,
  onClose,
  mealName,
  mealTime,
  mealType,
  options,
  currentSelection,
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
  const [excludedRecipeIds, setExcludedRecipeIds] = useState<Set<string>>(new Set())
  const [excludingRecipeId, setExcludingRecipeId] = useState<string | null>(null)
  const [excludingAllVisible, setExcludingAllVisible] = useState(false)

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
      const allRecipes = await nutritionService.listRecipes()

      // Filtrar recetas por tipo de comida si es posible
      const resolvedMealType = mealType || mealTypeMap[mealName] || "lunch"
      const filteredRecipes = allRecipes.filter(r => {
        if (r.meal_types && Array.isArray(r.meal_types)) {
          return r.meal_types.includes(resolvedMealType) || r.meal_types.length === 0
        }
        return true
      })

      setAllRecipes(filteredRecipes)
    } catch (error) {
      toast({
        title: 'No se pudieron cargar las recetas',
        description: 'Inténtalo de nuevo en unos segundos.',
        variant: 'destructive',
      })
      setAllRecipes([])
    } finally {
      setLoadingRecipes(false)
    }
  }

  const handleViewRecipe = async (option: MealOption) => {
    setLoadingRecipe(true)
    try {
      const resolvedMealType = mealType || mealTypeMap[mealName] || "lunch"
      let recipe: Recipe | null = null
      let recipeId: number | string | null = null

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
          } else {
            // Intentar convertir a número
            const parsed = parseInt(option.recipeId, 10)
            if (!isNaN(parsed) && parsed > 0) {
              recipeId = parsed
            } else {
              setLoadingRecipe(false)
              alert(`Error: ID de receta inválido (${option.recipeId}). Esta opción no tiene una receta específica asociada.`)
              handleViewAllRecipes()
              return
            }
          }
        } else {
          // Es un número
          recipeId = option.recipeId
        }
      } else {
        // Si no hay recipeId, buscar la primera receta recomendada de otras opciones
        
        // Buscar la primera opción que tenga recipeId
        const optionWithRecipe = options.find(opt => opt.recipeId !== undefined && opt.recipeId !== null)
        
        if (optionWithRecipe && optionWithRecipe.recipeId) {
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
          try {
            const allRecipes = await nutritionService.listRecipes()
            // Filtrar recetas por tipo de comida si es posible
            const filteredRecipes = allRecipes.filter(r => {
              if (r.meal_types && Array.isArray(r.meal_types)) {
                return r.meal_types.includes(mealType || '') || r.meal_types.length === 0
              }
              return true
            })
            
            if (filteredRecipes.length > 0) {
              const firstRecipe = filteredRecipes[0]
              recipeId = firstRecipe.id
            } else if (allRecipes.length > 0) {
              const firstRecipe = allRecipes[0]
              recipeId = firstRecipe.id
            } else {
              setLoadingRecipe(false)
              alert('No hay recetas disponibles para esta comida. Por favor, intenta más tarde.')
              return
            }
          } catch (error) {
            setLoadingRecipe(false)
            alert('Error al buscar recetas. Por favor, intenta de nuevo.')
            return
          }
        }
        
        // Continuar con el flujo normal usando el recipeId encontrado
      }
      const recipeInfo = {
        recipeId, 
        mealType: resolvedMealType, 
        mealName,
        optionName: option.name,
        optionId: option.id
      }
      
      const data = await nutritionService.getPersonalizedRecipe(recipeId!, resolvedMealType)
      
      // Validar que la receta cargada corresponde a la opción seleccionada
      if (data && data.recipe) {
        // Comparar IDs (pueden ser string o number, así que convertimos ambos a string para comparar)
        const loadedId = String(data.recipe.id)
        const expectedId = String(recipeId)
        // (debug object removed)
        
        // Verificar que el ID de la receta cargada coincide con el esperado
        if (loadedId !== expectedId) {
          // removed stray object literal
          setLoadingRecipe(false)
          alert(`Error: Se cargó una receta diferente (${data.recipe.name}) a la esperada. Por favor, intenta de nuevo.`)
          return
        }
      }

      if (data && data.recipe) {
        setRecipeData({
          recipe: data.recipe,
          personalized: data.personalized_quantities,
          userProfile: data.user_profile
        })
        setShowRecipe(true)
      } else {
        if (recipeId) {
          // Intentar cargar la receta básica como fallback
          const basicRecipe = await nutritionService.getRecipe(recipeId)
          if (basicRecipe) {
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
                meal_type: mealType || 'lunch',
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
            // Si no se puede cargar la receta básica, abrir el modal de todas las recetas
            handleViewAllRecipes()
          }
        }
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Error desconocido al cargar la receta'
      
      // Si es un error 404 (receta no encontrada), abrir el modal de todas las recetas
      if (errorMessage.includes('404') || errorMessage.includes('Not Found') || errorMessage.includes('No Recipe matches')) {
        setLoadingRecipe(false)
        handleViewAllRecipes()
        return
      }
      
      // Para otros errores, mostrar alerta pero también ofrecer ver todas las recetas
      const shouldOpenAllRecipes = confirm(
        `No se pudo cargar esta receta (${errorMessage}).\n\n¿Quieres ver todas las recetas disponibles?`
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

  // iOS Safari: evitar scroll-to-top al abrir modal con position:fixed
  useEffect(() => {
    if (!isOpen) return
    const scrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, scrollY)
    }
  }, [isOpen])

  useEffect(() => {
    let isActive = true
    const loadRecipeExclusions = async () => {
      const exclusions = await nutritionService.getRecipeExclusions()
      if (!isActive) return
      setExcludedRecipeIds(new Set(exclusions.map((item) => String(item.recipe_id))))
    }

    if (isOpen) {
      loadRecipeExclusions()
    }

    return () => {
      isActive = false
    }
  }, [isOpen])

  const visibleOptions = useMemo(() => {
    return options.filter((option) => {
      if (!option.recipeId) return true
      return !excludedRecipeIds.has(String(option.recipeId))
    })
  }, [options, excludedRecipeIds])

  const visibleRecipeIds = useMemo(() => {
    const ids = visibleOptions
      .map((option) => option.recipeId)
      .filter((id): id is string | number => id !== undefined && id !== null)
      .map((id) => String(id))

    return Array.from(new Set(ids))
  }, [visibleOptions])

  const handleExcludeOption = async (option: MealOption) => {
    if (!option.recipeId) {
      toast({
        title: 'No se puede excluir',
        description: 'Esta opción no está vinculada a una receta concreta.',
        variant: 'destructive',
      })
      return
    }

    const recipeId = String(option.recipeId)
    setExcludingRecipeId(recipeId)
    try {
      const created = await nutritionService.addRecipeExclusion(recipeId, 'No me gusta esta comida')
      if (!created) {
        toast({
          title: 'No se pudo excluir',
          description: 'Inténtalo de nuevo.',
          variant: 'destructive',
        })
        return
      }

      setExcludedRecipeIds((prev) => new Set([...Array.from(prev), recipeId]))
      toast({
        title: 'Guardado',
        description: `Marcaste "${option.name}" como "No me gusta esta comida".`,
      })
    } finally {
      setExcludingRecipeId(null)
    }
  }

  const handleExcludeAllVisible = async () => {
    if (visibleRecipeIds.length === 0) {
      toast({
        title: 'Sin recetas para excluir',
        description: 'No hay recetas visibles para marcar como no-como.',
      })
      return
    }

    setExcludingAllVisible(true)
    try {
      await Promise.all(
        visibleRecipeIds.map((recipeId) => nutritionService.addRecipeExclusion(recipeId, 'No me gusta esta comida'))
      )

      setExcludedRecipeIds((prev) => new Set([...Array.from(prev), ...visibleRecipeIds]))
      toast({
        title: 'Recetas excluidas',
        description: 'Marcaste estas recetas como "No me gusta esta comida".',
      })
    } finally {
      setExcludingAllVisible(false)
    }
  }

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
        return <Leaf className="w-4 h-4 text-muted-foreground" />
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
      <div className="fixed inset-0 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-orange-500/20 backdrop-blur-sm z-[9998] flex items-center justify-center p-0 md:p-4">
        <div className="w-full h-full md:w-full md:max-w-md md:h-[90vh] z-[9999] md:rounded-2xl overflow-hidden shadow-2xl bg-card md:border-2 md:border-border flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 md:p-4 border-b border-border bg-card md:rounded-t-2xl flex-shrink-0">
              <div className="flex-1 min-w-0">
                <h3 className="text-xl md:text-lg font-bold md:font-semibold text-foreground">{mealName}</h3>
                <p className="text-base md:text-sm text-muted-foreground flex items-center gap-2 md:gap-1 mt-1">
                  <Clock className="w-5 h-5 md:w-4 md:h-4 flex-shrink-0" />
                  <span>{mealTime}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors ml-4 flex-shrink-0 touch-manipulation p-2 -mr-2"
                aria-label="Cerrar modal"
              >
                <X className="w-7 h-7 md:w-6 md:h-6" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="p-5 md:p-4 space-y-4 md:space-y-3 overflow-y-auto flex-1 min-h-0">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 mb-5 md:mb-4">
                <p className="text-base md:text-sm font-medium md:font-normal text-gray-700 md:text-muted-foreground">
                  Selecciona una opción para {mealName.toLowerCase()}:
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExcludeAllVisible}
                    className="px-4 py-3 md:px-3 md:py-1.5 text-sm md:text-xs font-semibold md:font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-xl md:rounded-lg transition-all"
                    disabled={excludingAllVisible || visibleRecipeIds.length === 0}
                  >
                    {excludingAllVisible ? 'Excluyendo...' : 'No como ninguna de estas'}
                  </button>
                  <button
                    type="button"
                    onClick={handleViewAllRecipes}
                    className="px-4 py-3 md:px-3 md:py-1.5 text-sm md:text-xs font-semibold md:font-medium text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 rounded-xl md:rounded-lg transition-all shadow-md md:shadow-sm hover:shadow-lg md:hover:shadow-md flex items-center justify-center gap-2 md:gap-1.5 touch-manipulation"
                    disabled={loadingRecipes}
                  >
                    {loadingRecipes ? (
                      <>
                        <Loader2 className="w-4 h-4 md:w-3 md:h-3 animate-spin" />
                        <span>Cargando...</span>
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-4 h-4 md:w-3 md:h-3" />
                        <span>Ver Recetas Disponibles</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {visibleOptions.map((option) => (
                (() => {
                  const isCurrentSelection =
                    (currentSelection?.recipeId && option.recipeId && String(currentSelection.recipeId) === String(option.recipeId)) ||
                    (currentSelection?.optionId && String(currentSelection.optionId) === String(option.id))

                  return (
                <div
                  key={option.id}
                  onClick={() => handleSelectOption(option)}
                  className={`border-2 md:border rounded-2xl md:rounded-lg p-5 md:p-3 cursor-pointer transition-all touch-manipulation active:scale-[0.98] ${
                    isCurrentSelection
                      ? 'border-emerald-500 bg-emerald-50 shadow-md'
                      : option.recipeId 
                      ? 'border-orange-300 md:border-orange-200 bg-gradient-to-br from-orange-50 to-pink-50 hover:border-orange-500 md:hover:border-orange-400 hover:shadow-xl md:hover:shadow-md' 
                      : 'border-gray-300 md:border-border hover:border-blue-400 md:hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-start gap-4 md:gap-3">
                    <img
                      src={option.imageUrl || '/placeholder.jpg'}
                      alt={option.name}
                      className="w-14 h-14 md:w-12 md:h-12 rounded-lg object-cover border border-border flex-shrink-0"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).src = '/placeholder.jpg'
                      }}
                    />
                    <div className="text-4xl md:text-2xl flex-shrink-0">{option.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-2 mb-3 md:mb-1">
                        <h4 className="font-bold md:font-medium text-lg md:text-base text-foreground leading-tight">{option.name}</h4>
                        {(option.recipeId || isCurrentSelection) && (
                          <div className="flex flex-wrap gap-2 md:gap-2">
                            {isCurrentSelection && (
                              <span className="px-3 py-1.5 md:px-2 md:py-0.5 bg-emerald-100 text-emerald-700 text-sm md:text-xs font-semibold md:font-medium rounded-full">
                                ✅ Seleccionada
                              </span>
                            )}
                            <span className="px-3 py-1.5 md:px-2 md:py-0.5 bg-gradient-to-r from-orange-100 to-pink-100 text-orange-700 text-sm md:text-xs font-semibold md:font-medium rounded-full flex items-center gap-1.5 md:gap-1">
                              <BookOpen className="w-4 h-4 md:w-3 md:h-3" />
                              Receta disponible
                            </span>
                            <span className="px-3 py-1.5 md:px-2 md:py-0.5 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 text-sm md:text-xs font-semibold md:font-medium rounded-full flex items-center gap-1.5 md:gap-1">
                              <Target className="w-4 h-4 md:w-3 md:h-3" />
                              Recomendado
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-base md:text-sm text-gray-700 md:text-gray-600 mb-4 md:mb-2 leading-relaxed">{option.description}</p>

                      {/* Macros - Grid en móvil, flex en desktop */}
                      <div className="grid grid-cols-2 md:flex md:items-center gap-3 md:gap-4 text-sm md:text-xs text-muted-foreground md:text-gray-500 mb-4 md:mb-2">
                        <span className="flex items-center gap-2 md:gap-1">
                          <Zap className="w-5 h-5 md:w-3 md:h-3 text-orange-500 flex-shrink-0" />
                          <span className="font-semibold md:font-normal">{option.calories} kcal</span>
                        </span>
                        <span className="flex items-center gap-2 md:gap-1">
                          <div className="w-3 h-3 md:w-2 md:h-2 rounded-full bg-blue-500 flex-shrink-0" />
                          <span className="font-semibold md:font-normal">{formatMacro(option.protein)}g proteína</span>
                        </span>
                        <span className="flex items-center gap-2 md:gap-1">
                          <div className="w-3 h-3 md:w-2 md:h-2 rounded-full bg-green-500 flex-shrink-0" />
                          <span className="font-semibold md:font-normal">{formatMacro(option.carbs)}g carbos</span>
                        </span>
                        <span className="flex items-center gap-2 md:gap-1">
                          <div className="w-3 h-3 md:w-2 md:h-2 rounded-full bg-yellow-500 flex-shrink-0" />
                          <span className="font-semibold md:font-normal">{formatMacro(option.fat)}g grasas</span>
                        </span>
                      </div>

                      {/* Categoría */}
                      <div className="flex items-center gap-2 mb-4 md:mb-2">
                        <div className="scale-125 md:scale-100">
                          {getCategoryIcon(option.category || "balanced")}
                        </div>
                        <span className="text-sm md:text-xs text-muted-foreground md:text-gray-500 font-medium md:font-normal">
                          {getCategoryName(option.category || "balanced")}
                        </span>
                        {option.cookTime && (
                          <span className="text-sm md:text-xs text-muted-foreground md:text-muted-foreground/70">
                            • {option.cookTime}
                          </span>
                        )}
                      </div>

                      {/* Botón Ver Receta - Más grande en móvil */}
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewRecipe(option)
                          }}
                          className="px-6 py-4 md:px-4 md:py-2.5 text-base md:text-sm font-bold md:font-semibold text-white bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 rounded-xl md:rounded-lg transition-all shadow-lg md:shadow-md hover:shadow-xl md:hover:shadow-lg flex items-center justify-center gap-3 md:gap-2 touch-manipulation active:scale-[0.98]"
                          disabled={loadingRecipe}
                        >
                          {loadingRecipe ? (
                            <>
                              <Loader2 className="w-5 h-5 md:w-4 md:h-4 animate-spin" />
                              <span>Buscando receta...</span>
                            </>
                          ) : (
                            <>
                              <BookOpen className="w-5 h-5 md:w-4 md:h-4" />
                              <span>📖 Ver Receta</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleExcludeOption(option)
                          }}
                          className="px-6 py-4 md:px-4 md:py-2.5 text-base md:text-sm font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl md:rounded-lg transition-all touch-manipulation active:scale-[0.98]"
                          disabled={!option.recipeId || excludingRecipeId === String(option.recipeId)}
                        >
                          {excludingRecipeId === String(option.recipeId) ? 'Guardando...' : '⏭️ No me gusta esta comida'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                  )
                })()
              ))}

              {visibleOptions.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Ya no hay recetas visibles para esta comida. Puedes abrir "Ver Recetas Disponibles" o quitar exclusiones en tu perfil.
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="p-5 md:p-4 border-t border-border flex-shrink-0 bg-card md:bg-transparent">
              <button
                type="button"
                onClick={onClose}
                className="w-full px-6 py-4 md:px-4 md:py-2 text-base md:text-sm font-semibold md:font-normal text-gray-700 md:text-gray-600 border-2 md:border border-gray-400 md:border-gray-300 rounded-xl md:rounded-lg hover:bg-gray-100 md:hover:bg-muted/50 transition-colors touch-manipulation active:scale-[0.98]"
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
              recipeId: recipeData.recipe.id,
              imageUrl: recipeData.recipe.image_url || ''
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
            try {
              setLoadingRecipe(true)
              const mealType = mealTypeMap[mealName] || "lunch"
              
              // Cerrar el modal de todas las recetas PRIMERO
              setShowAllRecipes(false)
              
              // Pequeño delay para asegurar que el modal se cierre antes de mostrar el nuevo
              await new Promise(resolve => setTimeout(resolve, 100))
              
              // Intentar obtener receta personalizada
              let data = null
              try {
                data = await nutritionService.getPersonalizedRecipe(recipe.id, mealType)
              } catch (error: any) {
                // Si es 404, usar la receta básica directamente
                if (error?.message?.includes('404') || error?.message?.includes('Not Found')) {
                }
              }
              
              if (data && data.recipe && data.personalized_quantities) {
                // Mostrar modal de detalle con receta personalizada
                setRecipeData({
                  recipe: data.recipe,
                  personalized: data.personalized_quantities,
                  userProfile: data.user_profile
                })
                setShowRecipe(true)
              } else {
                // Fallback a receta básica
                try {
                  const basicRecipe = await nutritionService.getRecipe(recipe.id)
                  if (basicRecipe) {
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
                      original_calories: basicRecipe.calories || 0,
                      target_calories: basicRecipe.calories || 0,
                      meal_type: mealType || 'lunch'
                    }
                    
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
                    setShowRecipe(true)
                  } else {
                    alert('No se pudo cargar la receta. Por favor, intenta de nuevo.')
                  }
                } catch (basicError: any) {
                  // Si también falla la receta básica, mostrar error pero no abrir modal de todas las recetas
                  alert('Error al cargar la receta. Por favor, intenta de nuevo.')
                }
              }
            } catch (error) {
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
      default: return 'text-gray-600 bg-muted'
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] flex items-center justify-center p-0 md:p-4">
      <div className="w-full h-full md:w-full md:max-w-3xl md:h-[90vh] z-[9999] md:rounded-2xl overflow-hidden shadow-2xl bg-card flex flex-col relative">
          {/* Botón cerrar flotante - siempre visible aunque se haga scroll */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 transition-colors touch-manipulation p-2 bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-full shadow-md"
            aria-label="Cerrar"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Todo el contenido es scrollable — el header se desplaza al hacer scroll */}
          <div className="overflow-y-auto flex-1 min-h-0">
            {/* Header — ya no es estático, se aparta al deslizar */}
            <div className="bg-gradient-to-r from-orange-50 to-pink-50 dark:from-orange-950/30 dark:to-pink-950/30 border-b border-orange-100 dark:border-orange-900/30 p-5 md:p-6 md:rounded-t-2xl pr-14">
              <div className="flex items-center gap-3 mb-3 md:mb-2">
                <div className="w-12 h-12 md:w-12 md:h-12 bg-gradient-to-br from-orange-400 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ChefHat className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg md:text-2xl font-bold text-foreground leading-tight">{recipe.name}</h2>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-2">{recipe.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <div className="px-2.5 py-1 md:px-3 md:py-1 bg-blue-100 text-blue-700 rounded-full text-xs md:text-xs font-semibold flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Ajustado a tu perfil
                </div>
                {recipe.difficulty && (
                  <div className={`px-2.5 py-1 md:px-3 md:py-1 rounded-full text-xs font-semibold ${getDifficultyColor(recipe.difficulty)}`}>
                    {getDifficultyLabel(recipe.difficulty)}
                  </div>
                )}
                <div className="px-2.5 py-1 md:px-3 md:py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-xs font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {recipe.prep_time_minutes || 0}+{recipe.cook_time_minutes || 0} min
                </div>
                <div className="px-2.5 py-1 md:px-3 md:py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-xs font-semibold flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {personalized.servings} {personalized.servings === 1 ? 'porción' : 'porciones'}
                </div>
                {recipe.category && (
                  <div className="px-2.5 py-1 md:px-3 md:py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                    {recipe.category}
                  </div>
                )}
              </div>
            </div>

          {/* Resto del contenido */}
          <div className="p-5 md:p-6 space-y-5 md:space-y-6">
            {/* Macros personalizados */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div className="text-center bg-orange-50 rounded-xl md:rounded-lg p-4 md:p-4 border-2 md:border border-orange-200 md:border-orange-100">
                <div className="text-3xl md:text-2xl font-bold text-orange-600 mb-1.5 md:mb-1">
                  {personalized.macros.calories}
                </div>
                <div className="text-sm md:text-xs text-orange-500 font-semibold md:font-medium">kcal</div>
              </div>
              <div className="text-center bg-blue-50 rounded-xl md:rounded-lg p-4 md:p-4 border-2 md:border border-blue-200 md:border-blue-100">
                <div className="text-3xl md:text-2xl font-bold text-blue-600 mb-1.5 md:mb-1">
                  {formatMacro(personalized.macros.protein)}g
                </div>
                <div className="text-sm md:text-xs text-blue-500 font-semibold md:font-medium">Proteína</div>
              </div>
              <div className="text-center bg-green-50 rounded-xl md:rounded-lg p-4 md:p-4 border-2 md:border border-green-200 md:border-green-100">
                <div className="text-3xl md:text-2xl font-bold text-green-600 mb-1.5 md:mb-1">
                  {formatMacro(personalized.macros.carbs)}g
                </div>
                <div className="text-sm md:text-xs text-green-500 font-semibold md:font-medium">Carbos</div>
              </div>
              <div className="text-center bg-yellow-50 rounded-xl md:rounded-lg p-4 md:p-4 border-2 md:border border-yellow-200 md:border-yellow-100">
                <div className="text-3xl md:text-2xl font-bold text-yellow-600 mb-1.5 md:mb-1">
                  {formatMacro(personalized.macros.fat)}g
                </div>
                <div className="text-sm md:text-xs text-yellow-500 font-semibold md:font-medium">Grasas</div>
              </div>
            </div>

            {/* Ingredientes personalizados */}
            <div>
              <h3 className="text-xl md:text-lg font-bold md:font-semibold text-foreground mb-4 md:mb-3 flex items-center gap-2.5 md:gap-2">
                <BookOpen className="w-6 h-6 md:w-5 md:h-5 text-orange-500 flex-shrink-0" />
                <span>Ingredientes</span>
              </h3>
              <div className="bg-gray-50 rounded-xl md:rounded-lg p-5 md:p-4 space-y-3 md:space-y-2">
                {personalized.ingredients.map((ingredient, index) => {
                  const amount = typeof ingredient.amount === 'string'
                    ? (parseFloat(ingredient.amount) || null)
                    : ingredient.amount

                  // Filtrar el texto de "cantidad a ajustar según tu perfil"
                  const cleanNote = ingredient.note ? ingredient.note.replace(/cantidad a ajustar según tu perfil/gi, '').trim() : ''

                  return (
                    <div key={index} className="flex items-center justify-between py-3 md:py-2 border-b border-border last:border-0">
                      <span className="text-base md:text-sm text-gray-700 font-semibold md:font-medium pr-4">{ingredient.name}</span>
                      <span className="text-base md:text-sm text-muted-foreground font-bold md:font-semibold text-right flex-shrink-0">
                        {amount !== null && amount !== undefined ? `${amount} ${ingredient.unit || 'g'}` : cleanNote || ''}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Instrucciones */}
            <div>
              <h3 className="text-xl md:text-lg font-bold md:font-semibold text-foreground mb-4 md:mb-3 flex items-center gap-2.5 md:gap-2">
                <ChefHat className="w-6 h-6 md:w-5 md:h-5 text-orange-500 flex-shrink-0" />
                <span>Instrucciones de Preparación</span>
              </h3>
              <div className="bg-gray-50 dark:bg-muted rounded-xl md:rounded-lg p-4 md:p-4 space-y-3 md:space-y-3">
                {(() => {
                  const hasValidInstructions = recipe.instructions && 
                    recipe.instructions.trim() !== '' && 
                    !recipe.instructions.toLowerCase().includes('seguir preparación indicada') &&
                    !recipe.instructions.toLowerCase().includes('seguir preparación')

                  if (hasValidInstructions) {
                    const instructionsList = typeof recipe.instructions === 'string'
                      ? recipe.instructions.split('\n').filter(line => line.trim() && 
                          !line.toLowerCase().includes('seguir preparación indicada') &&
                          !line.toLowerCase().includes('seguir preparación'))
                      : Array.isArray(recipe.instructions as unknown)
                        ? (recipe.instructions as unknown as string[]).filter(inst => 
                            typeof inst === 'string' && 
                            inst.trim() !== '' &&
                            !inst.toLowerCase().includes('seguir preparación indicada') &&
                            !inst.toLowerCase().includes('seguir preparación'))
                        : []

                    if (instructionsList.length > 0) {
                      return instructionsList.map((instruction: string, index: number) => (
                        <div key={index} className="flex gap-3">
                          <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-orange-400 to-pink-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 flex-1 leading-snug">{instruction.trim()}</p>
                        </div>
                      ))
                    }
                  }
                  
                  // Si no hay instrucciones válidas, mostrar mensaje
                  return (
                    <div className="text-center py-6 md:py-4">
                      <p className="text-base md:text-sm text-muted-foreground italic">No hay instrucciones detalladas disponibles para esta receta.</p>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Información nutricional adicional */}
            {(recipe.fiber || recipe.sugar || recipe.sodium) && (
              <div>
                <h3 className="text-xl md:text-lg font-bold md:font-semibold text-foreground mb-4 md:mb-3">Información Nutricional Adicional</h3>
                <div className="grid grid-cols-3 gap-2.5 md:gap-4">
                  {recipe.fiber && (
                    <div className="text-center bg-purple-500/10 rounded-xl md:rounded-lg p-3 border border-purple-200 dark:border-purple-800/30 min-w-0">
                      <div className="text-xl md:text-lg font-bold text-purple-600 mb-1.5 md:mb-1 break-words">{formatMacro(recipe.fiber)}g</div>
                      <div className="text-xs md:text-xs text-purple-500 font-semibold md:font-medium">Fibra</div>
                    </div>
                  )}
                  {recipe.sugar && (
                    <div className="text-center bg-pink-50 rounded-xl md:rounded-lg p-3 md:p-3 border-2 md:border border-pink-200 md:border-pink-100 min-w-0">
                      <div className="text-xl md:text-lg font-bold text-pink-600 mb-1.5 md:mb-1 break-words">{formatMacro(recipe.sugar)}g</div>
                      <div className="text-xs md:text-xs text-pink-500 font-semibold md:font-medium">Azúcar</div>
                    </div>
                  )}
                  {recipe.sodium && (
                    <div className="text-center bg-indigo-500/10 rounded-xl md:rounded-lg p-3 border border-indigo-200 dark:border-indigo-800/30 min-w-0">
                      <div className="text-xl md:text-lg font-bold text-indigo-600 mb-1.5 md:mb-1 break-words text-[14px] md:text-lg leading-tight">{formatMacro(recipe.sodium)}mg</div>
                      <div className="text-xs md:text-xs text-indigo-500 font-semibold md:font-medium">Sodio</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Imagen de la receta */}
            <div>
              <h3 className="text-xl md:text-lg font-bold md:font-semibold text-foreground mb-4 md:mb-3">Imagen de la Receta</h3>
              <img
                src={recipe.image_url || '/placeholder.jpg'}
                alt={recipe.name}
                className="w-full rounded-xl md:rounded-lg object-cover shadow-lg md:shadow-md"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src = '/placeholder.jpg'
                }}
              />
            </div>
          </div>{/* cierre: resto del contenido */}
          </div>{/* cierre: scroll completo */}

          {/* Footer */}
          <div className="bg-white dark:bg-card border-t border-border p-5 md:p-6 md:rounded-b-2xl flex-shrink-0">
            <div className="flex flex-col md:flex-row gap-3 md:gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-4 md:px-4 md:py-3 text-base md:text-sm text-gray-700 md:text-gray-600 border-2 md:border border-gray-400 md:border-gray-300 rounded-xl md:rounded-lg hover:bg-gray-100 md:hover:bg-muted/50 transition-colors font-semibold md:font-medium touch-manipulation active:scale-[0.98]"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={onSelectRecipe}
                className="flex-1 px-6 py-4 md:px-4 md:py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl md:rounded-lg hover:from-orange-600 hover:to-pink-600 transition-colors font-bold md:font-medium shadow-xl md:shadow-lg touch-manipulation active:scale-[0.98]"
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
  const [selectedMealType, setSelectedMealType] = useState<string>("all")
  const [visibleCount, setVisibleCount] = useState(20)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const MEAL_TYPE_LABELS: Record<string, string> = {
    breakfast: 'Desayuno',
    lunch: 'Almuerzo',
    dinner: 'Cena',
    snack: 'Snack',
    pre_workout: 'Pre-entreno',
    post_workout: 'Post-entreno',
    mid_morning: 'Media mañana',
    afternoon_snack: 'Merienda',
  }

  // Filtrar recetas por búsqueda, categoría y tipo de comida
  const filteredRecipes = recipes.filter(recipe => {
    const recipeName = String(recipe?.name || '').toLowerCase()
    const recipeDescription = String(recipe?.description || '').toLowerCase()
    const query = searchQuery.toLowerCase()
    const matchesSearch = recipeName.includes(query) || recipeDescription.includes(query)
    const matchesCategory = selectedCategory === "all" ||
                           recipe.category?.toLowerCase() === selectedCategory.toLowerCase()
    const matchesMealType = selectedMealType === "all" ||
                           (recipe.meal_types && recipe.meal_types.includes(selectedMealType)) ||
                           (!recipe.meal_types || recipe.meal_types.length === 0)
    return matchesSearch && matchesCategory && matchesMealType
  })

  useEffect(() => {
    setVisibleCount(20)
  }, [searchQuery, selectedCategory, selectedMealType, recipes.length])

  if (!mounted) return null

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
      setVisibleCount((prev) => Math.min(prev + 20, filteredRecipes.length))
    }
  }

  // Obtener categorías y tipos de comida únicos de las recetas
  const categories = Array.from(new Set(recipes.map(r => r.category).filter(Boolean)))
  const mealTypes = Array.from(
    new Set(recipes.flatMap(r => r.meal_types || []).filter(Boolean))
  ).sort()

  const modalContent = (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] flex items-start sm:items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[90dvh] max-h-[90dvh] z-[9999] rounded-2xl overflow-hidden shadow-2xl bg-card flex flex-col">
          {/* Header */}
          <div className="border-b border-border p-6 rounded-t-2xl bg-card flex-shrink-0">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-purple-600" />
                  Recetas Recomendadas
                </h2>
                <p className="text-sm text-muted-foreground">
                  Recetas sugeridas para {mealName} ({mealTime}) según tu plan de nutrición
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors ml-4"
                aria-label="Cerrar"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Búsqueda y Filtros */}
            <div className="flex flex-col gap-2 mt-4">
              <input
                type="text"
                placeholder="Buscar recetas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={selectedMealType}
                  onChange={(e) => setSelectedMealType(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  aria-label="Filtrar por tipo de comida"
                  title="Filtrar por tipo de comida"
                >
                  <option value="all">Todos los tipos</option>
                  {mealTypes.map(mt => (
                    <option key={mt} value={mt}>{MEAL_TYPE_LABELS[mt] ?? mt}</option>
                  ))}
                </select>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  aria-label="Filtrar por categoría"
                  title="Filtrar por categoría"
                >
                  <option value="all">Todos los objetivos</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="p-6 overflow-y-auto flex-1 min-h-0 overscroll-contain touch-pan-y"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                <span className="ml-3 text-muted-foreground">Cargando recetas...</span>
              </div>
            ) : filteredRecipes.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery || selectedCategory !== "all" || selectedMealType !== "all"
                    ? "No se encontraron recetas con los filtros seleccionados"
                    : "No hay recetas recomendadas disponibles para esta comida"}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Las recetas se muestran según las recomendaciones de tu plan de nutrición activo
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRecipes.slice(0, visibleCount).map((recipe) => (
                  <div
                    key={recipe.id}
                    className="border border-border rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer group"
                    onClick={async () => {
                      await onSelectRecipe(recipe)
                    }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <img
                        src={recipe.image_url || '/placeholder.jpg'}
                        alt={recipe.name}
                        className="w-12 h-12 rounded-lg object-cover border border-border flex-shrink-0"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src = '/placeholder.jpg'
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-purple-600">
                          {recipe.name}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {recipe.description}
                        </p>
                      </div>
                    </div>

                    {/* Macros */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      <div className="text-center">
                        <div className="text-sm font-bold text-orange-600">{recipe.calories}</div>
                        <div className="text-xs text-muted-foreground">kcal</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-blue-600">{formatMacro(recipe.protein)}</div>
                        <div className="text-xs text-muted-foreground">P</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-green-600">{formatMacro(recipe.carbs)}</div>
                        <div className="text-xs text-muted-foreground">C</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-yellow-600">{formatMacro(recipe.fat)}</div>
                        <div className="text-xs text-muted-foreground">G</div>
                      </div>
                    </div>

                    {/* Info adicional */}
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
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
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation()
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
            {!loading && filteredRecipes.length > visibleCount && (
              <div className="flex justify-center mt-6">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => Math.min(prev + 20, filteredRecipes.length))}
                  className="px-4 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition"
                >
                  Cargar más recetas
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-white border-t border-border p-4 rounded-b-2xl flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-2 text-muted-foreground border border-gray-300 rounded-lg hover:bg-muted/50 transition-colors font-medium"
            >
              Cerrar
            </button>
          </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' && createPortal(modalContent, document.body)
}
