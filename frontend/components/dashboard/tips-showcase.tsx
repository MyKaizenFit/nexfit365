"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Sparkles, ArrowRight } from "lucide-react"
import { useWellnessTips } from "@/hooks/use-wellness-tips"

const categoryLabels: Record<string, string> = {
  nutrition: "Nutrición",
  training: "Entrenamiento",
  mindset: "Mentalidad",
  recovery: "Recuperación",
  lifestyle: "Estilo de vida",
}

export function TipsShowcase() {
  const { tips, loading, error } = useWellnessTips({ highlighted: true, limit: 3 })

  if (loading) {
    return (
      <Card className="bg-white/70 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            Consejos destacados
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, index) => (
            <Skeleton key={index} className="h-40 rounded-xl" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-white/70 backdrop-blur border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">
            No se pudieron cargar los consejos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (tips.length === 0) {
    return (
      <Card className="bg-white/80 backdrop-blur border-dashed border-primary/20">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            Consejos destacados
          </CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard?section=tips">
              Ver todos los consejos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aún no hay consejos destacados publicados. Visita la pestaña de consejos para ver recomendaciones generales o vuelve más tarde.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white/80 backdrop-blur">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-primary">
          <Sparkles className="h-5 w-5" />
          Consejos destacados
        </CardTitle>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard?section=tips">
            Ver todos los consejos
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        {tips.map((tip) => (
          <Card key={tip.id} className="border border-primary/10 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="secondary">
                  {categoryLabels[tip.category] ?? tip.category}
                </Badge>
                {tip.is_highlighted && (
                  <Badge variant="outline" className="border-amber-300 text-amber-500">
                    Destacado
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg">{tip.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-4">{tip.summary || tip.content}</p>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Público objetivo: {tip.audience || "General"}
              </p>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  )
}

