"use client"

import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { Camera, Check, Heart, Loader2, MessageCircle, Pencil, Send, Trash2, Upload, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { communityRecipeService, CommunityRecipePost } from "@/lib/community-recipe-service"

const formatDate = (value: string) => new Date(value).toLocaleDateString("es-ES", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
})

export function RecipeCommunity() {
  const [posts, setPosts] = useState<CommunityRecipePost[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [commentText, setCommentText] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    title: "",
    description: "",
    ingredients: "",
    instructions: "",
    photo: null as File | null,
  })

  // Estado edición
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    ingredients: "",
    instructions: "",
    photo: null as File | null,
  })
  const [editSaving, setEditSaving] = useState(false)
  const editPhotoInput = useRef<HTMLInputElement>(null)

  const editPhotoPreview = useMemo(() => {
    if (!editForm.photo) return ""
    return URL.createObjectURL(editForm.photo)
  }, [editForm.photo])

  const startEdit = (post: CommunityRecipePost) => {
    setEditingId(post.id)
    setEditForm({
      title: post.title,
      description: post.description,
      ingredients: post.ingredients,
      instructions: post.instructions,
      photo: null,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ title: "", description: "", ingredients: "", instructions: "", photo: null })
  }

  const saveEdit = async (post: CommunityRecipePost) => {
    if (!editForm.title.trim()) {
      toast({ title: "El título es obligatorio", variant: "destructive" })
      return
    }
    try {
      setEditSaving(true)
      let updated = await communityRecipeService.update(post.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        ingredients: editForm.ingredients.trim(),
        instructions: editForm.instructions.trim(),
      })
      if (editForm.photo) {
        updated = await communityRecipeService.uploadPhoto(post.id, editForm.photo)
      }
      setPosts((current) => current.map((item) => item.id === post.id ? updated : item))
      cancelEdit()
      toast({ title: "Receta actualizada" })
    } catch (error) {
      toast({
        title: "No se pudo guardar",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setEditSaving(false)
    }
  }

  const photoPreview = useMemo(() => {
    if (!form.photo) return ""
    return URL.createObjectURL(form.photo)
  }, [form.photo])

  const loadPosts = async () => {
    try {
      setLoading(true)
      setPosts(await communityRecipeService.list())
    } catch (error) {
      toast({
        title: "Error al cargar la comunidad",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPosts()
  }, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.title.trim() || !form.photo) {
      toast({
        title: "Faltan datos",
        description: "Añade un título y una foto de la receta.",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)
      const created = await communityRecipeService.create({
        title: form.title.trim(),
        description: form.description.trim(),
        ingredients: form.ingredients.trim(),
        instructions: form.instructions.trim(),
        photo: form.photo,
      })
      setPosts((current) => [created, ...current])
      setForm({ title: "", description: "", ingredients: "", instructions: "", photo: null })
      toast({ title: "Receta publicada", description: "Tu foto ya aparece en la comunidad." })
    } catch (error) {
      toast({
        title: "No se pudo publicar",
        description: error instanceof Error ? error.message : "Revisa la foto y vuelve a intentarlo.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleLike = async (post: CommunityRecipePost) => {
    try {
      const result = await communityRecipeService.toggleLike(post.id)
      setPosts((current) => current.map((item) => (
        item.id === post.id ? { ...item, liked_by_me: result.liked_by_me, likes_count: result.likes_count } : item
      )))
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
      setPosts((current) => current.map((item) => (
        item.id === post.id
          ? { ...item, comments: [...item.comments, comment], comments_count: item.comments_count + 1 }
          : item
      )))
    } catch (error) {
      toast({
        title: "No se pudo comentar",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      })
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

  return (
    <div className="responsive-content p-3 sm:p-4 lg:p-6 space-y-5">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-foreground">Recetas del Team</h2>
        <p className="text-sm text-muted-foreground">Comparte fotos de tus platos, deja comentarios y guarda tus favoritas con likes.</p>
      </div>

      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Camera className="h-5 w-5 text-teal-600" />
            Subir receta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[1fr_220px]">
            <div className="space-y-3">
              <Input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Nombre del plato"
                maxLength={160}
              />
              <Textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Qué has preparado, trucos o contexto"
                rows={3}
              />
              <Textarea
                value={form.ingredients}
                onChange={(event) => setForm((current) => ({ ...current, ingredients: event.target.value }))}
                placeholder="Ingredientes"
                rows={3}
              />
              <Textarea
                value={form.instructions}
                onChange={(event) => setForm((current) => ({ ...current, instructions: event.target.value }))}
                placeholder="Preparación"
                rows={3}
              />
            </div>
            <div className="space-y-3">
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
                {photoPreview ? (
                  <Image src={photoPreview} alt="Vista previa" width={220} height={220} className="h-full w-full rounded-lg object-cover" unoptimized />
                ) : (
                  <>
                    <Upload className="h-8 w-8" />
                    Añadir foto
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => setForm((current) => ({ ...current, photo: event.target.files?.[0] || null }))}
                />
              </label>
              <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Publicar
              </Button>
              <p className="text-xs text-muted-foreground">Las publicaciones se eliminan automáticamente al cumplir 7 días.</p>
            </div>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      ) : posts.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Todavía no hay recetas compartidas.</CardContent></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden border border-border bg-card">
              <div className="relative aspect-[4/3] bg-muted">
                <Image src={post.photo_url} alt={post.title} fill className="object-cover" unoptimized />
              </div>
              <CardContent className="space-y-4 p-4">
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{post.title}</h3>
                      <p className="text-xs text-muted-foreground">{post.author_name} · {formatDate(post.created_at)}</p>
                    </div>
                    <Badge variant="outline">Hasta {formatDate(post.expires_at)}</Badge>
                  </div>
                  {post.description ? <p className="text-sm text-foreground">{post.description}</p> : null}
                </div>

                {(post.ingredients || post.instructions) ? (
                  <div className="grid gap-3 text-sm md:grid-cols-2">
                    {post.ingredients ? <div><p className="font-medium">Ingredientes</p><p className="whitespace-pre-line text-muted-foreground">{post.ingredients}</p></div> : null}
                    {post.instructions ? <div><p className="font-medium">Preparación</p><p className="whitespace-pre-line text-muted-foreground">{post.instructions}</p></div> : null}
                  </div>
                ) : null}

              <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => toggleLike(post)}>
                    <Heart className={`mr-2 h-4 w-4 ${post.liked_by_me ? "fill-rose-500 text-rose-500" : ""}`} />
                    {post.likes_count}
                  </Button>
                  <Badge variant="secondary" className="gap-1">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {post.comments_count}
                  </Badge>
                  <div className="ml-auto flex gap-1">
                    {post.can_edit ? (
                      <Button variant="ghost" size="sm" className="text-teal-600" onClick={() => startEdit(post)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    ) : null}
                    {post.can_delete ? (
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deletePost(post)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>

                {/* Panel de edición inline */}
                {editingId === post.id ? (
                  <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-4 space-y-3">
                    <p className="text-sm font-medium text-teal-700">Editar receta</p>
                    <Input
                      value={editForm.title}
                      onChange={(e) => setEditForm((c) => ({ ...c, title: e.target.value }))}
                      placeholder="Nombre del plato"
                      maxLength={160}
                    />
                    <Textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm((c) => ({ ...c, description: e.target.value }))}
                      placeholder="Descripción"
                      rows={2}
                    />
                    <Textarea
                      value={editForm.ingredients}
                      onChange={(e) => setEditForm((c) => ({ ...c, ingredients: e.target.value }))}
                      placeholder="Ingredientes"
                      rows={2}
                    />
                    <Textarea
                      value={editForm.instructions}
                      onChange={(e) => setEditForm((c) => ({ ...c, instructions: e.target.value }))}
                      placeholder="Preparación"
                      rows={2}
                    />
                    <div className="flex items-center gap-3">
                      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50">
                        {editPhotoPreview ? (
                          <Image src={editPhotoPreview} alt="Nueva foto" width={40} height={40} className="rounded object-cover" unoptimized />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                        Cambiar foto
                        <input
                          ref={editPhotoInput}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => setEditForm((c) => ({ ...c, photo: e.target.files?.[0] || null }))}
                        />
                      </label>
                      <div className="ml-auto flex gap-2">
                        <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={editSaving}>
                          <X className="mr-1 h-4 w-4" /> Cancelar
                        </Button>
                        <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={() => saveEdit(post)} disabled={editSaving}>
                          {editSaving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                          Guardar
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  {post.comments.map((comment) => (
                    <div key={comment.id} className="rounded-lg bg-muted/50 p-3 text-sm">
                      <p className="font-medium">{comment.author_name}</p>
                      <p className="text-muted-foreground">{comment.text}</p>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={commentText[post.id] || ""}
                      onChange={(event) => setCommentText((current) => ({ ...current, [post.id]: event.target.value }))}
                      placeholder="Escribe un comentario"
                    />
                    <Button size="icon" onClick={() => addComment(post)} aria-label="Comentar">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
