// Script para limpiar datos del usuario en localStorage
// Copia y pega esto en la consola del navegador (F12 > Console)

(function clearUserData() {
  
  const keysToRemove = []
  
  // Buscar todas las claves relacionadas con comidas
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && (
      key.startsWith('meal-selections-') ||
      key.startsWith('daily-meals-') ||
      key.includes('meal') ||
      key.includes('nutrition') ||
      key.includes('daily')
    )) {
      keysToRemove.push(key)
    }
  }
  
  // Eliminar claves encontradas
  keysToRemove.forEach(key => {
    localStorage.removeItem(key)
  })
  
  // También limpiar Service Worker y caches
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(reg => reg.unregister())
    })
  }
  
  if ('caches' in window) {
    caches.keys().then(cacheNames => {
      cacheNames.forEach(name => {
        caches.delete(name)
      })
    })
  }
  
})()

