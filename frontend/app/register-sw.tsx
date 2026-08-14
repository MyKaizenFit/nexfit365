'use client'

import { useEffect } from 'react'
import { appPath } from '@/lib/app-path'

const NEXFIT_CACHE_PREFIX = 'nexfit365-'

export function RegisterServiceWorker() {
  useEffect(() => {
    const enablePwa =
      (process.env.NEXT_PUBLIC_ENABLE_PWA || '').toLowerCase() === 'true'

    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator)
    ) {
      return
    }

    const appScope = appPath('/')

    const belongsToNexfit = (registration: ServiceWorkerRegistration) => {
      try {
        return new URL(registration.scope).pathname === appScope
      } catch {
        return false
      }
    }

    // Si PWA está deshabilitado, limpiar únicamente los recursos de NexFit.
    // No tocar otros Service Workers o caches del mismo dominio.
    if (!enablePwa) {
      navigator.serviceWorker
        .getRegistrations()
        .then(async (registrations) => {
          for (const registration of registrations) {
            if (!belongsToNexfit(registration)) {
              continue
            }

            try {
              await registration.unregister()
            } catch {
              // ignore
            }
          }
        })
        .catch(() => {
          // ignore
        })

      if ('caches' in window) {
        caches
          .keys()
          .then((keys) =>
            Promise.all(
              keys
                .filter((key) => key.startsWith(NEXFIT_CACHE_PREFIX))
                .map((key) => caches.delete(key))
            )
          )
          .catch(() => {
            // ignore
          })
      }

      return
    }

    let updateInterval: number | undefined

    const handleControllerChange = () => {
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange
    )

    navigator.serviceWorker
      .register(appPath('/sw.js'), {
        scope: appScope,
      })
      .then((registration) => {
        registration.update().catch(() => {
          // ignore
        })

        updateInterval = window.setInterval(() => {
          registration.update().catch(() => {
            // ignore
          })
        }, 300000)
      })
      .catch(() => {
        // No bloquear la aplicación si el SW falla.
      })

    return () => {
      if (updateInterval !== undefined) {
        window.clearInterval(updateInterval)
      }

      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange
      )
    }
  }, [])

  return null
}
