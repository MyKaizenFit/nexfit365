import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFeedback } from '@/hooks/use-feedback'
import { FeedbackData } from '@/hooks/use-feedback'
import { MessageSquare, Send } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function FeedbackForm() {
  const { submitFeedback, loading, error, success, clearMessages } = useFeedback()
  const { toast } = useToast()
  const [formData, setFormData] = useState<FeedbackData>({
    subject: '',
    message: '',
    category: 'other',
    priority: 'medium'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.subject.trim() || !formData.message.trim()) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      })
      return
    }

    const success = await submitFeedback(formData)
    
    if (success) {
      toast({
        title: "¡Éxito!",
        description: "Tu feedback ha sido enviado correctamente",
      })
      setFormData({
        subject: '',
        message: '',
        category: 'other',
        priority: 'medium'
      })
      clearMessages()
    } else {
      toast({
        title: "Error",
        description: error || "Error al enviar el feedback",
        variant: "destructive",
      })
    }
  }

  const handleInputChange = (field: keyof FeedbackData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Enviar Feedback
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Asunto</Label>
            <Input
              id="subject"
              placeholder="Describe brevemente tu feedback"
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensaje</Label>
            <Textarea
              id="message"
              placeholder="Describe detalladamente tu feedback, sugerencia o reporte"
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleInputChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">Error/Bug</SelectItem>
                  <SelectItem value="feature">Nueva Funcionalidad</SelectItem>
                  <SelectItem value="improvement">Mejora</SelectItem>
                  <SelectItem value="complaint">Queja</SelectItem>
                  <SelectItem value="compliment">Elogio</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridad</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => handleInputChange('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Enviando...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Enviar Feedback
              </div>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
