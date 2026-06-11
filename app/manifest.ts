import type { MetadataRoute } from 'next'
import { manifest } from '@/lib/pwa-manifest'

export default function pwaManifest(): MetadataRoute.Manifest {
  return manifest
}
