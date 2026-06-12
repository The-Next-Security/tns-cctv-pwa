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
    // QA-07 (#48): Chrome exige íconos cuadrados 192×192 y 512×512 (purpose any)
    // para ofrecer la instalación; los maskable cubren el recorte de Android.
    icons: [
      {
        src: '/brand/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/brand/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/brand/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/brand/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
