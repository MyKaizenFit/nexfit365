"use client"

import dynamicImport from 'next/dynamic'

// Cargar ProgressDashboard de forma dinámica para evitar errores de build
const ProgressDashboard = dynamicImport(
  () => import("@/components/dashboard/progress-dashboard").then(mod => ({ default: mod.ProgressDashboard })),
  { ssr: false }
)

// Forzar renderizado dinámico para evitar errores de build
export const dynamic = 'force-dynamic'

export default function ProgressPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-teal-50 to-violet-50 p-4">
      <div className="max-w-7xl mx-auto">
        <ProgressDashboard />
      </div>
    </div>
  )
}
