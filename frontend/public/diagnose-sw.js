// Script de diagnóstico para el error "Cannot access 'O' before initialization"
// Ejecuta esto en la consola del navegador (F12 > Console)

console.log('🔍 DIAGNÓSTICO DEL ERROR');
console.log('=======================\n');

// 1. Verificar qué chunk se está cargando
console.log('1️⃣ CHUNKS CARGADOS:');
const scripts = Array.from(document.scripts);
const chunk8836 = scripts.find(s => s.src.includes('8836-'));
if (chunk8836) {
  const match = chunk8836.src.match(/8836-([a-f0-9]+)\.js/);
  if (match) {
    console.log('   Chunk 8836 cargado:', match[1]);
    console.log('   URL completa:', chunk8836.src);
    
    // Verificar si es el chunk viejo problemático
    if (match[1] === '283b29e2201483ee') {
      console.log('   ❌ PROBLEMA: Chunk VIEJO detectado (283b29e2201483ee)');
      console.log('   ✅ Debería ser: b5fb840832b79a66 (build nuevo)');
    } else if (match[1] === 'b5fb840832b79a66') {
      console.log('   ✅ Chunk CORRECTO (build nuevo)');
    } else {
      console.log('   ⚠️  Chunk diferente:', match[1]);
    }
  }
} else {
  console.log('   ⚠️  No se encontró chunk 8836 en los scripts cargados');
}

// 2. Verificar Service Worker
console.log('\n2️⃣ SERVICE WORKER:');
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    console.log('   Service Workers registrados:', regs.length);
    regs.forEach((reg, i) => {
      console.log(`   SW ${i + 1}:`, reg.scope);
      console.log(`      Estado:`, reg.active?.state || 'No activo');
      if (reg.installing) console.log(`      Instalando:`, reg.installing.state);
      if (reg.waiting) console.log(`      Esperando:`, reg.waiting.state);
    });
    
    if (regs.length > 0) {
      console.log('\n   💡 Para limpiar, ejecuta:');
      console.log('      navigator.serviceWorker.getRegistrations().then(r => r.forEach(reg => reg.unregister()))');
    }
  });
} else {
  console.log('   ⚠️  Service Worker no disponible');
}

// 3. Verificar Caches
console.log('\n3️⃣ CACHES:');
if ('caches' in window) {
  caches.keys().then(keys => {
    console.log('   Caches encontrados:', keys.length);
    keys.forEach(key => {
      console.log(`   - ${key}`);
    });
    
    if (keys.length > 0) {
      console.log('\n   💡 Para limpiar, ejecuta:');
      console.log('      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))');
    }
  });
} else {
  console.log('   ⚠️  Cache API no disponible');
}

// 4. Verificar buildId en Network
console.log('\n4️⃣ BUILD ID:');
console.log('   💡 Abre DevTools > Network > Filtra por "8836"');
console.log('   💡 Verifica qué chunk se está descargando');
console.log('   💡 Revisa los headers de respuesta (Cache-Control)');

// 5. Instrucciones
console.log('\n📋 PASOS SIGUIENTES:');
console.log('   1. Abre DevTools > Sources > Busca el chunk 8836-*.js');
console.log('   2. Busca "O=" para encontrar la definición');
console.log('   3. Busca "[...,O,...]" ANTES de "O=" para encontrar el problema');
console.log('   4. Si encuentras el problema, compara con el código fuente');
console.log('   5. Limpia Service Worker y caches (comandos arriba)');
console.log('   6. Recarga con Ctrl+Shift+R (hard refresh)');

console.log('\n✅ Diagnóstico completado');

