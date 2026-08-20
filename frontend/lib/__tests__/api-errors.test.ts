import { formatApiError, formatHttpError } from "../api-errors"

const INVALID_TIME_MESSAGE = "Formato de hora incorrecto. Usa HH:MM, por ejemplo 23:00."

describe("formatApiError", () => {
  it("prefers a specific detail message", () => {
    expect(formatApiError({ detail: INVALID_TIME_MESSAGE })).toBe(INVALID_TIME_MESSAGE)
  })

  it("extracts nested field errors", () => {
    expect(formatApiError({ time: [INVALID_TIME_MESSAGE] })).toBe(`Hora: ${INVALID_TIME_MESSAGE}`)
  })
})

describe("formatHttpError", () => {
  const menuOptions = {
    validationMessage: "Hay datos incorrectos en el formulario. Revisa los campos indicados.",
    serverMessage: "Ha ocurrido un error interno al guardar el menú. Inténtalo de nuevo.",
    fallback: "No se pudo guardar el menú",
  }

  it("shows the specific validation message from a 400", () => {
    expect(formatHttpError(400, { detail: INVALID_TIME_MESSAGE }, menuOptions)).toBe(
      INVALID_TIME_MESSAGE,
    )
  })

  it("uses the generic validation fallback when a 400 has no useful body", () => {
    expect(formatHttpError(400, {}, menuOptions)).toBe(menuOptions.validationMessage)
  })

  it("uses the internal error fallback for a 500", () => {
    expect(
      formatHttpError(500, { detail: "Traceback (most recent call last):" }, menuOptions),
    ).toBe(menuOptions.serverMessage)
  })
})
