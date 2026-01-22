// Script para limpiar el Service Worker desde la consola del navegador
// Copia y pega esto en la consola del navegador (F12 > Console)

(async function clearServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      
      for (let registration of registrations) {
        await registration.unregister()
      }
      
      // Limpiar todos los caches
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => {
          return caches.delete(name)
        }))
      }
      
    } catch (error) {
    }
  } else {
  }
})()


