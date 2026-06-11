import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/components/providers/auth-provider'
import { DEFAULT_CONSOLE_THEME } from '@/lib/console-themes'
import './globals.css'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'TNS Track - Sistema de Monitoreo de Seguridad',
    template: '%s | TNS Track',
  },
  description: 'Consola de operaciones de seguridad para Parque Industrial Agrolivo. Monitoreo en tiempo real, gestion de alertas y registro vehicular.',
  generator: 'The Next Security',
  applicationName: 'TNS Track',
  manifest: '/manifest.webmanifest',
  keywords: ['seguridad', 'monitoreo', 'alertas', 'CCTV', 'vigilancia', 'TNS', 'The Next Security'],
  authors: [{ name: 'The Next Security' }],
  icons: {
    icon: '/brand/pwa/icon-192.png',
    apple: '/brand/pwa/icon-192.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#121212' },
    { media: '(prefers-color-scheme: dark)', color: '#121212' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      data-console-theme={DEFAULT_CONSOLE_THEME}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
