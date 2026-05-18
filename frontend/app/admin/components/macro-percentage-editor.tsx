"use client"

import { useState, useEffect } from "react"
import { Calculator, Percent, Scale, Save, RotateCcw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { getApiBaseUrl } from "@/lib/api"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog"

const getApiUrl = getApiBaseUrl

interface NutritionPlan {
  id: string
  name: string
  daily_calories: number
  protein_grams: number
  carbs_grams: number
  fat_grams: number
  protein_percentage?: number
  carbs_percentage?: number
  fat_percentage?: number
  macro_percentages: {
    protein: number
    carbs: number
    fat: number
  }
}

interface MacroEditorProps {
  plan: NutritionPlan
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export function MacroPercentageEditor({ plan, isOpen, onClose, onUpdate }: MacroEditorProps) {
  const { getAuthHeaders } = useAuth()
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState<'percentage' | 'grams'>('percentage')

  // Estado para porcentajes
  const [proteinPct, setProteinPct] = useState(30)
  const [carbsPct, setCarbsPct] = useState(40)
  const [fatPct, setFatPct] = useState(30)

  // Estado para gramos
  const [proteinGrams, setProteinGrams] = useState(150)
  const [carbsGrams, setCarbsGrams] = useState(200)
  const [fatGrams, setFatGrams] = useState(65)

  // Estado para calorías
  const [calories, setCalories] = useState(2000)

  // Calcular totales
  const totalPct = proteinPct + carbsPct + fatPct
  const caloriesFromGrams = (proteinGrams * 4) + (carbsGrams * 4) + (fatGrams * 9)

  // Calcular gramos desde porcentajes
  const gramsFromPct = {
    protein: Math.round((calories * proteinPct / 100) / 4),
    carbs: Math.round((calories * carbsPct / 100) / 4),
    fat: Math.round((calories * fatPct / 100) / 9),
  }

  // Calcular porcentajes desde gramos
  const pctFromGrams = caloriesFromGrams > 0 ? {
    protein: Math.round((proteinGrams * 4 / caloriesFromGrams) * 100),
    carbs: Math.round((carbsGrams * 4 / caloriesFromGrams) * 100),
    fat: Math.round((fatGrams * 9 / caloriesFromGrams) * 100),
  } : { protein: 0, carbs: 0, fat: 0 }

  // Presets de macros según objetivo
  const presets = [
    { name: 'Pérdida de peso', protein: 35, carbs: 35, fat: 30, icon: '🔥' },
    { name: 'Ganancia muscular', protein: 30, carbs: 45, fat: 25, icon: '💪' },
    { name: 'Mantenimiento', protein: 25, carbs: 45, fat: 30, icon: '⚖️' },
    { name: 'Keto', protein: 25, carbs: 5, fat: 70, icon: '🥑' },
    { name: 'Alto en proteína', protein: 40, carbs: 35, fat: 25, icon: '🥩' },
    { name: 'Equilibrado', protein: 30, carbs: 40, fat: 30, icon: '🍽️' },
  ]

  // Cargar valores del plan
  useEffect(() => {
    if (plan) {
      setCalories(plan.daily_calories)
      setProteinGrams(plan.protein_grams)
      setCarbsGrams(plan.carbs_grams)
      setFatGrams(plan.fat_grams)

      if (plan.macro_percentages) {
        setProteinPct(Math.round(plan.macro_percentages.protein))
        setCarbsPct(Math.round(plan.macro_percentages.carbs))
        setFatPct(Math.round(plan.macro_percentages.fat))
      }
    }
  }, [plan])

  // Aplicar preset
  const applyPreset = (preset: typeof presets[0]) => {
    setProteinPct(preset.protein)
    setCarbsPct(preset.carbs)
    setFatPct(preset.fat)
  }

  // Ajustar slider (mantener suma = 100)
  const adjustSlider = (macro: 'protein' | 'carbs' | 'fat', value: number) => {
    const current = { protein: proteinPct, carbs: carbsPct, fat: fatPct }
    const diff = value - current[macro]

    // Distribuir la diferencia entre los otros dos
    const others = (['protein', 'carbs', 'fat'] as const).filter(m => m !== macro)
    const otherSum = others.reduce((sum, m) => sum + current[m], 0)

    if (otherSum > 0) {
      others.forEach(m => {
        const proportion = current[m] / otherSum
        const newVal = Math.max(0, Math.min(100, current[m] - Math.round(diff * proportion)))
        if (m === 'protein') setProteinPct(newVal)
        if (m === 'carbs') setCarbsPct(newVal)
        if (m === 'fat') setFatPct(newVal)
      })
    }

    if (macro === 'protein') setProteinPct(value)
    if (macro === 'carbs') setCarbsPct(value)
    if (macro === 'fat') setFatPct(value)
  }

  // Guardar cambios
  const handleSave = async () => {
    setSaving(true)
    try {
      const headers = await getAuthHeaders()

      const body = mode === 'percentage'
        ? {
          mode: 'percentage',
          protein: proteinPct,
          carbs: carbsPct,
          fat: fatPct,
          calories: calories,
        }
        : {
          mode: 'grams',
          protein: proteinGrams,
          carbs: carbsGrams,
          fat: fatGrams,
          calories: caloriesFromGrams,
        }

      const response = await fetch(
        `${getApiUrl()}/api/nutrition/plans/${plan.id}/update_macros/`,
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        }
      )

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "✅ Macros actualizados",
          description: `P: ${data.protein_percentage}% | C: ${data.carbs_percentage}% | G: ${data.fat_percentage}%`
        })
        onUpdate()
        onClose()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "No se pudo actualizar los macros",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  // Reset a valores originales
  const handleReset = () => {
    if (plan) {
      setCalories(plan.daily_calories)
      setProteinGrams(plan.protein_grams)
      setCarbsGrams(plan.carbs_grams)
      setFatGrams(plan.fat_grams)
      if (plan.macro_percentages) {
        setProteinPct(Math.round(plan.macro_percentages.protein))
        setCarbsPct(Math.round(plan.macro_percentages.carbs))
        setFatPct(Math.round(plan.macro_percentages.fat))
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-orange-600" />
            Configurar Macros - {plan?.name}
          </DialogTitle>
          <DialogDescription>
            Ajusta la distribución de macronutrientes del plan
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'percentage' | 'grams')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="percentage" className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Por Porcentaje
            </TabsTrigger>
            <TabsTrigger value="grams" className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Por Gramos
            </TabsTrigger>
          </TabsList>

          {/* Modo Porcentaje */}
          <TabsContent value="percentage" className="space-y-4 mt-4">
            {/* Calorías */}
            <div className="space-y-2">
              <Label>Calorías diarias</Label>
              <Input
                type="number"
                value={calories}
                onChange={(e) => setCalories(parseInt(e.target.value) || 0)}
                className="text-center text-lg font-bold"
              />
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <Label>Presets rápidos</Label>
              <div className="grid grid-cols-3 gap-2">
                {presets.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(preset)}
                    className="text-xs"
                  >
                    {preset.icon} {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-4">
              {/* Proteína */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="flex items-center gap-2">
                    🥩 Proteína
                  </Label>
                  <span className="font-bold text-red-600">{proteinPct}%</span>
                </div>
                <Slider
                  value={[proteinPct]}
                  onValueChange={([v]) => adjustSlider('protein', v)}
                  max={70}
                  step={5}
                  className="[&_[role=slider]]:bg-red-500"
                />
                <p className="text-xs text-muted-foreground text-right">
                  ≈ {gramsFromPct.protein}g ({gramsFromPct.protein * 4} kcal)
                </p>
              </div>

              {/* Carbohidratos */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="flex items-center gap-2">
                    🍚 Carbohidratos
                  </Label>
                  <span className="font-bold text-amber-600">{carbsPct}%</span>
                </div>
                <Slider
                  value={[carbsPct]}
                  onValueChange={([v]) => adjustSlider('carbs', v)}
                  max={70}
                  step={5}
                  className="[&_[role=slider]]:bg-amber-500"
                />
                <p className="text-xs text-muted-foreground text-right">
                  ≈ {gramsFromPct.carbs}g ({gramsFromPct.carbs * 4} kcal)
                </p>
              </div>

              {/* Grasa */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="flex items-center gap-2">
                    🧈 Grasa
                  </Label>
                  <span className="font-bold text-blue-600">{fatPct}%</span>
                </div>
                <Slider
                  value={[fatPct]}
                  onValueChange={([v]) => adjustSlider('fat', v)}
                  max={70}
                  step={5}
                  className="[&_[role=slider]]:bg-blue-500"
                />
                <p className="text-xs text-muted-foreground text-right">
                  ≈ {gramsFromPct.fat}g ({gramsFromPct.fat * 9} kcal)
                </p>
              </div>
            </div>

            {/* Total */}
            <Card className={totalPct === 100 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
              <CardContent className="py-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total</span>
                  <span className={`font-bold ${totalPct === 100 ? 'text-green-600' : 'text-red-600'}`}>
                    {totalPct}%
                    {totalPct !== 100 && ` (${totalPct > 100 ? '+' : ''}${totalPct - 100}%)`}
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Modo Gramos */}
          <TabsContent value="grams" className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-center block">🥩 Proteína (g)</Label>
                <Input
                  type="number"
                  value={proteinGrams}
                  onChange={(e) => setProteinGrams(parseInt(e.target.value) || 0)}
                  className="text-center"
                />
                <p className="text-xs text-center text-muted-foreground">
                  {proteinGrams * 4} kcal ({pctFromGrams.protein}%)
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-center block">🍚 Carbos (g)</Label>
                <Input
                  type="number"
                  value={carbsGrams}
                  onChange={(e) => setCarbsGrams(parseInt(e.target.value) || 0)}
                  className="text-center"
                />
                <p className="text-xs text-center text-muted-foreground">
                  {carbsGrams * 4} kcal ({pctFromGrams.carbs}%)
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-center block">🧈 Grasa (g)</Label>
                <Input
                  type="number"
                  value={fatGrams}
                  onChange={(e) => setFatGrams(parseInt(e.target.value) || 0)}
                  className="text-center"
                />
                <p className="text-xs text-center text-muted-foreground">
                  {fatGrams * 9} kcal ({pctFromGrams.fat}%)
                </p>
              </div>
            </div>

            {/* Resumen de calorías */}
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="py-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Calorías totales</span>
                  <span className="font-bold text-orange-600">
                    {caloriesFromGrams} kcal
                  </span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground mt-1">
                  <span>Distribución:</span>
                  <span>P: {pctFromGrams.protein}% | C: {pctFromGrams.carbs}% | G: {pctFromGrams.fat}%</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Barra visual de distribución */}
        <div className="space-y-2">
          <Label>Distribución visual</Label>
          <div className="flex h-8 rounded-lg overflow-hidden">
            <div
              className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${mode === 'percentage' ? proteinPct : pctFromGrams.protein}%` }}
            >
              {mode === 'percentage' ? proteinPct : pctFromGrams.protein}%
            </div>
            <div
              className="bg-amber-500 flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${mode === 'percentage' ? carbsPct : pctFromGrams.carbs}%` }}
            >
              {mode === 'percentage' ? carbsPct : pctFromGrams.carbs}%
            </div>
            <div
              className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${mode === 'percentage' ? fatPct : pctFromGrams.fat}%` }}
            >
              {mode === 'percentage' ? fatPct : pctFromGrams.fat}%
            </div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>🥩 Proteína</span>
            <span>🍚 Carbos</span>
            <span>🧈 Grasa</span>
          </div>
        </div>

        <DialogFooter className="flex gap-2 mt-4">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Resetear
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || (mode === 'percentage' && totalPct !== 100)}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar Macros
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
