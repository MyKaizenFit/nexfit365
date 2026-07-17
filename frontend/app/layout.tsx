import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { AuthProvider } from '@/contexts/auth-context'
import { Toaster } from '@/components/ui/toaster'
import { NotificationContainer } from '@/components/ui/notification-toast'
import { RegisterServiceWorker } from './register-sw'
import { ClientVersionGuard } from './client-version-guard'
import { ThemeProvider } from '@/components/theme-provider'
import { CookieBanner } from '@/components/cookie-banner'

const frontendBaseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL
  || (process.env.NODE_ENV === 'production'
    ? 'https://nexfit365.dpdns.org'
    : 'http://localhost:3000')

const pwaEnabled = (process.env.NEXT_PUBLIC_ENABLE_PWA || '').toLowerCase() === 'true'

export const metadata: Metadata = {
  metadataBase: new URL(frontendBaseUrl),
  title: 'NEXFIT - Tu Compañero de Entrenamiento',
  description: 'Aplicación completa de entrenamiento y bienestar para gestionar entrenamientos, nutrición y progreso',
  generator: 'NEXFIT v1.0',
  keywords: 'entrenamiento, nutrición, progreso, bienestar',
  authors: [{ name: 'NEXFIT Team' }],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icono.png?v=3', type: 'image/png', sizes: '32x32' },
      { url: '/icono.png?v=3', type: 'image/png', sizes: '192x192' },
      { url: '/icono.png?v=3', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: ['/icono.png?v=3'],
    apple: [{ url: '/apple-touch-icon.png?v=3', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.json',
  other: {
    'theme-color': '#14b8a6',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#14b8a6',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={GeistSans.className}>
        {!pwaEnabled ? (
          <Script id="disable-stale-service-workers" strategy="beforeInteractive">
            {`
              (function () {
                if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

                var clearWorkers = function () {
                  navigator.serviceWorker.getRegistrations()
                    .then(function (registrations) {
                      return Promise.all(registrations.map(function (registration) {
                        return registration.unregister().catch(function () { return false; });
                      }));
                    })
                    .catch(function () {});

                  if ('caches' in window) {
                    caches.keys()
                      .then(function (keys) {
                        return Promise.all(keys.map(function (key) {
                          return caches.delete(key).catch(function () { return false; });
                        }));
                      })
                      .catch(function () {});
                  }
                };

                clearWorkers();
                navigator.serviceWorker.ready.then(clearWorkers).catch(function () {});
              })();
            `}
          </Script>
        ) : null}
        <RegisterServiceWorker />
        <ClientVersionGuard />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster />
            <NotificationContainer />
          </AuthProvider>
                  <CookieBanner />
        </ThemeProvider>
      </body>
    </html>
  )
}
