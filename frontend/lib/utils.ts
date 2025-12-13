import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea un número para mostrar máximo 1 decimal
 * Elimina los decimales innecesarios (ej: 10.0 -> 10, 10.5 -> 10.5)
 */
export function formatMacro(value: number): string {
  if (isNaN(value) || value === null || value === undefined) {
    return '0'
  }
  // Redondear a 1 decimal y eliminar ceros innecesarios
  const rounded = Math.round(value * 10) / 10
  return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1)
}
