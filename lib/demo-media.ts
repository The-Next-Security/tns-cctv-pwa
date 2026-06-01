const EVENT_SNAPSHOTS: Record<string, string> = {
  intrusion: '/demo/snapshot-perimetro.jpg',
  velocidad: '/demo/snapshot-velocidad.jpg',
  acceso:    '/demo/snapshot-acceso.jpg',
  movimiento:'/demo/snapshot-industrial.jpg',
  persona:   '/demo/snapshot-industrial.jpg',
  vehiculo:  '/demo/snapshot-velocidad.jpg',
  objeto:    '/demo/snapshot-acceso.jpg',
}

export function resolveSnapshotUrl(
  snapshotUrl?: string | null,
  eventType?: string | null
): string {
  if (snapshotUrl?.startsWith('/demo/')) {
    return snapshotUrl
  }

  if (eventType && EVENT_SNAPSHOTS[eventType]) {
    return EVENT_SNAPSHOTS[eventType]
  }

  return '/demo/snapshot-generic.jpg'
}

export const DEMO_LIVE_FEED_URL = '/demo/live-feed-loop.mp4'
export const DEMO_EVIDENCE_SPEED_URL = '/demo/evidence-speed.jpg'
export const DEMO_PERIMETER_INTRUSION_LIVE_URL =
  '/demo/Person_scaling_chain-link_fence.mp4'

export function resolveLiveFeedUrl(params?: {
  cameraName?: string | null
  eventCode?: string | null
  eventType?: string | null
  videoUrl?: string | null
}): string {
  if (params?.videoUrl?.startsWith('/demo/')) {
    return params.videoUrl
  }

  if (
    params?.cameraName === 'CAM-PER-N01' &&
    (params?.eventCode === 'CrossLineDetection' || params?.eventType === 'intrusion')
  ) {
    return DEMO_PERIMETER_INTRUSION_LIVE_URL
  }

  return DEMO_LIVE_FEED_URL
}
