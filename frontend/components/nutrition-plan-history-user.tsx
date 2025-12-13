'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Clock, User, ArrowRight, AlertCircle } from 'lucide-react'
import { buildApiUrl, getAuthHeaders } from '@/lib/api'
import { NUTRITION_ENDPOINTS } from '@/lib/api'

interface PlanHistoryEntry {
  id: string
  old_plan_name: string
  new_plan_name: string
  changed_by_email?: string
  reason: string
  reason_display: string
  notes: string
  is_admin_change: boolean
  created_at: string
}

export function NutritionPlanHistoryUser() {
  const [history, setHistory] = useState<PlanHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl(NUTRITION_ENDPOINTS.PLAN_HISTORY || 'plan-history/'), {
        headers
      })
      
      if (response.ok) {
        const data = await response.json()
        setHistory(data.history || [])
      } else if (response.status === 404) {
        // Endpoint no existe aún, simplemente no mostrar historial
        setHistory([])
      }
    } catch (error) {
      // Silenciar errores de endpoint no disponible
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getReasonBadgeColor = (reason: string, isAdmin: boolean) => {
    if (isAdmin) return 'destructive'
    const colors: Record<string, string> = {
      'user_request': 'default',
      'auto_assigned': 'secondary',
      'goal_change': 'outline'
    }
    return colors[reason] || 'secondary'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Cambios de Plan</CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">No hay cambios de plan registrados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={getReasonBadgeColor(entry.reason, entry.is_admin_change)}>
                      {entry.reason_display}
                    </Badge>
                    {entry.is_admin_change && (
                      <Badge variant="destructive" className="text-xs">Por administrador</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Clock className="w-3 h-3" />
                    {formatDate(entry.created_at)}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-gray-600">{entry.old_plan_name || 'Sin plan'}</span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <span className="font-semibold text-gray-900">{entry.new_plan_name}</span>
                </div>
                
                {entry.notes && (
                  <div className="text-sm text-gray-600 italic mt-2">
                    "{entry.notes}"
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

