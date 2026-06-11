import type { Alert } from '@/lib/types'
import { getEventLabel } from '@/lib/types'

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported'

export function getNotificationSupport(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission
}

export function canNotify(): boolean {
  return typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted'
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  if (Notification.permission === 'granted') return 'granted'
  const result = await Notification.requestPermission()
  return result
}

export interface EscalationRecipient {
  name: string
  role: string
}

export async function sendEscalationNotification(
  alert: Alert,
  recipients: EscalationRecipient[],
  observation?: string
): Promise<boolean> {
  if (!canNotify()) return false

  const eventLabel = getEventLabel(alert.event_code)
  const zone = alert.zone?.name ?? 'Zona desconocida'
  const camera = alert.camera?.name ?? 'Cámara desconocida'
  const recipientNames = recipients.map(r => r.name).join(', ')

  const bodyLines = [
    `${zone} · ${camera}`,
    observation ? `"${observation}"` : `${eventLabel}`,
    `Notificado a: ${recipientNames}`,
  ]

  try {
    new Notification('🚨 Alerta Escalada — Atención Requerida', {
      body: bodyLines.join('\n'),
      icon: '/brand/tns-logo.png',
      tag: `escalation-alert-${alert.id}`,
      requireInteraction: true,
    })
    return true
  } catch {
    return false
  }
}
