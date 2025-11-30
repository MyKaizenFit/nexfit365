"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { buildApiUrl, getAuthHeaders, handleApiResponse, handleFetchError, TIPS_ENDPOINTS } from "@/lib/api"
import { authService } from "@/lib/auth-service"
import type { WellnessTip, WellnessTipPayload } from "@/types/tip"

export interface UseWellnessTipsOptions {
  highlighted?: boolean
  category?: string
  audience?: string
  limit?: number
  autoFetch?: boolean
}

interface UseWellnessTipsResult {
  tips: WellnessTip[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  createTip: (payload: WellnessTipPayload) => Promise<WellnessTip | null>
  updateTip: (id: string, payload: Partial<WellnessTipPayload>) => Promise<WellnessTip | null>
}

const buildQueryString = (options?: UseWellnessTipsOptions) => {
  if (!options) return ""
  const params = new URLSearchParams()
  if (options.highlighted) params.append("highlighted", "true")
  if (options.category) params.append("category", options.category)
  if (options.audience) params.append("audience", options.audience)
  if (options.limit) params.append("limit", String(options.limit))
  return params.toString() ? `?${params.toString()}` : ""
}

export function useWellnessTips(options?: UseWellnessTipsOptions): UseWellnessTipsResult {
  const [tips, setTips] = useState<WellnessTip[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const queryString = useMemo(() => buildQueryString(options), [options])

  const fetchTips = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        buildApiUrl(`${TIPS_ENDPOINTS.TIPS}${queryString}`),
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      )

      const { data, error: apiError } = await handleApiResponse<WellnessTip[]>(response)

      if (apiError) {
        setError(apiError)
        setTips([])
      } else {
        setTips(data || [])
      }
    } catch (err) {
      const fetchError = handleFetchError(err)
      setError(fetchError.message)
      setTips([])
    } finally {
      setLoading(false)
    }
  }, [queryString])

  const createTip = useCallback(
    async (payload: WellnessTipPayload) => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(
          buildApiUrl(TIPS_ENDPOINTS.TIPS),
          {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(payload),
          }
        )

        const { data, error: apiError } = await handleApiResponse<WellnessTip>(response)
        if (apiError) {
          setError(apiError)
          return null
        }

        await fetchTips()
        return data || null
      } catch (err) {
        const fetchError = handleFetchError(err)
        setError(fetchError.message)
        return null
      } finally {
        setLoading(false)
      }
    },
    [fetchTips]
  )

  const updateTip = useCallback(
    async (id: string, payload: Partial<WellnessTipPayload>) => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(
          buildApiUrl(`${TIPS_ENDPOINTS.TIPS}${id}/`),
          {
            method: "PATCH",
            headers: getAuthHeaders(),
            body: JSON.stringify(payload),
          }
        )

        const { data, error: apiError } = await handleApiResponse<WellnessTip>(response)
        if (apiError) {
          setError(apiError)
          return null
        }

        await fetchTips()
        return data || null
      } catch (err) {
        const fetchError = handleFetchError(err)
        setError(fetchError.message)
        return null
      } finally {
        setLoading(false)
      }
    },
    [fetchTips]
  )

  useEffect(() => {
    if (options?.autoFetch === false) return
    // Evitar llamadas cuando no hay usuario autenticado (por ejemplo durante SSR)
    if (!authService.isAuthenticated()) return
    fetchTips()
  }, [fetchTips, options?.autoFetch])

  return {
    tips,
    loading,
    error,
    refresh: fetchTips,
    createTip,
    updateTip,
  }
}

