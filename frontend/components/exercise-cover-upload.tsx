'use client'

import { useCallback, useRef, useState } from 'react'
import Image from 'next/image'
import { ImageIcon, Link2, Loader2, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { getExerciseCoverUrl } from '@/lib/exercise-media'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

type ExerciseCoverUploadProps = {
  coverUrl?: string | null
  disabled?: boolean
  uploading?: boolean
  onUploadFile: (file: File) => Promise<void>
  onSetUrl: (url: string) => Promise<void>
  onRemove?: () => Promise<void>
}

export function ExerciseCoverUpload({
  coverUrl,
  disabled = false,
  uploading = false,
  onUploadFile,
  onSetUrl,
  onRemove,
}: ExerciseCoverUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [urlValue, setUrlValue] = useState('')
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const preview = localPreview || getExerciseCoverUrl({ cover_url: coverUrl, thumbnail_url: coverUrl, image_url: coverUrl })

  const handleFiles = useCallback(async (files: FileList | null) => {
    const file = files?.[0]
    if (!file || disabled || uploading) return
    if (!ACCEPTED_TYPES.includes(file.type)) return
    const objectUrl = URL.createObjectURL(file)
    setLocalPreview(objectUrl)
    try {
      await onUploadFile(file)
    } finally {
      if (!coverUrl) {
        setLocalPreview((current) => (current === objectUrl ? null : current))
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [coverUrl, disabled, onUploadFile, uploading])

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border-2 border-dashed transition-colors',
          dragActive ? 'border-purple-500 bg-purple-50/60' : 'border-slate-200 bg-slate-50/60',
          disabled && 'opacity-60 pointer-events-none',
        )}
        onDragOver={(event) => {
          event.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={async (event) => {
          event.preventDefault()
          setDragActive(false)
          await handleFiles(event.dataTransfer.files)
        }}
      >
        {preview ? (
          <div className="relative aspect-video w-full bg-black/5">
            <Image
              src={preview}
              alt="Portada del ejercicio"
              fill
              className="object-cover"
              unoptimized
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-white">Portada asignada</span>
              {onRemove ? (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="h-7"
                  disabled={uploading}
                  onClick={() => void onRemove()}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Quitar
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            <div className="rounded-full bg-white p-3 shadow-sm">
              <ImageIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Arrastra la portada aquí</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG o WebP · máx. 10 MB</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Buscar en el equipo
            </Button>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          onChange={(event) => void handleFiles(event.target.files)}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          URL de portada (opcional)
        </Label>
        <div className="flex gap-2">
          <Input
            value={urlValue}
            onChange={(event) => setUrlValue(event.target.value)}
            placeholder="https://..."
            disabled={disabled || uploading}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={disabled || uploading || !urlValue.trim()}
            onClick={() => void onSetUrl(urlValue.trim()).then(() => setUrlValue(''))}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
