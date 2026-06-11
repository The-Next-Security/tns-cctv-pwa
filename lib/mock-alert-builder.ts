import type { Alert, AlertStatus, Camera, Rule, Zone } from './types'
import { getAlertClass } from './types'

const DEMO_SNAPSHOTS: Record<string, string> = {
  intrusion: '/demo/snapshot-perimetro.jpg',
  velocidad: '/demo/snapshot-velocidad.jpg',
  acceso: '/demo/snapshot-acceso.jpg',
  movimiento: '/demo/snapshot-industrial.jpg',
  persona: '/demo/snapshot-industrial.jpg',
  vehiculo: '/demo/snapshot-velocidad.jpg',
  objeto: '/demo/snapshot-acceso.jpg',
  salud: '/demo/snapshot-generic.jpg',
}

export type RuleAlertSeed = {
  ruleId: number
  /** Usar el primer codigo de la regla si se omite */
  event_code?: string
  status: AlertStatus
  /** Timestamp relativo a ahora (alertas live) */
  minutesAgo?: number
  /** Hora del dia para historico; si aun no ocurrio hoy, se usa ayer */
  hour?: number
  minute?: number
  /** Zona cuando la regla es global (zone_id null) */
  zone_id?: number
  note?: string
  plate?: string
  assigned_to?: string
  resolution_notes?: string
}

function eventTypeForCode(code: string): string {
  if (code === 'TrafficOverSpeed') return 'velocidad'
  if (code.startsWith('Traffic')) return 'vehiculo'
  if (code === 'SmartMotionHuman' || code === 'SmartMotionVehicle' || code === 'VideoMotion') {
    return 'movimiento'
  }
  if (code === 'WanderDetection') return 'persona'
  if (code === 'LeftDetection' || code === 'TakenAwayDetection') return 'objeto'
  if (code === 'CrossLineDetection') return 'intrusion'
  if (code === 'CrossRegionDetection') return 'acceso'
  if (code === 'VideoBlind' || code === 'VideoLoss' || code === 'StorageFailure' || code === 'StorageLowSpace') {
    return 'salud'
  }
  return 'intrusion'
}

function demoSnapshot(eventType: string): string {
  return DEMO_SNAPSHOTS[eventType] ?? '/demo/snapshot-generic.jpg'
}

function minutesAgoIso(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString()
}

/** Hora de hoy en el pasado; si la hora aun no llega, usa el dia anterior */
export function timestampAtPastHour(hour: number, minute = 0): string {
  const now = new Date()
  const date = new Date()
  date.setHours(hour, minute, 0, 0)
  if (date.getTime() > now.getTime()) {
    date.setDate(date.getDate() - 1)
  }
  return date.toISOString()
}

function resolvedAtIso(fromIso: string, minutesAfter = 25): string {
  const date = new Date(fromIso)
  date.setMinutes(date.getMinutes() + minutesAfter)
  return date.toISOString()
}

function pickCamera(cameras: Camera[], zoneId: number): Camera {
  return cameras.find(c => c.zone_id === zoneId) ?? cameras[0]
}

function resolveZone(zones: Zone[], zoneId: number): Zone {
  return zones.find(z => z.id === zoneId) ?? zones[0]
}

export function buildAlertFromRule(
  seed: RuleAlertSeed,
  id: number,
  rules: Rule[],
  zones: Zone[],
  cameras: Camera[]
): Alert {
  const rule = rules.find(r => r.id === seed.ruleId)
  if (!rule) {
    throw new Error(`Mock alert seed: regla ${seed.ruleId} no encontrada`)
  }

  const event_code = seed.event_code ?? rule.event_codes?.[0] ?? rule.event_code_pattern
  const zone_id = rule.zone_id ?? seed.zone_id ?? zones[0].id
  const zone = resolveZone(zones, zone_id)
  const camera = pickCamera(cameras, zone_id)
  const event_type = eventTypeForCode(event_code)

  const timestamp =
    seed.minutesAgo != null
      ? minutesAgoIso(seed.minutesAgo)
      : timestampAtPastHour(seed.hour ?? 12, seed.minute ?? 0)

  const isResolved =
    seed.status === 'resuelta' || seed.status === 'descartada' || seed.status === 'escalada'

  const description = seed.note ? `${rule.name} — ${seed.note}` : rule.name

  return {
    id,
    external_event_id: `mock-${id}`,
    rule_id: rule.id,
    rule,
    event_type,
    event_code,
    criticality: rule.criticality,
    status: seed.status,
    zone_id: zone.id,
    zone,
    camera_id: camera.id,
    camera: { ...camera, zone_id: zone.id },
    timestamp,
    snapshot_url: demoSnapshot(event_type),
    description,
    plate: seed.plate,
    assigned_to: seed.assigned_to,
    resolved_at: isResolved ? resolvedAtIso(timestamp) : null,
    resolution_notes: seed.resolution_notes,
    alert_class: getAlertClass(rule.criticality),
  }
}

export function buildAlertsFromRuleSeeds(
  seeds: RuleAlertSeed[],
  startId: number,
  rules: Rule[],
  zones: Zone[],
  cameras: Camera[]
): Alert[] {
  return seeds.map((seed, index) => buildAlertFromRule(seed, startId + index, rules, zones, cameras))
}
