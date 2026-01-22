import { useState, useEffect } from 'react'
import { buildApiUrl, getAuthHeaders } from '@/lib/api'
import { toast } from '@/hooks/use-toast'

export interface WellnessTip {
  id: string
  title: string
  summary: string
  content: string
  category: 'nutrition' | 'training' | 'mindset' | 'recovery' | 'lifestyle'
  audience: string
  is_active: boolean
  is_highlighted: boolean
  created_at: string
  updated_at: string
}

export type WellnessTipCategory = 'nutrition' | 'training' | 'mindset' | 'recovery' | 'lifestyle'

export interface WellnessTipPayload {
  title: string
  summary: string
  content: string
  category: WellnessTipCategory
  audience: string
  is_active: boolean
  is_highlighted: boolean
}

interface UseWellnessTipsOptions {
  highlighted?: boolean
  limit?: number
  category?: string
}

export function useWellnessTips(options: UseWellnessTipsOptions = {}) {
  const [tips, setTips] = useState<WellnessTip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTips = async () => {
    try {
      setLoading(true)
      
      // Construir query params
      const params = new URLSearchParams()
      if (options.limit) params.append('limit', options.limit.toString())
      if (options.category) params.append('category', options.category)
      
      const url = params.toString() 
        ? `tips/?${params.toString()}`
        : 'tips/'
      
      const response = await fetch(buildApiUrl(url), {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error('Error al cargar tips')
      }

      let data = await response.json()
      
      // Si la respuesta es paginada, extraer results
      if (data.results) {
        data = data.results
      }
      
      // Filtrar por highlighted si se especificó
      if (options.highlighted && Array.isArray(data)) {
        data = data.filter((tip: WellnessTip) => tip.is_highlighted)
      }
      
      // Limitar en frontend si es necesario
      if (options.limit && Array.isArray(data) && data.length > options.limit) {
        data = data.slice(0, options.limit)
      }
      
      setTips(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setTips([])
    } finally {
      setLoading(false)
    }
  }

  const createTip = async (payload: WellnessTipPayload) => {
    try {
      const response = await fetch(buildApiUrl('tips/'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Error al crear tip')
      }

      const newTip = await response.json()
      toast({
        title: '✅ Consejo creado',
        description: 'El consejo ha sido publicado correctamente',
      })
      
      await fetchTips()
      return newTip
    } catch (err) {
      toast({
        title: '❌ Error',
        description: err instanceof Error ? err.message : 'Error al crear consejo',
        variant: 'destructive',
      })
      return null
    }
  }

  const updateTip = async (id: string, updates: Partial<WellnessTipPayload>) => {
    try {
      const response = await fetch(buildApiUrl(`tips/${id}/`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Error al actualizar tip')
      }

      toast({
        title: '✅ Actualizado',
        description: 'El consejo ha sido actualizado',
      })
      
      await fetchTips()
    } catch (err) {
      toast({
        title: '❌ Error',
        description: err instanceof Error ? err.message : 'Error al actualizar',
        variant: 'destructive',
      })
    }
  }

  const deleteTip = async (id: string) => {
    try {
      const response = await fetch(buildApiUrl(`tips/${id}/`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error('Error al eliminar tip')
      }

      toast({
        title: '✅ Eliminado',
        description: 'El consejo ha sido eliminado',
      })
      
      await fetchTips()
    } catch (err) {
      toast({
        title: '❌ Error',
        description: err instanceof Error ? err.message : 'Error al eliminar',
        variant: 'destructive',
      })
    }
  }

  useEffect(() => {
    fetchTips()
  }, [options.highlighted, options.limit, options.category])

  return {
    tips,
    loading,
    error,
    refresh: fetchTips,
    createTip,
    updateTip,
    deleteTip,
  }
}
