import { sanitizeHelpHtml } from "../sanitize-help-html"

describe("sanitizeHelpHtml", () => {
  it("strips script tags and event handlers", () => {
    const dirty =
      '<p>Hola</p><script>alert(1)</script><img src=x onerror="alert(2)"><a href="javascript:alert(3)">x</a>'
    const clean = sanitizeHelpHtml(dirty)
    expect(clean).not.toMatch(/<script/i)
    expect(clean).not.toMatch(/onerror/i)
    expect(clean).not.toMatch(/javascript:/i)
    expect(clean).toContain("Hola")
  })
})
