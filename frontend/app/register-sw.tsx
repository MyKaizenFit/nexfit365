'use client'

import { useEffect } from 'react'

export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Registrar Service Worker desde la ruta API
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('✅ Service Worker registrado:', registration.scope)
          
          // Verificar actualizaciones periódicamente (cada 5 minutos en lugar de cada minuto)
          setInterval(() => {
            registration.update().catch((err) => {
              // Silenciar errores de actualización
              console.debug('Service Worker update check:', err.message)
            })
          }, 300000) // Cada 5 minutos
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

