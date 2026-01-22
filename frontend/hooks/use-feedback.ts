import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { buildApiUrl, getAuthHeaders } from '@/lib/api'

export interface FeedbackData {
  subject: string
  message: string
  category: 'bug' | 'feature' | 'improvement' | 'complaint' | 'compliment' | 'other'
  priority: 'low' | 'medium' | 'high' | 'urgent'
}

export interface FeedbackResponse {
  message: string
  id: string
}

export function useFeedback() {
  const { isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const submitFeedback = async (feedbackData: FeedbackData): Promise<boolean> => {
    if (!isAuthenticated) {
      setError('Debes estar autenticado para enviar feedback')
      return false
    }

    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      const response = await fetch(buildApiUrl('/feedback/'), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al enviar feedback')
      }

      const data: FeedbackResponse = await response.json()
      setSuccess(data.message)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      return false
    } finally {
      setLoading(false)
    }
  }

  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }

  return {
    submitFeedback,
    loading,
    error,
    success,
    clearMessages,
  }
}
