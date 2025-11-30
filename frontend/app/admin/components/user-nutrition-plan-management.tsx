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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Planes de Usuarios</h2>
          <p className="text-gray-600 mt-1">Asigna planes nutricionales a usuarios individuales o masivamente</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="management">Gestión</TabsTrigger>
          <TabsTrigger value="stats">Estadísticas</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="management" className="space-y-6">
          <div className="flex gap-2 justify-end">
            <Button 
              onClick={() => setShowIndividualDialog(true)}
              variant="outline"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Cambiar Plan Individual
            </Button>
            <Button 
              onClick={() => setShowBulkDialog(true)}
            >
              <Users className="w-4 h-4 mr-2" />
              Cambio Masivo
            </Button>
          </div>

          {/* Lista de usuarios */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Usuarios ({filteredUsers.length})</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar usuarios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
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
            <p className="text-center text-gray-500 py-8">No hay usuarios</p>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">{user.email}</div>
                      <div className="text-sm text-gray-500">
                        {user.first_name} {user.last_name} • {user.role}
                        {user.main_goal && ` • ${user.main_goal}`}
                      </div>
                    </div>
                  </div>
                  <Badge variant={user.is_active ? 'default' : 'secondary'}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Plan de Usuario</DialogTitle>
            <DialogDescription>
              Selecciona un usuario y el plan que deseas asignarle
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Usuario</Label>
              <Select onValueChange={(value) => {
                const user = users.find(u => u.id === value)
                setCurrentUser(user || null)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un usuario" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email} ({user.first_name} {user.last_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Plan Nutricional</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un plan" />
                </SelectTrigger>
                <SelectContent>
                  {defaultPlans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} ({plan.daily_calories} kcal)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIndividualDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (currentUser && selectedPlan) {
                  handleChangeIndividualPlan(currentUser.id, selectedPlan)
                }
              }}
              disabled={!currentUser || !selectedPlan || processing}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Cambiar Plan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para cambio masivo */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cambio Masivo de Planes</DialogTitle>
            <DialogDescription>
              Asigna un plan nutricional a múltiples usuarios o a todos según filtros
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Plan Nutricional</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un plan" />
                </SelectTrigger>
                <SelectContent>
                  {defaultPlans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} ({plan.daily_calories} kcal)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="change-all" 
                checked={changeAll}
                onCheckedChange={(checked) => setChangeAll(checked === true)}
              />
              <Label htmlFor="change-all" className="cursor-pointer">
                Cambiar a todos los usuarios (con filtros opcionales)
              </Label>
            </div>

            {changeAll && (
              <div className="grid grid-cols-2 gap-4 pl-6 border-l-2 border-blue-200">
                <div>
                  <Label>Filtrar por Rol</Label>
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Filtrar por Objetivo</Label>
                  <Select value={filterGoal} onValueChange={setFilterGoal}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="lose_weight">Pérdida de peso</SelectItem>
                      <SelectItem value="gain_muscle">Ganancia muscular</SelectItem>
                      <SelectItem value="body_recomposition">Recomposición</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {!changeAll && (
              <div>
                <Label>Seleccionar Usuarios Específicos</Label>
                <div className="max-h-60 overflow-y-auto border rounded-lg p-2 space-y-2 mt-2">
                  {users.map(user => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedUserIds.includes(user.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedUserIds([...selectedUserIds, user.id])
                          } else {
                            setSelectedUserIds(selectedUserIds.filter(id => id !== user.id))
                          }
                        }}
                      />
                      <Label className="cursor-pointer flex-1">
                        {user.email} ({user.first_name} {user.last_name})
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleBulkChangePlans}
              disabled={!selectedPlan || processing || (!changeAll && selectedUserIds.length === 0)}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
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

