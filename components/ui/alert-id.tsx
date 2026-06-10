import { cn } from '@/lib/utils'

interface AlertIdProps {
  /** ID reportado por el NVR (ale_evento.external_event_id). */
  externalEventId?: string | null
  /** Respaldo solo si no hay external_event_id (mocks legacy). */
  fallbackId?: number
  className?: string
  variant?: 'compact' | 'labeled'
}

/** Identificador visible de alerta: external_event_id del NVR. */
export function AlertId({
  externalEventId,
  fallbackId,
  className,
  variant = 'labeled',
}: AlertIdProps) {
  const value = externalEventId?.trim() || (fallbackId != null ? String(fallbackId) : null)
  if (!value) return null

  const label = `#id ${value}`

  return (
    <span
      className={cn(
        'inline-flex items-center font-mono tabular-nums text-ds-ink-muted shrink-0',
        variant === 'compact' ? 'text-xs' : 'text-sm',
        className
      )}
      title={`Alerta ${value}`}
    >
      {label}
    </span>
  )
}
