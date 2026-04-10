"use client"

/**
 * Función para corregir problemas de codificación UTF-8
 * Reemplaza caracteres mal codificados con sus equivalentes correctos
 */
export function fixEncoding(text: string | null | undefined): string {
  if (!text) return ""
  
  if (typeof text !== 'string') {
    return String(text)
  }

  let fixed = text

  // Correcciones específicas para patrones comunes con ??
  // gl??teo medio -> glúteo medio
  fixed = fixed.replace(/gl\?\?teo/gi, 'glúteo')
  fixed = fixed.replace(/gl\?\?teos/gi, 'glúteos')
  
  // b??ceps -> bíceps
  fixed = fixed.replace(/b\?\?ceps/gi, 'bíceps')
  
  // tr??ceps -> tríceps
  fixed = fixed.replace(/tr\?\?ceps/gi, 'tríceps')
  
  // cu??driceps -> cuádriceps
  fixed = fixed.replace(/cu\?\?driceps/gi, 'cuádriceps')
  
  // Eliminar "?? " al inicio o final de palabras
  fixed = fixed.replace(/\?\?\s*/g, '')
  
  // Corregir patrones de codificación incorrecta de UTF-8
  // Estos son patrones comunes cuando UTF-8 se lee como Latin-1
  fixed = fixed.replace(/\u00C3\u00A1/g, 'á') // Ã¡
  fixed = fixed.replace(/\u00C3\u00A9/g, 'é') // Ã©
  fixed = fixed.replace(/\u00C3\u00AD/g, 'í') // Ã­
  fixed = fixed.replace(/\u00C3\u00B3/g, 'ó') // Ã³
  fixed = fixed.replace(/\u00C3\u00BA/g, 'ú') // Ãº
  fixed = fixed.replace(/\u00C3\u00B1/g, 'ñ') // Ã±
  fixed = fixed.replace(/\u00C3\u00BC/g, 'ü') // Ã¼
  fixed = fixed.replace(/\u00C3\u0081/g, 'Á') // Ã
  fixed = fixed.replace(/\u00C3\u0089/g, 'É') // Ã‰
  fixed = fixed.replace(/\u00C3\u008D/g, 'Í') // Ã
  fixed = fixed.replace(/\u00C3\u0093/g, 'Ó') // Ã"
  fixed = fixed.replace(/\u00C3\u009A/g, 'Ú') // Ãš
  fixed = fixed.replace(/\u00C3\u0091/g, 'Ñ') // Ã'
  fixed = fixed.replace(/\u00C3\u009C/g, 'Ü') // Ãœ

  // Correcciones cuando UTF-8 se interpreta como CP437/CP850 (mojibake tipo "Tr├¡ceps")
  // Ejemplos:
  // - Tr├¡ceps -> Tríceps
  // - Gl├║teos -> Glúteos
  fixed = fixed.replace(/├í/g, 'á')
  fixed = fixed.replace(/├⌐/g, 'é')
  fixed = fixed.replace(/├¡/g, 'í')
  fixed = fixed.replace(/├│/g, 'ó')
  fixed = fixed.replace(/├║/g, 'ú')
  fixed = fixed.replace(/├▒/g, 'ñ')
  fixed = fixed.replace(/├╝/g, 'ü')

  return fixed
}

/**
 * Función para corregir encoding en arrays de strings
 */
export function fixEncodingArray(items: (string | null | undefined)[] | null | undefined): string[] {
  if (!items || !Array.isArray(items)) {
    return []
  }
  
  return items.map(item => fixEncoding(item)).filter(Boolean) as string[]
}

/**
 * Función para corregir encoding en objetos con strings
 */
export function fixEncodingObject<T extends Record<string, any>>(obj: T | null | undefined): T {
  if (!obj) {
    return obj as unknown as T
  }
  
  const fixed: Record<string, any> = { ...obj }
  
  Object.keys(fixed).forEach(key => {
    const value = fixed[key]
    if (typeof value === 'string') {
      fixed[key] = fixEncoding(value) as any
    } else if (Array.isArray(value)) {
      fixed[key] = fixEncodingArray(value) as any
    } else if (value && typeof value === 'object') {
      fixed[key] = fixEncodingObject(value) as any
    }
  })
  
  return fixed as unknown as T
}

