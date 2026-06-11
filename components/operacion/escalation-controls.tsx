'use client'

import { ArrowUpRight, CheckCircle2, Phone, PhoneCall } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { Alert } from '@/lib/types'
import { ROLE_LABELS } from '@/lib/types'
import { useEscalationUsers } from '@/hooks/use-escalation-users'
import {
  getEscalationContacts,
  getEscalationRoles,
  showEscalationActions,
  toTelHref,
} from '@/lib/escalation'

interface CallContactsPopoverProps {
  alert: Alert
  onLlamar: (id: number) => void
  className?: string
  disabled?: boolean
}

export function CallContactsPopover({
  alert,
  onLlamar,
  className,
  disabled = false,
}: CallContactsPopoverProps) {
  const { users: escalationUsers, reload: reloadEscalationUsers } = useEscalationUsers()

  if (!showEscalationActions(alert)) return null

  const roles = getEscalationRoles(alert.rule)
  const contacts = getEscalationContacts(alert.rule, escalationUsers)
  const llamadaRealizada = Boolean(alert.llamada_at)

  function handleOpenChange(open: boolean) {
    if (open) {
      void reloadEscalationUsers()
      if (!llamadaRealizada) {
        onLlamar(alert.id)
      }
    }
  }

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn('touch-target', className)}
        >
          {llamadaRealizada ? (
            <CheckCircle2 className="text-ds-accent" size={16} />
          ) : (
            <PhoneCall size={16} />
          )}
          Llamar
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(calc(100vw-2rem),22rem)] border-ds-hairline bg-ds-surface p-3 text-ds-ink-body"
      >
        <div className="space-y-3">
          <div>
            <p className="font-ds-display text-sm font-semibold text-ds-ink-display">
              Contactos de escalación
            </p>
            <p className="mt-0.5 text-xs text-ds-ink-muted">
              Definidos por la regla · {alert.rule?.name}
            </p>
          </div>

          {roles.length > 0 ? (
            contacts.length > 0 ? (
            <div className="space-y-2">
              {contacts.map(contact => (
                  <div
                    key={String(contact.userId ?? contact.email)}
                    className="flex items-center gap-3 rounded-xl border border-ds-hairline bg-ds-muted p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ds-ink-display">
                        {contact.name}
                      </p>
                      <p className="text-xs text-ds-ink-muted">{ROLE_LABELS[contact.role]}</p>
                      <p
                        className={cn(
                          'mt-0.5 font-mono text-xs',
                          contact.phone ? 'text-ds-ink-body' : 'text-ds-ink-muted italic'
                        )}
                      >
                        {contact.phone || 'Sin teléfono — configure en /admin/usuarios'}
                      </p>
                    </div>
                    {contact.phone ? (
                      <Button asChild size="icon" aria-label={`Llamar a ${contact.name}`}>
                        <a href={toTelHref(contact.phone)}>
                          <Phone size={20} />
                        </a>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled
                        aria-label={`${contact.name} sin teléfono configurado`}
                      >
                        <Phone size={20} />
                      </Button>
                    )}
                  </div>
                ))}
            </div>
            ) : (
              <p className="rounded-lg bg-ds-signal-faded p-3 text-xs text-ds-signal">
                No hay usuarios activos con los roles configurados en esta regla.
              </p>
            )
          ) : (
            <p className="rounded-lg bg-ds-signal-faded p-3 text-xs text-ds-signal">
              La regla permite escalar, pero no tiene contactos configurados.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface EscalateButtonProps {
  alert: Alert
  onEscalate: () => void
  className?: string
  wrapperClassName?: string
  disabled?: boolean
}

export function EscalateButton({
  alert,
  onEscalate,
  className,
  wrapperClassName,
  disabled = false,
}: EscalateButtonProps) {
  if (!showEscalationActions(alert)) return null

  const requiresCall = !alert.llamada_at
  const button = (
    <Button
      type="button"
      variant="outline"
      onClick={onEscalate}
      disabled={disabled || requiresCall}
      title={requiresCall ? 'Primero debes presionar LLAMAR' : undefined}
      className={cn('touch-target', className)}
    >
      <ArrowUpRight size={16} />
      Escalar
    </Button>
  )

  if (!requiresCall) return button

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('inline-flex', wrapperClassName)}>{button}</span>
      </TooltipTrigger>
      <TooltipContent>Primero debes presionar LLAMAR</TooltipContent>
    </Tooltip>
  )
}
