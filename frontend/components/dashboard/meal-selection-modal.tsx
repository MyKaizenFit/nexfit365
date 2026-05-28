'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { IngredientSubstitution, IngredientSubstitutionResponse, MealIngredientSubstitution, MealOption, nutritionService, Recipe, PersonalizedRecipeQuantities } from '@/lib/nutrition-service'
import { API_CONFIG } from '@/lib/api'
import { X, Clock, Zap, Leaf, ChefHat, Target, Users, BookOpen, Loader2, Shuffle, ArrowLeft, ChevronRight } from 'lucide-react'
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
  onDeselectOption?: () => void
  initialView?: 'recipe' | 'equivalencias'
}

const resolveRecipeImageSrc = (src?: string | null) => {
  const value = String(src || '').trim()
  if (!value) return '/placeholder.jpg'
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:') || value.startsWith('blob:')) {
    return value
  }
  if (value.startsWith('/')) {
    return `${API_CONFIG.BASE_URL}${value}`
  }
  return value
}

export function MealSelectionModal({
  isOpen,
  onClose,
  mealName,
  mealTime,
  mealType,
  options,
  currentSelection,
  onSelectOption,
  onDeselectOption,
  initialView
}: MealSelectionModalProps) {
  const [selectedOption, setSelectedOption] = useState<MealOption | null>(null)
  const [showRecipe, setShowRecipe] = useState(false)
  const [showAllRecipes, setShowAllRecipes] = useState(false)
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([])
  const [loadingRecipes, setLoadingRecipes] = useState(false)
  const [autoOpenEquivalenceRecipeId, setAutoOpenEquivalenceRecipeId] = useState<string | null>(null)
  const [equivalenceOnlyMode, setEquivalenceOnlyMode] = useState(false)
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
  const handleViewAllRecipes = async (autoOpenRecipeId?: string | number | null) => {
    setLoadingRecipes(true)
    setAutoOpenEquivalenceRecipeId(autoOpenRecipeId ? String(autoOpenRecipeId) : null)
    setEquivalenceOnlyMode(Boolean(autoOpenRecipeId))
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
        // Esta opción no tiene receta asociada — no cargar una receta aleatoria
        setLoadingRecipe(false)
        toast({
          title: "Sin receta",
          description: "Esta opción no tiene una receta específica asociada.",
        })
        return
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
        // Rescale ingredients to match the option's pre-computed macros (avoid plan vs personalized discrepancy)
        let personalized = data.personalized_quantities
        const optionCalories = option.calories ?? 0
        const originalCalories = personalized?.original_calories ?? 0
        if (optionCalories > 0 && originalCalories > 0 && personalized) {
          const correctScale = optionCalories / originalCalories
          const existingScale = personalized.scale_factor > 0 ? personalized.scale_factor : 1
          const rescaledIngredients = personalized.ingredients.map(ing => {
            const amount = ing.amount != null ? Number(ing.amount) : 0
            const originalAmount = amount / existingScale
            return { ...ing, amount: Math.round(originalAmount * correctScale * 10) / 10 }
          })
          personalized = {
            ...personalized,
            scale_factor: correctScale,
            macros: {
              calories: optionCalories,
              protein: option.protein ?? personalized.macros.protein,
              carbs: option.carbs ?? personalized.macros.carbs,
              fat: option.fat ?? personalized.macros.fat,
              fiber: personalized.macros.fiber,
            },
            ingredients: rescaledIngredients,
          }
        }
        setRecipeData({
          recipe: data.recipe,
          personalized,
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

  const autoViewTriggeredRef = useRef(false)

  useEffect(() => {
    if (!isOpen) { autoViewTriggeredRef.current = false }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !mounted || !initialView || options.length === 0) return
    if (autoViewTriggeredRef.current) return
    autoViewTriggeredRef.current = true
    const currentOption = options.find(opt =>
      (currentSelection?.recipeId && opt.recipeId && String(currentSelection.recipeId) === String(opt.recipeId)) ||
      (currentSelection?.optionId && String(currentSelection.optionId) === String(opt.id))
    ) || options[0]
    if (!currentOption) return
    if (initialView === 'recipe') {
      handleViewRecipe(currentOption)
    } else if (initialView === 'equivalencias') {
      handleViewAllRecipes(currentOption.recipeId || currentOption.id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mounted, initialView, options, currentSelection])

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!isOpen || !mounted) return null

  const isOptionCurrentSelection = (option: MealOption) => {
    return (
      (currentSelection?.recipeId && option.recipeId && String(currentSelection.recipeId) === String(option.recipeId)) ||
      (currentSelection?.optionId && String(currentSelection.optionId) === String(option.id))
    )
  }

  const handleSelectOption = (option: MealOption) => {
    if (isOptionCurrentSelection(option) && onDeselectOption) {
      onDeselectOption()
      onClose()
      return
    }

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
                    onClick={() => handleViewAllRecipes()}
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
                        <span>Ver recetas y equivalencias</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {visibleOptions.map((option) => (
                (() => {
                  const isCurrentSelection = isOptionCurrentSelection(option)
                  const imageSrc = resolveRecipeImageSrc(option.imageUrl)
                  const hasImage = Boolean(option.imageUrl)

                  return (
                <div
                  key={option.id}
                  onClick={() => handleSelectOption(option)}
                  className={`group overflow-hidden cursor-pointer rounded-2xl border bg-white shadow-sm transition-all touch-manipulation active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-xl ${
                    isCurrentSelection
                      ? 'border-emerald-500 shadow-emerald-100 ring-4 ring-emerald-100'
                      : option.recipeId 
                      ? 'border-orange-200 hover:border-orange-400' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex flex-col">
                    <div className="relative h-44 md:h-36 overflow-hidden bg-gray-100">
                      <img
                        src={imageSrc}
                        alt={option.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src = '/placeholder.jpg'
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
                      <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-lime-400 px-2.5 py-1 text-[11px] font-black text-lime-950 shadow">
                          {mealName}
                        </span>
                        {isCurrentSelection && (
                          <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white shadow">
                            Seleccionada
                          </span>
                        )}
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="line-clamp-2 text-lg md:text-base font-black leading-tight text-white drop-shadow">
                            {option.name}
                          </h4>
                          <div className="mt-1.5 flex items-center gap-2 text-[11px] font-semibold text-white/90">
                            {getCategoryIcon(option.category || "balanced")}
                            <span>{getCategoryName(option.category || "balanced")}</span>
                            {option.cookTime && <span>• {option.cookTime}</span>}
                          </div>
                        </div>
                        {!hasImage && <div className="text-4xl flex-shrink-0 drop-shadow">{option.icon}</div>}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 bg-white p-3">
                      <div className="grid grid-cols-4 gap-1.5 text-center">
                        <span className="rounded-xl bg-orange-50 px-1.5 py-1.5 border border-orange-100">
                          <span className="block text-xs font-black text-orange-700">{option.calories}</span>
                          <span className="block text-[9px] font-semibold text-orange-500">kcal</span>
                        </span>
                        <span className="rounded-xl bg-blue-50 px-1.5 py-1.5 border border-blue-100">
                          <span className="block text-xs font-black text-blue-700">{formatMacro(option.protein)}g</span>
                          <span className="block text-[9px] font-semibold text-blue-500">prot</span>
                        </span>
                        <span className="rounded-xl bg-green-50 px-1.5 py-1.5 border border-green-100">
                          <span className="block text-xs font-black text-green-700">{formatMacro(option.carbs)}g</span>
                          <span className="block text-[9px] font-semibold text-green-500">carb</span>
                        </span>
                        <span className="rounded-xl bg-yellow-50 px-1.5 py-1.5 border border-yellow-100">
                          <span className="block text-xs font-black text-yellow-700">{formatMacro(option.fat)}g</span>
                          <span className="block text-[9px] font-semibold text-yellow-500">grasa</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewRecipe(option)
                          }}
                          className="flex items-center justify-center gap-1 rounded-xl bg-orange-50 px-2 py-2 font-bold text-orange-700 transition-colors hover:bg-orange-100"
                          disabled={loadingRecipe}
                        >
                          {loadingRecipe ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Receta</span>
                            </>
                          ) : (
                            <>
                              <BookOpen className="h-3.5 w-3.5" />
                              <span>Receta</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewAllRecipes(option.recipeId || option.id)
                          }}
                          className="flex items-center justify-center gap-1 rounded-xl bg-emerald-50 px-2 py-2 font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
                          disabled={loadingRecipes}
                        >
                          {loadingRecipes ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Shuffle className="h-3.5 w-3.5" />
                          )}
                          <span>Equivalencias</span>
                        </button>
                        {isCurrentSelection && onDeselectOption && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeselectOption()
                              onClose()
                            }}
                            className="rounded-xl bg-emerald-50 px-2 py-2 font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
                          >
                            Quitar
                          </button>
                        )}
                        {!isCurrentSelection && (
                          <span className="flex items-center justify-center rounded-xl bg-lime-50 px-2 py-2 font-bold text-lime-700">
                            Recom.
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleExcludeOption(option)
                          }}
                          className="rounded-xl bg-gray-50 px-2 py-2 font-bold text-gray-600 transition-colors hover:bg-gray-100"
                          disabled={!option.recipeId || excludingRecipeId === String(option.recipeId)}
                        >
                          {excludingRecipeId === String(option.recipeId) ? '...' : 'No me gusta'}
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
          onClose={() => {
            setShowAllRecipes(false)
            setAutoOpenEquivalenceRecipeId(null)
            setEquivalenceOnlyMode(false)
          }}
          autoOpenEquivalenceRecipeId={autoOpenEquivalenceRecipeId}
          equivalenceOnlyMode={equivalenceOnlyMode}
          onAutoOpenConsumed={() => setAutoOpenEquivalenceRecipeId(null)}
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
          onSelectOption={handleSelectOption}
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

            <div className="bg-gray-100">
              <img
                src={resolveRecipeImageSrc(recipe.image_url)}
                alt={recipe.name}
                className="w-full h-64 md:h-80 object-cover"
                loading="eager"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src = '/placeholder.jpg'
                }}
              />
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
  onSelectOption: (option: MealOption) => void
  autoOpenEquivalenceRecipeId?: string | null
  equivalenceOnlyMode?: boolean
  onAutoOpenConsumed?: () => void
}

function AllRecipesModal({
  recipes,
  mealName,
  mealTime,
  loading,
  onClose,
  onSelectRecipe,
  onSelectOption,
  autoOpenEquivalenceRecipeId,
  equivalenceOnlyMode = false,
  onAutoOpenConsumed
}: AllRecipesModalProps) {
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedMealType, setSelectedMealType] = useState<string>("all")
  const [visibleCount, setVisibleCount] = useState(20)
  const [substitutionRecipe, setSubstitutionRecipe] = useState<Recipe | null>(null)
  const [selectedIngredientId, setSelectedIngredientId] = useState<string>("")
  const [substitutionSearch, setSubstitutionSearch] = useState("")
  const [substitutions, setSubstitutions] = useState<IngredientSubstitutionResponse | null>(null)
  const [loadingSubstitutions, setLoadingSubstitutions] = useState(false)
  const [mobileStep, setMobileStep] = useState<"ingredients" | "results">("ingredients")
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
    const query = searchQuery.trim().toLowerCase()
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

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
      setVisibleCount((prev) => Math.min(prev + 20, filteredRecipes.length))
    }
  }

  const linkedIngredients = substitutionRecipe?.recipe_ingredients?.filter((ingredient) => ingredient.food_detail || ingredient.food_id || ingredient.food) || []

  const loadSubstitutions = async (recipe: Recipe, ingredientId: string, search = substitutionSearch, unit: "g" | "ml" | "" = "") => {
    if (!ingredientId) {
      setSubstitutions(null)
      return
    }

    setLoadingSubstitutions(true)
    try {
      const data = await nutritionService.getIngredientSubstitutions(recipe.id, {
        ingredientId,
        search,
        unit: unit || undefined,
      })
      setSubstitutions(data)
    } finally {
      setLoadingSubstitutions(false)
    }
  }

  const openSubstitutions = async (recipe: Recipe) => {
    setLoadingSubstitutions(true)
    setSubstitutionSearch("")
    setSubstitutions(null)
    setMobileStep("ingredients")
    try {
      const detailedRecipe = await nutritionService.getRecipe(recipe.id)
      const resolvedRecipe = detailedRecipe || recipe
      setSubstitutionRecipe(resolvedRecipe)
      const firstIngredient = resolvedRecipe.recipe_ingredients?.find((ingredient) => ingredient.food_detail || ingredient.food_id || ingredient.food)
      const firstIngredientId = firstIngredient?.id || ""
      setSelectedIngredientId(firstIngredientId)
      if (firstIngredientId) {
        await loadSubstitutions(resolvedRecipe, firstIngredientId, "")
      }
    } catch (error) {
      toast({
        title: 'No se pudieron cargar equivalencias',
        description: 'Prueba de nuevo en unos segundos.',
        variant: 'destructive',
      })
    } finally {
      setLoadingSubstitutions(false)
    }
  }

  const buildSubstitutionPayload = (item: IngredientSubstitution): MealIngredientSubstitution | null => {
    if (!substitutions) return null
    return {
      ingredient_id: substitutions.ingredient.id || null,
      original_food_id: substitutions.ingredient.food_id,
      original_food_name: substitutions.ingredient.food_name,
      original_quantity: substitutions.ingredient.quantity,
      original_unit: substitutions.ingredient.unit,
      replacement_food_id: item.food_id,
      replacement_food_name: item.food_name,
      replacement_quantity: item.quantity,
      replacement_unit: item.unit,
      target_calories: item.target_calories,
    }
  }

  const applySubstitution = (item: IngredientSubstitution) => {
    if (!substitutionRecipe || !substitutions) return
    const substitution = buildSubstitutionPayload(item)
    if (!substitution) return

    const note = `${substitution.original_food_name} por ${substitution.replacement_quantity}${substitution.replacement_unit} de ${substitution.replacement_food_name}`
    const option: MealOption = {
      id: `recipe-${substitutionRecipe.id}`,
      name: substitutionRecipe.name,
      calories: substitutionRecipe.calories || 0,
      protein: Number(substitutionRecipe.protein) || 0,
      carbs: Number(substitutionRecipe.carbs) || 0,
      fat: Number(substitutionRecipe.fat) || 0,
      imageUrl: substitutionRecipe.image_url || '',
      category: 'balanced',
      icon: '🍽️',
      description: `${substitutionRecipe.description || 'Receta seleccionada'} · Cambio: ${note}`,
      cookTime: substitutionRecipe.prep_time_minutes ? `${substitutionRecipe.prep_time_minutes} min` : undefined,
      recipeId: substitutionRecipe.id,
      customDescription: `${substitutionRecipe.name} (${note})`,
      substitution_details: [substitution],
    }

    onSelectOption(option)
    setSubstitutionRecipe(null)
    onClose()
  }

  const closeSubstitutions = () => {
    setSubstitutionRecipe(null)
    if (equivalenceOnlyMode) {
      onClose()
    }
  }

  useEffect(() => {
    if (!autoOpenEquivalenceRecipeId || loading || recipes.length === 0) return
    const targetRecipe = recipes.find((recipe) => String(recipe.id) === String(autoOpenEquivalenceRecipeId))
    if (!targetRecipe) return
    onAutoOpenConsumed?.()
    openSubstitutions(targetRecipe)
  }, [autoOpenEquivalenceRecipeId, loading, onAutoOpenConsumed, recipes])

  if (!mounted) return null

  // Obtener categorías y tipos de comida únicos de las recetas
  const categories = Array.from(new Set(recipes.map(r => r.category).filter(Boolean)))
  const mealTypes = Array.from(
    new Set(recipes.flatMap(r => r.meal_types || []).filter(Boolean))
  ).sort()

  const modalContent = (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] flex items-start sm:items-center justify-center p-4">
      {!equivalenceOnlyMode && (
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
                placeholder="Buscar por nombre o parte del nombre..."
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
                    className="group overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-xl dark:bg-card dark:border-orange-900/30 cursor-pointer"
                    onClick={async () => {
                      await onSelectRecipe(recipe)
                    }}
                  >
                    <div className="relative h-44 overflow-hidden bg-orange-50">
                      <img
                        src={resolveRecipeImageSrc(recipe.image_url)}
                        alt={recipe.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src = '/placeholder.jpg'
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                      <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                        {recipe.category && (
                          <span className="rounded-full bg-lime-400 px-2.5 py-1 text-[10px] font-black text-lime-950 shadow">
                            {recipe.category}
                          </span>
                        )}
                        {recipe.difficulty && (
                          <span className="rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-gray-700 shadow">
                            {recipe.difficulty}
                          </span>
                        )}
                      </div>
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="line-clamp-2 text-lg font-black leading-tight text-white drop-shadow">
                          {recipe.name}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-white/85">
                          {recipe.description}
                        </p>
                      </div>
                    </div>

                    <div className="p-3">
                      {/* Macros */}
                      <div className="grid grid-cols-4 gap-1.5">
                        <div className="rounded-xl border border-orange-100 bg-orange-50 px-1 py-2 text-center">
                          <div className="text-sm font-black text-orange-700">{recipe.calories}</div>
                          <div className="text-[10px] font-semibold text-orange-500">kcal</div>
                        </div>
                        <div className="rounded-xl border border-blue-100 bg-blue-50 px-1 py-2 text-center">
                          <div className="text-sm font-black text-blue-700">{formatMacro(recipe.protein)}</div>
                          <div className="text-[10px] font-semibold text-blue-500">P</div>
                        </div>
                        <div className="rounded-xl border border-green-100 bg-green-50 px-1 py-2 text-center">
                          <div className="text-sm font-black text-green-700">{formatMacro(recipe.carbs)}</div>
                          <div className="text-[10px] font-semibold text-green-500">C</div>
                        </div>
                        <div className="rounded-xl border border-yellow-100 bg-yellow-50 px-1 py-2 text-center">
                          <div className="text-sm font-black text-yellow-700">{formatMacro(recipe.fat)}</div>
                          <div className="text-[10px] font-semibold text-yellow-500">G</div>
                        </div>
                      </div>

                      {/* Info adicional */}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-600">
                        {recipe.prep_time_minutes > 0 && (
                          <span className="flex items-center gap-1 rounded-full bg-gray-50 px-2 py-1">
                            <Clock className="w-3 h-3" />
                            {recipe.prep_time_minutes} min
                          </span>
                        )}
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                          Recomendada
                        </span>
                      </div>

                      {/* Botón seleccionar */}
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation()
                          await onSelectRecipe(recipe)
                        }}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-3 text-sm font-black text-white shadow-lg transition-all hover:from-orange-600 hover:to-pink-600 active:scale-[0.98]"
                      >
                        <BookOpen className="h-4 w-4" />
                        Seleccionar
                      </button>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation()
                          await openSubstitutions(recipe)
                        }}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-700 transition-all hover:bg-emerald-100 active:scale-[0.98]"
                      >
                        <Shuffle className="h-4 w-4" />
                        Ver equivalencias
                      </button>
                    </div>
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
      )}

      {equivalenceOnlyMode && !substitutionRecipe && (
        <div className="z-[9999] flex w-full max-w-md items-center justify-center rounded-2xl bg-white p-8 shadow-2xl">
          <Loader2 className="mr-3 h-6 w-6 animate-spin text-emerald-600" />
          <span className="text-sm font-semibold text-gray-600">Cargando equivalencias...</span>
        </div>
      )}

      {substitutionRecipe && (
        <div className={`${equivalenceOnlyMode ? 'relative z-[9999] w-full' : 'absolute inset-0 z-[10000]'} flex items-start justify-center ${equivalenceOnlyMode ? '' : 'bg-black/55'} p-4 sm:items-center`}>
          <div className="flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

            {/* Header */}
            <div className="flex-shrink-0 border-b border-gray-100 p-4">
              <div className="flex items-center justify-between gap-3">
                {/* Mobile back button (only on results step) */}
                <button
                  type="button"
                  onClick={() => setMobileStep("ingredients")}
                  className={`md:hidden flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 ${
                    mobileStep === "results" ? "flex" : "hidden"
                  }`}
                  aria-label="Volver a ingredientes"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver
                </button>

                {/* Title: hidden on mobile results step */}
                <div className={`flex-1 min-w-0 ${
                  mobileStep === "results" ? "hidden md:block" : "block"
                }`}>
                  <h3 className="text-lg font-black text-gray-900">Equivalencias de ingredientes</h3>
                  <p className="mt-0.5 text-xs text-gray-500 truncate">{substitutionRecipe.name}</p>
                </div>

                {/* Mobile results step: show selected ingredient name */}
                {mobileStep === "results" && (
                  <div className="md:hidden flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase text-gray-400">Equivalencias de</p>
                    <p className="text-sm font-black text-gray-900 truncate">
                      {linkedIngredients.find(i => i.id === selectedIngredientId)?.food_detail?.name ||
                        linkedIngredients.find(i => i.id === selectedIngredientId)?.food ||
                        'Ingrediente'}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={closeSubstitutions}
                  className="flex-shrink-0 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Cerrar equivalencias"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body: step-based on mobile, 2-col on desktop */}
            <div className="min-h-0 flex-1 overflow-hidden flex flex-col md:grid md:grid-cols-[280px_1fr]">

              {/* LEFT: ingredient list */}
              <div className={`${
                mobileStep === "ingredients" ? "flex" : "hidden"
              } md:flex flex-col overflow-y-auto border-b border-gray-100 p-4 md:border-b-0 md:border-r`}>
                <p className="mb-3 text-xs font-black uppercase text-gray-400">Selecciona el ingrediente a reemplazar</p>
                {linkedIngredients.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
                    Esta receta todavía no tiene ingredientes vinculados a alimentos. Cuando el admin los estructure, se podrán calcular cambios automáticos.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {linkedIngredients.map((ingredient) => {
                      const foodName = ingredient.food_detail?.name || ingredient.food || 'Ingrediente'
                      const isSelected = selectedIngredientId === ingredient.id
                      return (
                        <button
                          key={ingredient.id}
                          type="button"
                          onClick={() => {
                            setSelectedIngredientId(ingredient.id)
                            loadSubstitutions(substitutionRecipe, ingredient.id)
                            setMobileStep("results")
                          }}
                          className={`w-full rounded-xl border px-3 py-3 text-left transition flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-200 hover:bg-emerald-50/50'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-black truncate">{foodName}</div>
                            <div className="text-xs font-medium text-gray-500">
                              {ingredient.quantity}{ingredient.unit ? ` ${ingredient.unit}` : ''}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400 md:hidden" />
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* RIGHT: substitution results */}
              <div className={`${
                mobileStep === "results" ? "flex" : "hidden"
              } md:flex flex-col min-h-0 p-4`}>
                <div className="mb-3 flex gap-2">
                  <input
                    type="text"
                    value={substitutionSearch}
                    onChange={(e) => setSubstitutionSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && selectedIngredientId) {
                        loadSubstitutions(substitutionRecipe, selectedIngredientId, substitutionSearch)
                      }
                    }}
                    placeholder="Buscar alimento equivalente..."
                    className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => loadSubstitutions(substitutionRecipe, selectedIngredientId, substitutionSearch)}
                    disabled={!selectedIngredientId || loadingSubstitutions}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Buscar
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  {loadingSubstitutions ? (
                    <div className="flex items-center justify-center py-10 text-sm font-semibold text-gray-500">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin text-emerald-600" />
                      Calculando equivalencias...
                    </div>
                  ) : substitutions && substitutions.results.length > 0 ? (
                    <div className="space-y-2">
                      <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <span>
                            Equivalencia para {substitutions.ingredient.quantity}{substitutions.ingredient.unit} de {substitutions.ingredient.food_name}: {substitutions.ingredient.target_calories} kcal
                          </span>
                          <span className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-black text-emerald-700">
                            {substitutions.ingredient.unit}
                          </span>
                        </div>
                      </div>
                      {substitutions.results.map((item) => (
                        <div key={item.food_id} className="rounded-xl border border-gray-200 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-black text-gray-900">{item.food_name}</div>
                              <div className="mt-1 text-sm font-semibold text-emerald-700">
                                {item.quantity}{item.unit} para mantener unas {item.calories} kcal
                              </div>
                            </div>
                            <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-600">
                              {item.category.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-bold">
                            <div className="rounded-lg bg-blue-50 px-2 py-1 text-blue-700">P {formatMacro(item.protein)}</div>
                            <div className="rounded-lg bg-green-50 px-2 py-1 text-green-700">C {formatMacro(item.carbs)}</div>
                            <div className="rounded-lg bg-yellow-50 px-2 py-1 text-yellow-700">G {formatMacro(item.fat)}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => applySubstitution(item)}
                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-700"
                          >
                            <Shuffle className="h-3.5 w-3.5" />
                            Usar este cambio
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm font-medium text-gray-500">
                      {selectedIngredientId
                        ? 'No se encontraron equivalencias para este ingrediente.'
                        : 'Selecciona un ingrediente para ver alternativas con los gramos ajustados a sus kcal.'}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )

  return typeof document !== 'undefined' && createPortal(modalContent, document.body)
}
