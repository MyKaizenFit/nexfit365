"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Download, Upload, Loader2, Plus, Edit2, Trash2, Eye } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"

const getApiUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL
  if (envUrl) {
    return envUrl.replace(/\/api\/?$/, '').replace(/\/?$/, '')
  }
  if (process.env.NODE_ENV === 'production') {
    return 'https://api.nexfit365.dpdns.org'
  }
  return 'http://localhost:8001'
}

interface Recipe {
  id: string
  name: string
  description?: string
  category?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  difficulty?: string
  image_url?: string
  ingredients?: string
  instructions?: string
}

interface FormData {
  name: string
  description: string
  category: string
  calories: number | string
  protein: number | string
  carbs: number | string
  fat: number | string
  difficulty: string
  instructions: string
  ingredients: string
}

export function RecipeManagement() {
  const { getAuthHeaders } = useAuth()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  
  // Dialogs
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  
  // Files and forms
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Editing/Creating
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: '', description: '', category: '', calories: '', protein: '',
    carbs: '', fat: '', difficulty: '', instructions: '', ingredients: ''
  })

  const fetchRecipes = async () => {
    setLoading(true)
    try {
      const headers = await getAuthHeaders()
      const timestamp = new Date().getTime()
      const response = await fetch(`${getApiUrl()}/api/admin/nutrition/recipes/?cache=${timestamp}`, {
        method: 'GET',
        headers: headers,
      })
      if (response.ok) {
        const data = await response.json()
        const recipeList = Array.isArray(data) ? data : (data.results || [])
        setRecipes(recipeList)
      } else if (response.status === 401) {
        toast({ title: "Error", description: "No autorizado. Por favor, inicia sesión nuevamente.", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "No se pudieron cargar las recetas", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecipes()
  }, [])

  const handleExport = async (type: 'csv' | 'excel') => {
    try {
      const headers = await getAuthHeaders()
      const url = `${getApiUrl()}/api/admin/nutrition/recipes/export-${type}/`
      const response = await fetch(url, { method: 'GET', headers: headers })
      if (!response.ok) throw new Error(`Error ${response.status}`)
      const blob = await response.blob()
      const link = document.createElement('a')
      link.href = window.URL.createObjectURL(blob)
      link.download = type === 'csv' ? 'recipes_export.csv' : 'recipes_export.xlsx'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(link.href)
      toast({ title: `✅ Exportación ${type.toUpperCase()}`, description: 'Archivo descargado correctamente.' })
    } catch (error) {
      toast({ title: '❌ Error', description: error instanceof Error ? error.message : 'No se pudo exportar', variant: 'destructive' })
    }
  }

  const handleImport = async () => {
    if (!importFile) return
    setImporting(true)
    try {
      const headers = await getAuthHeaders()
      const formDataObj = new FormData()
      formDataObj.append('file', importFile)
      const fileType = importFile.name.endsWith('.xlsx') || importFile.name.endsWith('.xls') ? 'excel' : 'csv'
      const url = `${getApiUrl()}/api/admin/nutrition/recipes/import-${fileType}/`
      
      const token = (headers as Record<string, string>)['Authorization']
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': token },
        body: formDataObj,
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `Error ${response.status}`)
      }
      const data = await response.json()
      toast({ title: '✅ Importación', description: data?.message || 'Recetas importadas correctamente.' })
      setImportDialogOpen(false)
      setImportFile(null)
      fetchRecipes()
    } catch (error) {
      toast({ title: '❌ Error', description: error instanceof Error ? error.message : 'No se pudo importar', variant: 'destructive' })
    } finally {
      setImporting(false)
    }
  }

  const handleOpenCreate = () => {
    setEditingRecipe(null)
    setFormData({ name: '', description: '', category: '', calories: '', protein: '', carbs: '', fat: '', difficulty: '', instructions: '', ingredients: '' })
    setCreateDialogOpen(true)
  }

  const handleOpenEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe)
    setFormData({
      name: recipe.name || '',
      description: recipe.description || '',
      category: recipe.category || '',
      calories: recipe.calories || '',
      protein: recipe.protein || '',
      carbs: recipe.carbs || '',
      fat: recipe.fat || '',
      difficulty: recipe.difficulty || '',
      instructions: recipe.instructions || '',
      ingredients: recipe.ingredients || ''
    })
    setEditDialogOpen(true)
  }

  const handleOpenView = (recipe: Recipe) => {
    setEditingRecipe(recipe)
    setViewDialogOpen(true)
  }

  const handleSaveRecipe = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'El nombre es requerido', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const headers = await getAuthHeaders()
      const payload = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        calories: parseFloat(String(formData.calories) || '0'),
        protein: parseFloat(String(formData.protein) || '0'),
        carbs: parseFloat(String(formData.carbs) || '0'),
        fat: parseFloat(String(formData.fat) || '0'),
        difficulty: formData.difficulty,
        instructions: formData.instructions,
        ingredients: formData.ingredients,
      }

      const url = editingRecipe
        ? `${getApiUrl()}/api/admin/nutrition/recipes/${editingRecipe.id}/`
        : `${getApiUrl()}/api/admin/nutrition/recipes/`

      const method = editingRecipe ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error(`Error ${response.status}`)

      toast({ 
        title: '✅ Éxito', 
        description: editingRecipe ? 'Receta actualizada correctamente' : 'Receta creada correctamente' 
      })
      setCreateDialogOpen(false)
      setEditDialogOpen(false)
      fetchRecipes()
    } catch (error) {
      toast({ title: '❌ Error', description: error instanceof Error ? error.message : 'No se pudo guardar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRecipe = async (recipe: Recipe) => {
    if (!recipe.id) return
    if (!window.confirm(`¿Estás seguro que deseas eliminar "${recipe.name}"?`)) return

    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${getApiUrl()}/api/admin/nutrition/recipes/${recipe.id}/`, {
        method: 'DELETE',
        headers: headers,
      })
      if (!response.ok) throw new Error(`Error ${response.status}`)
      toast({ title: '✅ Eliminado', description: 'Receta eliminada correctamente' })
      fetchRecipes()
    } catch (error) {
      toast({ title: '❌ Error', description: error instanceof Error ? error.message : 'No se pudo eliminar', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Botones de acción */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('excel')}>
            <Download className="mr-2 h-4 w-4" /> Exportar Excel
          </Button>
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Importar CSV/Excel
          </Button>
        </div>
        <Button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Nueva Receta
        </Button>
      </div>

      {/* Tabla de recetas */}
      <Card>
        <CardHeader>
          <CardTitle>Recetas</CardTitle>
          <CardDescription>Gestiona todas las recetas del sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : recipes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No hay recetas disponibles</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Calorías</TableHead>
                    <TableHead>Dificultad</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipes.map((recipe) => (
                    <TableRow key={recipe.id}>
                      <TableCell className="font-medium">{recipe.name}</TableCell>
                      <TableCell>{recipe.category || '-'}</TableCell>
                      <TableCell>{recipe.calories || '-'}</TableCell>
                      <TableCell>{recipe.difficulty || '-'}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenView(recipe)}>
                              <Eye className="mr-2 h-4 w-4" /> Ver
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenEdit(recipe)}>
                              <Edit2 className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteRecipe(recipe)} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Importar */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importar Recetas</DialogTitle>
            <DialogDescription>Selecciona un archivo CSV o Excel para importar recetas</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="file"
              accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={e => setImportFile(e.target.files?.[0] || null)}
              disabled={importing}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)} disabled={importing}>Cancelar</Button>
            <Button onClick={handleImport} disabled={!importFile || importing} className="bg-blue-600">
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Ver */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecipe?.name}</DialogTitle>
          </DialogHeader>
          {editingRecipe && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><strong>Categoría:</strong> {editingRecipe.category || '-'}</div>
                <div><strong>Dificultad:</strong> {editingRecipe.difficulty || '-'}</div>
                <div><strong>Calorías:</strong> {editingRecipe.calories || '-'}</div>
                <div><strong>Proteína:</strong> {editingRecipe.protein}g</div>
                <div><strong>Carbos:</strong> {editingRecipe.carbs}g</div>
                <div><strong>Grasa:</strong> {editingRecipe.fat}g</div>
              </div>
              {editingRecipe.description && (
                <div>
                  <strong>Descripción:</strong>
                  <p className="mt-2 text-sm text-muted-foreground">{editingRecipe.description}</p>
                </div>
              )}
              {editingRecipe.ingredients && (
                <div>
                  <strong>Ingredientes:</strong>
                  <p className="mt-2 text-sm text-muted-foreground">{editingRecipe.ingredients}</p>
                </div>
              )}
              {editingRecipe.instructions && (
                <div>
                  <strong>Instrucciones:</strong>
                  <p className="mt-2 text-sm text-muted-foreground">{editingRecipe.instructions}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewDialogOpen(false)}>Cerrar</Button>
            {editingRecipe && (
              <Button onClick={() => { setViewDialogOpen(false); handleOpenEdit(editingRecipe); }} className="bg-blue-600">
                <Edit2 className="mr-2 h-4 w-4" /> Editar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Crear/Editar */}
      <Dialog open={createDialogOpen || editDialogOpen} onOpenChange={(open) => {
        if (!open) { setCreateDialogOpen(false); setEditDialogOpen(false); }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecipe ? 'Editar Receta' : 'Nueva Receta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Nombre de la receta"
                />
              </div>
              <div>
                <Label>Categoría</Label>
                <Input
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  placeholder="ej: Desayuno"
                />
              </div>
              <div>
                <Label>Dificultad</Label>
                <Input
                  value={formData.difficulty}
                  onChange={e => setFormData({...formData, difficulty: e.target.value})}
                  placeholder="ej: Fácil, Medio, Difícil"
                />
              </div>
              <div>
                <Label>Calorías</Label>
                <Input
                  type="number"
                  value={formData.calories}
                  onChange={e => setFormData({...formData, calories: e.target.value})}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Proteína (g)</Label>
                <Input
                  type="number"
                  value={formData.protein}
                  onChange={e => setFormData({...formData, protein: e.target.value})}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Carbos (g)</Label>
                <Input
                  type="number"
                  value={formData.carbs}
                  onChange={e => setFormData({...formData, carbs: e.target.value})}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Grasa (g)</Label>
                <Input
                  type="number"
                  value={formData.fat}
                  onChange={e => setFormData({...formData, fat: e.target.value})}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Descripción del plato"
              />
            </div>
            <div>
              <Label>Ingredientes</Label>
              <Textarea
                value={formData.ingredients}
                onChange={e => setFormData({...formData, ingredients: e.target.value})}
                placeholder="Listado de ingredientes"
              />
            </div>
            <div>
              <Label>Instrucciones</Label>
              <Textarea
                value={formData.instructions}
                onChange={e => setFormData({...formData, instructions: e.target.value})}
                placeholder="Pasos para preparar"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateDialogOpen(false); setEditDialogOpen(false); }} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRecipe} disabled={saving} className="bg-blue-600">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingRecipe ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
