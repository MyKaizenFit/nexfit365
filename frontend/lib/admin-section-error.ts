export type AdminSectionErrorKind = 'chunk_load' | 'render'

export type AdminSectionErrorReport = {
  message: string
  name: string
  stack: string
  componentStack: string
  pathname: string
  section: string
  build: string
  timestamp: string
  kind: AdminSectionErrorKind
}

function redact(value: string, maxLength: number): string {
  return value
    .replace(/bearer\s+\S+/gi, '[redacted]')
    .replace(/authorization\s*[:=]\s*\S+/gi, '[redacted]')
    .replace(/cookie\s*[:=]\s*\S+/gi, '[redacted]')
    .replace(/password\s*[:=]\s*\S+/gi, '[redacted]')
    .replace(/eyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, '[redacted]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted]')
    .slice(0, maxLength)
}

export function classifyAdminSectionError(error: { name?: string; message?: string }): AdminSectionErrorKind {
  const name = error.name || ''
  const message = error.message || ''
  if (
    name === 'ChunkLoadError' ||
    /Loading chunk .+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message)
  ) {
    return 'chunk_load'
  }
  return 'render'
}

function asError(value: unknown): Error {
  if (value instanceof Error) return value
  if (typeof value === 'string') return new Error(value)
  return new Error('Error inesperado')
}

export function frontendBuildLabel(): string {
  const version = process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0'
  const commit = process.env.NEXT_PUBLIC_GIT_COMMIT || 'unknown'
  return `version=${version};commit=${commit}`
}

export function buildAdminSectionErrorReport(input: {
  error: unknown
  componentStack?: string | null
  section: string
  pathname?: string
  now?: Date
}): AdminSectionErrorReport {
  const error = asError(input.error)
  return {
    message: redact(error.message || '', 500),
    name: redact(error.name || 'Error', 120),
    stack: redact(error.stack || '', 4000),
    componentStack: redact(input.componentStack || '', 4000),
    pathname: input.pathname || '',
    section: input.section,
    build: frontendBuildLabel(),
    timestamp: (input.now || new Date()).toISOString(),
    kind: classifyAdminSectionError(error),
  }
}

export function reportAdminSectionError(report: AdminSectionErrorReport): void {
  console.error('[admin-section-error]', report)
}
