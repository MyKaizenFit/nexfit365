// app/sw.js/route.ts
// Ruta API para servir el Service Worker
// Next.js requiere que los Service Workers se sirvan desde rutas API con el tipo MIME correcto

import { NextResponse } from 'next/server'

const rawBasePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').trim()
const APP_BASE_PATH = rawBasePath.replace(/\/+$/, '')
const APP_SCOPE = APP_BASE_PATH ? `${APP_BASE_PATH}/` : '/'

const KILL_SW_CONTENT = `// NexFit365 service worker cleanup
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(
      keys
        .filter((key) => key.startsWith('nexfit365-'))
        .map((key) => caches.delete(key))
    )
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of clientsList) {
      client.postMessage({ type: 'SW_DISABLED' })
      if ('navigate' in client) {
        const url = new URL(client.url)
        url.searchParams.set('sw_refresh', 'disabled')
        client.navigate(url.toString()).catch(() => {})
      }
    }
    await self.registration.unregister()
  })())
})

self.addEventListener('fetch', () => {})
`

// Contenido del Service Worker embebido
const SW_CONTENT = `// Service Worker para NexFit365 PWA
// Versión: 1.8.0 - soporte seguro para despliegue bajo basePath

const APP_BASE_PATH = ${JSON.stringify(APP_BASE_PATH)}
const APP_SCOPE = ${JSON.stringify(APP_SCOPE)}

function appPath(path = '/') {
  if (/^https?:\/\//i.test(path)) {
    return path
  }

  const normalized = path.startsWith('/') ? path : '/' + path

  if (
    APP_BASE_PATH &&
    (
      normalized === APP_BASE_PATH ||
      normalized.startsWith(APP_BASE_PATH + '/') ||
      normalized.startsWith(APP_BASE_PATH + '?') ||
      normalized.startsWith(APP_BASE_PATH + '#')
    )
  ) {
    return normalized
  }

  if (!APP_BASE_PATH) {
    return normalized
  }

  if (normalized === '/') {
    return APP_SCOPE
  }

  return APP_BASE_PATH + normalized
}

const CACHE_NAME = 'nexfit365-v1.8'
const RUNTIME_CACHE = 'nexfit365-runtime-v1.8'
const IMAGE_CACHE = 'nexfit365-images-v1.8'
const MAX_CACHE_SIZE = 50 * 1024 * 1024 // 50MB máximo

// Archivos estáticos críticos para cachear (solo lo esencial)
const STATIC_ASSETS = [
  APP_SCOPE,
  appPath('/icono.png'),
  appPath('/manifest.webmanifest')
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
  const cacheAllowList = [CACHE_NAME, RUNTIME_CACHE, IMAGE_CACHE]
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      // Eliminar solo caches viejos para mantener recursos offline válidos
      return Promise.all(
        cacheNames.map((name) => {
          // Cache Storage es por origen: no tocar caches de la landing u otras apps.
          if (name.startsWith('nexfit365-') && !cacheAllowList.includes(name)) {
            return caches.delete(name)
          }
          return Promise.resolve(false)
        })
      )
    }).then(() => {
      return self.clients.claim().then(() => {
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'SW_UPDATED', version: '1.8' })
          })
        })
      })
    })
  )
})

// Interceptar requests
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // No gestionar recursos de otros orígenes ni de la landing fuera de /nexfit.
  if (url.origin !== self.location.origin) {
    return
  }

  if (
    APP_BASE_PATH &&
    url.pathname !== APP_BASE_PATH &&
    !url.pathname.startsWith(APP_BASE_PATH + '/')
  ) {
    return
  }

  const pathname =
    APP_BASE_PATH && url.pathname.startsWith(APP_BASE_PATH)
      ? url.pathname.slice(APP_BASE_PATH.length) || '/'
      : url.pathname

  if (request.method !== 'GET') {
    return
  }

  // NO INTERCEPTAR archivos JS - dejar que pasen directamente sin cache del SW
  // Los chunks de Next.js tienen hashes únicos y Next.js maneja su propio cache
  if (pathname.startsWith('/api/') ||
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/admin/') ||
      pathname.startsWith('/_next/') ||
      pathname.includes('/_next/static/') ||
      pathname.match(/\/\d+-[a-f0-9]+\.js/) || // Chunks de Next.js con hash (ej: 8836-abc123.js)
      pathname.endsWith('.js') || // TODOS los archivos JS
      pathname.includes('.js')) { // Cualquier ruta que contenga .js
    // NO interceptar - dejar que el navegador maneje estos requests directamente
    // Esto evita cualquier interferencia del Service Worker
    return
  }

  // Service Worker no debe cachearse a sí mismo
  if (pathname === '/sw.js') {
    return
  }

  // Estrategia: Network First para páginas HTML
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstStrategy(request))
    return
  }

  // Solo cachear CSS y fuentes con Cache First
  // Los archivos JS ya fueron excluidos arriba y NO se cachean
  if (pathname.match(/\\.(css|woff|woff2|ttf|eot)$/)) {
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
    if (networkResponse.ok && !request.url.includes('/api/')) {
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    if (request.mode === 'navigate') {
      const fallback = await caches.match(APP_SCOPE)
      if (fallback) {
        return fallback
      }
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
    icon: appPath('/icono.png'),
    badge: appPath('/icono.png'),
    data: appPath(data.url || '/'),
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

  const urlToOpen = appPath(event.notification.data || '/')
  const absoluteUrlToOpen = new URL(urlToOpen, self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url === absoluteUrlToOpen && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(absoluteUrlToOpen)
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
  const pwaEnabled = (process.env.NEXT_PUBLIC_ENABLE_PWA || '').toLowerCase() === 'true'

  // Devolver el Service Worker con el tipo MIME correcto
  return new NextResponse(pwaEnabled ? SW_CONTENT : KILL_SW_CONTENT, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Service-Worker-Allowed': APP_SCOPE,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}
