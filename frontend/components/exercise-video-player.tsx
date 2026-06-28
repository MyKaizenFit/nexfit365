'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Play, ExternalLink, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import {
  getExerciseCoverUrl,
  getExerciseVideoUrl,
  getYoutubeEmbedUrl,
  isGoogleDriveUrl,
  isYoutubeUrl,
  type ExerciseMediaLike,
} from '@/lib/exercise-media'

interface ExerciseVideoPlayerProps {
  exercise: ExerciseMediaLike & {
    id?: string
    name: string
    description?: string
    instructions?: string
  }
  children?: React.ReactNode
}

export function ExerciseVideoPlayer({ exercise, children }: ExerciseVideoPlayerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [videoError, setVideoError] = useState(false)

  const videoUrl = getExerciseVideoUrl(exercise)
  const coverUrl = getExerciseCoverUrl(exercise)

  if (!videoUrl && !exercise.has_video && !coverUrl && !exercise.description && !exercise.instructions) {
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
            {videoUrl && !videoError && (
              <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                {isYoutubeUrl(videoUrl) ? (
                  <iframe
                    src={getYoutubeEmbedUrl(videoUrl)}
                    title={`Video de ${exercise.name}`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    onError={handleVideoError}
                  />
                ) : isGoogleDriveUrl(videoUrl) ? (
                  <div className="relative w-full h-full">
                    {coverUrl ? (
                      <Image
                        src={coverUrl}
                        alt={exercise.name}
                        fill
                        className="object-cover opacity-30"
                        unoptimized
                      />
                    ) : null}
                    <iframe
                      src={videoUrl}
                      title={`Video de ${exercise.name}`}
                      className="absolute inset-0 w-full h-full"
                      allow="autoplay; fullscreen"
                      allowFullScreen
                      onError={handleVideoError}
                    />
                  </div>
                ) : (
                  <video
                    src={videoUrl}
                    controls
                    className="w-full h-full"
                    poster={coverUrl || undefined}
                    onError={handleVideoError}
                  >
                    Tu navegador no soporta la reproducción de videos.
                  </video>
                )}
              </div>
            )}

            {!videoUrl && coverUrl && (
              <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={coverUrl}
                  alt={exercise.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}

            {!videoUrl && !coverUrl && (
              <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                <div className="text-center p-6">
                  <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                  <p className="text-gray-700 font-medium mb-2">Video no disponible</p>
                  <p className="text-gray-500 text-sm">
                    Este ejercicio aún no tiene un video asignado, disculpe por las molestias.
                  </p>
                </div>
              </div>
            )}

            {videoUrl && !videoError && (
              <Button
                variant="outline"
                onClick={() => window.open(videoUrl, '_blank')}
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir en nueva pestaña
              </Button>
            )}

            {videoError && videoUrl && (
              <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                <div className="text-center p-6">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-gray-700 font-medium mb-2">Video no disponible</p>
                  <p className="text-gray-500 text-sm mb-4">
                    No se pudo reproducir el video en el navegador.
                  </p>
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
