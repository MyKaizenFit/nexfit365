'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const SKIP_REASONS = [
  'No me apetece',
  'No tengo ingredientes',
  'No tengo hambre',
  'Exceso de calorías',
  'Estoy fuera de casa',
  'Otra razón',
]

interface SkipMealModalProps {
  mealName: string
  onConfirm: (reason: string, excludeFromRecommendations: boolean) => void
  onCancel: () => void
}

export function SkipMealModal({ mealName, onConfirm, onCancel }: SkipMealModalProps) {
  const [selectedReason, setSelectedReason] = useState(SKIP_REASONS[0])
  const [customReason, setCustomReason] = useState('')
  const [excludeFromRecommendations, setExcludeFromRecommendations] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const isCustom = selectedReason === 'Otra razón'
  const finalReason = isCustom ? customReason.trim() || 'Otra razón' : selectedReason

  const handleConfirm = () => {
    onConfirm(finalReason, excludeFromRecommendations)
  }

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-xl">⏭️</span>
            <div>
              <h2 className="font-semibold text-foreground text-base">No como esta comida</h2>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{mealName}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-muted-foreground">¿Por qué no comes esta comida hoy?</p>

          {/* Razones predefinidas */}
          <div className="grid grid-cols-2 gap-2">
            {SKIP_REASONS.map((reason) => (
              <button
                key={reason}
                onClick={() => setSelectedReason(reason)}
                className={`text-xs font-medium px-3 py-2.5 rounded-xl border-2 transition-all text-left ${
                  selectedReason === reason
                    ? 'border-amber-400 bg-amber-50 text-amber-800'
                    : 'border-border bg-muted text-gray-700 hover:border-gray-300 hover:bg-gray-100'
                }`}
              >
                {reason}
              </button>
            ))}
          </div>

          {/* Input para razón personalizada */}
          {isCustom && (
            <input
              type="text"
              placeholder="Escribe el motivo..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm() }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              autoFocus
            />
          )}

          {/* Excluir de recomendaciones */}
          <label className="flex items-start gap-3 p-3 rounded-xl bg-orange-50 border border-orange-100 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={excludeFromRecommendations}
              onChange={(e) => setExcludeFromRecommendations(e.target.checked)}
              className="mt-0.5 accent-orange-500 w-4 h-4 flex-shrink-0"
            />
            <div>
              <p className="text-xs font-semibold text-orange-800">No recomendar más esta comida</p>
              <p className="text-[10px] text-orange-600 mt-0.5">
                Se excluirá de las sugerencias futuras de tu plan nutricional
              </p>
            </div>
          </label>
        </div>

        {/* Botones */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border-2 border-border text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors touch-manipulation"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-sm font-semibold transition-colors touch-manipulation"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )

  if (!mounted) return null
  return createPortal(modal, document.body)
}
