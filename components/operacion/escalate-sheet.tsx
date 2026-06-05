'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowUpRight, Check, Bell, Loader2, CheckCircle2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { toast } from 'sonner'
import { alerts as alertsApi } from '@/lib/api'
import {
  canNotify,
  requestNotificationPermission,
  sendEscalationNotification,
  type EscalationRecipient,
} from '@/lib/pwa-notifications'
import type { Alert, Role } from '@/lib/types'
import { ROLE_LABELS, getEventLabel } from '@/lib/types'

interface EscalateSheetProps {
  alert: Alert | null
  onClose: () => void
  onSuccess: () => void
}

// Roles que pueden recibir escalaciones
const ESCALATION_ROLES: Role[] = [
  'responsable_seguridad',
  'admin_parque',
  'supervisor',
]

// Mock de contactos por rol para el preview
const ROLE_CONTACTS: Record<Role, { name: string; phone?: string; email?: string }> = {
  responsable_seguridad: { name: 'Carlos Rodríguez', phone: '+56 9 8821 4430', email: 'c.rodriguez@agrolivo.cl' },
  admin_parque:          { name: 'Ana Méndez',       phone: '+56 9 7743 2219', email: 'admin@agrolivo.cl' },
  supervisor:            { name: 'Pedro Soto',        phone: '+56 9 9103 5567', email: 'p.soto@agrolivo.cl' },
  soporte_tns:           { name: 'TNS Soporte',       phone: '+56 2 2891 0045', email: 'soporte@thenextsecurity.cl' },
  // unused roles — minimal entries
  vigilante:     { name: 'Vigilante' },
  recepcionista: { name: 'Recepcionista' },
  recepcion:     { name: 'Recepción' },
  tecnico:       { name: 'Técnico' },
  visualizador:  { name: 'Visualizador' },
}

type Phase = 'select' | 'preview' | 'sending' | 'done'

interface DeliveryStatus {
  role: Role
  name: string
  state: 'pending' | 'sending' | 'sent'
}

