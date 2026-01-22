import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { buildApiUrl, getAuthHeaders } from '@/lib/api'

export interface MotivationalTip {
  title: string
  content: string
  category: string
}

export function useMotivationalTip() {
  const { isAuthenticated } = useAuth()
  const [tip, setTip] = useState<MotivationalTip | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      fetchMotivationalTip()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated])

  const fetchMotivationalTip = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(buildApiUrl('/motivational-tip/'), {
        method: 'GET',
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error('Error al obtener consejo motivacional')
      }

      const data = await response.json()
      setTip(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      
      // Consejo por defecto si falla la conexión
      setTip({
        title: "¡Mantén la motivación!",
        content: "Recuerda que cada día es una nueva oportunidad para mejorar.",
        category: "general"
      })
    } finally {
      setLoading(false)
    }
  }

  const refreshTip = () => {
    fetchMotivationalTip()
  }

  return {
    tip,
    loading,
    error,
    refreshTip,
  }
}
