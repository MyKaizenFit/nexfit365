/** Utilidades compartidas para preparar fotos antes de subirlas al backend. */

export const MAX_PHOTO_UPLOAD_BYTES = 5 * 1024 * 1024

export const isHeicFile = (file: File): boolean => {
  const name = file.name.toLowerCase()
  return (
    file.type === "image/heic"
    || file.type === "image/heif"
    || name.endsWith(".heic")
    || name.endsWith(".heif")
  )
}

export const formatPhotoUploadError = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return "No se pudo subir la imagen. Inténtalo de nuevo."
  }

  const message = error.message.trim()
  const lower = message.toLowerCase()

  if (
    lower === "load failed"
    || lower.includes("failed to fetch")
    || lower.includes("networkerror")
    || lower.includes("network request failed")
    || lower.includes("aborted")
    || lower.includes("abort")
  ) {
    return "Falló la conexión al subir la foto. Comprueba tu red e inténtalo de nuevo."
  }

  if (lower.includes("no se pudo preparar") || lower.includes("no se pudo generar")) {
    return message
  }

  return message || "No se pudo subir la imagen. Inténtalo de nuevo."
}

export const loadImageElement = (file: File): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("No se pudo preparar la imagen seleccionada"))
    image.src = reader.result as string
  }
  reader.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada"))
  reader.readAsDataURL(file)
})

const canvasToJpegFile = (
  canvas: HTMLCanvasElement,
  originalName: string,
  quality = 0.85,
  suffix = "",
): Promise<File> => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (!blob) {
      reject(new Error("No se pudo generar la imagen"))
      return
    }
    const baseName = originalName.replace(/\.[^.]+$/, "") || "photo"
    resolve(new File([blob], `${baseName}${suffix}.jpg`, { type: "image/jpeg" }))
  }, "image/jpeg", quality)
})

const drawFileToCanvas = async (
  file: File,
  maxDimension: number,
): Promise<{ canvas: HTMLCanvasElement; width: number; height: number } | null> => {
  if (typeof window === "undefined") return null

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d")
    if (!context) return null
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close?.()
    return { canvas, width, height }
  } catch {
    try {
      const image = await loadImageElement(file)
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height))
      const width = Math.max(1, Math.round(image.width * scale))
      const height = Math.max(1, Math.round(image.height * scale))
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext("2d")
      if (!context) return null
      context.drawImage(image, 0, 0, width, height)
      return { canvas, width, height }
    } catch {
      return null
    }
  }
}

export const compressImageIfNeeded = async (
  file: File,
  options: {
    maxBytes?: number
    maxDimension?: number
    quality?: number
  } = {},
): Promise<File> => {
  if (typeof window === "undefined") return file

  const maxBytes = options.maxBytes ?? MAX_PHOTO_UPLOAD_BYTES
  const maxDimension = options.maxDimension ?? 1920
  const quality = options.quality ?? 0.85

  const dimensions = await getImageDimensions(file)
  const largestSide = dimensions ? Math.max(dimensions.width, dimensions.height) : maxDimension + 1
  const shouldProcess = (
    file.size > maxBytes
    || isHeicFile(file)
    || file.type !== "image/jpeg"
    || largestSide > maxDimension
  )

  if (!shouldProcess) return file

  const drawn = await drawFileToCanvas(file, maxDimension)
  if (!drawn) return file

  const compressed = await canvasToJpegFile(drawn.canvas, file.name, quality, "-compressed")
  if (compressed.size <= maxBytes) {
    return compressed
  }

  return canvasToJpegFile(drawn.canvas, file.name, 0.72, "-compressed")
}

const getImageDimensions = async (file: File): Promise<{ width: number; height: number } | null> => {
  try {
    const bitmap = await createImageBitmap(file)
    const dimensions = { width: bitmap.width, height: bitmap.height }
    bitmap.close?.()
    return dimensions
  } catch {
    try {
      const image = await loadImageElement(file)
      return { width: image.width, height: image.height }
    } catch {
      return null
    }
  }
}

export const normalizePhotoFile = async (
  file: File,
  options: {
    maxBytes?: number
    maxDimension?: number
    quality?: number
  } = {},
): Promise<File> => {
  let normalized = file

  if (typeof window !== "undefined" && isHeicFile(file)) {
    try {
      const { default: heic2any } = await import("heic2any")
      const result = await heic2any({ blob: file, toType: "image/jpeg", quality: options.quality ?? 0.85 })
      const blob = Array.isArray(result) ? result[0] : result
      if (blob instanceof Blob) {
        const newName = file.name.replace(/\.(heic|heif)$/i, ".jpg")
        normalized = new File([blob], newName, { type: "image/jpeg" })
      }
    } catch {
      // Seguiremos con compresión/canvas como fallback.
    }
  }

  return compressImageIfNeeded(normalized, options)
}

export const assertPhotoWithinUploadLimit = (file: File, maxBytes = MAX_PHOTO_UPLOAD_BYTES): void => {
  if (file.size > maxBytes) {
    throw new Error(`La foto es demasiado grande (${(file.size / (1024 * 1024)).toFixed(1)} MB). Máximo ${(maxBytes / (1024 * 1024)).toFixed(0)} MB.`)
  }
}

export type CroppedPhotoOptions = {
  ratio: number
  fit: "cover" | "contain"
  position: { x: number; y: number }
  maxSide?: number
  quality?: number
}

export const cropPhotoToRatio = async (
  file: File,
  originalName: string,
  options: CroppedPhotoOptions,
): Promise<File> => {
  const image = await loadImageElement(file)
  const maxSide = options.maxSide ?? 1600
  const targetWidth = options.ratio >= 1 ? maxSide : Math.round(maxSide * options.ratio)
  const targetHeight = Math.round(targetWidth / options.ratio)
  const canvas = document.createElement("canvas")
  canvas.width = targetWidth
  canvas.height = targetHeight

  const context = canvas.getContext("2d")
  if (!context) throw new Error("No se pudo preparar la imagen")

  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, targetWidth, targetHeight)

  const scale = options.fit === "cover"
    ? Math.max(targetWidth / image.width, targetHeight / image.height)
    : Math.min(targetWidth / image.width, targetHeight / image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  const x = options.fit === "cover"
    ? (targetWidth - drawWidth) * (options.position.x / 100)
    : (targetWidth - drawWidth) / 2
  const y = options.fit === "cover"
    ? (targetHeight - drawHeight) * (options.position.y / 100)
    : (targetHeight - drawHeight) / 2

  context.drawImage(image, x, y, drawWidth, drawHeight)
  const cropped = await canvasToJpegFile(canvas, originalName, options.quality ?? 0.9, "-cropped")
  assertPhotoWithinUploadLimit(cropped)
  return cropped
}
