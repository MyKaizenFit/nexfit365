// Service Worker para NexFit365 PWA
// Versión: 1.1.0 - Optimizado para mejor rendimiento offline

const CACHE_NAME = 'nexfit365-v1.1'
const RUNTIME_CACHE = 'nexfit365-runtime-v1.1'
const IMAGE_CACHE = 'nexfit365-images-v1.1'
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
  console.log('[SW] Instalando Service Worker...')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cacheando archivos estáticos')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => self.skipWaiting())
  )
})

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...')
  
  event.waitUntil(
    Promise.all([
      cleanOldCaches(),
      self.clients.claim()
    ])
  )
})

// Limpiar cache antiguo y mantener tamaño bajo
async function cleanOldCaches() {
  const cacheNames = await caches.keys()
  const oldCaches = cacheNames.filter(name => 
    name.startsWith('nexfit365-') && 
    name !== CACHE_NAME && 
    name !== RUNTIME_CACHE && 
    name !== IMAGE_CACHE
  )
  
  await Promise.all(oldCaches.map(name => caches.delete(name)))
  
  // Limpiar cache de imágenes si es muy grande
  try {
    const imageCache = await caches.open(IMAGE_CACHE)
    const keys = await imageCache.keys()
    if (keys.length > 100) {
      // Eliminar las más antiguas
      const toDelete = keys.slice(0, keys.length - 100)
      await Promise.all(toDelete.map(key => imageCache.delete(key)))
    }
  } catch (e) {
    console.log('[SW] Error limpiando cache de imágenes:', e)
  }
}

// Interceptar requests con estrategias optimizadas
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Solo procesar requests GET
  if (request.method !== 'GET') {
    return
  }

  // NO interceptar requests a la API (siempre pasar directamente)
  if (url.pathname.startsWith('/api/')) {
    return
  }
  
  // NO interceptar requests de autenticación
  if (url.pathname.includes('/auth/') || url.pathname.includes('/login') || url.pathname.includes('/register')) {
    return
  }
  
  // NO interceptar el Service Worker mismo
  if (url.pathname === '/sw.js' || url.pathname.includes('/sw.js')) {
    return
  }

  // Estrategia según el tipo de recurso
  if (request.destination === 'image') {
    // Imágenes: Stale-While-Revalidate
    event.respondWith(handleImageRequest(request))
  } else if (url.pathname.match(/\.(js|css|woff|woff2|ttf|eot)$/)) {
    // Assets estáticos: Cache First
    event.respondWith(handleStaticAsset(request))
  } else if (request.destination === 'document') {
    // Páginas HTML: Network First con fallback
    event.respondWith(handlePageRequest(request))
  } else {
    // Otros recursos: Network First
    event.respondWith(handleNetworkFirst(request))
  }
})

// Manejar imágenes con stale-while-revalidate
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE)
  const cached = await cache.match(request)
  
  // Devolver cache inmediatamente si existe
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  }).catch(() => null)
  
  return cached || fetchPromise || new Response('', { status: 404 })
}

// Manejar assets estáticos con cache first
async function handleStaticAsset(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)
  
  if (cached) {
    return cached
  }
  
  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch (e) {
    return new Response('', { status: 404 })
  }
}

// Manejar páginas HTML con network first
async function handlePageRequest(request) {
  try {
    // Intentar red primero
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch (e) {
    // Si falla, intentar cache
    const cache = await caches.open(RUNTIME_CACHE)
    const cached = await cache.match(request)
    if (cached) {
      return cached
    }
    // Último recurso: página offline básica
    const offlinePage = await cache.match('/')
    return offlinePage || new Response('Offline', { status: 503 })
  }
}

// Manejar otros recursos con network first
async function handleNetworkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch (e) {
    const cache = await caches.open(RUNTIME_CACHE)
    return await cache.match(request) || new Response('', { status: 404 })
  }
}

// Manejar mensajes push
self.addEventListener('push', (event) => {
  console.log('[SW] Push recibido:', event)
  
  let notificationData = {
    title: 'NexFit365',
    body: 'Tienes una nueva notificación',
    icon: '/icono.png',
    badge: '/icono.png',
    tag: 'nexfit-notification',
    requireInteraction: false,
    data: {}
  }

  if (event.data) {
    try {
      const data = event.data.json()
      notificationData = {
        ...notificationData,
        ...data
      }
    } catch (e) {
      notificationData.body = event.data.text()
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      actions: notificationData.actions || [],
      vibrate: [200, 100, 200]
    })
  )
})

// Manejar clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Click en notificación:', event)
  
  event.notification.close()

  if (event.action === 'close') {
    return
  }

  // Abrir o enfocar la ventana
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si hay una ventana abierta, enfocarla
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i]
          if (client.url === '/' && 'focus' in client) {
            return client.focus()
          }
        }
        
        // Si no hay ventana abierta, abrir una nueva
        if (clients.openWindow) {
          const urlToOpen = event.notification.data?.url || '/dashboard'
          return clients.openWindow(urlToOpen)
        }
      })
  )
})

// Manejar sincronización en segundo plano
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag)
  
  if (event.tag === 'sync-data') {
    event.waitUntil(
      syncPendingData()
    )
  }
})

// Sincronizar datos pendientes cuando hay conexión
async function syncPendingData() {
  try {
    // Aquí se podría sincronizar datos pendientes (logs de comidas, entrenamientos, etc.)
    // Por ahora solo logueamos
    console.log('[SW] Sincronizando datos pendientes...')
    
    // Ejemplo: sincronizar logs de comidas pendientes
    // const pendingMeals = await getPendingMealLogs()
    // for (const meal of pendingMeals) {
    //   await syncMealLog(meal)
    // }
    
    return Promise.resolve()
  } catch (e) {
    console.error('[SW] Error en sincronización:', e)
    return Promise.reject(e)
  }
}

// Limpiar cache periódicamente (cada vez que se activa)
setInterval(() => {
  cleanOldCaches().catch(e => console.error('[SW] Error limpiando cache:', e))
}, 3600000) // Cada hora

