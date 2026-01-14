'use client'

import { useEffect } from 'react'

export function RegisterServiceWorker() {
  useEffect(() => {
    const enablePwa = (process.env.NEXT_PUBLIC_ENABLE_PWA || '').toLowerCase() === 'true'

    // Si PWA está deshabilitado, asegurar que NO haya SW viejo controlando la app
    // (Esto es clave para evitar que cargue versiones antiguas intermitentemente por caché)
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && !enablePwa) {
      navigator.serviceWorker
        .getRegistrations()
        .then(async (registrations) => {
          for (const reg of registrations) {
            try {
              await reg.unregister()
            } catch {
              // ignore
            }
          }
        })
        .catch(() => {
          // ignore
        })

      // Borrar Cache Storage del SW (runtime/static/images)
      if ('caches' in window) {
        caches
          .keys()
          .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
          .catch(() => {
            // ignore
          })
      }

      return
    }

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && enablePwa) {
      // Registrar Service Worker desde la ruta API
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('✅ Service Worker registrado:', registration.scope)
          
          // Forzar actualización inmediata
          registration.update().catch((err) => {
            console.debug('Service Worker update check:', err.message)
          })
          
          // Verificar actualizaciones periódicamente (cada minuto para detectar cambios rápidamente)
          setInterval(() => {
            registration.update().catch((err) => {
              // Silenciar errores de actualización
              console.debug('Service Worker update check:', err.message)
            })
          }, 60000) // Cada minuto para detectar cambios más rápido
        })
        .catch((error) => {
          // Solo loguear errores críticos, no bloquear la aplicación
          console.warn('⚠️ Service Worker no disponible:', error.message)
        })

      // Escuchar actualizaciones del Service Worker
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('🔄 Service Worker actualizado, recargando página...')
        window.location.reload()
      })
    }
  }, [])

  return null
}

