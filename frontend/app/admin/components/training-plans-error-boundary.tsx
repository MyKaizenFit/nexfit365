'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { buildAdminSectionErrorReport, reportAdminSectionError } from '@/lib/admin-section-error'

const SECTION = 'workout-plans'

type TrainingPlansErrorBoundaryProps = {
  children: ReactNode
  onLeave: () => void
}

type TrainingPlansErrorBoundaryState = {
  hasError: boolean
  mountKey: number
}

export class TrainingPlansErrorBoundary extends Component<
  TrainingPlansErrorBoundaryProps,
  TrainingPlansErrorBoundaryState
> {
  state: TrainingPlansErrorBoundaryState = {
    hasError: false,
    mountKey: 0,
  }

  static getDerivedStateFromError(): Partial<TrainingPlansErrorBoundaryState> {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo): void {
    const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
    reportAdminSectionError(buildAdminSectionErrorReport({
      error,
      componentStack: errorInfo.componentStack,
      section: SECTION,
      pathname,
    }))
  }

  private handleRetry = (): void => {
    this.setState((current) => ({
      hasError: false,
      mountKey: current.mountKey + 1,
    }))
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[240px] items-center justify-center p-6" role="alert">
          <div className="max-w-md w-full rounded-xl border bg-card p-6 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              No se ha podido cargar Planes de entrenamiento.
            </h2>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleRetry}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90"
              >
                Reintentar
              </button>
              <button
                type="button"
                onClick={this.props.onLeave}
                className="px-4 py-2 rounded-md border border-border text-foreground hover:bg-muted"
              >
                Volver al inicio del panel
              </button>
            </div>
          </div>
        </div>
      )
    }

    return <div key={this.state.mountKey}>{this.props.children}</div>
  }
}
