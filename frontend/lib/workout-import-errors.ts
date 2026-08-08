export const WORKOUT_IMPORT_TIMEOUT_MS = 300_000

export function isExcelFile(fileName: string): boolean {
  return fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls')
}

export function getWorkoutImportConfig(fileName: string): {
  isExcel: boolean
  endpoint: string
  uploadTimeoutMs: number
} {
  const isExcel = isExcelFile(fileName)
  return {
    isExcel,
    endpoint: isExcel
      ? 'admin/workouts/workouts/import_excel/'
      : 'admin/workouts/workouts/import_csv/',
    uploadTimeoutMs: WORKOUT_IMPORT_TIMEOUT_MS,
  }
}

export function formatImportRequestError(error: unknown, isExcel: boolean): string {
  if (error instanceof Error) {
    const message = error.message || ""
    if (message.toLowerCase().includes("failed to fetch")) {
      const fileType = isExcel ? "Excel" : "CSV"
      return (
        `No se pudo mantener la conexión con el servidor durante la importación del ${fileType}. ` +
        `La importación puede no haberse completado. Comprueba los planes antes de volver a intentarlo.`
      )
    }
    if (message.toLowerCase().includes("la petici") && message.toLowerCase().includes("tard")) {
      return message
    }
    return message
  }

  return "No se pudo importar"
}