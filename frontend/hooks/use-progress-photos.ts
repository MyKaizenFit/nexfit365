// hooks/use-progress-photos.ts
// Hook para manejar fotos de progreso con datos reales del backend

import { useRef, useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { userService, ProgressPhoto } from '@/lib/user-service'
import { getAuthService } from '@/lib/auth-service'
import type { ProgressPhotoType } from '@/lib/progress-photo-types'

export function useProgressPhotos() {
  const { isAuthenticated, user } = useAuth()
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const uploadLock = useRef(false)

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
    photoType: ProgressPhotoType = 'front',
    date?: string
  ) => {
    if (uploadLock.current) {
      throw new Error('Ya hay una subida en curso')
    }
    try {
      uploadLock.current = true
      setUploading(true)
      setError(null)
      
      // Verificar autenticación antes de subir
      const authService = getAuthService()
      
      if (!isAuthenticated) {
        throw new Error('Usuario no autenticado')
      }
      
      if (!user) {
        throw new Error('No se pudo obtener información del usuario')
      }

      const idemKey =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`
      
      const newPhoto = await userService.uploadProgressPhoto(
        file,
        weight,
        notes,
        photoType,
        date,
        idemKey,
      )
      
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
    } finally {
      uploadLock.current = false
      setUploading(false)
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
    photoType: ProgressPhotoType = 'front',
    date?: string
  ) => {
    if (uploadLock.current) {
      throw new Error('Ya hay una subida en curso')
    }
    try {
      uploadLock.current = true
      setUploading(true)
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
    } finally {
      uploadLock.current = false
      setUploading(false)
    }
  }

  const refreshPhotos = async () => {
    await fetchProgressPhotos()
  }

  return {
    photos,
    loading,
    uploading,
    error,
    uploadPhoto,
    uploadPhotos,
    deletePhoto,
    refreshPhotos,
  }
}
