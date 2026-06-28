'use client'

import { Dumbbell, ImageOff, Play } from 'lucide-react'
import { ExerciseVideoPlayer } from '@/components/exercise-video-player'
import { getExerciseCoverUrl, type ExerciseMediaLike } from '@/lib/exercise-media'
import { cn } from '@/lib/utils'

type ExerciseCoverThumbnailProps = {
  exercise: ExerciseMediaLike & {
    id?: string
    name: string
    description?: string
    instructions?: string
  }
  className?: string
  imageClassName?: string
  showPlaceholder?: boolean
}

const placeholderGradients = [
  'from-emerald-500 via-teal-500 to-cyan-600',
  'from-violet-500 via-purple-500 to-fuchsia-600',
  'from-sky-500 via-blue-500 to-indigo-600',
  'from-amber-500 via-orange-500 to-rose-500',
  'from-lime-500 via-green-500 to-emerald-600',
]

const getPlaceholderGradient = (name: string) => {
  const score = name.split('').reduce((total, char) => total + char.charCodeAt(0), 0)
  return placeholderGradients[score % placeholderGradients.length]
}

export function ExerciseCoverThumbnail({
  exercise,
  className,
  imageClassName,
  showPlaceholder = true,
}: ExerciseCoverThumbnailProps) {
  const coverUrl = getExerciseCoverUrl(exercise)
  const canOpenPlayer = Boolean(
    exercise.has_video ||
    exercise.video_url ||
    exercise.google_drive_file_id ||
    exercise.description ||
    exercise.instructions ||
    coverUrl
  )

  const placeholderGradient = getPlaceholderGradient(exercise.name || 'exercise')

  const thumbnail = (
    <div
      className={cn(
        'group relative aspect-video w-full overflow-hidden bg-muted',
        canOpenPlayer && 'cursor-pointer',
        className,
      )}
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={exercise.name}
          className={cn('h-full w-full object-cover', imageClassName)}
        />
      ) : showPlaceholder ? (
        <div className={cn('relative flex h-full w-full items-center justify-center bg-gradient-to-br', placeholderGradient)}>
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/15" />
          <div className="absolute -bottom-12 -left-10 h-36 w-36 rounded-full bg-black/10" />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/45 via-black/15 to-transparent" />
          <div className="relative z-10 flex flex-col items-center gap-2 px-4 text-center text-white">
            <div className="rounded-2xl bg-white/18 p-3 shadow-lg ring-1 ring-white/25 backdrop-blur-md">
              <Dumbbell className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-white/90">Técnica del ejercicio</p>
              <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-white/75">
                Portada pendiente
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {canOpenPlayer ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/25">
          <div className="rounded-full bg-white/92 p-2.5 shadow-lg transition-transform group-hover:scale-105">
            <Play className="h-4 w-4 text-slate-900" />
          </div>
        </div>
      ) : null}

      {!coverUrl ? (
        <div className="absolute left-2 top-2 rounded-full bg-black/35 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm backdrop-blur">
          <span className="inline-flex items-center gap-1"><ImageOff className="h-3 w-3" /> Sin portada</span>
        </div>
      ) : null}
    </div>
  )

  if (!canOpenPlayer) {
    return thumbnail
  }

  return <ExerciseVideoPlayer exercise={exercise}>{thumbnail}</ExerciseVideoPlayer>
}
