'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Play, Dumbbell, Target, BarChart3 } from 'lucide-react'
import { ExerciseVideoPlayer } from './exercise-video-player'
import Image from 'next/image'

interface ExerciseCardProps {
  exercise: {
    id: string
    name: string
    description?: string
    category?: string
    muscle_groups?: string[]
    equipment?: string[]
    difficulty?: string
    instructions?: string
    video_display_url?: string
    video_file_url?: string
    video_url?: string
    thumbnail_url?: string
    image_url?: string
    has_video?: boolean
    google_drive_file_id?: string
  }
  showDetails?: boolean
  className?: string
}

const difficultyLabels: Record<string, { label: string; color: string }> = {
  beginner: { label: 'Principiante', color: 'bg-green-100 text-green-800 border-green-200' },
  intermediate: { label: 'Intermedio', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  advanced: { label: 'Avanzado', color: 'bg-red-100 text-red-800 border-red-200' },
}

export function ExerciseCard({ exercise, showDetails = true, className }: ExerciseCardProps) {
  const hasVisual = exercise.has_video || exercise.thumbnail_url || exercise.image_url
  const difficultyInfo = exercise.difficulty ? difficultyLabels[exercise.difficulty] : null

  return (
    <Card className={className}>
      <CardHeader className="pb-3 px-3 md:px-6 pt-3 md:pt-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base md:text-lg leading-tight break-words">{exercise.name}</CardTitle>
            {exercise.description && (
              <CardDescription className="mt-1 line-clamp-2 text-xs md:text-sm">{exercise.description}</CardDescription>
            )}
          </div>
          <div className="flex flex-col gap-1 items-end shrink-0">
            {exercise.has_video && (
              <Badge variant="secondary" className="text-[10px] md:text-xs px-1.5 py-0.5">
                📹 Video
              </Badge>
            )}
            {difficultyInfo && (
              <Badge variant="outline" className={`text-[10px] md:text-xs px-1.5 py-0.5 ${difficultyInfo.color}`}>
                {difficultyInfo.label}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 md:space-y-4 pt-0 px-3 md:px-6 pb-3 md:pb-6">
        {/* Thumbnail o imagen */}
        {hasVisual && (
          <ExerciseVideoPlayer exercise={exercise}>
            <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity touch-manipulation">
              {exercise.thumbnail_url || exercise.image_url ? (
                <Image
                  src={exercise.thumbnail_url || exercise.image_url || ''}
                  alt={exercise.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-blue-500">
                  <Play className="w-10 h-10 md:w-12 md:h-12 text-white" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
                <div className="bg-card/90 rounded-full p-2.5 md:p-3">
                  <Play className="w-5 h-5 md:w-6 md:h-6 text-foreground" />
                </div>
              </div>
            </div>
          </ExerciseVideoPlayer>
        )}

        {/* Categoría */}
        {exercise.category && (
          <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
            <Target className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
            <span className="capitalize break-words">{exercise.category}</span>
          </div>
        )}

        {/* Muscle groups */}
        {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
          <div>
            <p className="text-xs md:text-sm font-semibold md:font-medium mb-2 flex items-center gap-2">
              <Dumbbell className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
              Músculos trabajados:
            </p>
            <div className="flex flex-wrap gap-1.5 md:gap-1">
              {exercise.muscle_groups.map((group, index) => (
                <Badge key={index} variant="outline" className="text-[10px] md:text-xs px-1.5 py-0.5 capitalize">
                  {group}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Equipment */}
        {showDetails && exercise.equipment && exercise.equipment.length > 0 && (
          <div>
            <p className="text-xs md:text-sm font-semibold md:font-medium mb-2 flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
              Equipamiento:
            </p>
            <div className="flex flex-wrap gap-1.5 md:gap-1">
              {exercise.equipment.map((item, index) => (
                <Badge key={index} variant="secondary" className="text-[10px] md:text-xs px-1.5 py-0.5 capitalize">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {showDetails && exercise.instructions && (
          <div>
            <p className="text-xs md:text-sm font-semibold md:font-medium mb-2">📋 Instrucciones:</p>
            <p className="text-xs md:text-sm text-muted-foreground whitespace-pre-line line-clamp-4 break-words">
              {exercise.instructions}
            </p>
          </div>
        )}

        {/* Botón de ver video si hay video */}
        {exercise.has_video && (
          <ExerciseVideoPlayer exercise={exercise}>
            <Button variant="outline" className="w-full touch-manipulation active:scale-[0.98]" size="sm">
              <Play className="w-4 h-4 mr-2" />
              <span className="text-xs md:text-sm">Ver Video Tutorial</span>
            </Button>
          </ExerciseVideoPlayer>
        )}
      </CardContent>
    </Card>
  )
}

