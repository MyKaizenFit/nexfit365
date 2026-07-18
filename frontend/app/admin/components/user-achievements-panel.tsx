"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Medal, RefreshCw, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { authenticatedFetch } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

interface Achievement {
  id: string
  key: string
  name: string
  description: string
  category: string
  icon?: string
  points: number
  is_active: boolean
}

interface UserAchievement {
  id: string
  achievement: Achievement
  unlocked_at: string
}

interface Props {
  userId: string
}

export function UserAchievementsPanel({ userId }: Props) {
  const [catalog, setCatalog] = useState<Achievement[]>([])
  const [unlocked, setUnlocked] = useState<UserAchievement[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const unlockedByAchievementId = useMemo(() => {
    const map = new Map<string, UserAchievement>()
    for (const row of unlocked) {
      map.set(String(row.achievement.id), row)
    }
    return map
  }, [unlocked])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [catalogRes, unlockedRes] = await Promise.all([
        authenticatedFetch("achievements/"),
        authenticatedFetch(`user-achievements/?user=${encodeURIComponent(userId)}`),
      ])

      if (!catalogRes.ok || !unlockedRes.ok) {
        throw new Error("load")
      }

      const catalogData = await catalogRes.json()
      const unlockedData = await unlockedRes.json()

      const catalogRows: Achievement[] = Array.isArray(catalogData)
        ? catalogData
        : Array.isArray(catalogData.results)
          ? catalogData.results
          : []
      const unlockedRows: UserAchievement[] = Array.isArray(unlockedData)
        ? unlockedData
        : Array.isArray(unlockedData.results)
          ? unlockedData.results
          : []

      setCatalog(catalogRows)
      setUnlocked(unlockedRows)
    } catch {
      toast({
        title: "Error",
        description: "No se pudieron cargar los logros del usuario.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  const grant = async (achievementId: string) => {
    setBusyId(achievementId)
    try {
      const response = await authenticatedFetch("user-achievements/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: Number(userId) || userId,
          achievement: achievementId,
          progress: { source: "admin" },
        }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        const detail =
          typeof err === "object" && err !== null
            ? Object.values(err).flat().join(" ") || "No se pudo asignar el logro"
            : "No se pudo asignar el logro"
        throw new Error(detail)
      }
      toast({ title: "Logro asignado", description: "El logro se ha desbloqueado para la usuaria." })
      await load()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo asignar el logro",
        variant: "destructive",
      })
    } finally {
      setBusyId(null)
    }
  }

  const revoke = async (userAchievementId: string, achievementId: string) => {
    setBusyId(achievementId)
    try {
      const response = await authenticatedFetch(`user-achievements/${userAchievementId}/`, {
        method: "DELETE",
      })
      if (!response.ok && response.status !== 204) {
        throw new Error("revoke")
      }
      toast({ title: "Logro revocado", description: "Se ha quitado el logro a la usuaria." })
      await load()
    } catch {
      toast({
        title: "Error",
        description: "No se pudo revocar el logro.",
        variant: "destructive",
      })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-amber-600" />
              Logros
            </CardTitle>
            <CardDescription>
              Lista de logros desbloqueados y pendientes. Puedes asignar o revocar manualmente.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Cargando logros…
          </div>
        ) : catalog.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No hay logros activos en el catálogo.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Desbloqueados: {unlocked.length} / {catalog.length}
            </p>
            <ul className="divide-y rounded-lg border bg-white">
              {catalog.map((achievement) => {
                const row = unlockedByAchievementId.get(String(achievement.id))
                const unlockedAt = row?.unlocked_at
                  ? new Date(row.unlocked_at).toLocaleDateString("es-ES")
                  : null
                const busy = busyId === String(achievement.id)
                return (
                  <li key={achievement.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-0.5 rounded-full bg-amber-50 p-2 text-amber-700">
                        <Medal className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-900 truncate">{achievement.name}</p>
                          <Badge variant="secondary" className="text-[10px]">
                            {achievement.category}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {achievement.points} pts
                          </Badge>
                          {row ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px]">
                              Desbloqueado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-slate-500">
                              Pendiente
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{achievement.description}</p>
                        {unlockedAt ? (
                          <p className="text-[11px] text-slate-400 mt-1">Desde {unlockedAt}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {row ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => void revoke(row.id, String(achievement.id))}
                        >
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Revocar"}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => void grant(String(achievement.id))}
                        >
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Asignar"}
                        </Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
