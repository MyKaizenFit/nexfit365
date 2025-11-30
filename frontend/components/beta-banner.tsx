'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function BetaBanner() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Verificar si el usuario ya cerró el banner
    const bannerClosed = localStorage.getItem('nex-fit-beta-banner-closed')
    if (!bannerClosed) {
      setIsVisible(true)
    }
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    // Guardar en localStorage que el usuario cerró el banner
    localStorage.setItem('nex-fit-beta-banner-closed', 'true')
  }

  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white shadow-lg animate-in slide-in-from-top duration-500">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <p className="text-sm font-medium">
              <span className="font-bold">Versión Beta</span> - Nex-Fit está en desarrollo activo. 
              Puedes encontrar algunas funcionalidades en mejora continua.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-white hover:bg-white/20 h-8 w-8 rounded-full"
            aria-label="Cerrar banner"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

