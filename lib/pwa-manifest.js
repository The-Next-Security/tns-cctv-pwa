const manifest = {
  name: 'TNS Track',
  short_name: 'TNS Track',
  description: 'Consola de operaciones de seguridad para Parque Industrial Agrolivo.',
  start_url: '/operacion',
  scope: '/operacion',
  display: 'standalone',
  background_color: '#121212',
  theme_color: '#121212',
  icons: [
    {
      src: '/brand/pwa/icon-192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/brand/pwa/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/brand/pwa/icon-512-maskable.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
}

module.exports = { manifest }
