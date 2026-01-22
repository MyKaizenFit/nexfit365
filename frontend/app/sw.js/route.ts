// app/sw.js/route.ts
// Ruta API para servir el Service Worker
// Next.js requiere que los Service Workers se sirvan desde rutas API con el tipo MIME correcto

import { NextResponse } from 'next/server'

// Contenido del Service Worker embebido
const SW_CONTENT = `// Service Worker para NexFit365 PWA
// Versión: 1.5.0 - NO cachea NINGÚN archivo JS, usa cache-busting para forzar descarga fresca

const CACHE_NAME = 'nexfit365-v1.5'
const RUNTIME_CACHE = 'nexfit365-runtime-v1.5'
const IMAGE_CACHE = 'nexfit365-images-v1.5'
const MAX_CACHE_SIZE = 50 * 1024 * 1024 // 50MB máximo

// Archivos estáticos críticos para cachear (solo lo esencial)
const STATIC_ASSETS = [
  '/',
  '/icono.png',
  '/manifest.json'
]

// Estrategias de cache
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',    // Para assets estáticos
  NETWORK_FIRST: 'network-first', // Para contenido dinámico
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate' // Para imágenes
}

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      // Eliminar TODOS los caches (incluso los actuales) para forzar actualización completa
      return Promise.all(
        cacheNames.map((name) => {
          return caches.delete(name)
        })
      )
    }).then(() => {
      // Forzar que todos los clientes usen el nuevo Service Worker inmediatamente
      return self.clients.claim().then(() => {
        // Notificar a todos los clientes para que recarguen
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'SW_UPDATED', version: '1.5' })
          })
        })
      })
    })
  )
  // Forzar skipWaiting para activación inmediata
  return self.skipWaiting()
})

// Interceptar requests
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // NO INTERCEPTAR archivos JS - dejar que pasen directamente sin cache del SW
  // Los chunks de Next.js tienen hashes únicos y Next.js maneja su propio cache
  if (url.pathname.startsWith('/api/') || 
      url.pathname.startsWith('/auth/') ||
      url.pathname.startsWith('/admin/') ||
      url.pathname.startsWith('/_next/') ||
      url.pathname.includes('/_next/static/') ||
      url.pathname.match(/\/\d+-[a-f0-9]+\.js/) || // Chunks de Next.js con hash (ej: 8836-abc123.js)
      url.pathname.endsWith('.js') || // TODOS los archivos JS
      url.pathname.includes('.js')) { // Cualquier ruta que contenga .js
    // NO interceptar - dejar que el navegador maneje estos requests directamente
    // Esto evita cualquier interferencia del Service Worker
    return
  }

  // Service Worker no debe cachearse a sí mismo
  if (url.pathname === '/sw.js') {
    return
  }

  // Estrategia: Network First para páginas HTML
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstStrategy(request))
    return
  }

  // Solo cachear CSS y fuentes con Cache First
  // Los archivos JS ya fueron excluidos arriba y NO se cachean
  if (url.pathname.match(/\\.(css|woff|woff2|ttf|eot)$/)) {
    event.respondWith(cacheFirstStrategy(request))
    return
  }

  // Estrategia: Stale While Revalidate para imágenes
  if (request.headers.get('accept')?.includes('image/')) {
    event.respondWith(staleWhileRevalidateStrategy(request))
    return
  }

  // Por defecto: Network First
  event.respondWith(networkFirstStrategy(request))
})

// Estrategia: Network First
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    throw error
  }
}

// Estrategia: Cache First
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    throw error
  }
}

// Estrategia: Stale While Revalidate
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(IMAGE_CACHE)
  const cachedResponse = await caches.match(request)
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  }).catch(() => null)

  return cachedResponse || fetchPromise
}

// Manejar notificaciones push
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'NEXFIT'
  const options = {
    body: data.body || 'Tienes una nueva notificación',
    icon: '/icono.png',
    badge: '/icono.png',
    data: data.url || '/',
    tag: data.tag || 'notification',
    requireInteraction: false
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// Manejar clicks en notificaciones
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const urlToOpen = event.notification.data || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData())
  }
})

async function syncData() {
  // Implementar lógica de sincronización
}
`

export async function GET() {
  // Devolver el Service Worker con el tipo MIME correcto
  return new NextResponse(SW_CONTENT, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Service-Worker-Allowed': '/',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
