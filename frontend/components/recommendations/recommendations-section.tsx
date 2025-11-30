"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { PersonalizedRecommendations } from "@/components/personalized-recommendations"
import { useInitialRegistration } from "@/hooks/use-initial-registration"
import { Sparkles, RefreshCcw, ArrowLeft } from "lucide-react"

export function RecommendationsSection() {
  const router = useRouter()
  const { profile, userDataLoaded, isComplete, completionPercentage, checkRegistrationStatus } = useInitialRegistration()

  const statusLabel = useMemo(() => {
    if (!isComplete) return `Formulario pendiente (${completionPercentage}% completado)`
    return "Formulario completado"
  }, [isComplete, completionPercentage])

  const handleGoToDashboard = () => router.push("/dashboard")

  if (!userDataLoaded) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Cargando tu perfil para generar recomendaciones personalizadas…</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Alert>
          <Sparkles className="h-5 w-5" />
          <AlertTitle>Necesitamos un poco más de información</AlertTitle>
          <AlertDescription>
            Para generar recomendaciones personalizadas debes completar el formulario inicial.
            Puedes hacerlo desde el botón inferior.
          </AlertDescription>
        </Alert>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => router.push("/initial-registration")}>
            Completar formulario inicial
          </Button>
          <Button variant="outline" onClick={handleGoToDashboard}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-3 text-primary">
              <Sparkles className="h-5 w-5" />
              Tus recomendaciones personalizadas
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Generadas a partir del formulario inicial. Puedes volver a completarlo si tus objetivos han cambiado.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={checkRegistrationStatus}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refrescar datos
            </Button>
            <Button size="sm" variant="ghost" onClick={() => router.push("/initial-registration")}>
              Actualizar formulario
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{statusLabel}</p>
        </CardContent>
      </Card>

      <PersonalizedRecommendations
        userProfile={profile}
        onComplete={handleGoToDashboard}
      />
    </div>
  )
}

