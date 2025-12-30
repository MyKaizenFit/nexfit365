// Script para limpiar el Service Worker desde la consola del navegador
// Copia y pega esto en la consola del navegador (F12 > Console)

(async function clearServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      console.log(`🔍 Encontrados ${registrations.length} Service Worker(s)`)
      
      for (let registration of registrations) {
        console.log(`🗑️  Desregistrando: ${registration.scope}`)
        await registration.unregister()
      }
      
      // Limpiar todos los caches
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        console.log(`🗑️  Eliminando ${cacheNames.length} cache(s)`)
        await Promise.all(cacheNames.map(name => {
          console.log(`   - Eliminando cache: ${name}`)
          return caches.delete(name)
        }))
      }
      
      console.log('✅ Service Worker y caches limpiados. Recarga la página (Ctrl+Shift+R)')
      console.log('💡 O ejecuta: location.reload(true)')
    } catch (error) {
      console.error('❌ Error limpiando Service Worker:', error)
    }
  } else {
    console.log('⚠️  Service Worker no está disponible en este navegador')
  }
})()