export function EscalateSheet({ alert, onClose, onSuccess }: EscalateSheetProps) {
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([])
  const [observation, setObservation] = useState('')
  const [phase, setPhase] = useState<Phase>('select')
  const [delivery, setDelivery] = useState<DeliveryStatus[]>([])

  function toggleRole(role: Role) {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  function handleContinueToPreview() {
    if (selectedRoles.length === 0) return
    setPhase('preview')
  }

  function handleBack() {
    setPhase('select')
  }

  async function handleSend() {
    if (!alert) return
    setPhase('sending')

    // Inicializar estados de entrega
    const initial: DeliveryStatus[] = selectedRoles.map(role => ({
      role,
      name: ROLE_CONTACTS[role]?.name ?? ROLE_LABELS[role],
      state: 'pending',
    }))
    setDelivery(initial)

    // Llamada al backend (fire-and-forget en demo)
    alertsApi.attend(alert.id, { action: 'escalada', observation: observation || undefined })
      .catch(() => { /* ignorar en demo */ })

    // Pedir permiso de notificaciones si hace falta
    const permission = await requestNotificationPermission()

    // Animar entrega escalonada por destinatario
    for (let i = 0; i < initial.length; i++) {
      await delay(300)
      setDelivery(prev => prev.map((d, idx) => idx === i ? { ...d, state: 'sending' } : d))
      await delay(500 + i * 150)
      setDelivery(prev => prev.map((d, idx) => idx === i ? { ...d, state: 'sent' } : d))
    }

    // Disparar push notification real (una sola notificación con todos los destinatarios)
    if (permission === 'granted') {
      const recipients: EscalationRecipient[] = selectedRoles.map(role => ({
        name: ROLE_CONTACTS[role]?.name ?? ROLE_LABELS[role],
        role: ROLE_LABELS[role],
      }))
      await sendEscalationNotification(alert, recipients, observation || undefined)
    }

    setPhase('done')
  }

  function handleClose() {
    // Si ya se envió, llamar onSuccess para actualizar el estado de la alerta
    if (phase === 'done') {
      onSuccess()
    }
    // Resetear todo
    setSelectedRoles([])
    setObservation('')
    setPhase('select')
    setDelivery([])
    onClose()
  }

  // Si se cierra el sheet externamente (overlay click) y ya estaba en 'done', disparar onSuccess
  function handleOpenChange(open: boolean) {
    if (!open) handleClose()
  }

  if (!alert) return null

  const eventLabel = getEventLabel(alert.event_code)
  const zone = alert.zone?.name ?? 'Sin zona'
  const camera = alert.camera?.name ?? 'Sin cámara'
  const notificationsBlocked = typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'denied'

  return (
    <Sheet open={!!alert} onOpenChange={handleOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {phase !== 'select' && phase !== 'done' && (
              <button
                onClick={handleBack}
                className="mr-1 rounded-lg p-1 hover:bg-accent transition-colors"
                aria-label="Volver"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            {phase === 'select' && 'Escalar Alerta'}
            {phase === 'preview' && 'Vista previa'}
            {(phase === 'sending' || phase === 'done') && 'Enviando notificaciones'}
          </SheetTitle>
          <SheetDescription>
            {phase === 'select' && 'Seleccione uno o más roles para escalar esta alerta.'}
            {phase === 'preview' && 'Revise el mensaje antes de enviar.'}
            {phase === 'sending' && 'Notificando a los responsables...'}
            {phase === 'done' && 'Notificaciones enviadas correctamente.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 px-4 pt-4">
          {/* Alert info — siempre visible */}
          <div className="rounded-lg bg-ds-muted p-3 text-sm">
            <p className="font-medium leading-snug">{eventLabel}</p>
            <p className="text-ds-ink-muted mt-0.5">{camera} — {zone}</p>
          </div>

          {/* ── FASE SELECCIÓN ── */}
          {phase === 'select' && (
            <>
              <div className="space-y-2">
                <Label>Escalar a (puede elegir más de uno)</Label>
                <div className="space-y-2">
                  {ESCALATION_ROLES.map(role => {
                    const selected = selectedRoles.includes(role)
                    const contact = ROLE_CONTACTS[role]
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleRole(role)}
                        className={cn(
                          'w-full flex items-center justify-between rounded-xl border px-4 py-3 text-sm text-left transition-colors',
                          selected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-ds-hairline bg-secondary/40 hover:bg-secondary/70 text-ds-ink-display'
                        )}
                      >
                        <div className="min-w-0">
                          <p className="font-medium">{ROLE_LABELS[role]}</p>
                          {contact?.name && (
                            <p className={cn('text-xs mt-0.5 truncate', selected ? 'text-primary/70' : 'text-ds-ink-muted')}>
                              {contact.name}
                            </p>
                          )}
                        </div>
                        {selected && <Check className="h-4 w-4 shrink-0 ml-2" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observation">Observaciones (opcional)</Label>
                <Textarea
                  id="observation"
                  placeholder="Agregue contexto adicional para los responsables..."
                  value={observation}
                  onChange={e => setObservation(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-ds-hairline/60 bg-ds-page/95 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-ds-page/80">
                <Button variant="outline" className="h-11 flex-1 touch-target" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button
                  className="h-11 flex-1 touch-target"
                  onClick={handleContinueToPreview}
                  disabled={selectedRoles.length === 0}
                >
                  Continuar
                  <ArrowUpRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </>
          )}

          {/* ── FASE PREVIEW ── */}
          {phase === 'preview' && (
            <>
              {/* Mock de notificación push */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-ds-ink-muted uppercase tracking-wide">
                  Vista previa de la notificación
                </p>
                <div className="rounded-2xl border border-ds-hairline bg-ds-surface/80 p-4 shadow-soft-sm">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 shrink-0 rounded-xl bg-[var(--urgency-critical-bg)] flex items-center justify-center">
                      <Bell className="h-4 w-4 text-[var(--urgency-critical)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-xs font-semibold text-ds-ink-display">TNS CCTV</p>
                        <span className="text-[10px] text-ds-ink-muted shrink-0">ahora</span>
                      </div>
                      <p className="text-xs font-bold mt-0.5">🚨 Alerta Escalada — Atención Requerida</p>
                      <p className="text-xs text-ds-ink-muted mt-1 leading-snug">
                        {zone} · {camera}
                      </p>
                      {observation && (
                        <p className="text-xs text-ds-ink-muted mt-0.5 italic line-clamp-2">
                          "{observation}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista de destinatarios */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-ds-ink-muted uppercase tracking-wide">
                  Se notificará a
                </p>
                <div className="space-y-2">
                  {selectedRoles.map(role => {
                    const contact = ROLE_CONTACTS[role]
                    return (
                      <div key={role} className="flex items-center gap-3 rounded-xl bg-secondary/40 px-3 py-2.5">
                        <div className="h-8 w-8 shrink-0 rounded-full bg-accent/60 flex items-center justify-center">
                          <User className="h-4 w-4 text-ds-ink-muted" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{contact?.name ?? ROLE_LABELS[role]}</p>
                          <p className="text-xs text-ds-ink-muted">{ROLE_LABELS[role]}</p>
                        </div>
                        <div className="text-right shrink-0">
                          {contact?.phone && (
                            <p className="text-[10px] text-ds-ink-muted font-mono">{contact.phone}</p>
                          )}
                          <p className="text-[10px] text-ds-ink-muted">Push · Email</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {notificationsBlocked && (
                <p className="text-xs text-[var(--warning)] bg-[var(--warning-bg)] rounded-lg px-3 py-2">
                  Las notificaciones push están bloqueadas en este navegador. El escalado se registrará igualmente.
                </p>
              )}

              <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-ds-hairline/60 bg-ds-page/95 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-ds-page/80">
                <Button variant="outline" className="h-11 flex-1 touch-target" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Atrás
                </Button>
                <Button className="h-11 flex-1 touch-target" onClick={handleSend}>
                  <Bell className="h-4 w-4 mr-2" />
                  Enviar notificaciones
                </Button>
              </div>
            </>
          )}

          {/* ── FASE SENDING / DONE ── */}
          {(phase === 'sending' || phase === 'done') && (
            <>
              <div className="space-y-2">
                <p className="text-xs font-medium text-ds-ink-muted uppercase tracking-wide">
                  Estado de entrega
                </p>
                <div className="space-y-2">
                  {delivery.map(item => (
                    <div
                      key={item.role}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-300',
                        item.state === 'sent'
                          ? 'bg-[var(--urgency-resolved-bg)]'
                          : 'bg-secondary/40'
                      )}
                    >
                      <div className={cn(
                        'h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition-colors duration-300',
                        item.state === 'sent'
                          ? 'bg-[var(--urgency-resolved-bg)]'
                          : 'bg-accent/60'
                      )}>
                        {item.state === 'pending' && (
                          <User className="h-4 w-4 text-ds-ink-muted" />
                        )}
                        {item.state === 'sending' && (
                          <Loader2 className="h-4 w-4 text-primary animate-spin" />
                        )}
                        {item.state === 'sent' && (
                          <CheckCircle2 className="h-4 w-4 text-[var(--urgency-resolved)]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className={cn(
                          'text-xs transition-colors duration-300',
                          item.state === 'sent'
                            ? 'text-[var(--urgency-resolved)]'
                            : 'text-ds-ink-muted'
                        )}>
                          {item.state === 'pending'  && 'En espera...'}
                          {item.state === 'sending'  && 'Enviando notificación...'}
                          {item.state === 'sent'     && 'Notificado correctamente'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {phase === 'done' && !canNotify() && (
                <p className="text-xs text-ds-ink-muted text-center">
                  El escalado fue registrado. Para recibir notificaciones push, habilite los permisos en su navegador.
                </p>
              )}

              <div className="sticky bottom-0 -mx-4 border-t border-ds-hairline/60 bg-ds-page/95 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-ds-page/80">
                <Button
                  className="h-11 w-full touch-target"
                  onClick={handleClose}
                  disabled={phase === 'sending'}
                >
                  {phase === 'sending'
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
                    : <><Check className="h-4 w-4 mr-2" /> Cerrar</>
                  }
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
