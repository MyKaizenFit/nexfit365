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
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg leading-tight">{exercise.name}</CardTitle>
            {exercise.description && (
              <CardDescription className="mt-1 line-clamp-2">{exercise.description}</CardDescription>
            )}
          </div>
          <div className="flex flex-col gap-1 items-end shrink-0">
            {exercise.has_video && (
              <Badge variant="secondary" className="text-xs">
                📹 Video
              </Badge>
            )}
            {difficultyInfo && (
              <Badge variant="outline" className={`text-xs ${difficultyInfo.color}`}>
                {difficultyInfo.label}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Thumbnail o imagen */}
        {hasVisual && (
          <ExerciseVideoPlayer exercise={exercise}>
            <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
              {exercise.thumbnail_url || exercise.image_url ? (
                <Image
                  src={exercise.thumbnail_url || exercise.image_url || ''}
                  alt={exercise.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-blue-500">
                  <Play className="w-12 h-12 text-white" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
                <div className="bg-white/90 rounded-full p-3">
                  <Play className="w-6 h-6 text-gray-900" />
                </div>
              </div>
            </div>
          </ExerciseVideoPlayer>
        )}

        {/* Categoría */}
        {exercise.category && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="w-4 h-4" />
            <span className="capitalize">{exercise.category}</span>
          </div>
        )}

        {/* Muscle groups */}
        {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Dumbbell className="w-4 h-4" />
              Músculos trabajados:
            </p>
            <div className="flex flex-wrap gap-1">
              {exercise.muscle_groups.map((group, index) => (
                <Badge key={index} variant="outline" className="text-xs capitalize">
                  {group}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Equipment */}
        {showDetails && exercise.equipment && exercise.equipment.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Equipamiento:
            </p>
            <div className="flex flex-wrap gap-1">
              {exercise.equipment.map((item, index) => (
                <Badge key={index} variant="secondary" className="text-xs capitalize">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {showDetails && exercise.instructions && (
          <div>
            <p className="text-sm font-medium mb-2">📋 Instrucciones:</p>
            <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-4">
              {exercise.instructions}
            </p>
          </div>
        )}

        {/* Botón de ver video si hay video */}
        {exercise.has_video && (
          <ExerciseVideoPlayer exercise={exercise}>
            <Button variant="outline" className="w-full" size="sm">
              <Play className="w-4 h-4 mr-2" />
              Ver Video Tutorial
            </Button>
          </ExerciseVideoPlayer>
        )}
      </CardContent>
    </Card>
  )
}

