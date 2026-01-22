"use client"

import { useState, useEffect } from "react"

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Estado para almacenar nuestro valor
  // Pasa la función inicial al useState para que solo se ejecute una vez
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue
    }
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      return initialValue
    }
  })

  // Función para establecer el valor tanto en el estado como en localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Permite que el valor sea una función para que tengamos la misma API que useState
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      // Guarda en localStorage
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
    }
  }

  return [storedValue, setValue] as const
}

// Hook específico para notificaciones
export function useNotifications() {
  const [notifications, setNotifications] = useLocalStorage("notifications", [
    {
      id: "1",
      type: "meal" as const,
      title: "Hora de almorzar",
      message: "Es hora de tu almuerzo. ¡No olvides registrar tu comida!",
      time: "hace 30 min",
      read: false,
      actionable: true,
    },
    {
      id: "2",
      type: "achievement" as const,
      title: "¡Nuevo logro desbloqueado!",
      message: "Has completado 7 días seguidos registrando tus comidas",
      time: "hace 2 horas",
      read: false,
    },
    {
      id: "3",
      type: "workout" as const,
      title: "Entrenamiento programado",
      message: "Tu sesión de piernas está programada para las 18:00",
      time: "hace 4 horas",
      read: true,
    },
    {
      id: "4",
      type: "reminder" as const,
      title: "Recordatorio de peso",
      message: "No olvides registrar tu peso semanal",
      time: "ayer",
      read: true,
    },
    {
      id: "5",
      type: "system" as const,
      title: "Actualización disponible",
      message: "Nueva versión de la app disponible con mejoras",
      time: "hace 2 días",
      read: false,
    },
  ])

  const addNotification = (notification: Omit<typeof notifications[0], "id">) => {
    const newNotification = {
      ...notification,
      id: Date.now().toString(),
    }
    setNotifications(prev => [newNotification, ...prev] as typeof prev)
  }

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } as typeof n : n)
    )
  }

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true } as typeof n)))
  }

  const clearAll = () => {
    setNotifications([])
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    deleteNotification,
    markAllAsRead,
    clearAll,
  }
}

// Hook específico para el perfil del usuario
export function useUserProfile() {
  const [profile, setProfile] = useLocalStorage("userProfile", {
    name: "Juan Pérez",
    email: "juan.perez@email.com",
    phone: "+34 612 345 678",
    location: "Madrid, España",
    birthDate: "1995-06-15",
    bio: "Apasionado por el fitness y la vida saludable. Siempre buscando nuevos desafíos.",
    age: 28,
    height: 175,
    currentWeight: 72.5,
    targetWeight: 70,
    activityLevel: "moderate" as const,
    goals: ["weight_loss", "muscle_gain"] as const,
  })

  const updateProfile = (updates: Partial<typeof profile>) => {
    setProfile(prev => ({ ...prev, ...updates }))
  }

  return {
    profile,
    updateProfile,
  }
}

// Hook específico para configuraciones
export function useSettings() {
  const [settings, setSettings] = useLocalStorage("userSettings", {
    notifications: {
      email: true,
      push: true,
      sms: false,
      weekly: true,
      achievements: true,
      reminders: true,
    },
    privacy: {
      profile_public: false,
      progress_visible: true,
      stats_shared: false,
      location_tracking: false,
    },
    appearance: {
      dark_mode: false,
      compact_view: false,
      animations: true,
      high_contrast: false,
    },
  })

  const updateSetting = (category: keyof typeof settings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }))
  }

  return {
    settings,
    updateSetting,
  }
}
