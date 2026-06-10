'use client'

import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Check,
  CheckCircle2,
  Loader2,
  Phone,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { alerts as alertsApi } from '@/lib/api'
import {
  canNotify,
  requestNotificationPermission,
  sendEscalationNotification,
  type EscalationRecipient,
} from '@/lib/pwa-notifications'
import type { Alert, Role } from '@/lib/types'
import { ROLE_LABELS, getEventLabel } from '@/lib/types'
import {
  buildEscalationObservation,
  ESCALATION_CHECKLIST_ACTIONS,
  getEscalationContacts,
  toTelHref,
} from '@/lib/escalation'
import { AlertId } from '@/components/ui/alert-id'
import { useEscalationUsers } from '@/hooks/use-escalation-users'

interface EscalateSheetProps {
  alert: Alert | null
  onClose: () => void
  onSuccess: () => void
}

type Phase = 'checklist' | 'preview' | 'sending' | 'done'

interface DeliveryStatus {
  userId: string | number
  role: Role
  name: string
  state: 'pending' | 'sending' | 'sent'
}

export function EscalateSheet({ alert, onClose, onSuccess }: EscalateSheetProps) {
  const [checkedActions, setCheckedActions] = useState<string[]>([])
  const [observation, setObservation] = useState('')
  const [phase, setPhase] = useState<Phase>('checklist')
  const [delivery, setDelivery] = useState<DeliveryStatus[]>([])
  const { users: escalationUsers, reload: reloadEscalationUsers } = useEscalationUsers()

  useEffect(() => {
    if (alert) {
      void reloadEscalationUsers()
    }
  }, [alert?.id, reloadEscalationUsers])

  if (!alert) return null

  const currentAlert = alert
  const escalationContacts = getEscalationContacts(currentAlert.rule, escalationUsers)
  const escalationObservation = buildEscalationObservation(checkedActions, observation)
  const eventLabel = getEventLabel(alert.event_code)
  const zone = alert.zone?.name ?? 'Sin zona'
  const camera = alert.camera?.name ?? 'Sin cámara'
  const notificationsBlocked =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'denied'

  function toggleChecklistAction(action: string) {
    setCheckedActions(prev =>
      prev.includes(action)
        ? prev.filter(currentAction => currentAction !== action)
        : [...prev, action]
    )
  }

  function resetState() {
    setCheckedActions([])
    setObservation('')
    setPhase('checklist')
    setDelivery([])
  }

  function handleClose() {
    if (phase === 'done') {
      onSuccess()
    }
    resetState()
    onClose()
  }

  function handleOpenChange(open: boolean) {
    if (!open) handleClose()
  }

  async function handleSend() {
    setPhase('sending')

    const initialDelivery: DeliveryStatus[] = escalationContacts.map(contact => ({
      userId: contact.userId ?? contact.email ?? contact.name,
      role: contact.role,
      name: contact.name,
      state: 'pending',
    }))
    setDelivery(initialDelivery)

    alertsApi
      .attend(currentAlert.id, {
        action: 'escalada',
        observation: escalationObservation,
      })
      .catch(() => {
        // El flujo mock continúa aunque el backend no esté disponible.
      })

    const permission = await requestNotificationPermission()

    for (let index = 0; index < initialDelivery.length; index++) {
      await delay(300)
      setDelivery(prev =>
        prev.map((item, itemIndex) =>
          itemIndex === index ? { ...item, state: 'sending' } : item
        )
      )
      await delay(500 + index * 150)
      setDelivery(prev =>
        prev.map((item, itemIndex) =>
          itemIndex === index ? { ...item, state: 'sent' } : item
        )
      )
    }

    if (permission === 'granted') {
      const recipients: EscalationRecipient[] = escalationContacts.map(contact => ({
        name: contact.name,
        role: ROLE_LABELS[contact.role],
      }))
      await sendEscalationNotification(currentAlert, recipients, escalationObservation)
    }

    setPhase('done')
  }

  return (
    <Sheet open onOpenChange={handleOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-ds-ink-display">
            {phase === 'preview' && (
              <button
                type="button"
                onClick={() => setPhase('checklist')}
                className="mr-1 rounded-lg p-1 transition-colors hover:bg-ds-muted"
                aria-label="Volver al checklist"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            {phase === 'checklist' && 'Antes de escalar'}
            {phase === 'preview' && 'Vista previa'}
            {(phase === 'sending' || phase === 'done') && 'Enviando notificaciones'}
          </SheetTitle>
          <SheetDescription>
            {phase === 'checklist' && 'Indique qué acciones realizó antes de escalar.'}
            {phase === 'preview' && 'Revise los destinatarios definidos por la regla.'}
            {phase === 'sending' && 'Notificando a los responsables...'}
            {phase === 'done' && 'Notificaciones enviadas correctamente.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 px-4 pt-4">
          <div className="rounded-lg bg-ds-muted p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium leading-snug text-ds-ink-display">{eventLabel}</p>
              <AlertId externalEventId={alert.external_event_id} fallbackId={alert.id} variant="compact" />
            </div>
            <p className="mt-0.5 text-ds-ink-muted">{camera} · {zone}</p>
          </div>

          {phase === 'checklist' && (
            <>
              <div className="space-y-3">
                <div>
                  <p className="font-ds-display text-sm font-semibold text-ds-ink-display">
                    Antes de escalar — ¿qué acciones realizaste?
                  </p>
                  <p className="mt-1 text-xs text-ds-ink-muted">
                    Ninguna acción es obligatoria. La selección quedará registrada.
                  </p>
                </div>

                <div className="space-y-2">
                  {ESCALATION_CHECKLIST_ACTIONS.map(action => {
                    const checkboxId = `escalation-action-${action}`
                    return (
                      <label
                        key={action}
                        htmlFor={checkboxId}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-ds-hairline bg-ds-surface p-3 text-sm text-ds-ink-body"
                      >
                        <Checkbox
                          id={checkboxId}
                          checked={checkedActions.includes(action)}
                          onCheckedChange={() => toggleChecklistAction(action)}
                          className="mt-0.5"
                        />
                        <span>{action}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="escalation-observation">Observaciones (opcional)</Label>
                <Textarea
                  id="escalation-observation"
                  placeholder="Agregue contexto adicional para los responsables..."
                  value={observation}
                  onChange={event => setObservation(event.target.value)}
                  rows={3}
                />
              </div>

              <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-ds-hairline bg-ds-page/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur">
                <Button variant="outline" className="h-11 flex-1" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button
                  className="h-11 flex-1"
                  onClick={() => setPhase('preview')}
                  disabled={escalationContacts.length === 0}
                >
                  Continuar con escalamiento ({checkedActions.length})
                  <ArrowUpRight size={16} />
                </Button>
              </div>
            </>
          )}

          {phase === 'preview' && (
            <>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-ds-ink-muted">
                  Vista previa de la notificación
                </p>
                <div className="rounded-2xl border border-ds-hairline bg-ds-surface p-4 shadow-soft-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ds-signal-faded">
                      <Bell className="text-ds-signal" size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-xs font-semibold text-ds-ink-display">TNS CCTV</p>
                        <span className="shrink-0 text-[10px] text-ds-ink-muted">ahora</span>
                      </div>
                      <p className="mt-0.5 text-xs font-bold text-ds-ink-display">
                        Alerta escalada — atención requerida
                      </p>
                      <p className="mt-1 text-xs leading-snug text-ds-ink-muted">
                        {zone} · {camera}
                      </p>
                      {escalationObservation && (
                        <p className="mt-1 line-clamp-3 whitespace-pre-line text-xs text-ds-ink-body">
                          {escalationObservation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ds-ink-muted">
                    Contactos definidos en la regla · {alert.rule?.name}
                  </p>
                  <p className="mt-1 text-xs text-ds-ink-muted">
                    Los destinatarios no pueden modificarse en esta etapa.
                  </p>
                </div>
                <div className="space-y-2">
                  {escalationContacts.map(contact => (
                      <div
                        key={String(contact.userId ?? contact.email)}
                        className="flex items-center gap-3 rounded-xl border border-ds-hairline bg-ds-muted px-3 py-2.5"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ds-accent-faded">
                          <User className="text-ds-accent" size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-ds-ink-display">
                            {contact.name}
                          </p>
                          <p className="text-xs text-ds-ink-muted">{ROLE_LABELS[contact.role]}</p>
                          <p
                            className={cn(
                              'mt-0.5 font-mono text-[10px]',
                              contact.phone ? 'text-ds-ink-body' : 'text-ds-ink-muted italic'
                            )}
                          >
                            {contact.phone || 'Sin teléfono configurado'}
                          </p>
                        </div>
                        {contact.phone ? (
                          <Button asChild size="icon" variant="outline" aria-label={`Llamar a ${contact.name}`}>
                            <a href={toTelHref(contact.phone)}>
                              <Phone size={16} />
                            </a>
                          </Button>
                        ) : null}
                      </div>
                    ))}
                </div>
              </div>

              {notificationsBlocked && (
                <p className="rounded-lg border border-ds-hairline bg-ds-muted px-3 py-2 text-xs text-ds-ink-body">
                  Las notificaciones push están bloqueadas. La escalación se registrará igualmente.
                </p>
              )}

              <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-ds-hairline bg-ds-page/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur">
                <Button
                  variant="outline"
                  className="h-11 flex-1"
                  onClick={() => setPhase('checklist')}
                >
                  <ArrowLeft size={16} />
                  Atrás
                </Button>
                <Button
                  className="h-11 flex-1"
                  onClick={handleSend}
                  disabled={escalationContacts.length === 0}
                >
                  <Bell size={16} />
                  Enviar notificaciones
                </Button>
              </div>
            </>
          )}

          {(phase === 'sending' || phase === 'done') && (
            <>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-ds-ink-muted">
                  Estado de entrega
                </p>
                <div className="space-y-2">
                  {delivery.map(item => (
                    <div
                      key={String(item.userId)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border border-ds-hairline px-3 py-2.5 transition-colors',
                        item.state === 'sent' ? 'bg-ds-accent-faded' : 'bg-ds-muted'
                      )}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ds-surface">
                        {item.state === 'pending' && <User className="text-ds-ink-muted" size={16} />}
                        {item.state === 'sending' && <Loader2 className="animate-spin text-ds-accent" size={16} />}
                        {item.state === 'sent' && <CheckCircle2 className="text-ds-accent" size={16} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ds-ink-display">{item.name}</p>
                        <p className="text-xs text-ds-ink-muted">
                          {item.state === 'pending' && 'En espera...'}
                          {item.state === 'sending' && 'Enviando notificación...'}
                          {item.state === 'sent' && 'Notificado correctamente'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {phase === 'done' && !canNotify() && (
                <p className="text-center text-xs text-ds-ink-muted">
                  El escalado fue registrado. Habilite permisos para recibir notificaciones push.
                </p>
              )}

              <div className="sticky bottom-0 -mx-4 border-t border-ds-hairline bg-ds-page/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur">
                <Button
                  className="h-11 w-full"
                  onClick={handleClose}
                  disabled={phase === 'sending'}
                >
                  {phase === 'sending' ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      Cerrar
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
