/**
 * Client-side sanitize for admin-authored help HTML before dangerouslySetInnerHTML.
 * Server also sanitizes on write; this is defense in depth for already-stored content.
 */
export function sanitizeHelpHtml(html: string): string {
  if (!html) return ""
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
  }

  const doc = new DOMParser().parseFromString(html, "text/html")
  doc
    .querySelectorAll("script,iframe,object,embed,link,meta,form")
    .forEach((el) => el.remove())

  doc.querySelectorAll("*").forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase()
      const value = attr.value.trim()
      if (name.startsWith("on")) {
        el.removeAttribute(attr.name)
        return
      }
      if ((name === "href" || name === "src" || name === "xlink:href") && /^javascript:/i.test(value)) {
        el.removeAttribute(attr.name)
      }
    })
  })

  return doc.body.innerHTML
}
