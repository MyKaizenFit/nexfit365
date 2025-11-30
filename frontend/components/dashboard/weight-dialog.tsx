"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Weight, Calendar, FileText } from "lucide-react"
import { WeightEntry } from "@/lib/progress-service"

interface WeightDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (weight: number, date: string, notes: string) => Promise<void>
  entry?: WeightEntry | null
  onUpdate?: (id: string, weight: number, date: string, notes: string) => Promise<void>
}

export function WeightDialog({ 
  open, 
  onOpenChange, 
  onSave, 
  entry, 
  onUpdate 
}: WeightDialogProps) {
  const [weight, setWeight] = useState("")
  const [date, setDate] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)

  const isEditing = !!entry

  useEffect(() => {
    if (entry) {
      setWeight(entry.weight.toString())
      setDate(entry.date)
      setNotes(entry.notes || "")
    } else {
      setWeight("")
      setDate(new Date().toISOString().split('T')[0])
      setNotes("")
    }
  }, [entry, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!weight || !date) return

    const weightValue = parseFloat(weight)
    if (isNaN(weightValue) || weightValue <= 0) {
      alert("Por favor ingresa un peso válido")
      return
    }

    setLoading(true)
    try {
      if (isEditing && onUpdate && entry) {
        await onUpdate(entry.id, weightValue, date, notes)
      } else {
        await onSave(weightValue, date, notes)
      }
      onOpenChange(false)
    } catch (error) {
      console.error("Error al guardar peso:", error)
      alert("Error al guardar el peso. Inténtalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Weight className="h-5 w-5 text-blue-600" />
            {isEditing ? "Editar Peso" : "Registrar Nuevo Peso"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Actualiza la información de tu registro de peso"
              : "Registra tu peso actual para hacer seguimiento de tu progreso"
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight" className="flex items-center gap-2">
                <Weight className="h-4 w-4" />
                Peso (kg)
              </Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                min="0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="70.5"
                required
                className="text-center text-lg font-semibold"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notas (opcional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Después del entrenamiento, por la mañana, etc."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !weight || !date}>
              {loading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Weight className="h-4 w-4 mr-2" />
                  {isEditing ? "Actualizar" : "Guardar"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}






