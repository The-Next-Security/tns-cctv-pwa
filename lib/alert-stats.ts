import type { Alert } from './types'

/** Franjas de 2 h usadas en el panel lateral de operación (06:00–22:00) */
export const OPERACION_HOURLY_SLOTS = [6, 8, 10, 12, 14, 16, 18, 20, 22] as const

export type HourlyAlertBar = {
  label: string
  hour: number
  value: number
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Agrupa alertas del día calendario actual en franjas horarias de 2 h */
export function groupAlertsByHourSlot(alerts: Alert[]): HourlyAlertBar[] {
  const now = new Date()

  const todayAlerts = alerts.filter(alert =>
    isSameCalendarDay(new Date(alert.timestamp), now)
  )

  return OPERACION_HOURLY_SLOTS.map(hour => {
    const value = todayAlerts.filter(alert => {
      const alertHour = new Date(alert.timestamp).getHours()
      return alertHour >= hour && alertHour < hour + 2
    }).length

    return {
      label: `${String(hour).padStart(2, '0')}h`,
      hour,
      value,
    }
  })
}

export function countAlertsToday(alerts: Alert[]): number {
  const now = new Date()
  return alerts.filter(alert => isSameCalendarDay(new Date(alert.timestamp), now)).length
}
