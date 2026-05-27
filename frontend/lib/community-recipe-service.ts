import { authenticatedFetch, getApiBaseUrl } from "@/lib/api"

export interface CommunityRecipeComment {
  id: string
  author_name: string
  text: string
  can_delete: boolean
  created_at: string
}

export interface CommunityRecipePost {
  id: string
  author_name: string
  author_email?: string
  title: string
  description: string
  ingredients: string
  instructions: string
  photo_url: string
  expires_at: string
  likes_count: number
  comments_count: number
  liked_by_me: boolean
  can_delete: boolean
  comments: CommunityRecipeComment[]
  created_at: string
}

const normalizeList = async (response: Response): Promise<CommunityRecipePost[]> => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `Error ${response.status}`)
  }
  const data = await response.json()
  const posts = Array.isArray(data) ? data : data.results || []
  return posts.map(normalizePost)
}

const normalizeMediaUrl = (url: string): string => {
  if (!url) return ""
  if (url.startsWith("blob:") || url.startsWith("data:")) return url

  const apiBaseUrl = getApiBaseUrl()
  if (url.startsWith("/media/")) return `${apiBaseUrl}${url}`

  try {
    const parsedUrl = new URL(url)
    const isInternalBackendHost = ["backend", "localhost", "127.0.0.1", "0.0.0.0"].includes(parsedUrl.hostname)
    if (isInternalBackendHost && parsedUrl.pathname.startsWith("/media/")) {
      return `${apiBaseUrl}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
    }
  } catch {
    return url
  }

  return url
}

const normalizePost = (post: CommunityRecipePost): CommunityRecipePost => ({
  ...post,
  photo_url: normalizeMediaUrl(post.photo_url),
})

export const communityRecipeService = {
  async list(): Promise<CommunityRecipePost[]> {
    return normalizeList(await authenticatedFetch("nutrition/community-recipes/"))
  },

  async create(payload: {
    title: string
    description: string
    ingredients: string
    instructions: string
    photo: File
  }): Promise<CommunityRecipePost> {
    const formData = new FormData()
    formData.append("title", payload.title)
    formData.append("description", payload.description)
    formData.append("ingredients", payload.ingredients)
    formData.append("instructions", payload.instructions)
    formData.append("photo", payload.photo)

    const response = await authenticatedFetch("nutrition/community-recipes/", {
      method: "POST",
      body: formData,
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || errorData.photo?.[0] || `Error ${response.status}`)
    }
    const created = await response.json()
    return normalizePost(created)
  },

  async toggleLike(postId: string): Promise<{ liked_by_me: boolean; likes_count: number }> {
    const response = await authenticatedFetch(`nutrition/community-recipes/${postId}/like/`, {
      method: "POST",
    })
    if (!response.ok) throw new Error(`Error ${response.status}`)
    return response.json()
  },

  async comment(postId: string, text: string): Promise<CommunityRecipeComment> {
    const response = await authenticatedFetch(`nutrition/community-recipes/${postId}/comments/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Error ${response.status}`)
    }
    return response.json()
  },

  async delete(postId: string): Promise<void> {
    const response = await authenticatedFetch(`nutrition/community-recipes/${postId}/`, {
      method: "DELETE",
    })
    if (!response.ok) throw new Error(`Error ${response.status}`)
  },

  async deleteComment(postId: string, commentId: string): Promise<void> {
    const response = await authenticatedFetch(`nutrition/community-recipes/${postId}/comments/${commentId}/`, {
      method: "DELETE",
    })
    if (!response.ok) throw new Error(`Error ${response.status}`)
  },

  async adminList(status = "all"): Promise<CommunityRecipePost[]> {
    const suffix = status === "all" ? "" : `?status=${status}`
    return normalizeList(await authenticatedFetch(`admin/nutrition/community-recipes/${suffix}`))
  },

  async adminDelete(postId: string, reason: string): Promise<void> {
    const response = await authenticatedFetch(`admin/nutrition/community-recipes/${postId}/delete-with-reason/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Error ${response.status}`)
    }
  },
}
