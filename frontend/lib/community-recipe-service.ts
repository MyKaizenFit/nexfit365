import { authenticatedFetch } from "@/lib/api"

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
  post_type: CommunityPostType
  template_data: Record<string, string>
  tags: string[]
  expires_at: string | null
  likes_count: number
  comments_count: number
  liked_by_me: boolean
  can_delete: boolean
  can_edit: boolean
  comments: CommunityRecipeComment[]
  created_at: string
}

export type CommunityPostType = "general" | "recipe" | "exercise" | "workout" | "progress" | "tip" | "question"

export interface CommunityPostPayload {
  title: string
  description: string
  post_type: CommunityPostType
  ingredients?: string
  instructions?: string
  template_data?: Record<string, string>
  tags?: string[]
  photo?: File | null
}

const firstErrorMessage = (value: unknown): string => {
  if (!value) return ""
  if (typeof value === "string") return value
  if (Array.isArray(value)) return firstErrorMessage(value[0])
  if (typeof value === "object") {
    for (const [field, detail] of Object.entries(value as Record<string, unknown>)) {
      const message = firstErrorMessage(detail)
      if (message) return field === "detail" ? message : `${field}: ${message}`
    }
  }
  return String(value)
}

const responseErrorMessage = async (response: Response): Promise<string> => {
  const errorData = await response.json().catch(() => null)
  return firstErrorMessage(errorData?.detail) || firstErrorMessage(errorData?.errors) || firstErrorMessage(errorData) || `Error ${response.status}`
}

const normalizeList = async (response: Response): Promise<CommunityRecipePost[]> => {
  if (!response.ok) {
    throw new Error(await responseErrorMessage(response))
  }
  const data = await response.json()
  return Array.isArray(data) ? data : data.results || []
}

export const communityRecipeService = {
  async list(postType?: CommunityPostType): Promise<CommunityRecipePost[]> {
    const suffix = postType ? `?post_type=${postType}` : ""
    return normalizeList(await authenticatedFetch(`nutrition/community-recipes/${suffix}`))
  },

  async create(payload: CommunityPostPayload): Promise<CommunityRecipePost> {
    const formData = new FormData()
    formData.append("title", payload.title)
    formData.append("description", payload.description)
    formData.append("post_type", payload.post_type)
    formData.append("ingredients", payload.ingredients || "")
    formData.append("instructions", payload.instructions || "")
    formData.append("template_data", JSON.stringify(payload.template_data || {}))
    formData.append("tags", JSON.stringify(payload.tags || []))
    if (payload.photo) formData.append("photo", payload.photo)

    const response = await authenticatedFetch("nutrition/community-recipes/", {
      method: "POST",
      body: formData,
      uploadTimeoutMs: 120000,
      networkRetries: 1,
    })
    if (!response.ok) {
      throw new Error(await responseErrorMessage(response))
    }
    return response.json()
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
      throw new Error(await responseErrorMessage(response))
    }
    return response.json()
  },

  async delete(postId: string): Promise<void> {
    const response = await authenticatedFetch(`nutrition/community-recipes/${postId}/`, {
      method: "DELETE",
    })
    if (!response.ok) throw new Error(`Error ${response.status}`)
  },

  async update(postId: string, payload: Partial<Omit<CommunityPostPayload, "photo">>): Promise<CommunityRecipePost> {
    const response = await authenticatedFetch(`nutrition/community-recipes/${postId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      throw new Error(await responseErrorMessage(response))
    }
    return response.json()
  },

  async uploadPhoto(postId: string, photo: File): Promise<CommunityRecipePost> {
    const formData = new FormData()
    formData.append("photo", photo)
    const response = await authenticatedFetch(`nutrition/community-recipes/${postId}/upload-photo/`, {
      method: "POST",
      body: formData,
      uploadTimeoutMs: 120000,
      networkRetries: 1,
    })
    if (!response.ok) {
      throw new Error(await responseErrorMessage(response))
    }
    return response.json()
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
      throw new Error(await responseErrorMessage(response))
    }
  },
}
