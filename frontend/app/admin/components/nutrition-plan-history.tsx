'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Loader2, Search, Filter, Clock, User, ArrowRight, Download } from 'lucide-react'
import { buildApiUrl, getAuthHeaders } from '@/lib/api'

interface PlanHistoryEntry {
  id: string
  user: string
  old_plan_name: string
  new_plan_name: string
  changed_by_email?: string
  reason: string
  reason_display: string
  notes: string
  is_admin_change: boolean
  created_at: string
}

export function NutritionPlanHistory() {
  const [history, setHistory] = useState<PlanHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [userIdFilter, setUserIdFilter] = useState<string>('all')
  const [reasonFilter, setReasonFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [adminFilter, setAdminFilter] = useState<string>('all') // all, admin, user

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async (userId?: string) => {
    setLoading(true)
    try {
      const headers = await getAuthHeaders()
      let url = buildApiUrl('admin/nutrition/user-plans/history/')
      
      if (userId && userId !== 'all') {
        url += `?user_id=${userId}&limit=100`
      } else {
        url += '?limit=100'
      }
      
      const response = await fetch(url, { headers })
      
      if (response.ok) {
        const data = await response.json()
        setHistory(data.history || [])
      }
    } catch (error) {
      console.error('Error cargando historial:', error)
    } finally {
      setLoading(false)
    }
  }

  // Asegurar que history sea un array antes de filtrar
  const historyArray = Array.isArray(history) ? history : []
  const filteredHistory = historyArray.filter(entry => {
    if (!entry) return false
    // Filtro de búsqueda
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      const matchesSearch = (
        (entry.user || '').toLowerCase().includes(search) ||
        (entry.old_plan_name || '').toLowerCase().includes(search) ||
        (entry.new_plan_name || '').toLowerCase().includes(search) ||
        (entry.notes || '').toLowerCase().includes(search) ||
        (entry.changed_by_email || '').toLowerCase().includes(search)
      )
      if (!matchesSearch) return false
    }
    
    // Filtro por razón
    if (reasonFilter !== 'all') {
      if (entry.reason !== reasonFilter) return false
    }
    
    // Filtro por tipo de cambio (admin/user)
    if (adminFilter === 'admin') {
      if (!entry.is_admin_change) return false
    } else if (adminFilter === 'user') {
      if (entry.is_admin_change) return false
    }
    
    // Filtro por fecha
    if (dateFrom || dateTo) {
      const entryDate = new Date(entry.created_at)
      if (dateFrom) {
        const fromDate = new Date(dateFrom)
        if (entryDate < fromDate) return false
      }
      if (dateTo) {
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999) // Incluir todo el día
        if (entryDate > toDate) return false
      }
    }
    
    return true
  })

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

  const getReasonBadgeColor = (reason: string) => {
    const colors: Record<string, string> = {
      'admin_change': 'destructive',
      'user_request': 'default',
      'auto_assigned': 'secondary',
      'goal_change': 'outline'
    }
    return colors[reason] || 'secondary'
  }

  const exportHistoryToCSV = () => {
    if (filteredHistory.length === 0) return
    
    let csv = 'Historial de Cambios de Planes Nutricionales\n\n'
    csv += 'Fecha,Usuario,Plan Anterior,Plan Nuevo,Razón,Cambiado Por,Admin,Notas\n'
    
    filteredHistory.forEach(entry => {
      const date = formatDate(entry.created_at)
      const row = [
        date,
        entry.user,
        entry.old_plan_name || 'N/A',
        entry.new_plan_name,
        entry.reason_display,
        entry.changed_by_email || entry.user,
        entry.is_admin_change ? 'Sí' : 'No',
        entry.notes || ''
      ].map(field => `"${field.replace(/"/g, '""')}"`).join(',')
      csv += row + '\n'
    })
    
    // Crear blob y descargar
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `nutrition-plan-history-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Historial de Cambios de Planes</h2>
          <p className="text-gray-600 mt-1">Registro completo de todos los cambios de planes nutricionales</p>
        </div>
        <Button onClick={exportHistoryToCSV} variant="outline" disabled={filteredHistory.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Filtros Avanzados */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Primera fila */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Buscar</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar en historial..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div>
                <Label>Filtrar por Razón</Label>
                <Select value={reasonFilter} onValueChange={setReasonFilter} className="mt-1">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las razones</SelectItem>
                    <SelectItem value="admin_change">Cambio por administrador</SelectItem>
                    <SelectItem value="user_request">Solicitud del usuario</SelectItem>
                    <SelectItem value="auto_assigned">Asignación automática</SelectItem>
                    <SelectItem value="goal_change">Cambio de objetivo</SelectItem>
                    <SelectItem value="upgrade">Actualización</SelectItem>
                    <SelectItem value="downgrade">Reducción</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de Cambio</Label>
                <Select value={adminFilter} onValueChange={setAdminFilter} className="mt-1">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="admin">Solo cambios por admin</SelectItem>
                    <SelectItem value="user">Solo cambios por usuario</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Segunda fila - Fechas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Desde (Fecha)</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Hasta (Fecha)</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button 
                  onClick={() => {
                    setSearchTerm('')
                    setReasonFilter('all')
                    setAdminFilter('all')
                    setDateFrom('')
                    setDateTo('')
                  }} 
                  variant="outline"
                  className="flex-1"
                >
                  Limpiar Filtros
                </Button>
                <Button onClick={() => loadHistory()} variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Refrescar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de historial */}
      <Card>
        <CardHeader>
          <CardTitle>Cambios ({filteredHistory.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <p className="text-center text-gray-500 py-12">No hay cambios registrados</p>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={getReasonBadgeColor(entry.reason)}>
                          {entry.reason_display}
                        </Badge>
                        {entry.is_admin_change && (
                          <Badge variant="destructive">Admin</Badge>
                        )}
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
                      
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <User className="w-3 h-3" />
                        <span>Usuario: {entry.user}</span>
                        {entry.changed_by_email && (
                          <>
                            <span>•</span>
                            <span>Cambiado por: {entry.changed_by_email}</span>
                          </>
                        )}
                      </div>
                      
                      {entry.notes && (
                        <div className="mt-2 text-sm text-gray-600 italic">
                          "{entry.notes}"
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

