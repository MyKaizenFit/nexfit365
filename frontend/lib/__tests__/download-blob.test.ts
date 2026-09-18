import { downloadBlob } from "../download-blob"

describe("downloadBlob", () => {
  it("starts a same-tab file download from a blob", () => {
    const click = jest.fn()
    const originalCreate = document.createElement.bind(document)
    const createObjectURL = jest.fn(() => "blob:mock")
    const revokeObjectURL = jest.fn()
    Object.defineProperty(URL, "createObjectURL", { writable: true, value: createObjectURL })
    Object.defineProperty(URL, "revokeObjectURL", { writable: true, value: revokeObjectURL })
    jest.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const el = originalCreate(tagName)
      if (tagName.toLowerCase() === "a") {
        el.click = click
      }
      return el
    })

    downloadBlob(new Blob(["{\"ok\":true}"], { type: "application/json" }), "mis_datos_nexfit365.json")

    expect(createObjectURL).toHaveBeenCalled()
    expect(click).toHaveBeenCalledTimes(1)
    expect(document.body.querySelector("a")).toBeNull()
  })
})
