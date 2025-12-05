"use client"

import { useState, useMemo } from "react"
import { Plus, RefreshCw, Edit, Trash2, Search, Filter } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { useDefaultPlanConfigurations } from "@/hooks/use-default-plan-configurations"
import { DefaultPlanConfiguration } from "@/types"

export function DefaultPlanConfigurationsImproved() {
  const {
    configurations,
    loading,
    error,
    refetch,
    deleteConfiguration,
  } = useDefaultPlanConfigurations()

  // Filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState("")
  const [filterGoal, setFilterGoal] = useState<string>("all")
  const [filterLocation, setFilterLocation] = useState<string>("all")
  const [filterActivity, setFilterActivity] = useState<string>("all")
  const [filterGender, setFilterGender] = useState<string>("all")
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Filtrar configuraciones
  const filteredConfigurations = useMemo(() => {
    return configurations.filter(config => {
      const matchesSearch = config.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesGoal = filterGoal === "all" || config.main_goal === filterGoal
      const matchesLocation = filterLocation === "all" || config.training_location === filterLocation
      const matchesActivity = filterActivity === "all" || config.activity_level === filterActivity
      const matchesGender = filterGender === "all" || 
        (filterGender === "none" ? !config.gender : config.gender === filterGender)
      
      return matchesSearch && matchesGoal && matchesLocation && matchesActivity && matchesGender
    })
  }, [configurations, searchTerm, filterGoal, filterLocation, filterActivity, filterGender])

  // Paginación
  const totalPages = Math.ceil(filteredConfigurations.length / itemsPerPage)
  const paginatedConfigurations = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredConfigurations.slice(start, start + itemsPerPage)
  }, [filteredConfigurations, currentPage])

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta configuración?")) {
      await deleteConfiguration(id)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Configuraciones por Defecto</h2>
          <p className="text-muted-foreground">
            {configurations.length} configuraciones para asignación automática de planes
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Recargar
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-destructive">❌ {error}</p>
          </CardContent>
        </Card>
      )}

      {/* Filtros y Búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Objetivo</label>
              <Select value={filterGoal} onValueChange={setFilterGoal}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="lose_weight">Pérdida Peso</SelectItem>
                  <SelectItem value="gain_muscle">Ganancia Muscular</SelectItem>
                  <SelectItem value="body_recomposition">Recomposición</SelectItem>
                  <SelectItem value="maintain">Mantenimiento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ubicación</label>
              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="home">Casa</SelectItem>
                  <SelectItem value="gym">Gimnasio</SelectItem>
                  <SelectItem value="outdoor">Aire Libre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Actividad</label>
              <Select value={filterActivity} onValueChange={setFilterActivity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="sedentary">Sedentario</SelectItem>
                  <SelectItem value="light">Ligero</SelectItem>
                  <SelectItem value="moderate">Moderado</SelectItem>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="very_active">Muy Activo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Género</label>
              <Select value={filterGender} onValueChange={setFilterGender}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="none">Sin especificar</SelectItem>
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="female">Femenino</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredConfigurations.length !== configurations.length && (
            <div className="mt-4 flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Mostrando {filteredConfigurations.length} de {configurations.length} configuraciones
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("")
                  setFilterGoal("all")
                  setFilterLocation("all")
                  setFilterActivity("all")
                  setFilterGender("all")
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla de Configuraciones */}
      <Card>
        <CardHeader>
          <CardTitle>Configuraciones ({filteredConfigurations.length})</CardTitle>
          <CardDescription>
            Todas las configuraciones están activas y listas para asignación automática
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Prioridad</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Objetivo</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Actividad</TableHead>
                  <TableHead>Género</TableHead>
                  <TableHead>Edad</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedConfigurations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No se encontraron configuraciones
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedConfigurations.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-mono text-sm">{config.priority}</TableCell>
                      <TableCell className="font-medium">{config.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {config.main_goal === 'lose_weight' ? 'Pérdida' :
                           config.main_goal === 'gain_muscle' ? 'Ganancia' :
                           config.main_goal === 'body_recomposition' ? 'Recomp.' :
                           'Manten.'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {config.training_location === 'home' ? '🏠 Casa' :
                           config.training_location === 'gym' ? '🏋️ Gym' :
                           '🌳 Aire'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge>
                          {config.activity_level === 'sedentary' ? 'Sedent.' :
                           config.activity_level === 'light' ? 'Ligero' :
                           config.activity_level === 'moderate' ? 'Moder.' :
                           config.activity_level === 'active' ? 'Activo' :
                           'Muy Act.'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {config.gender ? (
                          <Badge variant="outline">
                            {config.gender === 'male' ? '👨' : config.gender === 'female' ? '👩' : '👤'}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Todos</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {config.age_min && config.age_max ? `${config.age_min}-${config.age_max}` :
                         config.age_min ? `${config.age_min}+` :
                         config.age_max ? `<${config.age_max}` :
                         <span className="text-muted-foreground">Todas</span>}
                      </TableCell>
                      <TableCell className="text-xs">
                        {config.min_training_days_per_week}-{config.max_training_days_per_week}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Eliminar"
                            onClick={() => handleDelete(config.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages} ({filteredConfigurations.length} configuraciones)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pageNum = currentPage <= 3 ? i + 1 :
                      currentPage >= totalPages - 2 ? totalPages - 4 + i :
                      currentPage - 2 + i
                    
                    if (pageNum < 1 || pageNum > totalPages) return null
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="h-8 w-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Configuraciones</CardDescription>
            <CardTitle className="text-4xl">{configurations.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Activas</CardDescription>
            <CardTitle className="text-4xl text-green-600">
              {configurations.filter(c => c.is_active).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Con Plan Nutricional</CardDescription>
            <CardTitle className="text-4xl text-blue-600">
              {configurations.filter(c => c.default_nutrition_plan).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Con Programa</CardDescription>
            <CardTitle className="text-4xl text-purple-600">
              {configurations.filter(c => c.default_workout_program).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}

