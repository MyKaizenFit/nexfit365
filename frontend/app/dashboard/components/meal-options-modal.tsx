"use client"

import { useState } from "react"
import { X, Clock, ChefHat, ExternalLink, BookOpen, Utensils } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { formatMacro } from "@/lib/utils"

interface MealOption {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  description: string
  category?: "light" | "balanced" | "protein-rich"
  icon?: string
  cookTime?: string
  difficulty?: string
  tags?: string[]
  recipeUrl?: string
}

interface MealOptionsModalProps {
  isOpen: boolean
  onClose: () => void
  mealName: string
  mealTime: string
  options: MealOption[]
  onSelectMeal: (option: MealOption) => void | Promise<void>
}

export function MealOptionsModal({
  isOpen,
  onClose,
  mealName,
  mealTime,
  options,
  onSelectMeal
}: MealOptionsModalProps) {
  const [selectedOption, setSelectedOption] = useState<MealOption | null>(null)

  const handleSelectMeal = (option: MealOption) => {
    setSelectedOption(option)
    onSelectMeal(option)
    toast({
      title: "Comida seleccionada",
      description: `${option.name} seleccionada para ${mealName}`,
    })
    onClose()
  }

  const openRecipe = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'muy fácil':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'fácil':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'medio':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'difícil':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getCategoryIcon = (name: string) => {
    const lowerName = name.toLowerCase()
    if (lowerName.includes('pollo') || lowerName.includes('pavo') || lowerName.includes('huevo')) return "🍗"
    if (lowerName.includes('pescado') || lowerName.includes('salmón') || lowerName.includes('merluza') || lowerName.includes('atún')) return "🐟"
    if (lowerName.includes('fruta') || lowerName.includes('plátano') || lowerName.includes('fresa')) return "🍎"
    if (lowerName.includes('yogur') || lowerName.includes('queso')) return "🥛"
    if (lowerName.includes('avena') || lowerName.includes('granola')) return "🌾"
    if (lowerName.includes('aguacate')) return "🥑"
    if (lowerName.includes('lentejas') || lowerName.includes('garbanzos')) return "🫘"
    if (lowerName.includes('arroz') || lowerName.includes('pasta') || lowerName.includes('quinoa')) return "🍚"
    if (lowerName.includes('espinacas') || lowerName.includes('verduras')) return "🥬"
    return "🍽️"
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Utensils className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="truncate">Opciones para {mealName}</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Selecciona una opción de comida para {mealTime}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4">
          {options.map((option, index) => (
            <Card 
              key={option.id} 
              className="hover:shadow-lg transition-all duration-300 cursor-pointer group"
              onClick={() => setSelectedOption(option)}
            >
              <CardHeader className="pb-2 sm:pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xl sm:text-2xl flex-shrink-0">{getCategoryIcon(option.name)}</span>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm sm:text-base lg:text-lg leading-tight truncate">{option.name}</CardTitle>
                      <CardDescription className="text-xs sm:text-sm mt-1 truncate">
                        {option.calories} kcal • P: {formatMacro(option.protein)}g • C: {formatMacro(option.carbs)}g • G: {formatMacro(option.fat)}g
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    #{index + 1}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {option.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-3">
                  {option.cookTime && (
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {option.cookTime}
                    </Badge>
                  )}
                  {option.difficulty && (
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getDifficultyColor(option.difficulty)}`}
                    >
                      {option.difficulty}
                    </Badge>
                  )}
                </div>

                {option.tags && option.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {option.tags.slice(0, 3).map((tag, tagIndex) => (
                      <Badge key={tagIndex} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs sm:text-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (option.recipeUrl) {
                        openRecipe(option.recipeUrl)
                      }
                    }}
                    disabled={!option.recipeUrl}
                  >
                    <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">Ver </span>Receta
                  </Button>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelectMeal(option)
                    }}
                    className="flex-1 text-xs sm:text-sm"
                  >
                    <ChefHat className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Seleccionar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <ChefHat className="h-4 w-4" />
            Consejos para cuadrar macros
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>Sube/baja proteína:</strong> añade/quita ½ scoop de whey, 80–100 g de pechuga o 1 clara</li>
            <li>• <strong>Ajusta carbohidratos:</strong> juega con 40–70 g de pan/arroz/pasta en crudo por comida</li>
            <li>• <strong>Controla grasas:</strong> usa 1–2 cditas de AOVE por plato; aguacate y frutos secos en porciones de 15–25 g</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  )
}
