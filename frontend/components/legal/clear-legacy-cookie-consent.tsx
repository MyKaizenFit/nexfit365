'use client'

import { useEffect } from 'react'

export function ClearLegacyCookieConsent() {
  useEffect(() => {
    try {
      localStorage.removeItem('nexfit365_cookie_consent')
    } catch {
      // Best effort. The banner no longer reads this key.
    }
  }, [])
  return null
}
