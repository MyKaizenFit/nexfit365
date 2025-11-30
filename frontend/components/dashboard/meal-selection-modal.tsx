'use client'

import React, { useState } from 'react'
import { MealOption } from '@/lib/nutrition-service'
import { X, Clock, Zap, Leaf } from 'lucide-react'

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

  if (!isOpen) return null

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

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-orange-500/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl border-2 border-purple-100">
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
              className="border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">{option.icon}</div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">{option.name}</h4>
                  <p className="text-sm text-gray-600 mb-2">{option.description}</p>
                  
                  {/* Macros */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-orange-500" />
                      {option.calories} kcal
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      {option.protein}g proteína
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      {option.carbs}g carbos
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      {option.fat}g grasas
                    </span>
                  </div>
                  
                  {/* Categoría */}
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(option.category)}
                    <span className="text-xs text-gray-500">
                      {getCategoryName(option.category)}
                    </span>
                    {option.cookTime && (
                      <span className="text-xs text-gray-400">
                        • {option.cookTime}
                      </span>
                    )}
                  </div>
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
  )
}
