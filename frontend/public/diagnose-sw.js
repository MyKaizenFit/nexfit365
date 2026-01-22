// Script de diagnóstico para el error "Cannot access 'O' before initialization"
// Ejecuta esto en la consola del navegador (F12 > Console)


// 1. Verificar qué chunk se está cargando
const scripts = Array.from(document.scripts);
const chunk8836 = scripts.find(s => s.src.includes('8836-'));
if (chunk8836) {
  const match = chunk8836.src.match(/8836-([a-f0-9]+)\.js/);
  if (match) {
    
    // Verificar si es el chunk viejo problemático
    if (match[1] === '283b29e2201483ee') {
    } else if (match[1] === 'b5fb840832b79a66') {
    } else {
    }
  }
} else {
}

// 2. Verificar Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach((reg, i) => {
      if (reg.installing) console.log(`      Instalando:`, reg.installing.state);
      if (reg.waiting) console.log(`      Esperando:`, reg.waiting.state);
    });
    
    if (regs.length > 0) {
    }
  });
} else {
}

// 3. Verificar Caches
if ('caches' in window) {
  caches.keys().then(keys => {
    keys.forEach(key => {
    });
    
    if (keys.length > 0) {
    }
  });
} else {
}

// 4. Verificar buildId en Network

// 5. Instrucciones


