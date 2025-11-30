"use client"

import { useState } from 'react'
import { 
  Medal, Star, Trophy, Award, Target, Flame, TrendingUp, 
  Calendar, Zap, RefreshCw, Loader2, AlertCircle 
} from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { useAchievements } from "@/hooks/use-achievements"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

const categoryIcons: Record<string, any> = {
  workout: Target,
  nutrition: Flame,
  progress: TrendingUp,
  streak: Zap,
  milestone: Trophy,
  social: Star,
  system: Award,
}

const categoryColors: Record<string, string> = {
  workout: "from-purple-500 to-violet-500",
  nutrition: "from-orange-500 to-red-500",
  progress: "from-emerald-500 to-teal-500",
  streak: "from-yellow-500 to-amber-500",
  milestone: "from-blue-500 to-indigo-500",
  social: "from-pink-500 to-rose-500",
  system: "from-gray-500 to-slate-500",
}

export function Achievements() {
  const { achievements, userAchievements, summary, loading, error, getAchievementsByCategory, refresh } = useAchievements()
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  
  const unlockedIds = new Set(userAchievements.map(ua => ua.achievement.id))
  
  const categories = ["all", "workout", "nutrition", "progress", "streak", "milestone"]
  const categoryNames: Record<string, string> = {
    all: "Todos",
    workout: "Entrenamiento",
    nutrition: "Nutrición",
    progress: "Progreso",
    streak: "Racha",
    milestone: "Hito",
  }

  const filteredAchievements = selectedCategory === "all"
    ? achievements.map(a => ({
        ...a,
        unlocked: unlockedIds.has(a.id),
        unlockedAt: userAchievements.find(ua => ua.achievement.id === a.id)?.unlocked_at
      }))
    : getAchievementsByCategory(selectedCategory)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="h-5 w-5" />
            Mis Logros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-gray-600">Cargando logros...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="h-5 w-5" />
            Mis Logros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8 flex-col space-y-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="text-red-600 text-sm">{error}</p>
            <Button onClick={refresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const unlockedCount = summary?.unlocked_count || userAchievements.length
  const totalCount = summary?.total_achievements || achievements.length
  const progressPercentage = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0
  const totalPoints = summary?.total_points || userAchievements.reduce((sum, ua) => sum + (ua.achievement?.points || 0), 0)

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
              <Medal className="h-5 w-5" />
              Mis Logros
            </CardTitle>
            <CardDescription>Tu progreso y conquistas</CardDescription>
          </div>
          <Button onClick={refresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-900">Desbloqueados</span>
              </div>
              <p className="text-2xl font-bold text-yellow-700">{unlockedCount}/{totalCount}</p>
              <Progress value={progressPercentage} className="h-2 mt-2" />
              <p className="text-xs text-yellow-600 mt-1">{Math.round(progressPercentage)}% completado</p>
            </div>
            
            <div className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Puntos</span>
              </div>
              <p className="text-2xl font-bold text-purple-700">{totalPoints}</p>
              <p className="text-xs text-purple-600 mt-1">Total acumulado</p>
            </div>

            <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-900">Logros Recientes</span>
              </div>
              <p className="text-2xl font-bold text-emerald-700">{summary?.recent_achievements?.length || 0}</p>
              <p className="text-xs text-emerald-600 mt-1">Últimos desbloqueos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros por categoría */}
      <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg">Logros por Categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map((cat) => {
              const categoryAchievements = cat === "all" ? achievements : getAchievementsByCategory(cat)
              const unlocked = categoryAchievements.filter(a => a.unlocked).length
              const total = categoryAchievements.length
              
              return (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="relative"
                >
                  {categoryNames[cat]}
                  {total > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {unlocked}/{total}
                    </Badge>
                  )}
                </Button>
              )
            })}
          </div>

          {/* Lista de logros */}
          <div className="space-y-3">
            {filteredAchievements.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Medal className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay logros disponibles en esta categoría</p>
              </div>
            ) : (
              filteredAchievements.map((achievement) => {
                const Icon = categoryIcons[achievement.category] || Medal
                const isUnlocked = unlockedIds.has(achievement.id)
                const unlockedAt = userAchievements.find(ua => ua.achievement.id === achievement.id)?.unlocked_at
                
                return (
                  <div
                    key={achievement.id}
                    className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                      isUnlocked
                        ? "bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 shadow-md"
                        : "bg-muted/50 border border-gray-200"
                    }`}
                  >
                    <div
                      className={`p-3 rounded-full flex-shrink-0 bg-gradient-to-br ${
                        isUnlocked
                          ? categoryColors[achievement.category] || "from-yellow-500 to-amber-500"
                          : "from-gray-300 to-gray-400"
                      } text-white shadow-lg`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold ${isUnlocked ? "text-yellow-900" : "text-gray-700"}`}>
                          {achievement.name}
                        </span>
                        {isUnlocked && (
                          <Badge className="bg-green-500 text-white">✓ Desbloqueado</Badge>
                        )}
                        {achievement.points > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {achievement.points} pts
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{achievement.description}</p>
                      {isUnlocked && unlockedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Desbloqueado {formatDistanceToNow(new Date(unlockedAt), { addSuffix: true, locale: es })}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logros recientes */}
      {summary?.recent_achievements && summary.recent_achievements.length > 0 && (
        <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Logros Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.recent_achievements.slice(0, 5).map((ua) => {
                const achievement = ua.achievement
                const Icon = categoryIcons[achievement.category] || Medal
                
                return (
                  <div
                    key={ua.id}
                    className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200"
                  >
                    <div className={`p-2 rounded-full bg-gradient-to-br ${categoryColors[achievement.category] || "from-green-500 to-emerald-500"} text-white`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{achievement.name}</p>
                      <p className="text-xs text-gray-600">
                        {formatDistanceToNow(new Date(ua.unlocked_at), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

