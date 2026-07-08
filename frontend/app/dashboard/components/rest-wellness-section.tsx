"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, Loader2, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { authenticatedFetch } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import type { RestWellnessQuestion } from "@/lib/rest-wellness/types"
import { OptionButton } from "./rest-wellness-priority-chart"

type WizardStep = "intro" | "questions" | "thanks"

export function RestWellnessSection() {
  const { user } = useAuth()

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <RestWellnessWizard userName={user?.first_name || user?.email || ""} />
    </div>
  )
}

function RestWellnessWizard({ userName }: { userName: string }) {
  const [step, setStep] = useState<WizardStep>("intro")
  const [questions, setQuestions] = useState<RestWellnessQuestion[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Array<boolean | null>>([])

  useEffect(() => {
    if (step !== "questions" || questions.length > 0) return

    const loadQuestions = async () => {
      setLoadingQuestions(true)
      try {
        const response = await authenticatedFetch("rest-wellness/questions/")
        if (!response.ok) throw new Error("questions")
        const data = await response.json()
        const loaded = (data.questions || []) as RestWellnessQuestion[]
        setQuestions(loaded)
        setAnswers(new Array(loaded.length).fill(null))
      } catch {
        toast({
          title: "Error",
          description: "No se pudieron cargar las preguntas.",
          variant: "destructive",
        })
        setStep("intro")
      } finally {
        setLoadingQuestions(false)
      }
    }

    void loadQuestions()
  }, [step, questions.length])

  const total = questions.length
  const currentAnswer = answers[currentIndex]
  const progressValue = total > 0 ? ((currentIndex + 1) / total) * 100 : 0

  const start = () => {
    setCurrentIndex(0)
    setStep("questions")
  }

  const submitAnswers = async (finalAnswers: boolean[]) => {
    setSubmitting(true)
    try {
      const response = await authenticatedFetch("rest-wellness/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: finalAnswers }),
      })
      if (!response.ok) throw new Error("submit")
      setStep("thanks")
    } catch {
      toast({
        title: "Error",
        description: "No se pudo enviar el cuestionario. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const selectAnswer = (value: boolean) => {
    if (submitting) return

    const nextAnswers = [...answers]
    nextAnswers[currentIndex] = value
    setAnswers(nextAnswers)

    if (currentIndex < total - 1) {
      setCurrentIndex((prev) => prev + 1)
      return
    }

    void submitAnswers(nextAnswers as boolean[])
  }

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  if (step === "intro") {
    return (
      <div className="space-y-4">
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 text-white shadow-lg">
          <CardHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-2xl">
              <Moon className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl text-white">Bienestar del Descanso</CardTitle>
            <CardDescription className="text-white/90">
              Unas preguntas rápidas sobre tu día a día para entender mejor cómo duermes.
            </CardDescription>
            <div className="mt-4 inline-flex rounded-xl bg-white/20 px-3 py-2 text-sm font-medium">
              {format(new Date(), "EEEE, d MMMM yyyy", { locale: es })}
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Hola{userName ? ` ${userName}` : ""}, el cuestionario tiene 32 preguntas de Sí/No. Tardarás unos minutos.
            </p>
            <Button className="mt-4 w-full" onClick={start}>
              Empezar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === "thanks") {
    return (
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 text-white shadow-lg">
        <CardHeader className="py-10">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-2xl">
            💜
          </div>
          <CardTitle className="text-2xl text-white">
            {userName ? `¡Gracias, ${userName}!` : "¡Gracias!"}
          </CardTitle>
          <CardDescription className="text-base text-white/90">
            Hemos recibido tu cuestionario. Lo revisaremos y te enviaremos un protocolo adaptado a ti para ayudarte a mejorar tu descanso.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (loadingQuestions || questions.length === 0) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    )
  }

  const question = questions[currentIndex]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={goBack}
          disabled={currentIndex === 0 || submitting}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <Progress value={progressValue} className="h-2" />
        </div>
        <span className="text-xs font-semibold text-muted-foreground">
          {currentIndex + 1} / {total}
        </span>
      </div>

      <Card className="min-h-[320px]">
        <CardContent className="flex h-full flex-col justify-center py-8">
          <h2 className="mb-8 text-xl font-bold leading-snug sm:text-2xl">{question.text}</h2>
          <div className="grid grid-cols-2 gap-3">
            <OptionButton
              selected={currentAnswer === true}
              emoji="🙂"
              label="Sí"
              disabled={submitting}
              onClick={() => selectAnswer(true)}
            />
            <OptionButton
              selected={currentAnswer === false}
              emoji="😐"
              label="No"
              disabled={submitting}
              onClick={() => selectAnswer(false)}
            />
          </div>
        </CardContent>
      </Card>

      {submitting ? (
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Enviando...
        </div>
      ) : null}
    </div>
  )
}
