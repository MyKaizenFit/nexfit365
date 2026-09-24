"use client"

import { Component, ReactNode, ErrorInfo } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react'

interface WorkoutErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  workoutDayId?: string
}

interface WorkoutErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class WorkoutErrorBoundary extends Component<
  WorkoutErrorBoundaryProps,
  WorkoutErrorBoundaryState
> {
  state: WorkoutErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  static getDerivedStateFromError(error: Error): Partial<WorkoutErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ error, errorInfo })
    if (process.env.NODE_ENV === 'development') {
      console.error('[WorkoutErrorBoundary] Caught error:', error)
      console.error('[WorkoutErrorBoundary] Component stack:', errorInfo.componentStack)
    }
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
    // Future: connect to frontend logging service here
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  private handleBack = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    // The parent should handle closing the modal via onClose
    // This is just a fallback if somehow error boundary wraps something else
    if (typeof window !== 'undefined') {
      window.history.back()
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-6 bg-card rounded-xl border">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold text-center mb-2">
            Ha ocurrido un problema al cargar el entrenamiento
          </h3>
          <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
            No se ha podido abrir la sesión de entrenamiento. Tus datos de progreso
            guardados localmente están a salvo.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <Button
              onClick={this.handleRetry}
              className="flex-1"
              size="lg"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
            <Button
              onClick={this.handleBack}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a entrenamientos
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-6 w-full max-w-md text-xs text-muted-foreground">
              <summary className="cursor-pointer mb-2">Detalles técnicos (desarrollo)</summary>
              <pre className="p-3 bg-muted rounded overflow-auto text-left">
                {this.state.error?.message}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

export function WorkoutSessionFallback({ onRetry, onBack }: { onRetry?: () => void; onBack?: () => void }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-6 bg-card rounded-xl border">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold text-center mb-2">
        Ha ocurrido un problema al cargar el entrenamiento
      </h3>
      <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
        No se ha podido abrir la sesión de entrenamiento. Tus datos de progreso
        guardados localmente están a salvo.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <Button
          onClick={onRetry}
          className="flex-1"
          size="lg"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Reintentar
        </Button>
        <Button
          onClick={onBack}
          variant="outline"
          className="flex-1"
          size="lg"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a entrenamientos
        </Button>
      </div>
    </div>
  )
}
