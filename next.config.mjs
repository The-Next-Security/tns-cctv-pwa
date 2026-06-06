/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  allowedDevOrigins: [
    '*.trycloudflare.com',
    '*.ngrok-free.dev',
    '*.ngrok-free.app',
    '*.ngrok.app',
    '*.ngrok.io',
    // Dominio del tunnel nombrado (ajusta si usas otro subdominio)
    'cctv-dev.thenextsecurity.cl',
    '*.thenextsecurity.cl',
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
