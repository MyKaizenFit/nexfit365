// hooks/use-progress-photos.ts
// Hook para manejar fotos de progreso con datos reales del backend

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { userService, ProgressPhoto } from '@/lib/user-service'
import { getAuthService } from '@/lib/auth-service'

export function useProgressPhotos() {
  const { isAuthenticated, user } = useAuth()
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      fetchProgressPhotos()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated])

  const fetchProgressPhotos = async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await userService.getProgressPhotos()
      
      // Asegurar que siempre sea un array
      const photosArray = Array.isArray(data) ? data : []
      
      setPhotos(photosArray)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al obtener fotos')
      setPhotos([])
    } finally {
      setLoading(false)
    }
  }

  const uploadPhoto = async (
    file: File, 
    weight?: number, 
    notes?: string, 
    photoType: 'front' | 'side' | 'back' | 'other' = 'front',
    date?: string
  ) => {
    try {
      setError(null)
      
      // Verificar autenticación antes de subir
      const authService = getAuthService()
      
      if (!isAuthenticated) {
        throw new Error('Usuario no autenticado')
      }
      
      if (!user) {
        throw new Error('No se pudo obtener información del usuario')
      }
      
      const newPhoto = await userService.uploadProgressPhoto(file, weight, notes, photoType, date)
      
      // Agregar la nueva foto al estado inmediatamente
      setPhotos(prev => {
        const updatedPhotos = [newPhoto, ...prev] // Nueva foto al principio
        return updatedPhotos
      })
      
      // Notificar actualización de peso para refrescar historial si aplica
      if (weight !== undefined && weight !== null && !isNaN(weight)) {
        window.dispatchEvent(new CustomEvent('weightUpdated', { detail: { weight } }))
      }

      // NO recargar todas las fotos - mantener el estado local
      
      return newPhoto
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al subir foto'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const deletePhoto = async (photoId: number | string) => {
    try {
      setError(null)
      await userService.deleteProgressPhoto(photoId)
      setPhotos(prev => prev.filter(photo => photo.id.toString() !== photoId.toString()))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar foto'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const uploadPhotos = async (
    files: File[],
    weight?: number,
    notes?: string,
    photoType: 'front' | 'side' | 'back' | 'other' = 'front',
    date?: string
  ) => {
    try {
      setError(null)

      if (!isAuthenticated) {
        throw new Error('Usuario no autenticado')
      }

      if (!user) {
        throw new Error('No se pudo obtener información del usuario')
      }

      const newPhotos = await userService.uploadProgressPhotos(files, weight, notes, photoType, date)
      setPhotos(prev => [...newPhotos, ...prev])

      if (weight !== undefined && weight !== null && !isNaN(weight)) {
        window.dispatchEvent(new CustomEvent('weightUpdated', { detail: { weight } }))
      }

      return newPhotos
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al subir fotos'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const refreshPhotos = async () => {
    await fetchProgressPhotos()
  }

  return {
    photos,
    loading,
    error,
    uploadPhoto,
    uploadPhotos,
    deletePhoto,
    refreshPhotos,
  }
}
