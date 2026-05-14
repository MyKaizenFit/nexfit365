"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

const COOKIE_KEY = "nexfit365_cookie_consent"

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY)
    if (!consent) {
      setVisible(true)
    }
  }, [])

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, "accepted")
    setVisible(false)
  }

  const reject = () => {
    localStorage.setItem(COOKIE_KEY, "rejected")
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t border-border shadow-lg">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 text-sm text-muted-foreground">
          <p>
            Usamos cookies esenciales para el funcionamiento de la aplicación y cookies de análisis para
            mejorar tu experiencia. Puedes aceptar todas o solo las esenciales.{" "}
            <a
              href="/privacidad"
              className="underline text-foreground hover:text-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Política de privacidad
            </a>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={reject}>
            Solo esenciales
          </Button>
          <Button size="sm" onClick={accept}>
            Aceptar todas
          </Button>
          <button
            aria-label="Cerrar"
            onClick={reject}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
