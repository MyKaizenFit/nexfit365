// lib/push-service.ts
// Servicio para gestionar suscripciones push notifications

import { buildApiUrl, getAuthHeaders, authenticatedFetch } from './api'

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface PushSubscriptionResponse {
  id: string
  user: number
  endpoint: string
  created_at: string
}

class PushService {
  /**
   * Solicitar permisos para notificaciones push
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Este navegador no soporta notificaciones')
    }

    if (Notification.permission === 'granted') {
      return 'granted'
    }

    if (Notification.permission === 'denied') {
      throw new Error('Los permisos de notificación fueron denegados')
    }

    const permission = await Notification.requestPermission()
    return permission
  }

  /**
   * Verificar si el navegador soporta Service Worker y Push
   */
  isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    )
  }

  /**
   * Obtener la suscripción push del usuario
   */
  async getSubscription(): Promise<PushSubscription | null> {
    if (!this.isSupported()) {
      return null
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      return subscription
    } catch (error) {
      return null
    }
  }

  /**
   * Crear una nueva suscripción push
   */
  async subscribe(): Promise<PushSubscription> {
    if (!this.isSupported()) {
      throw new Error('Push notifications no están soportadas en este navegador')
    }

    // Solicitar permisos primero
    const permission = await this.requestPermission()
    if (permission !== 'granted') {
      throw new Error('Permisos de notificación denegados')
    }

    try {
      const registration = await navigator.serviceWorker.ready

      // Obtener clave pública del servidor (VAPID key)
      const vapidPublicKey = await this.getVapidPublicKey()

      // Convertir clave VAPID a formato Uint8Array
      const applicationServerKey = this.urlBase64ToUint8Array(vapidPublicKey)

      // Crear suscripción
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as unknown as BufferSource
      })

      return subscription
    } catch (error) {
      throw error
    }
  }

  /**
   * Cancelar suscripción push
   */
  async unsubscribe(): Promise<boolean> {
    try {
      const subscription = await this.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
        return true
      }
      return false
    } catch (error) {
      return false
    }
  }

  /**
   * Enviar suscripción al backend
   */
  async sendSubscriptionToBackend(subscription: PushSubscription): Promise<PushSubscriptionResponse> {
    const subscriptionData: PushSubscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
      }
    }

    const headers = await getAuthHeaders()
    const response = await authenticatedFetch('notifications/push-subscriptions/', {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscriptionData)
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Error desconocido' }))
      throw new Error(error.error || `Error ${response.status}`)
    }

    return await response.json()
  }

  /**
   * Eliminar suscripción del backend
   */
  async removeSubscriptionFromBackend(subscriptionId: string): Promise<void> {
    const headers = await getAuthHeaders()
    const response = await authenticatedFetch(`notifications/push-subscriptions/${subscriptionId}/`, {
      method: 'DELETE',
      headers
    })

    if (!response.ok) {
      throw new Error(`Error eliminando suscripción: ${response.status}`)
    }
  }

  /**
   * Obtener todas las suscripciones del usuario
   */
  async getUserSubscriptions(): Promise<PushSubscriptionResponse[]> {
    const headers = await getAuthHeaders()
    const response = await authenticatedFetch('notifications/push-subscriptions/', {
      headers
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return data.results || data || []
  }

  /**
   * Obtener clave VAPID pública: primero de env, si no del backend
   */
  private async getVapidPublicKey(): Promise<string> {
    const envKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (envKey && envKey.length > 10) {
      return envKey
    }
    // Fallback: obtener del backend
    try {
      const response = await fetch('/api/notifications/push-subscriptions/vapid-public-key/')
      if (response.ok) {
        const data = await response.json()
        return data.vapid_public_key
      }
    } catch {}
    throw new Error('No se pudo obtener la clave VAPID del servidor')
  }

  /**
   * Convertir clave VAPID de base64 URL a Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }

    return outputArray
  }

  /**
   * Convertir ArrayBuffer a base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }
}

export const pushService = new PushService()






