import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMotivationalTip } from '@/hooks/use-motivational-tip'

export function MotivationalTipCard() {
  const { tip, loading, refreshTip } = useMotivationalTip()

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Consejo del Día
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!tip) {
    return null
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'motivation':
        return 'text-blue-600'
      case 'nutrition':
        return 'text-green-600'
      case 'workout':
        return 'text-purple-600'
      case 'mindset':
        return 'text-orange-600'
      case 'recovery':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'motivation':
        return '💪'
      case 'nutrition':
        return '🥗'
      case 'workout':
        return '🏋️'
      case 'mindset':
        return '🧠'
      case 'recovery':
        return '😴'
      default:
        return '💡'
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Consejo del Día
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshTip}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getCategoryIcon(tip.category)}</span>
          <span className={`text-sm font-medium ${getCategoryColor(tip.category)}`}>
            {tip.category.charAt(0).toUpperCase() + tip.category.slice(1)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <h3 className="font-semibold text-base mb-2">{tip.title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{tip.content}</p>
      </CardContent>
    </Card>
  )
}
