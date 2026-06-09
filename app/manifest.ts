import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TNS Track - Sistema de Monitoreo de Seguridad',
    short_name: 'TNS Track',
    description:
      'Consola de operaciones de seguridad para Parque Industrial Agrolivo. Monitoreo en tiempo real, gestion de alertas y registro vehicular.',
    start_url: '/operacion',
    display: 'standalone',
    background_color: '#121212',
    theme_color: '#121212',
    lang: 'es',
    icons: [
      {
        src: '/brand/tns-logo.png',
        sizes: '800x250',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/brand/tns-logo.png',
        sizes: '800x250',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
