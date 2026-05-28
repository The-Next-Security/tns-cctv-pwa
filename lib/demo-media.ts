const EVENT_SNAPSHOTS: Record<string, string> = {
  intrusion: '/demo/snapshot-perimetro.svg',
  velocidad: '/demo/snapshot-velocidad.svg',
  acceso: '/demo/snapshot-acceso.svg',
  movimiento: '/demo/snapshot-industrial.svg',
  persona: '/demo/snapshot-industrial.svg',
  vehiculo: '/demo/snapshot-velocidad.svg',
  objeto: '/demo/snapshot-acceso.svg',
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

  return '/demo/snapshot-generic.svg'
}

export const DEMO_LIVE_FEED_URL = '/demo/snapshot-live.svg'
export const DEMO_EVIDENCE_SPEED_URL = '/demo/evidence-speed.svg'
