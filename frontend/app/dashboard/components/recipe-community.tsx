"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import {
  Activity, BookOpen, Camera, Check, Dumbbell, Heart, HelpCircle,
  Lightbulb, Loader2, MessageCircle, MessageSquare, Pencil, Plus,
  Send, Sparkles, Trash2, TrendingUp, Upload, X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import {
  communityRecipeService,
  CommunityPostPayload,
  CommunityPostType,
  CommunityRecipePost,
} from "@/lib/community-recipe-service"

const POST_TYPES: Array<{
  value: CommunityPostType
  label: string
  description: string
  icon: typeof MessageSquare
  color: string
}> = [
  { value: "general", label: "Libre", description: "Comparte una idea, foto o experiencia", icon: MessageSquare, color: "text-sky-600 bg-sky-50" },
  { value: "recipe", label: "Receta", description: "Ingredientes y preparación", icon: BookOpen, color: "text-orange-600 bg-orange-50" },
  { value: "exercise", label: "Ejercicio", description: "Técnica, series y repeticiones", icon: Dumbbell, color: "text-violet-600 bg-violet-50" },
  { value: "workout", label: "Entrenamiento", description: "Comparte una sesión completa", icon: Activity, color: "text-emerald-600 bg-emerald-50" },
  { value: "progress", label: "Progreso", description: "Celebra y documenta avances", icon: TrendingUp, color: "text-teal-600 bg-teal-50" },
  { value: "tip", label: "Consejo", description: "Ayuda a la comunidad", icon: Lightbulb, color: "text-amber-600 bg-amber-50" },
  { value: "question", label: "Pregunta", description: "Pregunta al Team", icon: HelpCircle, color: "text-rose-600 bg-rose-50" },
]

const TEMPLATE_FIELDS: Partial<Record<CommunityPostType, Array<{ key: string; label: string; placeholder: string }>>> = {
  exercise: [
    { key: "muscle_groups", label: "Músculos trabajados", placeholder: "Ej: glúteos, cuádriceps" },
    { key: "equipment", label: "Material", placeholder: "Ej: mancuernas, banda elástica" },
    { key: "sets_reps", label: "Series y repeticiones", placeholder: "Ej: 4 series de 10 repeticiones" },
    { key: "technique", label: "Técnica y consejos", placeholder: "Explica cómo ejecutarlo correctamente" },
  ],
  workout: [
    { key: "objective", label: "Objetivo", placeholder: "Ej: fuerza, movilidad, cardio" },
    { key: "difficulty", label: "Dificultad", placeholder: "Ej: principiante, intermedio" },
    { key: "duration", label: "Duración", placeholder: "Ej: 45 minutos" },
    { key: "exercises", label: "Ejercicios", placeholder: "Lista ejercicios, series y repeticiones" },
  ],
  progress: [
    { key: "period", label: "Periodo", placeholder: "Ej: primeras 8 semanas" },
    { key: "achievement", label: "Logro", placeholder: "¿Qué has conseguido?" },
    { key: "habits", label: "Hábitos que ayudaron", placeholder: "Entrenamiento, alimentación, descanso..." },
  ],
  tip: [
    { key: "category", label: "Categoría", placeholder: "Ej: nutrición, técnica, motivación" },
    { key: "recommendation", label: "Recomendación práctica", placeholder: "¿Cómo puede aplicarlo otra persona?" },
  ],
}

const emptyForm = (postType: CommunityPostType = "general"): CommunityPostPayload => ({
  title: "",
  description: "",
  post_type: postType,
  ingredients: "",
  instructions: "",
  template_data: {},
  tags: [],
  photo: null,
})

const formatDate = (value: string) => new Date(value).toLocaleDateString("es-ES", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
})

const postTypeInfo = (type: CommunityPostType) => POST_TYPES.find((item) => item.value === type) || POST_TYPES[0]

