import { useCallback, useEffect, useMemo, useState } from "react"
import { buildApiUrl } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { handle401AndRefresh } from "@/lib/fetch-with-auth"

export interface AdminUserLite {
  id: number
  email: string
}

export interface MenuPlanListItem {
  id: string
  name: string
  description: string
  daily_calories: number
  protein_percentage: number
  carbs_percentage: number
  fat_percentage: number
  is_template: boolean
  is_system: boolean
  is_active: boolean
  user_id?: number | null
  user_email?: string | null
  meals_count?: number
  created_at: string
  updated_at: string
}

export interface MenuPlanDetail extends MenuPlanListItem {
  protein_grams?: number
  carbs_grams?: number
  fat_grams?: number
  meals?: any[]
}

export type MenuPlanTypeFilter = "all" | "templates" | "system" | "users"

export interface MenuPlanFilters {
  search?: string
  type?: MenuPlanTypeFilter
  userId?: string | "all"
  ordering?: string
}

function percentsToGrams(dailyCalories: number, percents: { protein: number; carbs: number; fat: number }) {
  const cals = Number(dailyCalories) || 0
  return {
    protein_grams: Math.round((cals * (Number(percents.protein) || 0)) / 100 / 4),
    carbs_grams: Math.round((cals * (Number(percents.carbs) || 0)) / 100 / 4),
    fat_grams: Math.round((cals * (Number(percents.fat) || 0)) / 100 / 9),
  }
}

export function useAdminMenuPlans() {
  const { getAuthHeaders } = useAuth()
  const [plans, setPlans] = useState<MenuPlanListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<AdminUserLite[]>([])

  const fetchUsers = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
      let res = await fetch(buildApiUrl("admin/users/?page_size=500"), { headers })
      if (res.status === 401) {
        const newHeaders = await handle401AndRefresh(getAuthHeaders)
        if (!newHeaders) return
        res = await fetch(buildApiUrl("admin/users/?page_size=500"), { headers: newHeaders })
      }
      if (!res.ok) return
      const data = await res.json()
      const list = Array.isArray(data.results) ? data.results : []
      setUsers(list.map((u: any) => ({ id: Number(u.id), email: String(u.email) })))
    } catch {
      // ignore
    }
  }, [getAuthHeaders])

  const buildListUrl = useCallback((filters?: MenuPlanFilters) => {
    const params = new URLSearchParams()
    params.set("page_size", "200")

    const q = filters?.search?.trim()
    if (q) params.set("search", q)

    const type = filters?.type || "all"
    if (type === "users") params.set("user__isnull", "false")
    if (type === "templates") {
      params.set("is_system", "false")
      params.set("user__isnull", "true")
      params.set("is_template", "true")
    }
    if (type === "system") params.set("is_system", "true")

    const userId = filters?.userId
    if (userId && userId !== "all") params.set("user", String(userId))

    if (filters?.ordering) params.set("ordering", filters.ordering)

    return `admin/nutrition/plans/?${params.toString()}`
  }, [])

  const fetchPlans = useCallback(async (filters?: MenuPlanFilters) => {
    try {
      setLoading(true)
      setError(null)
      let headers = await getAuthHeaders()
      let res = await fetch(buildApiUrl(buildListUrl(filters)), { headers })
      if (res.status === 401) {
        const newHeaders = await handle401AndRefresh(getAuthHeaders)
        if (!newHeaders) throw new Error("Sesión expirada")
        headers = newHeaders
        res = await fetch(buildApiUrl(buildListUrl(filters)), { headers })
      }
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      const list = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : [])
      setPlans(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando planes")
      setPlans([])
    } finally {
      setLoading(false)
    }
  }, [buildListUrl, getAuthHeaders])

  const fetchPlanDetail = useCallback(async (planId: string): Promise<MenuPlanDetail | null> => {
    try {
      let headers = await getAuthHeaders()
      let res = await fetch(buildApiUrl(`admin/nutrition/plans/${planId}/`), { headers })
      if (res.status === 401) {
        const newHeaders = await handle401AndRefresh(getAuthHeaders)
        if (!newHeaders) throw new Error("Sesión expirada")
        headers = newHeaders
        res = await fetch(buildApiUrl(`admin/nutrition/plans/${planId}/`), { headers })
      }
      if (!res.ok) throw new Error(`Error ${res.status}`)
      return await res.json()
    } catch {
      return null
    }
  }, [getAuthHeaders])

  const createPlan = useCallback(async (data: {
    name: string
    description: string
    daily_calories: number
    percents: { protein: number; carbs: number; fat: number }
    user_id?: number | null
    meals?: any[]
    portion_multiplier?: number
  }) => {
    const grams = percentsToGrams(data.daily_calories, data.percents)
    const payload: any = {
      name: data.name,
      description: data.description,
      daily_calories: data.daily_calories,
      ...grams,
      is_system: false,
      is_active: true,
      user_id: data.user_id ?? null,
      is_template: data.user_id ? false : true,
      portion_multiplier: data.portion_multiplier ?? 1.0,
    }
    if (Array.isArray(data.meals)) payload.meals = data.meals

    let headers = await getAuthHeaders()
    let res = await fetch(buildApiUrl("admin/nutrition/plans/"), {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (res.status === 401) {
      const newHeaders = await handle401AndRefresh(getAuthHeaders)
      if (!newHeaders) throw new Error("Sesión expirada")
      headers = newHeaders
      res = await fetch(buildApiUrl("admin/nutrition/plans/"), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || err.error || `Error ${res.status}`)
    }
    return await res.json()
  }, [getAuthHeaders])

  const updatePlan = useCallback(async (planId: string, patch: any) => {
    let headers = await getAuthHeaders()
    let res = await fetch(buildApiUrl(`admin/nutrition/plans/${planId}/`), {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    if (res.status === 401) {
      const newHeaders = await handle401AndRefresh(getAuthHeaders)
      if (!newHeaders) throw new Error("Sesión expirada")
      headers = newHeaders
      res = await fetch(buildApiUrl(`admin/nutrition/plans/${planId}/`), {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || err.error || `Error ${res.status}`)
    }
    return await res.json()
  }, [getAuthHeaders])

  const deletePlan = useCallback(async (planId: string) => {
    let headers = await getAuthHeaders()
    let res = await fetch(buildApiUrl(`admin/nutrition/plans/${planId}/`), { method: "DELETE", headers })
    if (res.status === 401) {
      const newHeaders = await handle401AndRefresh(getAuthHeaders)
      if (!newHeaders) throw new Error("Sesión expirada")
      headers = newHeaders
      res = await fetch(buildApiUrl(`admin/nutrition/plans/${planId}/`), { method: "DELETE", headers })
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || err.error || `Error ${res.status}`)
    }
  }, [getAuthHeaders])

  const toggleActive = useCallback(async (planId: string, is_active: boolean) => {
    return await updatePlan(planId, { is_active })
  }, [updatePlan])

  useEffect(() => {
    fetchUsers()
    fetchPlans()
  }, [fetchPlans, fetchUsers])

  const stats = useMemo(() => {
    const total = plans.length
    const active = plans.filter((p) => p.is_active).length
    return { total, active }
  }, [plans])

  return {
    plans,
    users,
    stats,
    loading,
    error,
    fetchPlans,
    fetchPlanDetail,
    createPlan,
    updatePlan,
    deletePlan,
    toggleActive,
  }
}

