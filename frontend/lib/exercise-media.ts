import { buildMediaUrl } from '@/lib/api'

export type ExerciseMediaLike = {
  cover_url?: string | null
  thumbnail_url?: string | null
  image_url?: string | null
  video_display_url?: string | null
  video_file_url?: string | null
  video_url?: string | null
  google_drive_file_id?: string | null
  has_video?: boolean
}

export function getExerciseCoverUrl(exercise?: ExerciseMediaLike | null): string | null {
  if (!exercise) return null
  return (
    buildMediaUrl(exercise.cover_url) ||
    buildMediaUrl(exercise.thumbnail_url) ||
    buildMediaUrl(exercise.image_url) ||
    exercise.cover_url ||
    exercise.thumbnail_url ||
    exercise.image_url ||
    null
  )
}

export function getExerciseVideoUrl(exercise?: ExerciseMediaLike | null): string | null {
  if (!exercise) return null
  const direct =
    buildMediaUrl(exercise.video_display_url) ||
    buildMediaUrl(exercise.video_file_url) ||
    exercise.video_display_url ||
    exercise.video_file_url ||
    exercise.video_url ||
    null
  if (direct) return normalizeGoogleDriveEmbedUrl(direct)
  if (exercise.google_drive_file_id) {
    return `https://drive.google.com/file/d/${exercise.google_drive_file_id}/preview`
  }
  return null
}

export function normalizeGoogleDriveEmbedUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace('www.', '')
    if (host !== 'drive.google.com') return url

    if (parsed.pathname.includes('/file/d/')) {
      const fileId = parsed.pathname.split('/file/d/')[1]?.split('/')[0]
      if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`
    }

    const id = parsed.searchParams.get('id')
    if (id) return `https://drive.google.com/file/d/${id}/preview`
  } catch {
    return url
  }
  return url
}

export function getYoutubeEmbedUrl(url: string): string {
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

export function isYoutubeUrl(url?: string | null): boolean {
  if (!url) return false
  return url.includes('youtube.com') || url.includes('youtu.be')
}

export function isGoogleDriveUrl(url?: string | null): boolean {
  if (!url) return false
  return url.includes('drive.google.com')
}
