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

// D9: suscripción Web Push real (VAPID). Se registra contra el backend para
// que el servidor pueda notificar aunque la PWA esté cerrada.
export async function registerPushSubscription(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false
  }
  if (!canNotify()) return false

  try {
    const { push: pushApi } = await import('./api')
    const { enabled, public_key } = await pushApi.publicKey()
    if (!enabled || !public_key) return false

    const registration = await navigator.serviceWorker.ready
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(public_key),
      }))

    await pushApi.subscribe(subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } })
    return true
  } catch {
    return false
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(new ArrayBuffer(rawData.length))
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i)
  }
  return output
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
