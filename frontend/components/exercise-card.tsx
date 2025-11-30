'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Play, Image as ImageIcon } from 'lucide-react'
import { ExerciseVideoPlayer } from './exercise-video-player'
import Image from 'next/image'

interface ExerciseCardProps {
  exercise: {
    id: string
    name: string
    category?: string
    muscle_groups?: string[]
    instructions?: string
    video_display_url?: string
    video_file_url?: string
    video_url?: string
    thumbnail_url?: string
    image_url?: string
    has_video?: boolean
  }
  showDetails?: boolean
  className?: string
}

export function ExerciseCard({ exercise, showDetails = true, className }: ExerciseCardProps) {
  const hasVisual = exercise.has_video || exercise.thumbnail_url || exercise.image_url

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{exercise.name}</CardTitle>
            {exercise.category && (
              <CardDescription className="mt-1">{exercise.category}</CardDescription>
            )}
          </div>
          {exercise.has_video && (
            <Badge variant="secondary" className="ml-2">
              Video
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
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

        {/* Muscle groups */}
        {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Grupos musculares:</p>
            <div className="flex flex-wrap gap-1">
              {exercise.muscle_groups.map((group, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {group}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {showDetails && exercise.instructions && (
          <div>
            <p className="text-sm font-medium mb-2">Instrucciones:</p>
            <p className="text-sm text-muted-foreground line-clamp-3">
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

