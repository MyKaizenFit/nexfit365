"use client"

import { useCallback, useEffect, useState } from "react"
import { authenticatedFetch } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import type { RestWellnessAccess } from "@/lib/rest-wellness/types"
import { shouldQueryRestWellnessAccess } from "./rest-wellness-access-gate"

const DEFAULT_ACCESS: RestWellnessAccess = {
  can_fill: false,
  can_coach: false,
}

export { shouldQueryRestWellnessAccess }

export function useRestWellnessAccess() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
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
    if (!shouldQueryRestWellnessAccess(authLoading, isAuthenticated)) {
      if (!authLoading && !isAuthenticated) {
        setAccess(DEFAULT_ACCESS)
        setLoading(false)
      }
      return
    }
    void refetch()
  }, [authLoading, isAuthenticated, refetch])

  return { access, loading, error, refetch }
}
