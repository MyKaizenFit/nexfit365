"use client"

import { useCallback, useEffect, useState } from "react"
import { authenticatedFetch } from "@/lib/api"
import type { RestWellnessAccess } from "@/lib/rest-wellness/types"

const DEFAULT_ACCESS: RestWellnessAccess = {
  can_fill: false,
  can_coach: false,
}

export function useRestWellnessAccess() {
  const [access, setAccess] = useState<RestWellnessAccess>(DEFAULT_ACCESS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await authenticatedFetch("rest-wellness/access/")
      if (!response.ok) {
        setAccess(DEFAULT_ACCESS)
        return DEFAULT_ACCESS
      }
      const data = (await response.json()) as RestWellnessAccess
      setAccess(data)
      return data
    } catch {
      setAccess(DEFAULT_ACCESS)
      setError("No se pudo comprobar el acceso al cuestionario de descanso.")
      return DEFAULT_ACCESS
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { access, loading, error, refetch }
}
