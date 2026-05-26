"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Eye, Heart, Loader2, MessageCircle, Search, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { communityRecipeService, CommunityRecipePost } from "@/lib/community-recipe-service"

const formatDate = (value: string) => new Date(value).toLocaleString("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

export function CommunityRecipesManagement() {
  const [posts, setPosts] = useState<CommunityRecipePost[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState("active")
  const [search, setSearch] = useState("")
  const [selectedPost, setSelectedPost] = useState<CommunityRecipePost | null>(null)
  const [postToDelete, setPostToDelete] = useState<CommunityRecipePost | null>(null)
  const [reason, setReason] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)

  const loadPosts = async () => {
    try {
      setLoading(true)
      setPosts(await communityRecipeService.adminList(status))
    } catch (error) {
      toast({
        title: "Error al cargar publicaciones",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPosts()
  }, [status])

  const filteredPosts = posts.filter((post) => {
    const haystack = `${post.title} ${post.description} ${post.author_name} ${post.author_email || ""}`.toLowerCase()
    return haystack.includes(search.toLowerCase())
  })

  const confirmDelete = async () => {
    if (!postToDelete || !reason.trim()) {
      toast({ title: "Añade una razón", variant: "destructive" })
      return
    }
    try {
      setDeleting(true)
      await communityRecipeService.adminDelete(postToDelete.id, reason.trim())
      setPosts((current) => current.filter((item) => item.id !== postToDelete.id))
      setPostToDelete(null)
      setReason("")
      toast({ title: "Publicación eliminada", description: "La usuaria recibirá una notificación con el motivo." })
    } catch (error) {
      toast({
        title: "No se pudo eliminar",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const deleteComment = async (postId: string, commentId: string) => {
    try {
      setDeletingCommentId(commentId)
      await communityRecipeService.deleteComment(postId, commentId)

      const updatePost = (post: CommunityRecipePost): CommunityRecipePost => {
        if (post.id !== postId) return post
        const nextComments = post.comments.filter((comment) => comment.id !== commentId)
        return {
          ...post,
          comments: nextComments,
          comments_count: Math.max(0, post.comments_count - 1),
        }
      }

      setPosts((current) => current.map(updatePost))
      setSelectedPost((current) => current ? updatePost(current) : current)
      toast({ title: "Comentario eliminado" })
    } catch (error) {
      toast({
        title: "No se pudo eliminar el comentario",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo",
        variant: "destructive",
      })
    } finally {
      setDeletingCommentId(null)
    }
  }

  return (
    <div className="space-y-5">
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle>Comunidad de recetas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por receta o usuaria" className="pl-9" />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activas</SelectItem>
                <SelectItem value="expired">Expiradas</SelectItem>
                <SelectItem value="all">Todas</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadPosts}>Actualizar</Button>
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="rounded-lg border p-8 text-center text-muted-foreground">No hay publicaciones.</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredPosts.map((post) => (
                <div key={post.id} className="grid gap-4 rounded-lg border p-3 md:grid-cols-[140px_1fr]">
                  <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
                    <Image src={post.photo_url} alt={post.title} fill className="object-cover" unoptimized />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold">{post.title}</h3>
                      <p className="text-xs text-muted-foreground">{post.author_name} · {post.author_email}</p>
                      <p className="text-xs text-muted-foreground">Publicada {formatDate(post.created_at)} · Expira {formatDate(post.expires_at)}</p>
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{post.description || "Sin descripción"}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="gap-1"><Heart className="h-3.5 w-3.5" />{post.likes_count}</Badge>
                      <Badge variant="secondary" className="gap-1"><MessageCircle className="h-3.5 w-3.5" />{post.comments_count}</Badge>
                      <Button size="sm" variant="outline" onClick={() => setSelectedPost(post)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600" onClick={() => setPostToDelete(post)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedPost)} onOpenChange={(open) => !open && setSelectedPost(null)}>
        <DialogContent className="max-w-3xl">
          {selectedPost ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedPost.title}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 md:grid-cols-[260px_1fr]">
                <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                  <Image src={selectedPost.photo_url} alt={selectedPost.title} fill className="object-cover" unoptimized />
                </div>
                <div className="space-y-3 text-sm">
                  <p className="text-muted-foreground">{selectedPost.author_name} · {selectedPost.author_email}</p>
                  {selectedPost.description ? <p>{selectedPost.description}</p> : null}
                  {selectedPost.ingredients ? <div><p className="font-medium">Ingredientes</p><p className="whitespace-pre-line text-muted-foreground">{selectedPost.ingredients}</p></div> : null}
                  {selectedPost.instructions ? <div><p className="font-medium">Preparación</p><p className="whitespace-pre-line text-muted-foreground">{selectedPost.instructions}</p></div> : null}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Comentarios</h3>
                  <Badge variant="secondary">{selectedPost.comments_count}</Badge>
                </div>
                {selectedPost.comments.length === 0 ? (
                  <div className="rounded-lg border p-4 text-sm text-muted-foreground">Sin comentarios.</div>
                ) : (
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {selectedPost.comments.map((comment) => (
                      <div key={comment.id} className="flex items-start gap-3 rounded-lg border p-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">{comment.author_name}</p>
                            <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
                          </div>
                          <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{comment.text}</p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => deleteComment(selectedPost.id, comment.id)}
                          disabled={deletingCommentId === comment.id}
                          aria-label="Eliminar comentario"
                        >
                          {deletingCommentId === comment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(postToDelete)} onOpenChange={(open) => !open && setPostToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar publicación</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">La usuaria recibirá una notificación con esta razón.</p>
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo de eliminación" rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPostToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Eliminar y notificar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
