"use client"

import { useAuth } from "@/contexts/auth-context"
import { useEffect, useState } from "react"
import { authenticatedFetch, buildApiUrl } from "@/lib/api"
import { authService } from "@/lib/auth-service"

export function AuthDebug() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [testResults, setTestResults] = useState<any>({})
  const [isTesting, setIsTesting] = useState(false)

  const testEndpoints = async () => {
    setIsTesting(true)
    const results: any = {}

    try {
      // Probar endpoint de progreso
      try {
        const accessToken = authService.getAccessToken()
        const response = await authenticatedFetch(buildApiUrl('progress-photos/'), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })
        results.progressPhotos = {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText
        }
      } catch (error: any) {
        results.progressPhotos = {
          error: error.message,
          status: 'error'
        }
      }

      // Probar endpoint de nutrición
      try {
        const accessToken = authService.getAccessToken()
        const response = await authenticatedFetch(buildApiUrl('daily-meal-selections/today/'), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })
        results.nutrition = {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText
        }
      } catch (error: any) {
        results.nutrition = {
          error: error.message,
          status: 'error'
        }
      }

      // Probar endpoint de usuario
      try {
        const accessToken = authService.getAccessToken()
        const response = await authenticatedFetch(buildApiUrl('me/'), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })
        results.user = {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText
        }
      } catch (error: any) {
        results.user = {
          error: error.message,
          status: 'error'
        }
      }

      setTestResults(results)
    } catch (error) {
      console.error('Error en pruebas:', error)
    } finally {
      setIsTesting(false)
    }
  }

  if (isLoading) {
    return <div>Cargando...</div>
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">Debug de Autenticación</h3>
      
      <div className="mb-4">
        <p><strong>Estado:</strong> {isAuthenticated ? 'Autenticado' : 'No autenticado'}</p>
        <p><strong>Usuario:</strong> {user?.email || 'Ninguno'}</p>
        <p><strong>Token:</strong> {authService.getAccessToken() ? `${authService.getAccessToken()?.substring(0, 20)}...` : 'Ninguno'}</p>
      </div>

      <button
        onClick={testEndpoints}
        disabled={isTesting || !isAuthenticated}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
      >
        {isTesting ? 'Probando...' : 'Probar Endpoints'}
      </button>

      {Object.keys(testResults).length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Resultados de las Pruebas:</h4>
          <pre className="bg-white p-2 rounded text-sm overflow-auto">
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
