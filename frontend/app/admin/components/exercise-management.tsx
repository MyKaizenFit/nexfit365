"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/hooks/use-toast"
import { useAdminExercises, Exercise } from "@/hooks/use-admin-exercises"
import {
  Dumbbell,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label as FormLabel } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fixEncoding, fixEncodingArray } from "@/lib/encoding-fix"

export function ExerciseManagement() {
  const {
    exercises,
    stats,
    loading,
    error,
    createExercise,
    updateExercise,
    deleteExercise,
    bulkDeleteExercises,
    uploadExerciseVideo,
    uploadExerciseThumbnail,
    refetch
  } = useAdminExercises()

  const [selectedExercises, setSelectedExercises] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [muscleGroupFilter, setMuscleGroupFilter] = useState<string>("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Ordenamiento
  const [sortColumn, setSortColumn] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Estado del formulario
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    muscle_groups: '',
    equipment: '',
    difficulty: '',
    instructions: '',
    video_url: '',
    image_url: ''
  })

  // Estado para archivos de video y miniatura
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)

  // Asegurar que exercises sea un array
  const exercisesArray = Array.isArray(exercises) ? exercises : []
  // Obtener categorías únicas para el filtro
  const uniqueCategories = Array.from(new Set(exercisesArray.map(exercise => exercise?.category).filter(Boolean)))
  const uniqueMuscleGroups = Array.from(new Set(
    exercisesArray.flatMap(exercise => fixEncodingArray(exercise?.muscle_groups || []))
  ))

  const filteredExercises = exercisesArray.filter((exercise) => {
    if (!exercise) return false
    const matchesSearch = (exercise.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exercise.instructions || '').toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = categoryFilter === "all" || exercise.category === categoryFilter

    const matchesMuscleGroup = muscleGroupFilter === "all" ||
      (Array.isArray(exercise.muscle_groups) && exercise.muscle_groups.includes(muscleGroupFilter))

    return matchesSearch && matchesCategory && matchesMuscleGroup
  })

  // Ordenamiento
  const sortedExercises = [...filteredExercises].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortColumn) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'category':
        aValue = a.category?.toLowerCase() || ''
        bValue = b.category?.toLowerCase() || ''
        break
      default:
        return 0
    }

    if (typeof aValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    } else {
      return sortDirection === 'asc'
        ? (aValue - bValue)
        : (bValue - aValue)
    }
  })

  // Paginación
  const totalPages = Math.ceil(sortedExercises.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentExercises = sortedExercises.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, categoryFilter, muscleGroupFilter])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedExercises(currentExercises.map(ex => ex.id))
    } else {
      setSelectedExercises([])
    }
  }

  const handleSelectExercise = (exerciseId: number, checked: boolean) => {
    if (checked) {
      setSelectedExercises(prev => [...prev, exerciseId])
    } else {
      setSelectedExercises(prev => prev.filter(id => id !== exerciseId))
    }
  }

  const handleCreate = async () => {
    try {
      setIsLoading(true)
      const muscleGroupsArray = formData.muscle_groups
        .split(',')
        .map(g => g.trim())
        .filter(g => g.length > 0)

      const equipmentArray = formData.equipment
        .split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0)

      await createExercise({
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category,
        muscle_groups: muscleGroupsArray,
        equipment: equipmentArray.length > 0 ? equipmentArray : undefined,
        difficulty: formData.difficulty || undefined,
        instructions: formData.instructions,
        video_url: formData.video_url || undefined,
        image_url: formData.image_url || undefined
      })

      toast({
        title: "✅ Ejercicio creado",
        description: "El ejercicio ha sido creado correctamente",
      })

      setShowCreateDialog(false)
      resetForm()
      refetch()
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al crear ejercicio",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingExercise) return

    try {
      setIsLoading(true)
      const muscleGroupsArray = formData.muscle_groups
        .split(',')
        .map(g => g.trim())
        .filter(g => g.length > 0)

      const equipmentArray = formData.equipment
        .split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0)

      await updateExercise(editingExercise.id, {
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category,
        muscle_groups: muscleGroupsArray,
        equipment: equipmentArray.length > 0 ? equipmentArray : undefined,
        difficulty: formData.difficulty || undefined,
        instructions: formData.instructions,
        video_url: formData.video_url || undefined,
        image_url: formData.image_url || undefined
      })

      toast({
        title: "✅ Ejercicio actualizado",
        description: "El ejercicio ha sido actualizado correctamente",
      })

      setEditingExercise(null)
      resetForm()
      refetch()
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al actualizar ejercicio",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (exerciseId: number) => {
    try {
      setIsLoading(true)
      await deleteExercise(exerciseId)
      toast({
        title: "✅ Ejercicio eliminado",
        description: "El ejercicio ha sido eliminado correctamente",
      })
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al eliminar ejercicio",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedExercises.length === 0) {
      toast({
        title: "❌ Error",
        description: "Selecciona al menos un ejercicio",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      await bulkDeleteExercises(selectedExercises)
      toast({
        title: "✅ Ejercicios eliminados",
        description: `${selectedExercises.length} ejercicios eliminados`,
      })
      setSelectedExercises([])
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al eliminar ejercicios",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      muscle_groups: '',
      equipment: '',
      difficulty: '',
      instructions: '',
      video_url: '',
      image_url: ''
    })
    setVideoFile(null)
    setThumbnailFile(null)
  }

  const openEditDialog = (exercise: Exercise) => {
    setEditingExercise(exercise)
    setFormData({
      name: fixEncoding(exercise.name),
      description: fixEncoding(exercise.description || ''),
      category: exercise.category || '',
      muscle_groups: fixEncodingArray(exercise.muscle_groups || []).join(', '),
      equipment: fixEncodingArray(exercise.equipment || []).join(', '),
      difficulty: exercise.difficulty || '',
      instructions: fixEncoding(exercise.instructions || ''),
      video_url: exercise.video_url || '',
      image_url: exercise.image_url || ''
    })
  }

  const openCreateDialog = () => {
    setEditingExercise(null)
    resetForm()
    setShowCreateDialog(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestión de Ejercicios</h2>
          <p className="text-muted-foreground">
            Administra los ejercicios disponibles en el sistema
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Ejercicio
        </Button>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Ejercicios</CardTitle>
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_exercises}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar ejercicios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {uniqueCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={muscleGroupFilter} onValueChange={setMuscleGroupFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Grupo muscular" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los grupos</SelectItem>
                {uniqueMuscleGroups.map(group => (
                  <SelectItem key={group} value={group}>{group}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Acciones masivas */}
      {selectedExercises.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedExercises.length} ejercicio(s) seleccionado(s)
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar seleccionados
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left w-12">
                    <Checkbox
                      checked={selectedExercises.length > 0 && selectedExercises.length === currentExercises.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="p-3 text-left">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-2 hover:text-foreground"
                    >
                      Nombre
                      {sortColumn === 'name' && (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-3 text-left">
                    <button
                      onClick={() => handleSort('category')}
                      className="flex items-center gap-2 hover:text-foreground"
                    >
                      Categoría
                      {sortColumn === 'category' && (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-3 text-left">Dificultad</th>
                  <th className="p-3 text-left">Músculos</th>
                  <th className="p-3 text-left">Equipamiento</th>
                  <th className="p-3 text-center">Video</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentExercises.map((exercise) => (
                  <tr key={exercise.id} className="border-t hover:bg-muted/50">
                    <td className="p-3">
                      <Checkbox
                        checked={selectedExercises.includes(exercise.id)}
                        onCheckedChange={(checked) => handleSelectExercise(exercise.id, checked as boolean)}
                      />
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{fixEncoding(exercise.name)}</div>
                      {exercise.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={fixEncoding(exercise.description)}>
                          {fixEncoding(exercise.description)}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">{exercise.category || '-'}</Badge>
                    </td>
                    <td className="p-3">
                      {exercise.difficulty ? (
                        <Badge
                          variant="outline"
                          className={
                            exercise.difficulty === 'beginner' ? 'bg-green-100 text-green-800 border-green-200' :
                              exercise.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                exercise.difficulty === 'advanced' ? 'bg-red-100 text-red-800 border-red-200' : ''
                          }
                        >
                          {exercise.difficulty === 'beginner' ? 'Principiante' :
                            exercise.difficulty === 'intermediate' ? 'Intermedio' :
                              exercise.difficulty === 'advanced' ? 'Avanzado' : exercise.difficulty}
                        </Badge>
                      ) : '-'}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {fixEncodingArray(exercise.muscle_groups || []).slice(0, 2).map((group, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {group}
                          </Badge>
                        ))}
                        {(exercise.muscle_groups || []).length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{(exercise.muscle_groups || []).length - 2}
                          </Badge>
                        )}
                        {(exercise.muscle_groups || []).length === 0 && '-'}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {fixEncodingArray(exercise.equipment || []).slice(0, 2).map((item, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {item}
                          </Badge>
                        ))}
                        {(exercise.equipment || []).length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{(exercise.equipment || []).length - 2}
                          </Badge>
                        )}
                        {(exercise.equipment || []).length === 0 && '-'}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {exercise.has_video ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          📹 Sí
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEditDialog(exercise)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(exercise.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 0 && (
            <div className="border-t p-3 md:p-4">
              {/* Mobile View - Compact */}
              <div className="md:hidden space-y-3">
                <div className="text-xs text-center text-muted-foreground">
                  Página {currentPage} de {totalPages} • {sortedExercises.length} ejercicios
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="flex-1 text-xs"
                  >
                    <ArrowLeft className="h-3 w-3 mr-1" />
                    Anterior
                  </Button>
                  <div className="flex items-center gap-1 px-2">
                    {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage === 1) {
                        pageNum = i + 1;
                      } else if (currentPage === totalPages) {
                        pageNum = totalPages - 2 + i;
                      } else {
                        pageNum = currentPage - 1 + i;
                      }
                      
                      if (pageNum < 1 || pageNum > totalPages) return null;
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-8 h-8 p-0 text-xs"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="flex-1 text-xs"
                  >
                    Siguiente
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>

              {/* Desktop View - Full */}
              <div className="hidden md:flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1} - {Math.min(endIndex, sortedExercises.length)} de {sortedExercises.length} ejercicios
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    Primera
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>

                  {/* Números de página */}
                  {totalPages > 0 && (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-10"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    Última
                  </Button>
                </div>
              </div>
            </div>
          )}

          {currentExercises.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No se encontraron ejercicios
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de creación/edición */}
      <Dialog open={showCreateDialog || !!editingExercise} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false)
          setEditingExercise(null)
          resetForm()
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingExercise ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}
            </DialogTitle>
            <DialogDescription>
              {editingExercise ? 'Modifica los datos del ejercicio' : 'Completa los datos para crear un nuevo ejercicio'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <FormLabel>Nombre *</FormLabel>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Press de Banca en Multipower"
              />
            </div>

            <div>
              <FormLabel>Descripción breve</FormLabel>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Breve descripción del ejercicio..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FormLabel>Categoría *</FormLabel>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strength">Fuerza</SelectItem>
                    <SelectItem value="cardio">Cardio</SelectItem>
                    <SelectItem value="flexibility">Flexibilidad</SelectItem>
                    <SelectItem value="balance">Equilibrio</SelectItem>
                    <SelectItem value="plyometrics">Pliometría</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <FormLabel>Dificultad *</FormLabel>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar dificultad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Principiante</SelectItem>
                    <SelectItem value="intermediate">Intermedio</SelectItem>
                    <SelectItem value="advanced">Avanzado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <FormLabel>Grupos Musculares (separados por comas) *</FormLabel>
              <Input
                value={formData.muscle_groups}
                onChange={(e) => setFormData(prev => ({ ...prev, muscle_groups: e.target.value }))}
                placeholder="Ej: pectorales, tríceps, deltoides anterior"
              />
            </div>

            <div>
              <FormLabel>Equipamiento (separado por comas)</FormLabel>
              <Input
                value={formData.equipment}
                onChange={(e) => setFormData(prev => ({ ...prev, equipment: e.target.value }))}
                placeholder="Ej: multipower, banco plano"
              />
            </div>

            <div>
              <FormLabel>Instrucciones detalladas *</FormLabel>
              <Textarea
                value={formData.instructions}
                onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                placeholder="1. Primer paso...&#10;2. Segundo paso...&#10;3. Tercer paso..."
                rows={6}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FormLabel>URL del Video (opcional)</FormLabel>
                <Input
                  value={formData.video_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                  placeholder="https://drive.google.com/file/d/..."
                />
              </div>

              <div>
                <FormLabel>URL de la Imagen (opcional)</FormLabel>
                <Input
                  value={formData.image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Subir archivo de video */}
            {editingExercise && (
              <>
                <div className="border-t pt-4">
                  <FormLabel>Subir Video (MP4, WebM - máx. 50MB)</FormLabel>
                  <Input
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,video/quicktime"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                  {videoFile && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Seleccionado: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                  {editingExercise.has_video && (
                    <p className="text-sm text-blue-600 mt-1">
                      Este ejercicio ya tiene un video. Subir uno nuevo lo reemplazará.
                    </p>
                  )}
                  {videoFile && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          setUploadingVideo(true)
                          await uploadExerciseVideo(editingExercise.id, videoFile)
                          toast({
                            title: "✅ Video subido",
                            description: "El video se ha subido correctamente",
                          })
                          setVideoFile(null)
                          refetch()
                        } catch (error) {
                          toast({
                            title: "❌ Error",
                            description: error instanceof Error ? error.message : "Error al subir video",
                            variant: "destructive",
                          })
                        } finally {
                          setUploadingVideo(false)
                        }
                      }}
                      disabled={uploadingVideo}
                      className="mt-2"
                    >
                      {uploadingVideo && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Subir Video
                    </Button>
                  )}
                </div>

                {/* Subir miniatura */}
                <div>
                  <FormLabel>Subir Miniatura (JPG, PNG, WebP - máx. 5MB)</FormLabel>
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                  {thumbnailFile && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Seleccionado: {thumbnailFile.name} ({(thumbnailFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                  {thumbnailFile && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          setUploadingThumbnail(true)
                          await uploadExerciseThumbnail(editingExercise.id, thumbnailFile)
                          toast({
                            title: "✅ Miniatura subida",
                            description: "La miniatura se ha subido correctamente",
                          })
                          setThumbnailFile(null)
                          refetch()
                        } catch (error) {
                          toast({
                            title: "❌ Error",
                            description: error instanceof Error ? error.message : "Error al subir miniatura",
                            variant: "destructive",
                          })
                        } finally {
                          setUploadingThumbnail(false)
                        }
                      }}
                      disabled={uploadingThumbnail}
                      className="mt-2"
                    >
                      {uploadingThumbnail && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Subir Miniatura
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                setEditingExercise(null)
                resetForm()
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={editingExercise ? handleUpdate : handleCreate}
              disabled={isLoading || !formData.name || !formData.category || !formData.instructions}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingExercise ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

