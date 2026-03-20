"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/hooks/use-toast"
import { useAdminExercises, Exercise } from "@/hooks/use-admin-exercises"
import { getAuthHeaders, buildApiUrl } from "@/lib/api"
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
  ArrowRight,
  Download,
  Upload
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fixEncoding, fixEncodingArray } from "@/lib/encoding-fix"

// Funciones de traducción y capitalización
const translateCategory = (category: string): string => {
  const translations: Record<string, string> = {
    'cardio': 'Cardio',
    'strength': 'Fuerza',
    'flexibility': 'Flexibilidad',
    'bodyweight': 'Peso Corporal',
    'hiit': 'HIIT',
    'yoga': 'Yoga',
    'pilates': 'Pilates',
    'crossfit': 'CrossFit',
    'powerlifting': 'Powerlifting',
    'olympic': 'Olímpico',
    'functional': 'Funcional',
    'mobility': 'Movilidad',
    'core': 'Core',
    'stretching': 'Estiramiento'
  }
  return translations[category?.toLowerCase()] || category?.charAt(0).toUpperCase() + category?.slice(1).toLowerCase() || category
}

const translateMuscleGroup = (muscleGroup: string): string => {
  const translations: Record<string, string> = {
    'chest': 'Pecho',
    'back': 'Espalda',
    'shoulders': 'Hombros',
    'biceps': 'Bíceps',
    'triceps': 'Tríceps',
    'forearms': 'Antebrazos',
    'abs': 'Abdominales',
    'core': 'Core',
    'obliques': 'Oblicuos',
    'quads': 'Cuádriceps',
    'hamstrings': 'Isquiotibiales',
    'glutes': 'Glúteos',
    'calves': 'Gemelos',
    'legs': 'Piernas',
    'upper body': 'Tren Superior',
    'lower body': 'Tren Inferior',
    'full body': 'Cuerpo Completo',
    'lats': 'Dorsales',
    'traps': 'Trapecios',
    'delts': 'Deltoides'
  }
  return translations[muscleGroup?.toLowerCase()] || muscleGroup?.charAt(0).toUpperCase() + muscleGroup?.slice(1).toLowerCase() || muscleGroup
}

const translateEquipment = (equipment: string): string => {
  const translations: Record<string, string> = {
    'barbell': 'Barra',
    'dumbbells': 'Mancuernas',
    'kettlebell': 'Kettlebell',
    'resistance bands': 'Bandas Elásticas',
    'bodyweight': 'Peso Corporal',
    'machine': 'Máquina',
    'cable': 'Polea',
    'bench': 'Banco',
    'pull-up bar': 'Barra de Dominadas',
    'treadmill': 'Cinta de Correr',
    'bike': 'Bicicleta',
    'rower': 'Remo',
    'elliptical': 'Elíptica',
    'trx': 'TRX',
    'foam roller': 'Rodillo de Espuma',
    'yoga mat': 'Esterilla',
    'medicine ball': 'Balón Medicinal',
    'box': 'Cajón',
    'rope': 'Cuerda',
    'sled': 'Trineo',
    'none': 'Ninguno',
    '-': '-'
  }
  return translations[equipment?.toLowerCase()] || equipment?.charAt(0).toUpperCase() + equipment?.slice(1).toLowerCase() || equipment
}

const translateDifficulty = (difficulty: string): string => {
  const translations: Record<string, string> = {
    'beginner': 'Principiante',
    'intermediate': 'Intermedio',
    'advanced': 'Avanzado'
  }
  return translations[difficulty?.toLowerCase()] || difficulty?.charAt(0).toUpperCase() + difficulty?.slice(1).toLowerCase() || difficulty
}

