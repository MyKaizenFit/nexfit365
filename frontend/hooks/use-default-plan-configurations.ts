"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { CONFIGURATION_ENDPOINTS, buildApiUrl } from "@/lib/api"
import { DefaultPlanConfiguration, PlanOption, UpsertDefaultPlanConfigurationPayload } from "@/types"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/hooks/use-toast"

// Endpoints para obtener TODOS los planes (no solo los default)
const ALL_NUTRITION_PLANS_ENDPOINT = "nutrition/default-nutrition-plans/" // Todos los planes de nutrición
const ALL_WORKOUT_PROGRAMS_ENDPOINT = "workout-plan-templates/" // Todos los templates de entrenamiento (los 315)

type FetchState = "idle" | "loading" | "success" | "error"

interface UseDefaultPlanConfigurationsResult {
  configurations: DefaultPlanConfiguration[]
  nutritionPlans: PlanOption[]
  workoutPrograms: PlanOption[]
  loading: boolean
  loadingNutritionPlans: boolean
  loadingWorkoutPrograms: boolean
  saving: boolean
  state: FetchState
  error: string | null
  refetch: () => Promise<void>
  createConfiguration: (payload: UpsertDefaultPlanConfigurationPayload) => Promise<DefaultPlanConfiguration | null>
  updateConfiguration: (id: string, payload: UpsertDefaultPlanConfigurationPayload) => Promise<DefaultPlanConfiguration | null>
  deleteConfiguration: (id: string) => Promise<void>
}

const toOptions = (items: unknown): PlanOption[] => {
  if (!Array.isArray(items)) {
    console.warn("[useDefaultPlanConfigurations] toOptions: items no es un array", typeof items, items)
    return []
  }
  
  const options = items
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        console.warn(`[useDefaultPlanConfigurations] toOptions: item ${index} no es un objeto`, item)
        return null
      }
      
      const hasId = "id" in item
      const hasName = "name" in item
      
      if (!hasId || !hasName) {
        console.warn(`[useDefaultPlanConfigurations] toOptions: item ${index} no tiene id o name`, {
          hasId,
          hasName,
          keys: Object.keys(item),
          item
        })
        return null
      }
      
      const id = (item as any).id
      const name = (item as any).name
      
      return {
        id: id != null ? String(id) : "",
        name: name != null ? String(name) : "Sin nombre",
      }
    })
    .filter((value): value is PlanOption => value !== null)
  
  if (options.length < items.length) {
    console.warn(`[useDefaultPlanConfigurations] toOptions: Solo se convirtieron ${options.length} de ${items.length} items`)
  }
  
  return options
}

const extractResults = (payload: any): DefaultPlanConfiguration[] => {
  console.log("[useDefaultPlanConfigurations] 🔵 extractResults - payload:", {
    isNull: payload === null,
    isUndefined: payload === undefined,
    type: typeof payload,
    isArray: Array.isArray(payload),
    hasResults: payload && typeof payload === "object" && "results" in payload,
    keys: payload && typeof payload === "object" ? Object.keys(payload) : "N/A"
  })
  
  if (!payload) {
    console.log("[useDefaultPlanConfigurations] ⚠️ extractResults - payload vacío")
    return []
  }
  if (Array.isArray(payload)) {
    console.log("[useDefaultPlanConfigurations] ✅ extractResults - payload es array, devolviendo", payload.length, "items")
    return payload
  }
  if (Array.isArray(payload.results)) {
    console.log("[useDefaultPlanConfigurations] ✅ extractResults - payload.results es array, devolviendo", payload.results.length, "items")
    return payload.results
  }
  console.log("[useDefaultPlanConfigurations] ⚠️ extractResults - formato no reconocido, devolviendo array vacío")
  return []
}

