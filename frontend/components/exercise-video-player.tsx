'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Play, ExternalLink, AlertCircle } from 'lucide-react'
import Image from 'next/image'

interface ExerciseVideoPlayerProps {
  exercise: {
    id: string
    name: string
    video_display_url?: string
    video_file_url?: string
    video_url?: string
    thumbnail_url?: string
    image_url?: string
    has_video?: boolean
    google_drive_file_id?: string
    description?: string
    instructions?: string
  }
  children?: React.ReactNode
}

/**
 * Normaliza el nombre del ejercicio para construir URLs de Google Drive
 * - Limpia caracteres especiales
 * - Convierte espacios a guiones
 * - Convierte a minúsculas
 * Ejemplo: "Press de Banca Inclinado" → "press-de-banca-inclinado"
 */
function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD') // Normalizar caracteres unicode
    .replace(/[\u0300-\u036f]/g, '') // Eliminar diacríticos
    .replace(/[^a-z0-9\s-]/g, '') // Eliminar caracteres especiales excepto espacios y guiones
    .trim()
    .replace(/\s+/g, '-') // Reemplazar espacios múltiples por un solo guión
    .replace(/-+/g, '-') // Reemplazar múltiples guiones por uno solo
}

/**
 * Construye la URL de Google Drive para un video basado en el nombre normalizado
 * Nota: Requiere que los videos estén en una carpeta compartida de Google Drive
 * y que el nombre del archivo coincida con el nombre normalizado del ejercicio
 */
function buildGoogleDriveUrl(exerciseName: string): string {
  const normalizedName = normalizeExerciseName(exerciseName)
  const folderId = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID || ''

  // Si hay un folder ID configurado, construir URL para buscar en la carpeta
  // Formato: https://drive.google.com/drive/folders/{FOLDER_ID}
  // Para acceder a un archivo específico necesitaríamos el file ID
  // Por ahora, retornamos una URL base que puede ser usada con un mapeo de nombres

  // Alternativa: si tienes un mapeo de nombres a file IDs, puedes usarlo aquí
  // Por ahora retornamos null y manejamos el fallback en el componente
  return ''
}

/**
 * Mapeo de nombres de ejercicios a IDs de archivos de Google Drive
 * Este mapeo debería ser configurado con los IDs reales de los archivos en Google Drive
 * 
 * Para obtener el ID de un archivo:
 * 1. Abre el archivo en Google Drive
 * 2. Copia el ID de la URL: https://drive.google.com/file/d/{FILE_ID}/view
 * 3. Añádelo aquí con el nombre normalizado del ejercicio
 */
const EXERCISE_VIDEO_MAP: Record<string, string> = {
  // Ejemplo: 'press-de-banca': '1ABC123def456GHI789jkl012MNO345',
  // Ejemplo: 'sentadillas': '1XYZ789abc123DEF456ghi789JKL012',
  // Añadir más mapeos según sea necesario
}

/**
 * Obtiene la URL del video, con fallback a Google Drive si no hay video_url
 */
function getVideoUrl(exercise: ExerciseVideoPlayerProps['exercise']): string | null {
  // Primero intentar URLs existentes (video_display_url tiene prioridad ya que viene del backend)
  const directUrl = exercise.video_display_url || exercise.video_file_url || exercise.video_url
  if (directUrl) {
    return directUrl
  }

  // Segundo: usar google_drive_file_id directamente desde la base de datos (más confiable)
  if (exercise.google_drive_file_id) {
    return `https://drive.google.com/file/d/${exercise.google_drive_file_id}/preview`
  }

  // Tercero: buscar en el mapeo manual como fallback (para ejercicios antiguos)
  const normalizedName = normalizeExerciseName(exercise.name)
  if (EXERCISE_VIDEO_MAP[normalizedName]) {
    const fileId = EXERCISE_VIDEO_MAP[normalizedName]
    return `https://drive.google.com/file/d/${fileId}/preview`
  }

  // Si no hay ninguna opción, retornamos null
  return null
}

function getYoutubeEmbedUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace('www.', '')

    if (host === 'youtu.be') {
      const id = parsed.pathname.replace('/', '').trim()
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : url
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname === '/watch') {
        const id = parsed.searchParams.get('v')
        return id ? `https://www.youtube-nocookie.com/embed/${id}` : url
      }

      if (parsed.pathname.startsWith('/embed/')) {
        const id = parsed.pathname.split('/embed/')[1]
        return id ? `https://www.youtube-nocookie.com/embed/${id}` : url
      }

      if (parsed.pathname.startsWith('/shorts/')) {
        const id = parsed.pathname.split('/shorts/')[1]
        return id ? `https://www.youtube-nocookie.com/embed/${id}` : url
      }
    }
  } catch {
    return url
  }

  return url
}

export function ExerciseVideoPlayer({ exercise, children }: ExerciseVideoPlayerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [videoError, setVideoError] = useState(false)

  const videoUrl = getVideoUrl(exercise)

  // Si no hay ningún contenido que mostrar, renderizar children directamente (deshabilitados por el padre)
  if (!videoUrl && !exercise.has_video && !exercise.description && !exercise.instructions) {
    return children ? <>{children}</> : null
  }

  const handlePlay = () => {
    setIsOpen(true)
    setVideoError(false)
  }

  const handleVideoError = () => {
    setVideoError(true)
  }

  return (
    <>
      {children ? (
        <div onClick={handlePlay} className="cursor-pointer">
          {children}
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handlePlay}
          className="w-full"
        >
          <Play className="w-4 h-4 mr-2" />
          Ver Video
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{exercise.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Video Player */}
            {videoUrl && !videoError && (
              <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                {videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') ? (
                  <iframe
                    src={getYoutubeEmbedUrl(videoUrl)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    onError={handleVideoError}
                  />
                ) : videoUrl.includes('drive.google.com') ? (
                  <iframe
                    src={videoUrl}
                    className="w-full h-full"
                    allow="autoplay"
                    onError={handleVideoError}
                  />
                ) : (
                  <video
                    src={videoUrl}
                    controls
                    className="w-full h-full"
                    poster={exercise.thumbnail_url || exercise.image_url}
                    onError={handleVideoError}
                  >
                    Tu navegador no soporta la reproducción de videos.
                  </video>
                )}
              </div>
            )}

            {/* Error si el video falla al cargar */}
            {videoError && videoUrl && (
              <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                <div className="text-center p-6">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-gray-700 font-medium mb-2">No se pudo cargar el video</p>
                  <p className="text-gray-500 text-sm mb-4">El video puede no estar disponible en este momento</p>
                  <Button
                    variant="outline"
                    onClick={() => window.open(videoUrl, '_blank')}
                    className="w-full"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Intentar abrir en nueva pestaña
                  </Button>
                </div>
              </div>
            )}

            {/* Thumbnail si no hay video pero hay imagen */}
            {!videoUrl && (exercise.thumbnail_url || exercise.image_url) && (
              <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={exercise.thumbnail_url || exercise.image_url || ''}
                  alt={exercise.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Link externo si es URL */}
            {videoUrl && !videoUrl.startsWith('/') && !videoError && (
              <Button
                variant="outline"
                onClick={() => window.open(videoUrl, '_blank')}
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir en nueva pestaña
              </Button>
            )}

            {/* Descripción e instrucciones */}
            {(exercise.description || exercise.instructions) && (
              <div className="space-y-3 pt-2 border-t border-border">
                {exercise.description && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-1">Descripción</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{exercise.description}</p>
                  </div>
                )}
                {exercise.instructions && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-1">Instrucciones</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{exercise.instructions}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

