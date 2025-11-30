"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  // Extraer color del className si existe
  const extractColorInfo = (className?: string): { bg: string; indicator: string; otherClasses: string } | null => {
    if (!className) return null
    
    // Buscar patrones como bg-blue-100, bg-green-100, etc.
    const colorPatterns = [
      { pattern: /bg-blue-(\d+)/, color: 'blue' },
      { pattern: /bg-green-(\d+)/, color: 'green' },
      { pattern: /bg-yellow-(\d+)/, color: 'yellow' },
      { pattern: /bg-red-(\d+)/, color: 'red' },
      { pattern: /bg-purple-(\d+)/, color: 'purple' },
      { pattern: /bg-pink-(\d+)/, color: 'pink' },
      { pattern: /bg-emerald-(\d+)/, color: 'emerald' },
      { pattern: /bg-teal-(\d+)/, color: 'teal' },
      { pattern: /bg-orange-(\d+)/, color: 'orange' },
      { pattern: /bg-cyan-(\d+)/, color: 'cyan' },
    ]
    
    for (const { pattern, color } of colorPatterns) {
      if (pattern.test(className)) {
          const indicatorMap: Record<string, string> = {
            'blue': 'bg-gradient-to-r from-blue-300 to-blue-500',
            'green': 'bg-gradient-to-r from-green-300 to-green-500',
            'yellow': 'bg-gradient-to-r from-yellow-300 to-orange-400',
            'red': 'bg-gradient-to-r from-red-300 to-red-500',
            'purple': 'bg-gradient-to-r from-purple-300 to-purple-500',
            'pink': 'bg-gradient-to-r from-pink-300 to-pink-500',
            'emerald': 'bg-gradient-to-r from-emerald-300 to-emerald-500',
            'teal': 'bg-gradient-to-r from-teal-300 to-teal-500',
            'orange': 'bg-gradient-to-r from-orange-300 to-orange-500',
            'cyan': 'bg-gradient-to-r from-cyan-300 to-cyan-500',
          }
        
        // Extraer todas las clases excepto el bg-xxx-xxx
        const bgMatch = className.match(pattern)
        const otherClasses = className.replace(pattern, '').trim().split(/\s+/).filter(c => c && !c.includes('bg-')).join(' ')
        
        return {
          bg: bgMatch ? bgMatch[0] : `bg-${color}-100`,
          indicator: indicatorMap[color] || `bg-gradient-to-r from-${color}-500 to-${color}-600`,
          otherClasses
        }
      }
    }
    
    // Si tiene bg-gradient, detectar el color y crear indicador más intenso
    if (className.includes('bg-gradient')) {
      // Buscar el color en el gradiente (from-blue-100, from-green-100, etc.)
      const gradientColorPatterns = [
        { pattern: /from-blue-(\d+)/, color: 'blue' },
        { pattern: /from-green-(\d+)/, color: 'green' },
        { pattern: /from-yellow-(\d+)/, color: 'yellow' },
        { pattern: /from-red-(\d+)/, color: 'red' },
        { pattern: /from-purple-(\d+)/, color: 'purple' },
        { pattern: /from-pink-(\d+)/, color: 'pink' },
        { pattern: /from-emerald-(\d+)/, color: 'emerald' },
        { pattern: /from-teal-(\d+)/, color: 'teal' },
        { pattern: /from-orange-(\d+)/, color: 'orange' },
        { pattern: /from-cyan-(\d+)/, color: 'cyan' },
      ]
      
      for (const { pattern, color } of gradientColorPatterns) {
        if (pattern.test(className)) {
          const indicatorMap: Record<string, string> = {
            'blue': 'bg-gradient-to-r from-blue-300 to-blue-500',
            'green': 'bg-gradient-to-r from-green-300 to-green-500',
            'yellow': 'bg-gradient-to-r from-yellow-300 to-orange-400',
            'red': 'bg-gradient-to-r from-red-300 to-red-500',
            'purple': 'bg-gradient-to-r from-purple-300 to-purple-500',
            'pink': 'bg-gradient-to-r from-pink-300 to-pink-500',
            'emerald': 'bg-gradient-to-r from-emerald-300 to-emerald-500',
            'teal': 'bg-gradient-to-r from-teal-300 to-teal-500',
            'orange': 'bg-gradient-to-r from-orange-300 to-orange-500',
            'cyan': 'bg-gradient-to-r from-cyan-300 to-cyan-500',
          }
          
          const otherClasses = className.replace(/bg-gradient-to-r\s+from-[\w-]+\s+to-[\w-]+/, '').trim().split(/\s+/).filter(c => c && !c.includes('bg-gradient')).join(' ')
          
          return {
            bg: className.match(/bg-gradient-to-r\s+from-[\w-]+\s+to-[\w-]+/)?.[0] || className,
            indicator: indicatorMap[color] || `bg-gradient-to-r from-${color}-500 to-${color}-600`,
            otherClasses
          }
        }
      }
      
      // Si no se detectó color específico, mantener como está
      const otherClasses = className.replace(/bg-gradient-to-r\s+from-[\w-]+\s+to-[\w-]+/, '').trim().split(/\s+/).filter(c => c && !c.includes('bg-gradient')).join(' ')
      return {
        bg: className,
        indicator: className,
        otherClasses
      }
    }
    
    return null
  }
  
  const colorInfo = extractColorInfo(className)
  
  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full",
        colorInfo ? colorInfo.bg : (className?.includes('bg-') ? className : "bg-gradient-to-r from-purple-100 via-pink-100 to-orange-100"),
        colorInfo?.otherClasses,
        !colorInfo && className && !className.includes('bg-')
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 transition-all",
          colorInfo ? colorInfo.indicator : (className?.includes('bg-gradient') ? className : "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500")
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