export function useDefaultPlanConfigurations(): UseDefaultPlanConfigurationsResult {
  const { getAuthHeaders, isAuthenticated } = useAuth()

  const [configurations, setConfigurations] = useState<DefaultPlanConfiguration[]>([])
  const [nutritionPlans, setNutritionPlans] = useState<PlanOption[]>([])
  const [workoutPrograms, setWorkoutPrograms] = useState<PlanOption[]>([])
  const [state, setState] = useState<FetchState>("idle")
  const [loading, setLoading] = useState<boolean>(true)
  const [loadingNutritionPlans, setLoadingNutritionPlans] = useState<boolean>(true)
  const [loadingWorkoutPrograms, setLoadingWorkoutPrograms] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  
  // Referencia para rastrear si ya se cargaron los datos inicialmente
  const hasLoadedInitially = useRef(false)
  // Referencia para evitar recargas múltiples simultáneas
  const isLoadingRef = useRef(false)

  const handleError = useCallback((message: string) => {
    setError(message)
    toast({
      title: "Error",
      description: message,
      variant: "destructive",
    })
  }, [])

  const fetchConfigurations = useCallback(async (forceReload = false) => {
    // Evitar recargas múltiples simultáneas (excepto si es forzada)
    if (isLoadingRef.current && !forceReload) {
      console.log("[useDefaultPlanConfigurations] ⏭️ fetchConfigurations ya en progreso, saltando...")
      return
    }
    
    console.log("[useDefaultPlanConfigurations] 🔵 fetchConfigurations INICIADO", forceReload ? "(forzado)" : "")
    isLoadingRef.current = true
    setState("loading")
    // Solo mostrar loading si no hay datos o si es una recarga forzada
    // Usar función de actualización para obtener el estado actual
    setLoading(prev => {
      // Si ya hay datos y no es forzado, no mostrar loading para evitar flickering
      if (!forceReload && prev === false) {
        return false
      }
      return true
    })
    setError(null)

    try {
      const headers = await getAuthHeaders()
      const url = buildApiUrl(CONFIGURATION_ENDPOINTS.DEFAULT_PLAN_CONFIGURATIONS)
      console.log("[useDefaultPlanConfigurations] 🔵 Cargando configuraciones desde:", url)
      console.log("[useDefaultPlanConfigurations] 🔵 Headers:", Object.keys(headers))
      
      const response = await fetch(url, { headers })

      console.log("[useDefaultPlanConfigurations] 🔵 Respuesta recibida:", response.status, response.statusText)
      console.log("[useDefaultPlanConfigurations] 🔵 URL completa:", url)

      const contentType = response.headers.get("content-type") ?? ""
      const payload = contentType.includes("application/json") ? await response.json() : await response.text()

      console.log("[useDefaultPlanConfigurations] 🔵 Payload recibido:", {
        isArray: Array.isArray(payload),
        hasResults: payload && typeof payload === "object" && "results" in payload,
        type: typeof payload,
        keys: payload && typeof payload === "object" ? Object.keys(payload) : "N/A",
        payload: payload && typeof payload === "object" ? JSON.stringify(payload).substring(0, 200) : String(payload).substring(0, 200)
      })

      if (!response.ok) {
        const message =
          (payload && typeof payload === "object" && "detail" in payload && (payload as any).detail) ||
          (payload && typeof payload === "object" && "message" in payload && (payload as any).message) ||
          response.statusText ||
          "No se pudieron cargar las configuraciones."
        console.error("[useDefaultPlanConfigurations] ❌ Error en respuesta:", message)
        console.error("[useDefaultPlanConfigurations] ❌ Status:", response.status)
        console.error("[useDefaultPlanConfigurations] ❌ Payload completo:", payload)
        throw new Error(String(message))
      }

      // Si la respuesta es OK pero el payload tiene un error, manejarlo
      if (payload && typeof payload === "object" && "detail" in payload && !Array.isArray(payload) && !("results" in payload)) {
        const errorMessage = (payload as any).detail || "Error desconocido"
        console.error("[useDefaultPlanConfigurations] ❌ Error en payload (aunque response.ok):", errorMessage)
        // Si es un 404 o similar, devolver array vacío en lugar de error
        if (response.status === 404 || String(errorMessage).toLowerCase().includes("no encontrado")) {
          console.warn("[useDefaultPlanConfigurations] ⚠️ Endpoint no encontrado, devolviendo array vacío")
          setConfigurations([])
          setState("success")
          return
        }
        throw new Error(String(errorMessage))
      }

      const data = extractResults(payload)
      console.log("[useDefaultPlanConfigurations] ✅ Configuraciones extraídas:", data.length)
      console.log("[useDefaultPlanConfigurations] 🔵 Datos:", data)
      
      // Eliminar duplicados por ID antes de actualizar (usando Map para mejor rendimiento)
      const uniqueMap = new Map<string, DefaultPlanConfiguration>()
      for (const config of data) {
        if (config && config.id) {
          const id = String(config.id)
          if (!uniqueMap.has(id)) {
            uniqueMap.set(id, config)
          } else {
            console.warn(`[useDefaultPlanConfigurations] ⚠️ Duplicado encontrado: ID ${id}`)
          }
        }
      }
      
      const uniqueData = Array.from(uniqueMap.values())
      
      if (uniqueData.length !== data.length) {
        console.warn(`[useDefaultPlanConfigurations] ⚠️ Se encontraron ${data.length - uniqueData.length} duplicados, eliminados`)
      }
      
      // Solo actualizar si hay datos nuevos o si es una recarga forzada
      if (uniqueData.length > 0 || forceReload) {
        setConfigurations(prev => {
          // Combinar con datos existentes y eliminar duplicados
          const combined = [...prev, ...uniqueData]
          const finalMap = new Map<string, DefaultPlanConfiguration>()
          for (const config of combined) {
            if (config && config.id) {
              const id = String(config.id)
              // Mantener el más reciente (último en el array)
              finalMap.set(id, config)
            }
          }
          const final = Array.from(finalMap.values())
          console.log(`[useDefaultPlanConfigurations] 🔵 Actualizando estado: ${prev.length} -> ${final.length} configuraciones`)
          return final
        })
      }
      setState("success")
    } catch (err) {
      console.error("[useDefaultPlanConfigurations] ❌ fetchConfigurations error:", err)
      setState("error")
      const message =
        err instanceof Error ? err.message : "Error desconocido al cargar configuraciones"
      handleError(message)
    } finally {
      setLoading(false)
      isLoadingRef.current = false
      console.log("[useDefaultPlanConfigurations] 🔵 fetchConfigurations FINALIZADO")
    }
  }, [getAuthHeaders, handleError])

  const fetchNutritionPlans = useCallback(async (forceReload = false) => {
    // Si ya hay datos y no es una recarga forzada, no hacer nada
    if (nutritionPlans.length > 0 && !forceReload) {
      console.log(`[useDefaultPlanConfigurations] ⏭️ fetchNutritionPlans saltado (ya hay ${nutritionPlans.length} planes, no es recarga forzada)`)
      return
    }
    
    // Solo mostrar loading si no hay datos cargados o si es una recarga forzada
    if (nutritionPlans.length === 0 || forceReload) {
      setLoadingNutritionPlans(true)
    }
    try {
      const headers = await getAuthHeaders()
      let allPlans: PlanOption[] = []
      let page = 1
      const pageSize = 100
      let hasMore = true
      
      console.log(`[useDefaultPlanConfigurations] Iniciando carga de planes de nutrición...`)
      
      // Cargar todos los planes con paginación
      while (hasMore) {
        const url = buildApiUrl(`${ALL_NUTRITION_PLANS_ENDPOINT}?page=${page}&page_size=${pageSize}`)
        const response: Response = await fetch(url, { headers })
        
        if (!response.ok) {
          console.warn(`[useDefaultPlanConfigurations] Error en página ${page}: ${response.status}`)
          break
        }
        
        const payload: any = await response.json()
        const plans = Array.isArray(payload) ? payload : (payload.results || [])
        const plansCount = plans.length
        
        allPlans = [...allPlans, ...toOptions(plans)]
        
        // Verificar si hay más páginas
        const totalCount = payload.count !== undefined ? payload.count : null
        if (totalCount !== null) {
          hasMore = allPlans.length < totalCount
        } else {
          hasMore = !!payload.next && plansCount > 0
        }
        
        if (hasMore) {
          page++
        }
      }
      
      // Solo actualizar si hay datos nuevos
      if (allPlans.length > 0) {
        setNutritionPlans(allPlans)
        console.log(`[useDefaultPlanConfigurations] ✅ Total cargado: ${allPlans.length} planes de nutrición`)
      }
    } catch (err) {
      console.warn("[useDefaultPlanConfigurations] fetchNutritionPlans error:", err)
    } finally {
      setLoadingNutritionPlans(false)
    }
  }, [getAuthHeaders, nutritionPlans.length])

  const fetchWorkoutPrograms = useCallback(async (forceReload = false) => {
    // Si ya hay datos y no es una recarga forzada, no hacer nada
    if (workoutPrograms.length > 0 && !forceReload) {
      console.log(`[useDefaultPlanConfigurations] ⏭️ fetchWorkoutPrograms saltado (ya hay ${workoutPrograms.length} programas, no es recarga forzada)`)
      return
    }
    
    // Solo mostrar loading si no hay datos cargados o si es una recarga forzada
    if (workoutPrograms.length === 0 || forceReload) {
      console.log(`[useDefaultPlanConfigurations] 🔵 fetchWorkoutPrograms INICIADO`, forceReload ? "(forzado)" : "")
      setLoadingWorkoutPrograms(true)
    }
    try {
      console.log(`[useDefaultPlanConfigurations] 🔵 Obteniendo headers...`)
      const headers = await getAuthHeaders()
      console.log(`[useDefaultPlanConfigurations] 🔵 Headers obtenidos:`, Object.keys(headers))
      
      console.log(`[useDefaultPlanConfigurations] Iniciando carga de programas de entrenamiento...`)
      
      // Intentar cargar todos de una vez con page_size grande
      const url = buildApiUrl(`${ALL_WORKOUT_PROGRAMS_ENDPOINT}?page=1&page_size=1000`)
      console.log(`[useDefaultPlanConfigurations] Cargando desde: ${url}`)
      
      console.log(`[useDefaultPlanConfigurations] 🔵 Haciendo fetch...`)
      const response: Response = await fetch(url, { headers })
      console.log(`[useDefaultPlanConfigurations] 🔵 Respuesta recibida:`, response.status, response.statusText)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[useDefaultPlanConfigurations] Error al cargar: ${response.status}`, {
          status: response.status,
          statusText: response.statusText,
          error: errorText.substring(0, 500),
        })
        return
      }
      
      const payload: any = await response.json()
      console.log(`[useDefaultPlanConfigurations] Respuesta recibida:`, {
        hasCount: 'count' in payload,
        hasResults: 'results' in payload,
        isArray: Array.isArray(payload),
        count: payload.count,
        resultsLength: Array.isArray(payload) ? payload.length : (payload.results?.length || 0)
      })
      
      const programs = Array.isArray(payload) ? payload : (payload.results || [])
      console.log(`[useDefaultPlanConfigurations] Programas extraídos: ${programs.length}`)
      
      if (programs.length === 0) {
        console.warn(`[useDefaultPlanConfigurations] ⚠️ No se encontraron programas en la respuesta`)
        // No limpiar los datos existentes si no hay nuevos datos
        return
      }
      
      const converted = toOptions(programs)
      console.log(`[useDefaultPlanConfigurations] Convertidos: ${converted.length} de ${programs.length}`)
      
      if (converted.length === 0) {
        console.warn(`[useDefaultPlanConfigurations] ⚠️ No se pudieron convertir los programas. Primer programa:`, programs[0])
        // No limpiar los datos existentes si no se pudieron convertir
        return
      }
      
      // Solo actualizar si hay datos nuevos
      if (converted.length > 0) {
        setWorkoutPrograms(converted)
        console.log(`[useDefaultPlanConfigurations] ✅ Estado actualizado con ${converted.length} programas de entrenamiento`)
      }
      
      // Si hay más páginas (aunque con page_size=1000 no debería haber), cargarlas
      if (payload.next && payload.count > programs.length) {
        console.log(`[useDefaultPlanConfigurations] Hay más páginas, cargando adicionales...`)
        let allPrograms = [...converted]
        let page = 2
        let hasMore = true
        
        while (hasMore && page <= 20) {
          const nextUrl = buildApiUrl(`${ALL_WORKOUT_PROGRAMS_ENDPOINT}?page=${page}&page_size=1000`)
          const nextResponse: Response = await fetch(nextUrl, { headers })
          
          if (!nextResponse.ok) {
            console.warn(`[useDefaultPlanConfigurations] Error en página ${page}: ${nextResponse.status}`)
            break
          }
          
          const nextPayload: any = await nextResponse.json()
          const nextPrograms = Array.isArray(nextPayload) ? nextPayload : (nextPayload.results || [])
          const nextConverted = toOptions(nextPrograms)
          
          allPrograms = [...allPrograms, ...nextConverted]
          setWorkoutPrograms([...allPrograms])
          
          hasMore = !!nextPayload.next && nextPrograms.length > 0
          page++
        }
        
        console.log(`[useDefaultPlanConfigurations] ✅ Carga completa: ${allPrograms.length} programas de entrenamiento`)
      }
    } catch (err) {
      console.error("[useDefaultPlanConfigurations] ❌ fetchWorkoutPrograms error:", err)
      console.error("[useDefaultPlanConfigurations] ❌ Error completo:", err instanceof Error ? err.message : String(err))
    } finally {
      setLoadingWorkoutPrograms(false)
      console.log(`[useDefaultPlanConfigurations] 🔵 fetchWorkoutPrograms FINALIZADO`)
    }
  }, [getAuthHeaders, workoutPrograms.length])

  // Cargar datos solo una vez cuando el usuario está autenticado
  useEffect(() => {
    // Solo cargar si está autenticado y no se han cargado los datos inicialmente
    if (!isAuthenticated) {
      console.log(`[useDefaultPlanConfigurations] ⏭️ Usuario no autenticado, saltando carga`)
      // Resetear el flag si el usuario se desautentica
      hasLoadedInitially.current = false
      setConfigurations([])
      setNutritionPlans([])
      setWorkoutPrograms([])
      return
    }
    
    // Solo cargar la primera vez
    if (hasLoadedInitially.current) {
      console.log(`[useDefaultPlanConfigurations] ⏭️ Datos ya cargados inicialmente, saltando recarga automática`)
      return
    }
    
    console.log(`[useDefaultPlanConfigurations] 🔵 useEffect ejecutado, cargando datos iniciales...`)
    hasLoadedInitially.current = true
    
    // Cargar datos iniciales sin forzar recarga
    fetchConfigurations(false)
    fetchNutritionPlans(false)
    fetchWorkoutPrograms(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]) // Solo depender de isAuthenticated para evitar recargas innecesarias

  // Debug: Log cuando cambian los estados
  useEffect(() => {
    console.log(`[useDefaultPlanConfigurations] Estado actualizado - NutritionPlans: ${nutritionPlans.length}, WorkoutPrograms: ${workoutPrograms.length}`)
  }, [nutritionPlans, workoutPrograms])

  const performMutation = useCallback(
    async (
      method: "POST" | "PATCH",
      payload: UpsertDefaultPlanConfigurationPayload,
      id?: string,
    ): Promise<DefaultPlanConfiguration | null> => {
      try {
        setSaving(true)
        setError(null)

        const headers = await getAuthHeaders()
        const endpoint =
          method === "POST"
            ? buildApiUrl(CONFIGURATION_ENDPOINTS.DEFAULT_PLAN_CONFIGURATIONS)
            : buildApiUrl(`${CONFIGURATION_ENDPOINTS.DEFAULT_PLAN_CONFIGURATIONS}${id}/`)

        const response = await fetch(endpoint, {
          method,
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })

        const contentType = response.headers.get("content-type") ?? ""
        const responseData = contentType.includes("application/json")
          ? await response.json()
          : await response.text()

        if (!response.ok) {
          const message =
            (responseData && typeof responseData === "object" && "detail" in responseData && (responseData as any).detail) ||
            response.statusText ||
            "No se pudo guardar la configuración."
          throw new Error(String(message))
        }

        await fetchConfigurations(true) // Forzar recarga después de mutación
        return responseData as DefaultPlanConfiguration
      } catch (err) {
        console.error("[useDefaultPlanConfigurations] performMutation error:", err)
        const message = err instanceof Error ? err.message : "Error desconocido al guardar la configuración"
        handleError(message)
        throw err
      } finally {
        setSaving(false)
      }
    },
    [fetchConfigurations, getAuthHeaders, handleError],
  )

  const createConfiguration = useCallback(
    (payload: UpsertDefaultPlanConfigurationPayload) => performMutation("POST", payload),
    [performMutation],
  )

  const updateConfiguration = useCallback(
    (id: string, payload: UpsertDefaultPlanConfigurationPayload) => performMutation("PATCH", payload, id),
    [performMutation],
  )

  const deleteConfiguration = useCallback(
    async (id: string) => {
      try {
        setSaving(true)
        const headers = await getAuthHeaders()
        const response = await fetch(
          buildApiUrl(`${CONFIGURATION_ENDPOINTS.DEFAULT_PLAN_CONFIGURATIONS}${id}/`),
          {
            method: "DELETE",
            headers,
          },
        )

        if (!response.ok) {
          const message = `No se pudo eliminar la configuración (Error ${response.status}).`
          throw new Error(message)
        }

        setConfigurations(prev => prev.filter(config => config.id !== id))
        toast({
          title: "Configuración eliminada",
          description: "La regla se eliminó correctamente.",
        })
      } catch (err) {
        console.error("[useDefaultPlanConfigurations] deleteConfiguration error:", err)
        const message = err instanceof Error ? err.message : "Error desconocido al eliminar la configuración"
        handleError(message)
        throw err
      } finally {
        setSaving(false)
      }
    },
    [getAuthHeaders, handleError],
  )

  // Función de refetch que permite forzar recarga
  const refetch = useCallback(async () => {
    console.log(`[useDefaultPlanConfigurations] 🔄 Refetch manual solicitado`)
    // Forzar recarga de todos los datos
    await Promise.all([
      fetchConfigurations(true), // Forzar recarga
      fetchNutritionPlans(true), // Forzar recarga
      fetchWorkoutPrograms(true), // Forzar recarga
    ])
  }, [fetchConfigurations, fetchNutritionPlans, fetchWorkoutPrograms])

  const value = useMemo(
    () => ({
      configurations,
      nutritionPlans,
      workoutPrograms,
      loading,
      loadingNutritionPlans,
      loadingWorkoutPrograms,
      saving,
      state,
      error,
      refetch,
      createConfiguration,
      updateConfiguration,
      deleteConfiguration,
    }),
    [
      configurations,
      nutritionPlans,
      workoutPrograms,
      loading,
      loadingNutritionPlans,
      loadingWorkoutPrograms,
      saving,
      state,
      error,
      refetch,
      createConfiguration,
      updateConfiguration,
      deleteConfiguration,
    ],
  )

  return value
}

