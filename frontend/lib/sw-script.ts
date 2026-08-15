export const SW_CACHE_VERSION = '1.9'

export const swBasePath = (raw: string): string =>
  (raw || '').trim().replace(/\/+$/, '')

export const swScope = (raw: string): string => {
  const basePath = swBasePath(raw)
  return basePath ? `${basePath}/` : '/'
}

const killSwContent = `// NexFit365 service worker cleanup
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

export const buildServiceWorkerScript = ({
  pwaEnabled,
  rawBasePath,
}: {
  pwaEnabled: boolean
  rawBasePath: string
}): string => {
  if (!pwaEnabled) {
    return killSwContent
  }

  const APP_BASE_PATH = swBasePath(rawBasePath)
  const APP_SCOPE = swScope(rawBasePath)

  return `// Service Worker para NexFit365 PWA
// Versión: ${SW_CACHE_VERSION}.0 - soporte seguro para despliegue bajo basePath

const APP_BASE_PATH = ${JSON.stringify(APP_BASE_PATH)}
const APP_SCOPE = ${JSON.stringify(APP_SCOPE)}

function appPath(path = '/') {
  if (path.startsWith('http://') || path.startsWith('https://')) {
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

const CACHE_NAME = 'nexfit365-v${SW_CACHE_VERSION}'
const RUNTIME_CACHE = 'nexfit365-runtime-v${SW_CACHE_VERSION}'
const IMAGE_CACHE = 'nexfit365-images-v${SW_CACHE_VERSION}'
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
            client.postMessage({ type: 'SW_UPDATED', version: '${SW_CACHE_VERSION}' })
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
  if (pathname.startsWith('/api/') ||
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/admin/') ||
      pathname.startsWith('/_next/') ||
      pathname.includes('/_next/static/') ||
      pathname.endsWith('.js') ||
      pathname.includes('.js')) {
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
  if (
    pathname.endsWith('.css') ||
    pathname.endsWith('.woff') ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.ttf') ||
    pathname.endsWith('.eot')
  ) {
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
}
