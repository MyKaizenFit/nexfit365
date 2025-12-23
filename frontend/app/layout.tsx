import type { Metadata } from 'next'
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
  title: 'NEXFIT - Tu Compañero de Fitness',
  description: 'Aplicación completa de fitness y bienestar para gestionar entrenamientos, nutrición y progreso',
  generator: 'NEXFIT v1.0',
  keywords: 'fitness, entrenamiento, nutrición, progreso, bienestar',
  authors: [{ name: 'NEXFIT Team' }],
  icons: {
    icon: '/icono.png',
    apple: '/icono.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#14b8a6" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icono.png" />
        <link rel="apple-touch-icon" href="/icono.png" />
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
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
