import type { MetadataRoute } from 'next'
import { appPath } from '@/lib/app-path'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NexFit365 - Tu Compañero de Entrenamiento',
    short_name: 'NexFit365',
    description:
      'Aplicación completa de entrenamiento y bienestar para gestionar entrenamientos, nutrición y progreso',

    start_url: appPath('/'),
    scope: appPath('/'),

    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#14b8a6',
    orientation: 'portrait-primary',

    icons: [
      {
        src: appPath('/icono.png?v=3'),
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: appPath('/icono.png?v=3'),
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: appPath('/icono.png?v=3'),
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: appPath('/icono.png?v=3'),
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],

    categories: ['health', 'fitness', 'lifestyle'],

    shortcuts: [
      {
        name: 'Dashboard',
        short_name: 'Dashboard',
        description: 'Ver tu dashboard principal',
        url: appPath('/dashboard'),
        icons: [
          {
            src: appPath('/icono.png'),
            sizes: '192x192',
          },
        ],
      },
      {
        name: 'Entrenamientos',
        short_name: 'Entrenar',
        description: 'Ver tus entrenamientos',
        url: appPath('/dashboard?section=workouts-3'),
        icons: [
          {
            src: appPath('/icono.png'),
            sizes: '192x192',
          },
        ],
      },
      {
        name: 'Comidas',
        short_name: 'Comidas',
        description: 'Ver tu plan nutricional',
        url: appPath('/dashboard?section=meals'),
        icons: [
          {
            src: appPath('/icono.png'),
            sizes: '192x192',
          },
        ],
      },
    ],
  }
}
