import { formatPreferenceValue, unwrapPreferenceList } from "../preference-list"

describe("unwrapPreferenceList", () => {
  it("keeps clean Spanish labels", () => {
    expect(unwrapPreferenceList(["Vegano", "Intolerancia a la lactosa", "Celíaco"])).toEqual([
      "Vegano",
      "Intolerancia a la lactosa",
      "Celíaco",
    ])
  })

  it("parses a JSON array string", () => {
    expect(unwrapPreferenceList('["Vegano", "Intolerancia a la lactosa", "celíaco"]')).toEqual([
      "Vegano",
      "Intolerancia a la lactosa",
      "celíaco",
    ])
  })

  it("parses a Python-repr list string", () => {
    expect(unwrapPreferenceList("['Vegano', 'Intolerancia a la lactosa', 'celíaco']")).toEqual([
      "Vegano",
      "Intolerancia a la lactosa",
      "celíaco",
    ])
  })

  it("repairs comma-split fragments", () => {
    expect(unwrapPreferenceList(["['Vegano'", "'Intolerancia a la lactosa'", "'celíaco']"])).toEqual([
      "Vegano",
      "Intolerancia a la lactosa",
      "celíaco",
    ])
  })

  it("repairs the reported nested JSON fragment shape", () => {
    expect(
      unwrapPreferenceList(['["[\'Vegano\'"', '"\'Intolerancia a la lactosa\'"', '"\'celíaco\']"]']),
    ).toEqual(["Vegano", "Intolerancia a la lactosa", "celíaco"])
  })

  it("formats nested payloads as a comma-separated field", () => {
    expect(formatPreferenceValue(["['Vegano'", "'Intolerancia a la lactosa'"])).toBe(
      "Vegano, Intolerancia a la lactosa",
    )
  })
})
