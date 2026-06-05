import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Inter, DM_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/components/providers/auth-provider'
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

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-dm-sans',
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
  keywords: ['seguridad', 'monitoreo', 'alertas', 'CCTV', 'vigilancia', 'TNS', 'The Next Security'],
  authors: [{ name: 'The Next Security' }],
  icons: {
    icon: '/brand/tns-logo.png',
    apple: '/brand/tns-logo.png',
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
      suppressHydrationWarning
    >
      <head>
        {/* bm-design-system:start — blocking theme boot before paint */}
        <script
          id="bm-ds-theme-boot"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('bm-ds-theme');var t=s==='light'||s==='dark'||s==='system'?s:'system';var r=t==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;if(r==='dark')document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
        {/* bm-design-system:end */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${dmSans.variable} font-ds-body antialiased bg-ds-page text-ds-ink-body`}
        suppressHydrationWarning
      >
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
