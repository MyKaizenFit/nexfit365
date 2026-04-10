"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale/es"
import { Sparkles, PlusCircle, Star, CheckCircle2, XCircle, Loader2 } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useWellnessTips } from "@/hooks/use-wellness-tips"
import { useAuth } from "@/contexts/auth-context"
import type { WellnessTip, WellnessTipCategory, WellnessTipPayload } from "@/types/tip"
import { cn } from "@/lib/utils"

const categoryOptions: { value: WellnessTipCategory; label: string; description: string }[] = [
  { value: "nutrition", label: "Nutrición", description: "Consejos alimenticios, hábitos, recetas rápidas." },
  { value: "training", label: "Entrenamiento", description: "Rutinas, técnica, progreso y motivación física." },
  { value: "mindset", label: "Mentalidad", description: "Mentalidad positiva, constancia, gestión del estrés." },
  { value: "recovery", label: "Recuperación", description: "Descanso, sueño, estiramientos y prevención de lesiones." },
  { value: "lifestyle", label: "Estilo de vida", description: "Hábitos diarios, organización, equilibrio vida-salud." },
]

interface TipsBoardProps {
  showCreateForm?: boolean
}

const emptyForm: WellnessTipPayload = {
  title: "",
  summary: "",
  content: "",
  category: "mindset",
  audience: "general",
  is_active: true,
  is_highlighted: false,
}

