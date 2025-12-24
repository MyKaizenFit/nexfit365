import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { AuthProvider } from '@/contexts/auth-context'
import { Toaster } from '@/components/ui/toaster'
import { NotificationContainer } from '@/components/ui/notification-toast'
import { BetaBanner } from '@/components/beta-banner'
import { RegisterServiceWorker } from './register-sw'
// import { ThemeProvider } from '@/components/theme-provider'  // Deshabilitado para esta versión

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001'),
  title: 'NEXFIT - Tu Compañero de Fitness',
  description: 'Aplicación completa de fitness y bienestar para gestionar entrenamientos, nutrición y progreso',
  generator: 'NEXFIT v1.0',
  keywords: 'fitness, entrenamiento, nutrición, progreso, bienestar',
  authors: [{ name: 'NEXFIT Team' }],
  icons: {
    icon: '/icono.png',
    apple: '/icono.png',
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
        {/* ThemeProvider deshabilitado para esta versión
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        > */}
          <AuthProvider>
            {children}
            <Toaster />
            <NotificationContainer />
          </AuthProvider>
        {/* </ThemeProvider> */}
      </body>
    </html>
  )
}
