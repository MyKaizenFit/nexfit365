export function downloadBlob(data: Blob, filename: string) {
  if (typeof document === "undefined") return

  const url = URL.createObjectURL(data)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.rel = "noopener"
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
