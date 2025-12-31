'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/hooks/use-toast'
import { 
  Users, 
  UserCheck, 
  ArrowRight, 
  Loader2, 
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { buildApiUrl, getAuthHeaders } from '@/lib/api'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
  main_goal?: string
  is_active: boolean
}

interface DefaultPlan {
  id: string
  name: string
  description: string
  daily_calories: number
  target_audience?: string
  is_active: boolean
}

import { NutritionPlanStats } from './nutrition-plan-stats'
import { NutritionPlanHistory as NutritionPlanHistoryComponent } from './nutrition-plan-history'

export function UserNutritionPlanManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [defaultPlans, setDefaultPlans] = useState<DefaultPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  
  // Diálogos
  const [showIndividualDialog, setShowIndividualDialog] = useState(false)
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  
  // Filtros para cambio masivo
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterGoal, setFilterGoal] = useState<string>('all')
  const [changeAll, setChangeAll] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  
  const [processing, setProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState<'management' | 'stats' | 'history'>('management')

  useEffect(() => {
    loadUsers()
    loadDefaultPlans()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl('admin/users/'), {
        headers
      })
      
      if (!response.ok) throw new Error('Error cargando usuarios')
      
      const data = await response.json()
      setUsers(Array.isArray(data.results) ? data.results : [])
    } catch (error) {
      console.error('Error cargando usuarios:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadDefaultPlans = async () => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl('admin/nutrition/default-plans/'), {
        headers
      })
      
      if (!response.ok) throw new Error('Error cargando planes')
      
      const data = await response.json()
      const plans = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : [])
      setDefaultPlans(plans.filter((p: DefaultPlan) => p.is_active))
    } catch (error) {
      console.error('Error cargando planes:', error)
    }
  }

  const handleChangeIndividualPlan = async (userId: string, planId: string) => {
    setProcessing(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(buildApiUrl('admin/nutrition/change-user-plan/'), {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          default_plan_id: planId
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al cambiar plan')
      }

      const data = await response.json()
      toast({
        title: '✅ Plan actualizado',
        description: data.message || 'Plan cambiado exitosamente'
      })
      
      setShowIndividualDialog(false)
      setCurrentUser(null)
      setSelectedPlan('')
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al cambiar plan',
        variant: 'destructive'
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleBulkChangePlans = async () => {
    if (!selectedPlan) {
      toast({
        title: 'Error',
        description: 'Selecciona un plan',
        variant: 'destructive'
      })
      return
    }

    setProcessing(true)
    try {
      const headers = await getAuthHeaders()
      const requestBody: any = {
        default_plan_id: selectedPlan
      }

      if (changeAll) {
        requestBody.change_all = true
        if (filterRole !== 'all' || filterGoal !== 'all') {
          requestBody.filter = {}
          if (filterRole !== 'all') requestBody.filter.role = filterRole
          if (filterGoal !== 'all') requestBody.filter.main_goal = filterGoal
        }
      } else if (selectedUserIds.length > 0) {
        requestBody.user_ids = selectedUserIds
      } else {
        throw new Error('Selecciona usuarios o activa "Cambiar a todos"')
      }

      const response = await fetch(buildApiUrl('admin/nutrition/bulk-change-plans/'), {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error en cambio masivo')
      }

      const data = await response.json()
      toast({
        title: '✅ Proceso completado',
        description: data.message || `Plan cambiado para ${data.success_count} usuarios`
      })
      
      setShowBulkDialog(false)
      setSelectedUserIds([])
      setSelectedPlan('')
      setChangeAll(false)
      setFilterRole('all')
      setFilterGoal('all')
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error en cambio masivo',
        variant: 'destructive'
      })
    } finally {
      setProcessing(false)
    }
  }

  const filteredUsers = users.filter(user => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        user.email.toLowerCase().includes(search) ||
        user.first_name?.toLowerCase().includes(search) ||
        user.last_name?.toLowerCase().includes(search)
      )
    }
    return true
  })

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Gestión de Planes de Usuarios</h2>
          <p className="text-sm md:text-base text-gray-600 mt-1">Asigna planes nutricionales a usuarios individuales o masivamente</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3 text-xs md:text-sm">
          <TabsTrigger value="management" className="text-[10px] md:text-sm px-2 md:px-4">Gestión</TabsTrigger>
          <TabsTrigger value="stats" className="text-[10px] md:text-sm px-2 md:px-4">Estadísticas</TabsTrigger>
          <TabsTrigger value="history" className="text-[10px] md:text-sm px-2 md:px-4">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="management" className="space-y-4 md:space-y-6">
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button 
              onClick={() => setShowIndividualDialog(true)}
              variant="outline"
              className="w-full sm:w-auto text-xs md:text-sm"
            >
              <UserCheck className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Cambiar Plan Individual</span>
              <span className="sm:hidden">Plan Individual</span>
            </Button>
            <Button 
              onClick={() => setShowBulkDialog(true)}
              className="w-full sm:w-auto text-xs md:text-sm"
            >
              <Users className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              Cambio Masivo
            </Button>
          </div>

          {/* Lista de usuarios */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base md:text-lg">Usuarios ({filteredUsers.length})</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 text-gray-400" />
                <Input
                  placeholder="Buscar usuarios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 md:pl-8 w-full sm:w-48 md:w-64 text-xs md:text-sm"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">No hay usuarios</p>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm md:text-base truncate">{user.email}</div>
                      <div className="text-xs md:text-sm text-gray-500 break-words">
                        {user.first_name} {user.last_name} • {user.role}
                        {user.main_goal && ` • ${user.main_goal}`}
                      </div>
                    </div>
                  </div>
                  <Badge variant={user.is_active ? 'default' : 'secondary'} className="w-fit text-xs">
                    {user.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo para cambio individual */}
      <Dialog open={showIndividualDialog} onOpenChange={setShowIndividualDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">Cambiar Plan de Usuario</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Selecciona un usuario y el plan que deseas asignarle
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs md:text-sm">Usuario</Label>
              <Select onValueChange={(value) => {
                const user = users.find(u => u.id === value)
                setCurrentUser(user || null)
              }}>
                <SelectTrigger className="text-xs md:text-sm">
                  <SelectValue placeholder="Selecciona un usuario" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id} className="text-xs md:text-sm">
                      <span className="truncate block">{user.email} ({user.first_name} {user.last_name})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs md:text-sm">Plan Nutricional</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger className="text-xs md:text-sm">
                  <SelectValue placeholder="Selecciona un plan" />
                </SelectTrigger>
                <SelectContent>
                  {defaultPlans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id} className="text-xs md:text-sm">
                      <span className="truncate block">{plan.name} ({plan.daily_calories} kcal)</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowIndividualDialog(false)}
              className="w-full sm:w-auto text-xs md:text-sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (currentUser && selectedPlan) {
                  handleChangeIndividualPlan(currentUser.id, selectedPlan)
                }
              }}
              disabled={!currentUser || !selectedPlan || processing}
              className="w-full sm:w-auto text-xs md:text-sm"
            >
              {processing ? (
                <>
                  <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <ArrowRight className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  Cambiar Plan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para cambio masivo */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">Cambio Masivo de Planes</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Asigna un plan nutricional a múltiples usuarios o a todos según filtros
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs md:text-sm">Plan Nutricional</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger className="text-xs md:text-sm">
                  <SelectValue placeholder="Selecciona un plan" />
                </SelectTrigger>
                <SelectContent>
                  {defaultPlans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id} className="text-xs md:text-sm">
                      <span className="truncate block">{plan.name} ({plan.daily_calories} kcal)</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-start space-x-2">
              <Checkbox 
                id="change-all" 
                checked={changeAll}
                onCheckedChange={(checked) => setChangeAll(checked === true)}
                className="mt-1"
              />
              <Label htmlFor="change-all" className="cursor-pointer text-xs md:text-sm leading-relaxed">
                Cambiar a todos los usuarios (con filtros opcionales)
              </Label>
            </div>

            {changeAll && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6 border-l-2 border-blue-200">
                <div>
                  <Label className="text-xs md:text-sm">Filtrar por Rol</Label>
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger className="text-xs md:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs md:text-sm">Todos</SelectItem>
                      <SelectItem value="basic" className="text-xs md:text-sm">Basic</SelectItem>
                      <SelectItem value="pro" className="text-xs md:text-sm">Pro</SelectItem>
                      <SelectItem value="premium" className="text-xs md:text-sm">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs md:text-sm">Filtrar por Objetivo</Label>
                  <Select value={filterGoal} onValueChange={setFilterGoal}>
                    <SelectTrigger className="text-xs md:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs md:text-sm">Todos</SelectItem>
                      <SelectItem value="lose_weight" className="text-xs md:text-sm">Pérdida de peso</SelectItem>
                      <SelectItem value="gain_muscle" className="text-xs md:text-sm">Ganancia muscular</SelectItem>
                      <SelectItem value="body_recomposition" className="text-xs md:text-sm">Recomposición</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {!changeAll && (
              <div>
                <Label className="text-xs md:text-sm">Seleccionar Usuarios Específicos</Label>
                <div className="max-h-60 overflow-y-auto border rounded-lg p-2 space-y-2 mt-2">
                  {users.map(user => (
                    <div key={user.id} className="flex items-start space-x-2">
                      <Checkbox
                        checked={selectedUserIds.includes(user.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedUserIds([...selectedUserIds, user.id])
                          } else {
                            setSelectedUserIds(selectedUserIds.filter(id => id !== user.id))
                          }
                        }}
                        className="mt-0.5"
                      />
                      <Label className="cursor-pointer flex-1 text-xs md:text-sm break-words leading-relaxed">
                        {user.email} ({user.first_name} {user.last_name})
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowBulkDialog(false)}
              className="w-full sm:w-auto text-xs md:text-sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleBulkChangePlans}
              disabled={!selectedPlan || processing || (!changeAll && selectedUserIds.length === 0)}
              className="w-full sm:w-auto text-xs md:text-sm"
            >
              {processing ? (
                <>
                  <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Users className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  Aplicar Cambio
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </TabsContent>

        <TabsContent value="stats">
          <NutritionPlanStats />
        </TabsContent>

        <TabsContent value="history">
          <NutritionPlanHistoryComponent />
        </TabsContent>
      </Tabs>
    </div>
  )
}