export function ExerciseManagement() {
  // --- Importación CSV/Excel ---
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      let endpoint = 'admin/exercises/import-csv/';
      if (importFile.name.endsWith('.xlsx') || importFile.name.endsWith('.xls')) {
        endpoint = 'admin/exercises/import-excel/';
      }
      const url = buildApiUrl(endpoint);
      const formData = new FormData();
      formData.append('file', importFile);
      const headers = await getAuthHeaders();
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Error al importar');
      }
      let data = null;
      try {
        data = await response.json();
      } catch { }
      toast({
        title: '✅ Importación',
        description: data?.message || 'Ejercicios importados y actualizados correctamente.'
      });
      setShowImportDialog(false);
      setImportFile(null);
      refetch(); // Refresca la lista en tiempo real
    } catch (error) {
      toast({ title: '❌ Error', description: error instanceof Error ? error.message : 'No se pudo importar', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };
  // --- Exportación CSV y Excel ---
  const handleExportCSV = async () => {
    try {
      const url = buildApiUrl('admin/exercises/export-csv/');
      const headers = await getAuthHeaders();
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });
      if (!response.ok) throw new Error('Error al exportar CSV');
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/csv') && !contentType.includes('application/csv')) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(errorBody || 'El servidor no devolvió un CSV válido');
      }
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = 'exercises_export.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: '✅ Exportación CSV', description: 'Archivo descargado correctamente.' });
    } catch (error) {
      toast({ title: '❌ Error', description: 'No se pudo exportar el CSV', variant: 'destructive' });
    }
  };

  const handleExportExcel = async () => {
    try {
      const url = buildApiUrl('admin/exercises/export-excel/');
      const headers = await getAuthHeaders();
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });
      if (!response.ok) throw new Error('Error al exportar Excel');
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(errorBody || 'El servidor no devolvió un archivo Excel válido');
      }
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = 'exercises_export.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: '✅ Exportación Excel', description: 'Archivo descargado correctamente.' });
    } catch (error) {
      toast({ title: '❌ Error', description: 'No se pudo exportar el Excel', variant: 'destructive' });
    }
  };
  const {
    exercises,
    stats,
    categories,
    loading,
    error,
    createExercise,
    updateExercise,
    deleteExercise,
    bulkDeleteExercises,
    uploadExerciseVideo,
    uploadExerciseThumbnail,
    getExerciseSubstitutes,
    addExerciseSubstitute,
    removeExerciseSubstitute,
    refetch
  } = useAdminExercises()

  const [selectedExercises, setSelectedExercises] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [muscleGroupFilter, setMuscleGroupFilter] = useState<string>("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentTab, setCurrentTab] = useState('basicos')

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
    location: 'any',
    instructions: '',
    video_url: ''
  })

  // Estado para archivos de video y miniatura
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)

  // Estado para gestión de sustitutos
  const [showSubstitutesDialog, setShowSubstitutesDialog] = useState(false)
  const [substitutesExercise, setSubstitutesExercise] = useState<Exercise | null>(null)
  const [substitutes, setSubstitutes] = useState<Array<{ id: number, substitute_id: string, substitute_name: string, category?: string, priority: number, notes: string }>>([])
  const [substituteSearch, setSubstituteSearch] = useState("")
  const [loadingSubstitutes, setLoadingSubstitutes] = useState(false)

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

  const normalizeTags = (tags?: string[]) =>
    (tags || [])
      .map(tag => String(tag).toLowerCase().trim())
      .filter(tag => tag.length > 0)

  const getLocationFromTags = (tags?: string[]) => {
    const normalized = new Set(normalizeTags(tags))
    const hasHome = normalized.has('home')
    const hasGym = normalized.has('gym')

    if (hasHome && !hasGym) return 'home'
    if (hasGym && !hasHome) return 'gym'
    return 'any'
  }

  const buildTagsWithLocation = (location: string, existingTags: string[] = []) => {
    const baseTags = normalizeTags(existingTags).filter(tag => tag !== 'home' && tag !== 'gym')

    if (location === 'home') {
      baseTags.push('home')
    } else if (location === 'gym') {
      baseTags.push('gym')
    }

    return Array.from(new Set(baseTags))
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

      const locationTags = buildTagsWithLocation(formData.location)

      await createExercise({
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category,
        muscle_groups: muscleGroupsArray,
        equipment: equipmentArray.length > 0 ? equipmentArray : undefined,
        difficulty: formData.difficulty || undefined,
        instructions: formData.instructions,
        video_url: formData.video_url || undefined,
        tags: locationTags
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

      const locationTags = buildTagsWithLocation(
        formData.location,
        editingExercise.tags || []
      )

      await updateExercise(editingExercise.id, {
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category,
        muscle_groups: muscleGroupsArray,
        equipment: equipmentArray.length > 0 ? equipmentArray : undefined,
        difficulty: formData.difficulty || undefined,
        instructions: formData.instructions,
        video_url: formData.video_url || undefined,
        tags: locationTags
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
      location: 'any',
      instructions: '',
      video_url: ''
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
      location: getLocationFromTags(exercise.tags || []),
      instructions: fixEncoding(exercise.instructions || ''),
      video_url: exercise.video_url || ''
    })
  }

  const openCreateDialog = () => {
    setEditingExercise(null)
    resetForm()
    setCurrentTab('basicos')
    setShowCreateDialog(true)
  }

  // === Gestión de Sustitutos ===
  const openSubstitutesDialog = async (exercise: Exercise) => {
    setSubstitutesExercise(exercise)
    setSubstituteSearch("")
    setShowSubstitutesDialog(true)
    setLoadingSubstitutes(true)
    try {
      const subs = await getExerciseSubstitutes(exercise.id)
      setSubstitutes(subs)
    } catch (err) {
      toast({
        title: "❌ Error",
        description: "No se pudieron cargar los sustitutos",
        variant: "destructive"
      })
    } finally {
      setLoadingSubstitutes(false)
    }
  }

  const handleAddSubstitute = async (substituteId: number | string) => {
    if (!substitutesExercise) return
    try {
      await addExerciseSubstitute(substitutesExercise.id, substituteId)
      const subs = await getExerciseSubstitutes(substitutesExercise.id)
      setSubstitutes(subs)
      toast({ title: "✅ Sustituto añadido" })
    } catch (err: any) {
      toast({
        title: "❌ Error",
        description: err.message || "No se pudo añadir",
        variant: "destructive"
      })
    }
  }

  const handleRemoveSubstitute = async (substituteId: string) => {
    if (!substitutesExercise) return
    try {
      await removeExerciseSubstitute(substitutesExercise.id, substituteId)
      setSubstitutes(prev => prev.filter(s => s.substitute_id !== substituteId))
      toast({ title: "✅ Sustituto eliminado" })
    } catch (err) {
      toast({
        title: "❌ Error",
        description: "No se pudo eliminar",
        variant: "destructive"
      })
    }
  }

  // Ejercicios disponibles para añadir como sustitutos (excluyendo el actual y los ya añadidos)
  const availableForSubstitute = exercisesArray.filter(ex => {
    if (!substitutesExercise) return false
    if (ex.id === substitutesExercise.id) return false
    if (substitutes.some(s => s.substitute_id === String(ex.id))) return false
    const q = substituteSearch.toLowerCase()
    if (q && !fixEncoding(ex.name).toLowerCase().includes(q)) return false
    return true
  })

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
      {/* Card de Exportación/Importación */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>📁 Importar/Exportar Ejercicios</CardTitle>
              <CardDescription>Gestiona tus ejercicios con archivos CSV o Excel</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleExportCSV}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
              <Button
                variant="outline"
                onClick={handleExportExcel}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar Excel
              </Button>
              <Button
                onClick={() => setShowImportDialog(true)}
                className="bg-blue-600 hover:bg-blue-700 gap-2"
              >
                <Upload className="h-4 w-4" />
                Importar CSV/Excel
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Dialog de importación mejorado */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>📥 Importar Ejercicios</DialogTitle>
            <DialogDescription>
              Sube un archivo CSV o Excel para importar o actualizar ejercicios. Los ejercicios existentes se actualizarán si el nombre coincide.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <FormLabel className="font-semibold">Selecciona el archivo</FormLabel>
              <Input
                type="file"
                accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={e => setImportFile(e.target.files?.[0] || null)}
                disabled={importing}
                className="mt-2"
              />
              {importFile && (
                <div className="text-sm text-green-600 mt-2">
                  ✓ Archivo seleccionado: <strong>{importFile.name}</strong> ({(importFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                <strong>💡 Tip:</strong> El formato esperado incluye campos como: nombre, descripción, categoría, grupos musculares, equipamiento, dificultad e instrucciones.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)} disabled={importing}>Cancelar</Button>
            <Button onClick={handleImport} disabled={!importFile || importing} className="bg-blue-600 hover:bg-blue-700">
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {importing ? 'Importando...' : 'Importar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

      {/* Listado de Ejercicios - Mobile Cards / Desktop Table */}
      <Card>
        <CardContent className="p-0">
          {/* Mobile View - Cards */}
          <div className="md:hidden space-y-3 p-3">
            {/* Select All Header */}
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedExercises.length > 0 && selectedExercises.length === currentExercises.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium text-muted-foreground">
                  Seleccionar todos
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {selectedExercises.length} seleccionados
              </span>
            </div>

            {/* Exercise Cards */}
            {currentExercises.map((exercise) => (
              <Card
                key={exercise.id}
                className={`border-2 transition-all ${selectedExercises.includes(exercise.id)
                    ? 'border-purple-500 bg-purple-50/50'
                    : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
                  }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedExercises.includes(exercise.id)}
                      onCheckedChange={(checked) => handleSelectExercise(exercise.id, checked as boolean)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base mb-1">
                            {fixEncoding(exercise.name)}
                          </div>
                          {exercise.description && (
                            <div className="text-xs text-muted-foreground line-clamp-2 mb-2">
                              {fixEncoding(exercise.description)}
                            </div>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEditDialog(exercise)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openSubstitutesDialog(exercise)}>
                              <Dumbbell className="h-4 w-4 mr-2" />
                              Sustitutos
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

                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {exercise.category && (
                          <Badge variant="outline" className="text-xs">
                            {translateCategory(exercise.category)}
                          </Badge>
                        )}
                        {exercise.difficulty && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${exercise.difficulty === 'beginner' ? 'bg-green-100 text-green-800 border-green-200' :
                                exercise.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                  exercise.difficulty === 'advanced' ? 'bg-red-100 text-red-800 border-red-200' : ''
                              }`}
                          >
                            {translateDifficulty(exercise.difficulty)}
                          </Badge>
                        )}
                        {exercise.has_video && (
                          <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                            📹 Video
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2 text-xs pt-2 border-t">
                        {(exercise.muscle_groups || []).length > 0 && (
                          <div>
                            <span className="font-medium text-muted-foreground">Músculos: </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {fixEncodingArray(exercise.muscle_groups || []).map((group, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {translateMuscleGroup(group)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {(exercise.equipment || []).length > 0 && (
                          <div>
                            <span className="font-medium text-muted-foreground">Equipamiento: </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {fixEncodingArray(exercise.equipment || []).map((item, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {translateEquipment(item)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop View - Table */}
          <div className="hidden md:block overflow-x-auto">
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
                      <Badge variant="outline">{translateCategory(exercise.category) || '-'}</Badge>
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
                          {translateDifficulty(exercise.difficulty)}
                        </Badge>
                      ) : '-'}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {fixEncodingArray(exercise.muscle_groups || []).slice(0, 2).map((group, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {translateMuscleGroup(group)}
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
                            {translateEquipment(item)}
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
                            <DropdownMenuItem onClick={() => openSubstitutesDialog(exercise)}>
                              <Dumbbell className="h-4 w-4 mr-2" />
                              Sustitutos
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

      {/* Dialog de creación/edición con pestañas */}
      <Dialog open={showCreateDialog || !!editingExercise} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false)
          setEditingExercise(null)
          resetForm()
          setCurrentTab('basicos')
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingExercise ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}
            </DialogTitle>
            <DialogDescription>
              {editingExercise ? 'Modifica los datos del ejercicio' : 'Completa los datos para crear un nuevo ejercicio'}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basicos">📋 Básicos</TabsTrigger>
              <TabsTrigger value="musculos">💪 Músculos</TabsTrigger>
              <TabsTrigger value="instrucciones">📖 Instrucciones</TabsTrigger>
            </TabsList>

            {/* TAB 1: Básicos */}
            <TabsContent value="basicos" className="space-y-4">
              <div>
                <FormLabel className="font-semibold">Nombre del ejercicio *</FormLabel>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Press de Banca en Multipower"
                  className="mt-2"
                />
              </div>

              <div>
                <FormLabel className="font-semibold">Descripción breve</FormLabel>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Breve descripción del ejercicio..."
                  rows={2}
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FormLabel className="font-semibold">Categoría *</FormLabel>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length > 0 ? (
                        categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="strength">Fuerza</SelectItem>
                          <SelectItem value="cardio">Cardio</SelectItem>
                          <SelectItem value="flexibility">Flexibilidad</SelectItem>
                          <SelectItem value="hiit">HIIT</SelectItem>
                          <SelectItem value="bodyweight">Peso corporal</SelectItem>
                          <SelectItem value="functional">Funcional</SelectItem>
                          <SelectItem value="plyometrics">Pliometría</SelectItem>
                          <SelectItem value="balance">Equilibrio</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <FormLabel className="font-semibold">Dificultad *</FormLabel>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value }))}
                  >
                    <SelectTrigger className="mt-2">
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
                <FormLabel className="font-semibold">Lugar de entrenamiento</FormLabel>
                <Select
                  value={formData.location}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Seleccionar lugar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Ambos (Casa y Gimnasio)</SelectItem>
                    <SelectItem value="home">Casa</SelectItem>
                    <SelectItem value="gym">Gimnasio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* TAB 2: Músculos y Equipamiento */}
            <TabsContent value="musculos" className="space-y-4">
              <div>
                <FormLabel className="font-semibold">Grupos Musculares (separados por coma) *</FormLabel>
                <Input
                  value={formData.muscle_groups}
                  onChange={(e) => setFormData(prev => ({ ...prev, muscle_groups: e.target.value }))}
                  placeholder="Ej: pectorales, tríceps, deltoides anterior"
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-2">💡 Separa cada grupo muscular con una coma</p>
              </div>

              <div>
                <FormLabel className="font-semibold">Equipamiento (opcional)</FormLabel>
                <Input
                  value={formData.equipment}
                  onChange={(e) => setFormData(prev => ({ ...prev, equipment: e.target.value }))}
                  placeholder="Ej: multipower, banco plano, mancernas"
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-2">💡 Separa cada equipo con una coma</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FormLabel className="font-semibold">URL del Video (opcional)</FormLabel>
                  <Input
                    value={formData.video_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                    placeholder="https://drive.google.com/file/d/..."
                    className="mt-2"
                  />
                </div>


              </div>
            </TabsContent>

            {/* TAB 3: Instrucciones */}
            <TabsContent value="instrucciones" className="space-y-4">
              <div>
                <FormLabel className="font-semibold">Instrucciones detalladas *</FormLabel>
                <Textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                  placeholder="1. Posición inicial...&#10;2. Ejecución del movimiento...&#10;3. Punto de máxima contracción...&#10;4. Retorno..."
                  rows={8}
                  className="mt-2 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">💡 Usa números o viñetas para cada paso</p>
              </div>

              {/* Subir archivos - solo si está editando */}
              {editingExercise && (
                <>
                  <div className="border-t pt-4">
                    <FormLabel className="font-semibold">📹 Subir Video (MP4, WebM - máx. 50MB)</FormLabel>
                    <Input
                      type="file"
                      accept="video/mp4,video/webm,video/ogg,video/quicktime"
                      onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                      className="cursor-pointer mt-2"
                    />
                    {videoFile && (
                      <p className="text-sm text-blue-600 mt-2">
                        ✓ Seleccionado: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                    {editingExercise.has_video && !videoFile && (
                      <p className="text-sm text-green-600 mt-2">
                        ✓ Este ejercicio ya tiene un video
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

                  <div>
                    <FormLabel className="font-semibold">🖼️ Subir Miniatura (JPG, PNG, WebP - máx. 5MB)</FormLabel>
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                      className="cursor-pointer mt-2"
                    />
                    {thumbnailFile && (
                      <p className="text-sm text-blue-600 mt-2">
                        ✓ Seleccionado: {thumbnailFile.name} ({(thumbnailFile.size / 1024 / 1024).toFixed(2)} MB)
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
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                setEditingExercise(null)
                resetForm()
                setCurrentTab('basicos')
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={editingExercise ? handleUpdate : handleCreate}
              disabled={isLoading || !formData.name || !formData.category || !formData.instructions}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingExercise ? 'Actualizar Ejercicio' : 'Crear Ejercicio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para gestionar sustitutos */}
      <Dialog open={showSubstitutesDialog} onOpenChange={(open) => {
        if (!open) {
          setShowSubstitutesDialog(false)
          setSubstitutesExercise(null)
          setSubstitutes([])
          setSubstituteSearch("")
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-blue-500" />
              Sustitutos de: {substitutesExercise && fixEncoding(substitutesExercise.name)}
            </DialogTitle>
            <DialogDescription>
              Añade ejercicios alternativos que pueden usarse como sustitutos.
            </DialogDescription>
          </DialogHeader>

          {loadingSubstitutes ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col gap-4">
              {/* Lista de sustitutos actuales */}
              <div>
                <h4 className="font-medium text-sm mb-2">Sustitutos actuales ({substitutes.length})</h4>
                {substitutes.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-4 bg-gray-50 rounded-lg text-center">
                    No hay sustitutos configurados
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {substitutes.map(sub => (
                      <div key={sub.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div>
                          <span className="font-medium">{fixEncoding(sub.substitute_name)}</span>
                          {sub.category && (
                            <Badge variant="outline" className="ml-2 text-xs">{sub.category}</Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSubstitute(sub.substitute_id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Buscar y añadir */}
              <div>
                <h4 className="font-medium text-sm mb-2">Añadir sustituto</h4>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar ejercicios..."
                    value={substituteSearch}
                    onChange={(e) => setSubstituteSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  {availableForSubstitute.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      {substituteSearch ? "No se encontraron ejercicios" : "Escribe para buscar ejercicios"}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {availableForSubstitute.slice(0, 10).map(ex => (
                        <div
                          key={ex.id}
                          className="flex items-center justify-between p-2 hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleAddSubstitute(ex.id)}
                        >
                          <div>
                            <span className="font-medium text-sm">{fixEncoding(ex.name)}</span>
                            {ex.category && (
                              <Badge variant="outline" className="ml-2 text-xs">{ex.category}</Badge>
                            )}
                          </div>
                          <Plus className="h-4 w-4 text-blue-500" />
                        </div>
                      ))}
                      {availableForSubstitute.length > 10 && (
                        <div className="p-2 text-xs text-muted-foreground text-center">
                          +{availableForSubstitute.length - 10} más...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubstitutesDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

