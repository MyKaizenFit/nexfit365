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
        return 'bg-gray-100 text-foreground border-border'
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
      <DialogContent className="flex max-h-[92dvh] w-[95vw] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:rounded-xl">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
          <DialogHeader className="pr-8">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Utensils className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="truncate">Opciones para {mealName}</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Selecciona una opción de comida para {mealTime}.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {options.map((option, index) => (
            <Card 
              key={option.id} 
              className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg"
              onClick={() => setSelectedOption(option)}
            >
              <CardHeader className="relative min-h-[170px] overflow-hidden bg-gradient-to-br from-slate-50 via-orange-50 to-stone-50 p-0">
                <div className="absolute inset-0 opacity-70">
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border border-orange-200/70" />
                  <div className="absolute right-12 bottom-6 h-16 w-16 rounded-full bg-white/70 shadow-sm ring-1 ring-orange-100" />
                  <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-orange-100/45" />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/65 to-transparent" />
                </div>
                <div className="relative z-10 flex min-h-[170px] flex-col justify-between p-4 text-slate-900">
                  <div className="flex items-start justify-between gap-2">
                    <Badge className="border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 shadow-sm">
                      Opción {index + 1}
                    </Badge>
                    {option.difficulty && (
                      <Badge className="border border-white bg-white/80 px-2 py-1 text-[10px] font-bold text-slate-600 shadow-sm">
                        {option.difficulty}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="line-clamp-2 text-xl font-black leading-tight text-slate-900">
                        {option.name}
                      </CardTitle>
                      <CardDescription className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-slate-600">
                        {option.description}
                      </CardDescription>
                    </div>
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/85 text-3xl shadow-sm ring-1 ring-orange-100 backdrop-blur">
                      {getCategoryIcon(option.name)}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-3">
                <div className="grid grid-cols-4 gap-1.5">
                  <div className="rounded-xl border border-orange-100/80 bg-orange-50/60 px-1 py-2 text-center">
                    <div className="text-sm font-black text-orange-600">{option.calories}</div>
                    <div className="text-[10px] font-semibold text-orange-400">kcal</div>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-1 py-2 text-center">
                    <div className="text-sm font-black text-blue-700">{formatMacro(option.protein)}</div>
                    <div className="text-[10px] font-semibold text-blue-500">P</div>
                  </div>
                  <div className="rounded-xl border border-emerald-100/80 bg-emerald-50/60 px-1 py-2 text-center">
                    <div className="text-sm font-black text-emerald-600">{formatMacro(option.carbs)}</div>
                    <div className="text-[10px] font-semibold text-emerald-400">C</div>
                  </div>
                  <div className="rounded-xl border border-yellow-100 bg-yellow-50 px-1 py-2 text-center">
                    <div className="text-sm font-black text-yellow-700">{formatMacro(option.fat)}</div>
                    <div className="text-[10px] font-semibold text-yellow-500">G</div>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
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
                  <div className="flex flex-wrap gap-1 mt-2">
                    {option.tags.slice(0, 3).map((tag, tagIndex) => (
                      <Badge key={tagIndex} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 rounded-xl text-xs sm:text-sm"
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
                    className="flex-1 rounded-xl border border-orange-200 bg-orange-100 text-xs font-black text-orange-800 shadow-sm hover:bg-orange-200 sm:text-sm"
                  >
                    <ChefHat className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Seleccionar
                  </Button>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>

          <div className="mt-6 rounded-lg bg-muted/50 p-4">
            <h4 className="mb-2 flex items-center gap-2 font-medium">
              <ChefHat className="h-4 w-4" />
              Consejos para cuadrar macros
            </h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• <strong>Sube/baja proteína:</strong> añade/quita ½ scoop de whey, 80–100 g de pechuga o 1 clara</li>
              <li>• <strong>Ajusta carbohidratos:</strong> juega con 40–70 g de pan/arroz/pasta en crudo por comida</li>
              <li>• <strong>Controla grasas:</strong> usa 1–2 cditas de AOVE por plato; aguacate y frutos secos en porciones de 15–25 g</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
