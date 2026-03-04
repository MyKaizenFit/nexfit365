"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Download, Upload, Loader2 } from "lucide-react"

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

export function RecipeManagement() {
  const { getAuthHeaders } = useAuth()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)

  const fetchRecipes = async () => {
    setLoading(true)
    try {
      const headers = await getAuthHeaders()
      // Agregar timestamp para evitar cache del navegador
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
      } else {
        toast({ title: "Error", description: `Error ${response.status}: No se pudieron cargar las recetas`, variant: "destructive" })
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
      const response = await fetch(url, { 
        method: 'GET',
        headers: headers,
      })
      if (!response.ok) throw new Error(`Error ${response.status}: No se pudo exportar`)
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
    if (!importFile) {
      toast({ title: 'Error', description: 'Por favor selecciona un archivo', variant: 'destructive' })
      return
    }
    setImporting(true)
    try {
      const authHeaders = await getAuthHeaders()
      const formData = new FormData()
      formData.append('file', importFile)
      const fileType = importFile.name.endsWith('.xlsx') || importFile.name.endsWith('.xls') ? 'excel' : 'csv'
      const url = `${getApiUrl()}/api/admin/nutrition/recipes/import-${fileType}/`
      
      // Solo enviar Authorization header - FormData establece Content-Type automáticamente
      const token = (authHeaders as Record<string, string>)['Authorization']
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': token,
        },
        body: formData,
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `Error ${response.status}: No se pudo importar`)
      }
      const data = await response.json()
      toast({
        title: '✅ Importación',
        description: data?.message || 'Recetas importadas y actualizadas correctamente.'
      })
      setImportDialogOpen(false)
      setImportFile(null)
      fetchRecipes()
    } catch (error) {
      toast({ title: '❌ Error', description: error instanceof Error ? error.message : 'No se pudo importar', variant: 'destructive' })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 mb-4 flex-wrap">
        <Button variant="outline" onClick={() => handleExport('csv')}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
        <Button variant="outline" onClick={() => handleExport('excel')}>
          <Download className="mr-2 h-4 w-4" />
          Exportar Excel
        </Button>
        <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Importar CSV/Excel
        </Button>
      </div>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importar Recetas (CSV/Excel)</DialogTitle>
            <DialogDescription>
              Selecciona un archivo CSV o Excel para importar recetas. Las existentes se actualizarán si el nombre coincide.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-input" className="text-base">Seleccionar archivo</Label>
              <Input
                id="file-input"
                type="file"
                accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={e => setImportFile(e.target.files?.[0] || null)}
                disabled={importing}
                className="mt-2"
              />
            </div>
            {importFile && (
              <div className="text-sm text-muted-foreground">Archivo seleccionado: <strong>{importFile.name}</strong></div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)} disabled={importing}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={!importFile || importing} className="bg-blue-600 hover:bg-blue-700">
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : recipes.length === 0 ? (
          <div className="col-span-full flex items-center justify-center min-h-[200px] text-muted-foreground">
            <p>No hay recetas disponibles</p>
          </div>
        ) : (
          recipes.map(recipe => (
            <Card key={recipe.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="line-clamp-2">{recipe.name}</CardTitle>
                <CardDescription>{recipe.category || 'Sin categoría'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><strong>Calorías:</strong> {recipe.calories || 0}</div>
                    <div><strong>Proteína:</strong> {recipe.protein || 0}g</div>
                    <div><strong>Carbos:</strong> {recipe.carbs || 0}g</div>
                    <div><strong>Grasa:</strong> {recipe.fat || 0}g</div>
                  </div>
                  <div><strong>Dificultad:</strong> {recipe.difficulty || 'N/A'}</div>
                  {recipe.description && <div className="text-xs text-muted-foreground line-clamp-2">{recipe.description}</div>}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
