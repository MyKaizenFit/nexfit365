// Test simple para verificar el endpoint de fotos
// Ejecutar en el navegador o con Node.js

const testEndpoint = async () => {
  const token = 'TU_TOKEN_AQUI' // Reemplazar con un token válido
  
  try {
    console.log('🧪 Probando endpoint de fotos...')
    
    const response = await fetch('http://localhost:8000/api/progress-photos/', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('📥 Respuesta:', response.status, response.statusText)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Datos recibidos:', data)
      console.log('📸 Total de fotos:', Array.isArray(data) ? data.length : 'No es array')
    } else {
      console.error('❌ Error:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('📄 Error details:', errorText)
    }
  } catch (error) {
    console.error('💥 Error de conexión:', error)
  }
}

// Ejecutar el test
testEndpoint()






