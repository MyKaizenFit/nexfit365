import { isExcelFile, formatImportRequestError, getWorkoutImportConfig, WORKOUT_IMPORT_TIMEOUT_MS } from "@/lib/workout-import-errors"

describe("workout-import-errors", () => {
  describe("WORKOUT_IMPORT_TIMEOUT_MS", () => {
    it("is 300000 (5 minutes)", () => {
      expect(WORKOUT_IMPORT_TIMEOUT_MS).toBe(300_000)
    })
  })

  describe("isExcelFile", () => {
    it("returns true for .xlsx files", () => {
      expect(isExcelFile("plan.xlsx")).toBe(true)
      expect(isExcelFile("PLAN.XLSX")).toBe(true)
      expect(isExcelFile("my_plan_file.xlsx")).toBe(true)
    })

    it("returns true for .xls files", () => {
      expect(isExcelFile("plan.xls")).toBe(true)
      expect(isExcelFile("PLAN.XLS")).toBe(true)
      expect(isExcelFile("my_plan_file.xls")).toBe(true)
    })

    it("returns false for .csv files", () => {
      expect(isExcelFile("plan.csv")).toBe(false)
      expect(isExcelFile("PLAN.CSV")).toBe(false)
      expect(isExcelFile("my_plan_file.csv")).toBe(false)
    })

    it("returns false for other extensions", () => {
      expect(isExcelFile("plan.txt")).toBe(false)
      expect(isExcelFile("plan.pdf")).toBe(false)
      expect(isExcelFile("plan")).toBe(false)
      expect(isExcelFile("")).toBe(false)
    })
  })

  describe("getWorkoutImportConfig", () => {
    it("returns CSV config for .csv files", () => {
      const config = getWorkoutImportConfig("planes.csv")
      expect(config.endpoint).toBe("admin/workouts/workouts/import_csv/")
      expect(config.isExcel).toBe(false)
      expect(config.uploadTimeoutMs).toBe(300_000)
    })

    it("returns CSV config for .CSV files (uppercase)", () => {
      const config = getWorkoutImportConfig("PLANES.CSV")
      expect(config.endpoint).toBe("admin/workouts/workouts/import_csv/")
      expect(config.isExcel).toBe(false)
      expect(config.uploadTimeoutMs).toBe(300_000)
    })

    it("returns Excel config for .xlsx files", () => {
      const config = getWorkoutImportConfig("planes.xlsx")
      expect(config.endpoint).toBe("admin/workouts/workouts/import_excel/")
      expect(config.isExcel).toBe(true)
      expect(config.uploadTimeoutMs).toBe(300_000)
    })

    it("returns Excel config for .XLSX files (uppercase)", () => {
      const config = getWorkoutImportConfig("PLANES.XLSX")
      expect(config.endpoint).toBe("admin/workouts/workouts/import_excel/")
      expect(config.isExcel).toBe(true)
      expect(config.uploadTimeoutMs).toBe(300_000)
    })

    it("returns Excel config for .xls files", () => {
      const config = getWorkoutImportConfig("planes.xls")
      expect(config.endpoint).toBe("admin/workouts/workouts/import_excel/")
      expect(config.isExcel).toBe(true)
      expect(config.uploadTimeoutMs).toBe(300_000)
    })

    it("returns Excel config for .XLS files (uppercase)", () => {
      const config = getWorkoutImportConfig("PLANES.XLS")
      expect(config.endpoint).toBe("admin/workouts/workouts/import_excel/")
      expect(config.isExcel).toBe(true)
      expect(config.uploadTimeoutMs).toBe(300_000)
    })
  })

  describe("formatImportRequestError", () => {
    it("returns CSV-specific message for Failed to fetch with isExcel=false", () => {
      const error = new Error("Failed to fetch")
      const message = formatImportRequestError(error, false)
      expect(message).toContain("CSV")
      expect(message).not.toContain("Excel")
      expect(message).toContain("Comprueba los planes antes de volver a intentarlo")
    })

    it("returns Excel-specific message for Failed to fetch with isExcel=true", () => {
      const error = new Error("Failed to fetch")
      const message = formatImportRequestError(error, true)
      expect(message).toContain("Excel")
      expect(message).not.toContain("CSV")
      expect(message).toContain("Comprueba los planes antes de volver a intentarlo")
    })

    it("returns CSV-specific message for 'failed to fetch' (lowercase)", () => {
      const error = new Error("failed to fetch")
      const message = formatImportRequestError(error, false)
      expect(message).toContain("CSV")
      expect(message).toContain("Comprueba los planes antes de volver a intentarlo")
    })

    it("returns Excel-specific message for 'Failed To Fetch' (mixed case)", () => {
      const error = new Error("Failed To Fetch")
      const message = formatImportRequestError(error, true)
      expect(message).toContain("Excel")
      expect(message).toContain("Comprueba los planes antes de volver a intentarlo")
    })

    it("preserves 'La petición tardó demasiado' message for AbortError", () => {
      const error = new Error("La petición tardó demasiado. Inténtalo de nuevo.")
      const message = formatImportRequestError(error, false)
      expect(message).toBe("La petición tardó demasiado. Inténtalo de nuevo.")
    })

    it("preserves 'La petición tardó demasiado' message for AbortError with isExcel=true", () => {
      const error = new Error("La petición tardó demasiado. Inténtalo de nuevo.")
      const message = formatImportRequestError(error, true)
      expect(message).toBe("La petición tardó demasiado. Inténtalo de nuevo.")
    })

    it("returns original message for other errors", () => {
      const error = new Error("Error de servidor")
      const message = formatImportRequestError(error, false)
      expect(message).toBe("Error de servidor")
    })

    it("returns fallback for non-Error objects", () => {
      const message = formatImportRequestError("string error", false)
      expect(message).toBe("No se pudo importar")
    })

    it("returns fallback for null", () => {
      const message = formatImportRequestError(null, false)
      expect(message).toBe("No se pudo importar")
    })

    it("returns fallback for undefined", () => {
      const message = formatImportRequestError(undefined, true)
      expect(message).toBe("No se pudo importar")
    })

    it("message for Failed to fetch includes the full guidance text", () => {
      const error = new Error("Failed to fetch")
      const csvMessage = formatImportRequestError(error, false)
      const excelMessage = formatImportRequestError(error, true)

      expect(csvMessage).toContain("importación del CSV")
      expect(excelMessage).toContain("importación del Excel")
      expect(csvMessage).toContain("La importación puede no haberse completado")
      expect(csvMessage).toContain("Comprueba los planes antes de volver a intentarlo")
    })
  })
})