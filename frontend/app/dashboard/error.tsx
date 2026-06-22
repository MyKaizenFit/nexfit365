'use client'

import { useEffect } from 'react'
import { dismissBlockingOverlays } from '@/lib/dismiss-blocking-overlays'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    dismissBlockingOverlays()

    const logoutInProgress =
      typeof window !== 'undefined' &&
      localStorage.getItem('auth_logout_in_progress') === 'true'

    if (logoutInProgress) {
      window.location.replace('/auth')
      return
    }

    // Auto-recuperacion una vez por sesion para errores de bundle/acciones desincronizadas.
    const key = 'dashboard_error_auto_recovered'

    try {
      if (typeof window !== 'undefined' && !sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1')
        window.location.reload()
      }
    } catch {
      // ignore
    }
  }, [])

  const handleRetry = () => {
    dismissBlockingOverlays()
    reset()
  }

  const handleGoHome = () => {
    dismissBlockingOverlays()
    try {
      sessionStorage.removeItem('dashboard_error_auto_recovered')
    } catch {
      // ignore
    }
    window.location.href = '/dashboard'
  }

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full rounded-xl border bg-card p-6 text-center shadow-sm relative z-[10051]">
        <h2 className="text-xl font-semibold text-foreground mb-2">Se ha producido un error temporal</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Estamos recargando la vista para sincronizar la aplicacion. Si continua, pulsa reintentar.
        </p>

        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={handleRetry}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90"
          >
            Reintentar
          </button>
          <button
            type="button"
            onClick={handleGoHome}
            className="px-4 py-2 rounded-md border border-border text-foreground hover:bg-muted"
          >
            Volver a Inicio
          </button>
        </div>

        <p className="text-xs text-muted-foreground mt-4 break-all">
          {error?.digest ? `Ref: ${error.digest}` : ''}
        </p>
      </div>
    </div>
  )
}
