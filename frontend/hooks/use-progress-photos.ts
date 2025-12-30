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
      console.log('🔄 Fetching progress photos...')

      const data = await userService.getProgressPhotos()
      console.log('📥 Datos recibidos del backend:', data)
      
      // Asegurar que siempre sea un array
      const photosArray = Array.isArray(data) ? data : []
      console.log(`📸 Fotos procesadas: ${photosArray.length} fotos`)
      
      setPhotos(photosArray)
      console.log('✅ Estado de fotos actualizado en el hook')
    } catch (err) {
      console.error('❌ Error fetching progress photos:', err)
      setError(err instanceof Error ? err.message : 'Error al obtener fotos')
      setPhotos([])
    } finally {
      setLoading(false)
      console.log('🏁 Fetch completado, loading: false')
    }
  }

  const uploadPhoto = async (
    file: File, 
    weight?: number, 
    notes?: string, 
    photoType: 'front' | 'side' | 'back' | 'other' = 'front'
  ) => {
    try {
      setError(null)
      console.log('📤 Subiendo nueva foto...')
      
      // Verificar autenticación antes de subir
      const authService = getAuthService()
      console.log('🔐 Estado de autenticación:')
      console.log('  - isAuthenticated:', isAuthenticated)
      console.log('  - Usuario actual:', user)
      console.log('  - Token disponible:', !!authService.getAccessToken())
      
      if (!isAuthenticated) {
        throw new Error('Usuario no autenticado')
      }
      
      if (!user) {
        throw new Error('No se pudo obtener información del usuario')
      }
      
      const newPhoto = await userService.uploadProgressPhoto(file, weight, notes, photoType)
      console.log('✅ Foto subida exitosamente:', newPhoto)
      
      // Agregar la nueva foto al estado inmediatamente
      setPhotos(prev => {
        const updatedPhotos = [newPhoto, ...prev] // Nueva foto al principio
        console.log(`🔄 Estado actualizado: ${updatedPhotos.length} fotos`)
        return updatedPhotos
      })
      
      // NO recargar todas las fotos - mantener el estado local
      console.log('✅ Foto agregada al estado local sin recargar del backend')
      
      return newPhoto
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al subir foto'
      console.error('❌ Error al subir foto:', errorMessage)
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const deletePhoto = async (photoId: number | string) => {
    try {
      // TODO: Implementar endpoint de eliminación en el backend
      setPhotos(prev => prev.filter(photo => photo.id.toString() !== photoId.toString()))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar foto'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const refreshPhotos = async () => {
    console.log('🔄 Refrescando fotos desde el backend...')
    await fetchProgressPhotos()
  }

  return {
    photos,
    loading,
    error,
    uploadPhoto,
    deletePhoto,
    refreshPhotos,
  }
}
