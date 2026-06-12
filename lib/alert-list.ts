import type { Alert, Criticality } from './types'

export type AlertSortBy = 'recientes' | 'antiguas' | 'criticidad' | 'sin_atender' | 'zona'

export const ALERT_SORT_LABELS: Record<AlertSortBy, string> = {
  recientes: 'Más recientes',
  antiguas: 'Más antiguas',
  criticidad: 'Criticidad (crítica → baja)',
  sin_atender: 'Tiempo sin atender',
  zona: 'Zona (A → Z)',
}

export const ALERT_SORT_OPTIONS = Object.keys(ALERT_SORT_LABELS) as AlertSortBy[]

/** Mapa opcional zone_id → nombre, para ordenar por zona cuando la alerta no trae la relación expandida */
export type ZoneNameMap = Record<number, string>

/** Ventana SLA operativa: toda alerta debería resolverse dentro de las 48h (D12) */
export const SLA_WINDOW_MS = 48 * 60 * 60 * 1000

const OPEN_STATUSES: ReadonlyArray<Alert['status']> = ['pendiente', 'en_revision', 'escalada']

/**
 * Una alerta abierta que superó la ventana SLA de 48h está "vencida": nunca se
 * archiva, se destaca para que no desaparezca del radar operativo (D12).
 */
export function isSlaOverdue(alert: Alert, now: number = Date.now()): boolean {
  if (!OPEN_STATUSES.includes(alert.status)) return false
  const created = resolveAlertDateValue(alert)
  if (created === 0) return false
  return now - created > SLA_WINDOW_MS
}

const CRITICALITY_RANK: Record<Criticality, number> = {
  critica: 0,
  alta: 1,
  media: 2,
  baja: 3,
}

function resolveAlertDateValue(alert: Alert): number {
  const candidate = alert.timestamp || alert.created_at
  const value = candidate ? Date.parse(candidate) : Number.NaN

  return Number.isNaN(value) ? 0 : value
}

function resolveCriticalityRank(alert: Alert): number {
  return CRITICALITY_RANK[alert.criticality] ?? CRITICALITY_RANK.baja
}

function resolveAlertZoneName(alert: Alert, zoneNames?: ZoneNameMap): string {
  if (alert.zone?.name) return alert.zone.name
  if (alert.zone_id != null && zoneNames?.[alert.zone_id]) return zoneNames[alert.zone_id]
  return ''
}

function compareByMostRecent(left: Alert, right: Alert): number {
  return resolveAlertDateValue(right) - resolveAlertDateValue(left)
}

function compareByOldest(left: Alert, right: Alert): number {
  return resolveAlertDateValue(left) - resolveAlertDateValue(right)
}

function compareByCriticality(left: Alert, right: Alert): number {
  return resolveCriticalityRank(left) - resolveCriticalityRank(right) || compareByMostRecent(left, right)
}

/** Pendientes primero (la más antigua arriba: es la que lleva más tiempo sin atender); el resto, más recientes primero */
function compareByUnattended(left: Alert, right: Alert): number {
  const leftPending = left.status === 'pendiente' ? 0 : 1
  const rightPending = right.status === 'pendiente' ? 0 : 1

  if (leftPending !== rightPending) return leftPending - rightPending
  return leftPending === 0 ? compareByOldest(left, right) : compareByMostRecent(left, right)
}

function makeZoneComparator(zoneNames?: ZoneNameMap) {
  return (left: Alert, right: Alert): number => {
    const leftName = resolveAlertZoneName(left, zoneNames)
    const rightName = resolveAlertZoneName(right, zoneNames)

    // Alertas sin zona conocida van al final
    if (!leftName || !rightName) {
      if (leftName === rightName) return compareByCriticality(left, right)
      return leftName ? -1 : 1
    }

    return leftName.localeCompare(rightName, 'es') || compareByCriticality(left, right)
  }
}

export function sortAlerts(alerts: Alert[], sortBy: AlertSortBy, zoneNames?: ZoneNameMap): Alert[] {
  const comparator =
    sortBy === 'antiguas' ? compareByOldest
    : sortBy === 'criticidad' ? compareByCriticality
    : sortBy === 'sin_atender' ? compareByUnattended
    : sortBy === 'zona' ? makeZoneComparator(zoneNames)
    : compareByMostRecent

  return [...alerts].sort(comparator)
}

export function sortAlertsByMostRecent(alerts: Alert[]): Alert[] {
  return sortAlerts(alerts, 'recientes')
}
