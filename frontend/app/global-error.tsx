'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="es">
      <body>
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="max-w-md w-full rounded-xl border bg-card p-6 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-foreground mb-2">Error de aplicacion</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Se produjo un error inesperado. Reintenta para continuar.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => reset()}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90"
              >
                Reintentar
              </button>
              <button
                onClick={() => (window.location.href = '/auth')}
                className="px-4 py-2 rounded-md border border-border text-foreground hover:bg-muted"
              >
                Ir a login
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-4 break-all">
              {error?.digest ? `Ref: ${error.digest}` : ''}
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}