export function TipsBoard({ showCreateForm = true }: TipsBoardProps) {
  const { user } = useAuth()
  const isAdmin = Boolean(user?.is_staff || user?.is_superuser || user?.role === "ADMIN")

  const [activeCategory, setActiveCategory] = useState<WellnessTipCategory | "all">("all")
  const [formData, setFormData] = useState<WellnessTipPayload>(emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const tipRequestOptions = useMemo(
    () => ({
      category: activeCategory === "all" ? undefined : activeCategory,
    }),
    [activeCategory]
  )

  const { tips, loading, error, refresh, createTip, updateTip } = useWellnessTips(tipRequestOptions)

  const filteredTips = useMemo(() => {
    if (activeCategory === "all") return tips
    return tips.filter((tip) => tip.category === activeCategory)
  }, [tips, activeCategory])

  const handleInputChange = (field: keyof WellnessTipPayload, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isAdmin) return
    setIsSubmitting(true)
    try {
      const payload: WellnessTipPayload = {
        ...formData,
        audience: formData.audience || "general",
      }
      const result = await createTip(payload)
      if (result) {
        setFormData({ ...emptyForm, category: formData.category })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleTipField = async (tip: WellnessTip, field: "is_highlighted" | "is_active") => {
    if (!isAdmin) return
    await updateTip(tip.id, { [field]: !tip[field] })
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Consejos y motivación
          </h1>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Refrescar
          </Button>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Aquí encontrarás recomendaciones creadas por el equipo para mantenerte motivado. Si eres administrador puedes añadir nuevos consejos o destacar los más importantes.
        </p>
      </header>

      <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as WellnessTipCategory | "all")} className="w-full">
        <TabsList className="flex flex-wrap justify-start gap-2">
          <TabsTrigger value="all">Todas</TabsTrigger>
          {categoryOptions.map((option) => (
            <TabsTrigger key={option.value} value={option.value}>
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-6">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(4)].map((_, index) => (
                <Card key={index} className="h-40 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-destructive">No se pudieron cargar los consejos</CardTitle>
                <CardDescription>{error}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={refresh}>Reintentar</Button>
              </CardContent>
            </Card>
          ) : filteredTips.length === 0 ? (
            <Card className="bg-muted/20">
              <CardHeader>
                <CardTitle>No hay consejos aún</CardTitle>
                <CardDescription>Cuando se publiquen consejos aparecerán aquí.</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredTips.map((tip) => (
                <Card key={tip.id} className={cn("border border-primary/10", !tip.is_active && "opacity-60")}>
                  <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary">{categoryOptions.find((option) => option.value === tip.category)?.label ?? tip.category}</Badge>
                      <div className="flex gap-1">
                        {tip.is_highlighted && (
                          <Badge variant="outline" className="border-amber-300 text-amber-500">
                            Destacado
                          </Badge>
                        )}
                        {!tip.is_active && (
                          <Badge variant="outline" className="border-muted-foreground text-muted-foreground">
                            Oculto
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardTitle className="text-lg leading-tight">{tip.title}</CardTitle>
                    {tip.summary ? (
                      <CardDescription>{tip.summary}</CardDescription>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{tip.content}</p>
                    <div className="text-xs text-muted-foreground">
                      Publicado {format(new Date(tip.created_at), "PPPp", { locale: es })}
                      {tip.author_name ? ` · Por ${tip.author_name}` : null}
                    </div>
                    {isAdmin ? (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant={tip.is_highlighted ? "default" : "outline"} onClick={() => toggleTipField(tip, "is_highlighted")}>
                          {tip.is_highlighted ? (
                            <>
                              <Star className="mr-2 h-4 w-4" />
                              Quitar destacado
                            </>
                          ) : (
                            <>
                              <Star className="mr-2 h-4 w-4" />
                              Destacar
                            </>
                          )}
                        </Button>
                        <Button size="sm" variant={tip.is_active ? "outline" : "default"} onClick={() => toggleTipField(tip, "is_active")}>
                          {tip.is_active ? (
                            <>
                              <XCircle className="mr-2 h-4 w-4" />
                              Ocultar
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Mostrar
                            </>
                          )}
                        </Button>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {showCreateForm && isAdmin ? (
        <Card className="border-dashed border-primary/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-primary" />
              Añadir nuevo consejo
            </CardTitle>
            <CardDescription>
              Comparte recomendaciones con la comunidad. Puedes destacar aquellos consejos que quieras resaltar en Inicio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    placeholder="Ej. Mantén tu hidratación bajo control"
                    onChange={(event) => handleInputChange("title", event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audience">Audiencia</Label>
                  <Input
                    id="audience"
                    value={formData.audience}
                    placeholder="General, Principiantes, Avanzados…"
                    onChange={(event) => handleInputChange("audience", event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="summary">Resumen (opcional)</Label>
                <Input
                  id="summary"
                  value={formData.summary}
                  placeholder="Una frase corta que resuma el consejo."
                  onChange={(event) => handleInputChange("summary", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Contenido *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  placeholder="Describe el consejo con detalle, pasos concretos o recomendaciones."
                  onChange={(event) => handleInputChange("content", event.target.value)}
                  required
                  rows={5}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Categoría *</Label>
                  <div className="grid gap-2">
                    {categoryOptions.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={formData.category === option.value ? "default" : "outline"}
                        className="justify-start"
                        onClick={() => handleInputChange("category", option.value)}
                      >
                        <div className="flex flex-col items-start">
                          <span>{option.label}</span>
                          <span className="text-xs text-muted-foreground font-normal">{option.description}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="font-medium text-sm">Destacar en Inicio</p>
                      <p className="text-xs text-muted-foreground">Los usuarios lo verán primero</p>
                    </div>
                    <Button
                      type="button"
                      variant={formData.is_highlighted ? "default" : "outline"}
                      onClick={() => handleInputChange("is_highlighted", !formData.is_highlighted)}
                    >
                      {formData.is_highlighted ? "Destacado" : "Sin destacar"}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="font-medium text-sm">Estado</p>
                      <p className="text-xs text-muted-foreground">Puedes ocultarlo temporalmente</p>
                    </div>
                    <Button
                      type="button"
                      variant={formData.is_active ? "default" : "outline"}
                      onClick={() => handleInputChange("is_active", !formData.is_active)}
                    >
                      {formData.is_active ? "Visible" : "Oculto"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormData(emptyForm)}
                  disabled={isSubmitting}
                >
                  Limpiar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando…
                    </>
                  ) : (
                    <>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Publicar consejo
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

