import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { AuthProvider } from '@/contexts/auth-context'
import { Toaster } from '@/components/ui/toaster'
import { NotificationContainer } from '@/components/ui/notification-toast'
import { BetaBanner } from '@/components/beta-banner'
import { RegisterServiceWorker } from './register-sw'
import { ThemeProvider } from '@/components/theme-provider'
import { CookieBanner } from '@/components/cookie-banner'

const frontendBaseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL
  || (process.env.NODE_ENV === 'production'
    ? 'https://nexfit365.dpdns.org'
    : 'http://localhost:3000')

export const metadata: Metadata = {
  metadataBase: new URL(frontendBaseUrl),
  title: 'NEXFIT - Tu Compañero de Fitness',
  description: 'Aplicación completa de fitness y bienestar para gestionar entrenamientos, nutrición y progreso',
  generator: 'NEXFIT v1.0',
  keywords: 'fitness, entrenamiento, nutrición, progreso, bienestar',
  authors: [{ name: 'NEXFIT Team' }],
  icons: {
    icon: [
      { url: '/icono.png?v=2', type: 'image/png', sizes: '32x32' },
      { url: '/icono.png?v=2', type: 'image/png', sizes: '192x192' },
    ],
    shortcut: ['/icono.png?v=2'],
    apple: [{ url: '/icono.png?v=2', sizes: '180x180' }],
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
        <RegisterServiceWorker />
        <BetaBanner />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
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
