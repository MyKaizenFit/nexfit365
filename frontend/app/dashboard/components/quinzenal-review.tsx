"use client"

import { useState } from "react"
import { AlertCircle, Calendar, Send, CheckCircle, Upload, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/hooks/use-toast"

export function QuinzenalReview() {
  const [daysUntilReview, setDaysUntilReview] = useState(3)
  const [needsPhotos, setNeedsPhotos] = useState(true)
  const [needsMeasurements, setNeedsMeasurements] = useState(false)
  const [reviewSent, setReviewSent] = useState(false)

  const handleSendReview = () => {
    if (needsPhotos || needsMeasurements) {
      toast({
        title: "Revisión incompleta",
        description: "Por favor completa todos los requisitos antes de enviar la revisión.",
        variant: "destructive",
      })
      return
    }

    setReviewSent(true)
    toast({
      title: "¡Revisión enviada!",
      description: "Tu nutricionista recibirá tu progreso y te contactará pronto.",
    })
  }

  const handleUploadPhotos = () => {
    setNeedsPhotos(false)
    toast({
      title: "Fotos subidas",
      description: "Tus fotos de progreso han sido guardadas correctamente.",
    })
  }

  const handleRecordMeasurements = () => {
    setNeedsMeasurements(false)
    toast({
      title: "Medidas registradas",
      description: "Tus medidas corporales han sido actualizadas.",
    })
  }

  const handleScheduleReview = () => {
    toast({
      title: "Programar revisión",
      description: "Abriendo calendario para agendar tu cita...",
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Revisión Quincenal
        </CardTitle>
        <CardDescription>Próxima evaluación con tu nutricionista</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!reviewSent ? (
          <>
            <div
              className="text-center p-4 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={handleScheduleReview}
            >
              <p className="text-2xl font-bold">{daysUntilReview}</p>
              <p className="text-sm text-muted-foreground">días restantes</p>
              <p className="text-xs text-muted-foreground mt-1">15 de Enero, 2024</p>
            </div>

            {(needsPhotos || needsMeasurements) && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Pendiente:
                  {needsPhotos && " Subir fotos de progreso"}
                  {needsPhotos && needsMeasurements && " y"}
                  {needsMeasurements && " Registrar medidas"}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Preparación para la revisión:</h4>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span>Registro de comidas completo</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span>Entrenamientos al día</span>
                </div>
                <div
                  className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors"
                  onClick={handleUploadPhotos}
                >
                  <div className={`h-2 w-2 rounded-full ${needsPhotos ? "bg-yellow-500" : "bg-green-500"}`} />
                  <span>Fotos de progreso</span>
                  {needsPhotos && <Camera className="h-3 w-3 ml-1" />}
                </div>
                {needsMeasurements && (
                  <div
                    className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors"
                    onClick={handleRecordMeasurements}
                  >
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    <span>Medidas corporales</span>
                    <Upload className="h-3 w-3 ml-1" />
                  </div>
                )}
              </div>
            </div>

            <Button
              className="w-full hover:scale-105 transition-transform"
              disabled={needsPhotos || needsMeasurements}
              onClick={handleSendReview}
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar Revisión
            </Button>
          </>
        ) : (
          <div className="text-center space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-800">¡Revisión enviada!</p>
              <p className="text-xs text-green-600 mt-1">
                Tu nutricionista revisará tu progreso y te contactará pronto.
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full bg-transparent"
              onClick={() => {
                setReviewSent(false)
                toast({ title: "Nueva revisión", description: "Preparando siguiente evaluación..." })
              }}
            >
              Preparar Siguiente Revisión
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
