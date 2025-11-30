"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export function MacroChart() {
  const macros = [
    { name: "Proteínas", current: 120, target: 150, color: "bg-blue-500", colorRing: "ring-blue-500", unit: "g" },
    { name: "Carbohidratos", current: 180, target: 220, color: "bg-green-500", colorRing: "ring-green-500", unit: "g" },
    { name: "Grasas", current: 65, target: 80, color: "bg-yellow-500", colorRing: "ring-yellow-500", unit: "g" },
  ]

  const totalCalories = macros.reduce((sum, macro) => {
    const caloriesPerGram = macro.name === "Proteínas" ? 4 : macro.name === "Carbohidratos" ? 4 : 9
    return sum + macro.current * caloriesPerGram
  }, 0)

  return (
    <Card className="responsive-card backdrop-blur-sm bg-white/80 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.01]">
      <CardHeader className="p-3 sm:p-4 lg:p-6">
        <CardTitle className="text-sm sm:text-base lg:text-lg responsive-text bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
          Macronutrientes de Hoy ✨
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm responsive-text text-gray-600">
          Tu progreso diario de macros • {totalCalories} kcal consumidas 🔥
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6 pt-0">
        {/* Gráficos circulares */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4 w-full">
          {macros.map((macro, index) => {
            const percentage = (macro.current / macro.target) * 100
            const circumference = 2 * Math.PI * 30
            const strokeDasharray = circumference
            const strokeDashoffset = circumference - (percentage / 100) * circumference

            return (
              <div key={macro.name} className="flex flex-col items-center space-y-1 sm:space-y-2 group min-w-0">
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 transform transition-transform duration-300 hover:scale-110 flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 70 70">
                    {/* Círculo de fondo */}
                    <circle cx="35" cy="35" r="30" stroke="hsl(var(--muted))" strokeWidth="5" fill="none" />
                    {/* Círculo de progreso */}
                    <circle
                      cx="35"
                      cy="35"
                      r="30"
                      stroke={
                        macro.name === "Proteínas"
                          ? "url(#blueGradient)"
                          : macro.name === "Carbohidratos"
                            ? "url(#greenGradient)"
                            : "url(#yellowGradient)"
                      }
                      strokeWidth="5"
                      fill="none"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      className={`transition-all duration-2000 ease-out animate-in delay-[${index * 300}ms] duration-[2500ms]`}
                    />
                    {/* Gradientes */}
                    <defs>
                      <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#1d4ed8" />
                      </linearGradient>
                      <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                      <linearGradient id="yellowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#d97706" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs sm:text-sm font-bold transition-all duration-300 group-hover:text-primary bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
                      {Math.round(percentage)}%
                    </span>
                  </div>
                </div>
                <div className="text-center transition-transform duration-300 group-hover:scale-105 min-w-0 w-full">
                  <div className="flex items-center gap-1 justify-center mb-1">
                    <div
                      className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${macro.color} animate-in zoom-in-50 duration-500 flex-shrink-0`}
                      style={{ animationDelay: `${index * 200}ms` }}
                    />
                    <span className="text-xs sm:text-sm font-medium responsive-text">{macro.name}</span>
                  </div>
                  <span className="text-xs text-gray-600 responsive-text">
                    {macro.current}/{macro.target}
                    {macro.unit}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Barras de progreso detalladas */}
        <div className="space-y-3 sm:space-y-4 w-full">
          {macros.map((macro, index) => {
            const percentage = (macro.current / macro.target) * 100
            const remaining = macro.target - macro.current

            return (
              <div
                key={macro.name}
                className="space-y-2 group hover:bg-gradient-to-r hover:from-teal-50/50 hover:to-cyan-50/50 p-2 rounded-lg transition-all duration-300 w-full"
              >
                <div className="responsive-flex items-center justify-between w-full">
                  <div className="responsive-flex items-center gap-2 min-w-0 flex-1">
                    <div
                      className={`h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full ${macro.color} transition-all duration-300 group-hover:scale-110 flex-shrink-0`}
                    />
                    <span className="text-xs sm:text-sm font-medium transition-colors duration-300 group-hover:text-primary responsive-text">
                      {macro.name}
                    </span>
                  </div>
                  <div className="text-right transform transition-transform duration-300 group-hover:scale-105 flex-shrink-0">
                    <span className="text-xs sm:text-sm font-medium">
                      {macro.current}/{macro.target}
                      {macro.unit}
                    </span>
                    <div className="text-xs text-gray-600 responsive-text">
                      {remaining > 0
                        ? `Faltan ${remaining}${macro.unit}`
                        : `Exceso de ${Math.abs(remaining)}${macro.unit}`}
                    </div>
                  </div>
                </div>
                <div className="relative w-full">
                  <Progress
                    value={Math.min(percentage, 100)}
                    className="h-2 sm:h-3 transition-all duration-500 hover:h-3 sm:hover:h-4 w-full"
                    style={{ transitionDelay: `${index * 300}ms` }}
                  />
                  {percentage > 100 && (
                    <div
                      className="absolute top-0 right-0 h-2 sm:h-3 bg-red-200 rounded-r-full animate-pulse"
                      style={{ width: `${Math.min((percentage - 100) / 2, 20)}%` }}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