export function RecipeCommunity() {
  const [posts, setPosts] = useState<CommunityRecipePost[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  const [filter, setFilter] = useState<CommunityPostType | "all">("all")
  const [commentText, setCommentText] = useState<Record<string, string>>({})
  const [form, setForm] = useState<CommunityPostPayload>(emptyForm())
  const [tagsText, setTagsText] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editSaving, setEditSaving] = useState(false)

  const photoPreview = useMemo(() => form.photo ? URL.createObjectURL(form.photo) : "", [form.photo])
  const selectedType = postTypeInfo(form.post_type)
  const selectedFields = TEMPLATE_FIELDS[form.post_type] || []

  const loadPosts = async () => {
    try {
      setLoading(true)
      setPosts(await communityRecipeService.list(filter === "all" ? undefined : filter))
    } catch (error) {
      toast({
        title: "Error al cargar Team SK",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPosts()
  }, [filter])

  const selectTemplate = (postType: CommunityPostType) => {
    setForm(emptyForm(postType))
    setTagsText("")
    setShowComposer(true)
  }

  const updateTemplateField = (key: string, value: string) => {
    setForm((current) => ({
      ...current,
      template_data: { ...(current.template_data || {}), [key]: value },
    }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.title.trim() || !form.description.trim()) {
      toast({ title: "Añade un título y una descripción", variant: "destructive" })
      return
    }

    try {
      setSaving(true)
      const created = await communityRecipeService.create({
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        ingredients: form.ingredients?.trim(),
        instructions: form.instructions?.trim(),
        tags: tagsText.split(",").map((tag) => tag.trim()).filter(Boolean),
      })
      setPosts((current) => [created, ...current])
      setForm(emptyForm())
      setTagsText("")
      setShowComposer(false)
      toast({ title: "Publicación compartida en Team SK" })
    } catch (error) {
      toast({
        title: "No se pudo publicar",
        description: error instanceof Error ? error.message : "Revisa los datos y vuelve a intentarlo.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleLike = async (post: CommunityRecipePost) => {
    try {
      const result = await communityRecipeService.toggleLike(post.id)
      setPosts((current) => current.map((item) => item.id === post.id
        ? { ...item, liked_by_me: result.liked_by_me, likes_count: result.likes_count }
        : item))
    } catch {
      toast({ title: "No se pudo actualizar el like", variant: "destructive" })
    }
  }

  const addComment = async (post: CommunityRecipePost) => {
    const text = (commentText[post.id] || "").trim()
    if (!text) return
    try {
      const comment = await communityRecipeService.comment(post.id, text)
      setCommentText((current) => ({ ...current, [post.id]: "" }))
      setPosts((current) => current.map((item) => item.id === post.id
        ? { ...item, comments: [...item.comments, comment], comments_count: item.comments_count + 1 }
        : item))
    } catch {
      toast({ title: "No se pudo comentar", variant: "destructive" })
    }
  }

  const deletePost = async (post: CommunityRecipePost) => {
    try {
      await communityRecipeService.delete(post.id)
      setPosts((current) => current.filter((item) => item.id !== post.id))
      toast({ title: "Publicación eliminada" })
    } catch {
      toast({ title: "No se pudo eliminar", variant: "destructive" })
    }
  }

  const startEdit = (post: CommunityRecipePost) => {
    setEditingId(post.id)
    setEditTitle(post.title)
    setEditDescription(post.description)
  }

  const saveEdit = async (post: CommunityRecipePost) => {
    if (!editTitle.trim() || !editDescription.trim()) return
    try {
      setEditSaving(true)
      const updated = await communityRecipeService.update(post.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
      })
      setPosts((current) => current.map((item) => item.id === post.id ? updated : item))
      setEditingId(null)
      toast({ title: "Publicación actualizada" })
    } catch {
      toast({ title: "No se pudo guardar", variant: "destructive" })
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <div className="responsive-content space-y-5 p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Team SK</h2>
          <p className="text-sm text-muted-foreground">Comparte, pregunta y aprende junto a la comunidad.</p>
        </div>
        <Button onClick={() => setShowComposer((current) => !current)} className="bg-teal-600 hover:bg-teal-700">
          {showComposer ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {showComposer ? "Cerrar" : "Crear publicación"}
        </Button>
      </div>

      {showComposer ? (
        <Card className="border-teal-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-5 w-5 text-teal-600" />Elige una plantilla</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
              {POST_TYPES.map((type) => {
                const Icon = type.icon
                const selected = form.post_type === type.value
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => selectTemplate(type.value)}
                    className={`rounded-xl border p-3 text-left transition ${selected ? "border-teal-500 ring-2 ring-teal-100" : "hover:border-teal-300"}`}
                  >
                    <span className={`mb-2 inline-flex rounded-lg p-2 ${type.color}`}><Icon className="h-4 w-4" /></span>
                    <span className="block text-sm font-semibold">{type.label}</span>
                  </button>
                )
              })}
            </div>

            <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[1fr_240px]">
              <div className="space-y-3">
                <div className="rounded-lg bg-muted/40 p-3 text-sm">
                  <p className="font-medium">{selectedType.label}</p>
                  <p className="text-muted-foreground">{selectedType.description}</p>
                </div>
                <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Título de la publicación" maxLength={160} />
                <Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder={form.post_type === "question" ? "¿Qué quieres preguntar al Team?" : "Cuéntanos algo sobre esta publicación"} rows={3} />

                {form.post_type === "recipe" ? (
                  <>
                    <Textarea value={form.ingredients} onChange={(event) => setForm((current) => ({ ...current, ingredients: event.target.value }))} placeholder="Ingredientes" rows={3} />
                    <Textarea value={form.instructions} onChange={(event) => setForm((current) => ({ ...current, instructions: event.target.value }))} placeholder="Preparación" rows={3} />
                  </>
                ) : null}

                {selectedFields.map((field) => (
                  <Textarea
                    key={field.key}
                    value={form.template_data?.[field.key] || ""}
                    onChange={(event) => updateTemplateField(field.key, event.target.value)}
                    placeholder={`${field.label}: ${field.placeholder}`}
                    rows={field.key === "exercises" || field.key === "technique" ? 3 : 2}
                  />
                ))}

                <Input value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="Etiquetas separadas por comas: fuerza, fácil, desayuno..." />
              </div>
              <div className="space-y-3">
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-lg border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
                  {photoPreview ? <Image src={photoPreview} alt="Vista previa" width={240} height={240} className="h-full w-full object-cover" unoptimized /> : <><Camera className="h-8 w-8" />Foto opcional</>}
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => setForm((current) => ({ ...current, photo: event.target.files?.[0] || null }))} />
                </label>
                <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Publicar
                </Button>
                <p className="text-xs text-muted-foreground">La publicación se elimina automáticamente al cumplir 7 días.</p>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-1">
        <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>Todo</Button>
        {POST_TYPES.map((type) => <Button key={type.value} size="sm" variant={filter === type.value ? "default" : "outline"} onClick={() => setFilter(type.value)}>{type.label}</Button>)}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>
      ) : posts.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Todavía no hay publicaciones de este tipo.</CardContent></Card>
      ) : (
        <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-2">
          {posts.map((post) => {
            const type = postTypeInfo(post.post_type || "recipe")
            const Icon = type.icon
            const details = Object.entries(post.template_data || {}).filter(([, value]) => value)
            return (
              <Card key={post.id} className="overflow-hidden border border-border bg-card">
                {post.photo_url ? <div className="relative aspect-[4/3] bg-muted"><Image src={post.photo_url} alt={post.title} fill className="object-cover" unoptimized /></div> : null}
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start gap-3">
                    <span className={`rounded-lg p-2 ${type.color}`}><Icon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-lg font-semibold">{post.title}</h3>
                        <Badge variant="outline">{type.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{post.author_name} · {formatDate(post.created_at)}</p>
                    </div>
                  </div>

                  {editingId === post.id ? (
                    <div className="space-y-2 rounded-lg border border-teal-200 bg-teal-50/50 p-3">
                      <Input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
                      <Textarea value={editDescription} onChange={(event) => setEditDescription(event.target.value)} rows={3} />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="mr-1 h-4 w-4" />Cancelar</Button>
                        <Button size="sm" onClick={() => saveEdit(post)} disabled={editSaving}>{editSaving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}Guardar</Button>
                      </div>
                    </div>
                  ) : <p className="whitespace-pre-line text-sm">{post.description}</p>}

                  {(post.ingredients || post.instructions) ? <div className="grid gap-3 rounded-lg bg-orange-50/60 p-3 text-sm md:grid-cols-2">
                    {post.ingredients ? <div><p className="font-medium">Ingredientes</p><p className="whitespace-pre-line text-muted-foreground">{post.ingredients}</p></div> : null}
                    {post.instructions ? <div><p className="font-medium">Preparación</p><p className="whitespace-pre-line text-muted-foreground">{post.instructions}</p></div> : null}
                  </div> : null}

                  {details.length ? <div className="space-y-2 rounded-lg bg-muted/40 p-3 text-sm">{details.map(([key, value]) => {
                    const label = TEMPLATE_FIELDS[post.post_type]?.find((field) => field.key === key)?.label || key.replaceAll("_", " ")
                    return <div key={key}><p className="font-medium capitalize">{label}</p><p className="whitespace-pre-line text-muted-foreground">{value}</p></div>
                  })}</div> : null}

                  {post.tags?.length ? <div className="flex flex-wrap gap-1">{post.tags.map((tag) => <Badge key={tag} variant="secondary">#{tag}</Badge>)}</div> : null}

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => toggleLike(post)}><Heart className={`mr-2 h-4 w-4 ${post.liked_by_me ? "fill-rose-500 text-rose-500" : ""}`} />{post.likes_count}</Button>
                    <Badge variant="secondary" className="gap-1"><MessageCircle className="h-3.5 w-3.5" />{post.comments_count}</Badge>
                    <div className="ml-auto flex gap-1">
                      {post.can_edit ? <Button variant="ghost" size="sm" onClick={() => startEdit(post)}><Pencil className="h-4 w-4" /></Button> : null}
                      {post.can_delete ? <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deletePost(post)}><Trash2 className="h-4 w-4" /></Button> : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {post.comments.map((comment) => <div key={comment.id} className="rounded-lg bg-muted/50 p-3 text-sm"><p className="font-medium">{comment.author_name}</p><p className="text-muted-foreground">{comment.text}</p></div>)}
                    <div className="flex gap-2">
                      <Input value={commentText[post.id] || ""} onChange={(event) => setCommentText((current) => ({ ...current, [post.id]: event.target.value }))} placeholder="Escribe un comentario" />
                      <Button size="icon" onClick={() => addComment(post)} aria-label="Comentar"><Send className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
