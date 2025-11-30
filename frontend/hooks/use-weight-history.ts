import { useState, useEffect } from 'react'
import { progressService, WeightEntry } from '@/lib/progress-service'

export function useWeightHistory() {
  const [entries, setEntries] = useState<WeightEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Asegurar que entries sea siempre un array
  const safeEntries = Array.isArray(entries) ? entries : []

  const fetchEntries = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await progressService.getWeightHistory()
      setEntries(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      console.error('Error al obtener historial de peso:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEntries()
  }, [])

  const addEntry = async (weight: number, date: string, notes?: string) => {
    try {
      const newEntry = await progressService.addWeightEntry(weight, date, notes)
      setEntries(prev => {
        if (Array.isArray(prev)) {
          return [newEntry, ...prev]
        }
        return [newEntry]
      })
      return newEntry
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar entrada')
      throw err
    }
  }

  const updateEntry = async (id: string, weight: number, date: string, notes?: string) => {
    try {
      const updatedEntry = await progressService.updateWeightEntry(id, weight, date, notes)
      setEntries(prev => {
        if (Array.isArray(prev)) {
          return prev.map(entry => 
            entry.id === id ? updatedEntry : entry
          )
        }
        return [updatedEntry]
      })
      return updatedEntry
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar entrada')
      throw err
    }
  }

  const deleteEntry = async (id: string) => {
    try {
      await progressService.deleteWeightEntry(id)
      setEntries(prev => {
        if (Array.isArray(prev)) {
          return prev.filter(entry => entry.id !== id)
        }
        return []
      })
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar entrada')
      throw err
    }
  }

  const refreshEntries = () => {
    fetchEntries()
  }

  return {
    entries: safeEntries,
    loading,
    error,
    addEntry,
    updateEntry,
    deleteEntry,
    refreshEntries,
  }
}
