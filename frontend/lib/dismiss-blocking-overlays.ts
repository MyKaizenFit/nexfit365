/**
 * Clears Radix/shadcn overlays that can trap pointer events after async actions
 * (e.g. logout from a DropdownMenu while the dismiss layer is still mounted).
 */
export function dismissBlockingOverlays(): void {
  if (typeof document === 'undefined') {
    return
  }

  document.body.style.pointerEvents = ''
  document.body.style.overflow = ''
  document.body.removeAttribute('data-scroll-locked')

  document.querySelectorAll('[data-radix-focus-guard]').forEach((node) => {
    node.remove()
  })

  const overlaySelectors = [
    '[data-radix-popper-content-wrapper]',
    '[data-radix-dialog-overlay]',
    '[data-radix-alert-dialog-overlay]',
    '[data-radix-dropdown-menu-content]',
    '[data-radix-menu-content]',
  ]

  overlaySelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((node) => {
      const portal = node.closest('[data-radix-portal]')
      if (portal) {
        portal.remove()
        return
      }
      node.parentElement?.remove()
    })
  })
}
