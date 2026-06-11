import type { Alert } from './types'

function resolveAlertDateValue(alert: Alert): number {
  const candidate = alert.timestamp || alert.created_at
  const value = candidate ? Date.parse(candidate) : Number.NaN

  return Number.isNaN(value) ? 0 : value
}

export function sortAlertsByMostRecent(alerts: Alert[]): Alert[] {
  return [...alerts].sort((left, right) => resolveAlertDateValue(right) - resolveAlertDateValue(left))
}
