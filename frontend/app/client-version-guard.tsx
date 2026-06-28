'use client'

import { useEffect } from 'react'
import { APP_VERSION } from '@/lib/app-version'

const VERSION_STORAGE_KEY = 'nexfit365_app_version'
const REFRESH_PARAM = 'app_refresh'

async function clearBrowserAppCaches() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations().catch(() => [])
    await Promise.all(
      registrations.map((registration) => registration.unregister().catch(() => false)),
    )
  }

  if ('caches' in window) {
    const keys = await caches.keys().catch(() => [])
    await Promise.all(keys.map((key) => caches.delete(key).catch(() => false)))
  }
}

export function ClientVersionGuard() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const currentVersion = APP_VERSION
    const storedVersion = window.localStorage.getItem(VERSION_STORAGE_KEY)

    if (storedVersion === currentVersion) return

    window.localStorage.setItem(VERSION_STORAGE_KEY, currentVersion)

    const url = new URL(window.location.href)
    const alreadyRefreshed = url.searchParams.get(REFRESH_PARAM) === currentVersion

    clearBrowserAppCaches()
      .finally(() => {
        if (alreadyRefreshed) return
        url.searchParams.set(REFRESH_PARAM, currentVersion)
        window.location.replace(url.toString())
      })
  }, [])

  return null
}
