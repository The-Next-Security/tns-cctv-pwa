'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Camera, Clock, MapPin, ChevronDown, ChevronRight, Check, X, Eye, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Alert, Criticality, DiscardReason } from '@/lib/types'
import { DISCARD_REASON_LABELS, getAlertRuleTitle, getAlertClass, getResolutionLabel } from '@/lib/types'
import { isSlaOverdue } from '@/lib/alert-list'
import { RuleId } from '@/components/ui/rule-id'
import { CRITICALITY_STYLES, CRITICALITY_LABELS } from '@/lib/constants'
import { UrgencyBadge } from '@/components/ui/urgency-badge'
import { AlertId } from '@/components/ui/alert-id'
import {
  CallContactsPopover,
  EscalateButton,
} from '@/components/operacion/escalation-controls'

interface AlertCardProps {
  alert: Alert
  onAction: (action: 'acknowledge' | 'resolve' | 'escalate' | 'discard', notes?: string) => void
  onEscalate: () => void
  onLlamar: (id: number) => void
  onReactivate?: (id: number) => void
  onShowDetails?: (alert: Alert) => void
  readonly?: boolean
  useReviewActions?: boolean
}


const discardReasons: DiscardReason[] = [
  'falso_positivo_iluminacion',
  'falso_positivo_vegetacion',
  'falso_positivo_polvo',
  'irrelevante_vehiculo_interno',
  'irrelevante_persona_autorizada',
  'otro',
]

export function AlertCard({
  alert,
  onAction,
  onEscalate,
  onLlamar,
  onReactivate,
  onShowDetails,
  readonly = false,
  useReviewActions = false,
}: AlertCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false)
  const [resolveNotes, setResolveNotes] = useState('')
  const [elapsedTime, setElapsedTime] = useState('')

  // Cronometro en tiempo real - actualiza cada segundo
  useEffect(() => {
    function updateElapsed() {
      const elapsed = formatDistanceToNow(new Date(alert.timestamp), {
        addSuffix: false,
        locale: es,
      })
      setElapsedTime(elapsed)
    }

    // Actualizar inmediatamente
    updateElapsed()

    // Solo actualizar cada segundo si la alerta esta pendiente, en revision o escalada
    const isPendingOrReview =
      alert.status === 'pendiente' ||
      alert.status === 'en_revision' ||
      alert.status === 'escalada'
    if (isPendingOrReview) {
      const interval = setInterval(updateElapsed, 1000)
      return () => clearInterval(interval)
    }
  }, [alert.timestamp, alert.status])

  // Calcular segundos transcurridos para mostrar en formato mas preciso
  const getElapsedSeconds = () => {
    const now = new Date()
    const alertTime = new Date(alert.timestamp)
    return Math.floor((now.getTime() - alertTime.getTime()) / 1000)
  }

  // Formato de tiempo mas preciso para alertas recientes
  const formatPreciseTime = () => {
    const seconds = getElapsedSeconds()
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}m ${secs}s`
    }
    return elapsedTime
  }

  const timeDisplay = (
    alert.status === 'pendiente' ||
    alert.status === 'en_revision' ||
    alert.status === 'escalada'
  )
    ? formatPreciseTime()
    : elapsedTime

  function handleAcknowledge() {
    setIsLoading(true)
    setTimeout(() => {
      onAction('acknowledge')
      toast.success('Alerta tomada para revision')
      setIsLoading(false)
    }, 300)
  }

  function handleResolve() {
    setIsLoading(true)
    setTimeout(() => {
      onAction('resolve', resolveNotes || 'Resuelto sin notas adicionales')
      toast.success('Alerta resuelta')
      setIsLoading(false)
      setResolveDialogOpen(false)
      setResolveNotes('')
    }, 300)
  }

  function handleDiscard(reason: DiscardReason) {
    setIsLoading(true)
    setTimeout(() => {
      onAction('discard', reason)
      toast.success('Alerta descartada')
      setIsLoading(false)
    }, 300)
  }

  function handleReactivate() {
    if (!onReactivate) return
    setIsLoading(true)
    setTimeout(() => {
      onReactivate(alert.id)
      setIsLoading(false)
    }, 300)
  }

  const isPending = alert.status === 'pendiente'
  const isInReview = alert.status === 'en_revision'
  const isEscalated = alert.status === 'escalada'
  // D12: una alerta abierta >48h nunca se archiva; se destaca como vencida.
  const slaOverdue = isSlaOverdue(alert)
  const isClosed = alert.status === 'resuelta' || alert.status === 'descartada'
  const alertClass = getAlertClass(alert.criticality)
  const isCriticalClass = alertClass === 'critica'
  const isLowPriorityClass = alertClass === 'baja_prioridad'
  const showAtenderButton = isLowPriorityClass && isPending
  const showReviewActions = useReviewActions || isInReview
  const showCloseActions = showReviewActions || isEscalated
  const escalationAlert = showReviewActions && alert.status !== 'en_revision'
    ? { ...alert, status: 'en_revision' as const }
    : alert

  const critStyles = CRITICALITY_STYLES[alert.criticality]

  function handleCardClick() {
    onShowDetails?.(alert)
  }

  function handleCardKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!onShowDetails) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onShowDetails(alert)
    }
  }

  return (
    <>
      <Card
        role={onShowDetails ? 'button' : undefined}
        tabIndex={onShowDetails ? 0 : undefined}
        onKeyDown={handleCardKeyDown}
        className={cn(
          'soft-card group relative overflow-hidden rounded-2xl py-0',
          'cursor-pointer transition-all duration-200 ease-out',
          'border border-ds-hairline shadow-[var(--shadow-soft-sm)]',
          'hover:-translate-y-0.5 hover:border-ds-accent/45 hover:shadow-soft-md hover:bg-ds-muted/15',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ds-page',
          'active:translate-y-0 active:scale-[0.995]',
          isPending && isCriticalClass && cn('ring-2', critStyles.ring, critStyles.borderSubtle),
          isPending && alert.criticality === 'alta' && 'ring-1 ring-[var(--criticality-alta)]/20 border-[var(--criticality-alta)]/35',
          isPending && !isCriticalClass && alert.criticality !== 'alta' && 'ring-1 ring-ds-hairline',
          slaOverdue && 'border-[var(--urgency-critical-border)]/60',
          !isPending && 'opacity-[0.97] hover:opacity-100'
        )}
        onClick={handleCardClick}
      >
        <CardContent className="p-3 sm:p-4">
          <div
            className={cn(
              'relative rounded-xl border border-ds-hairline/80 bg-ds-muted/20 p-3 sm:p-4 transition-colors duration-200',
              'group-hover:border-ds-accent/30 group-hover:bg-ds-muted/30',
              isPending && isCriticalClass && 'border-[var(--urgency-critical-border)]/50 bg-[var(--urgency-critical-bg)]/25'
            )}
          >
            {onShowDetails && (
              <ChevronRight
                aria-hidden
                className="pointer-events-none absolute right-3 top-3 z-10 h-4 w-4 text-ds-ink-muted opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
              />
            )}
            <div className="flex gap-3 sm:gap-4">
              {/* Class indicator */}
              <div className={cn(
                'flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 flex-col items-center justify-center rounded-lg sm:rounded-xl text-[9px] font-bold uppercase tracking-wide leading-tight gap-0.5',
                isCriticalClass
                  ? CRITICALITY_STYLES[alert.criticality].bgSubtle
                  : 'bg-ds-muted/60',
                isCriticalClass
                  ? CRITICALITY_STYLES[alert.criticality].text
                  : 'text-ds-ink-muted',
                isCriticalClass && isPending && 'badge-urgency-critical-pulse ring-1 ring-[var(--urgency-critical-border)]'
              )}>
                {isCriticalClass ? (
                  <span>{alert.criticality === 'critica' ? 'CRÍ' : 'ALT'}</span>
                ) : (
                  <>
                    <span>BP</span>
                    <span className="text-[7px] opacity-70">{CRITICALITY_LABELS[alert.criticality].slice(0, 3)}</span>
                  </>
                )}
              </div>

              {/* Content — dentro del marco clickeable */}
              <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2 pr-5">
              <div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <h3 className="font-medium text-sm sm:text-base leading-snug line-clamp-2">
                    {getAlertRuleTitle(alert)}
                  </h3>
                  <RuleId rule={alert.rule} variant="compact" />
                  <AlertId externalEventId={alert.external_event_id} fallbackId={alert.id} variant="compact" />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs sm:text-sm text-ds-ink-muted mt-1">
                  {alert.camera && (
                    <span className="flex items-center gap-1">
                      <Camera className="h-3.5 w-3.5" />
                      {alert.camera.name}
                    </span>
                  )}
                  {alert.zone && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {alert.zone.name}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-live-data text-xs">
                    <Clock className="h-3.5 w-3.5" />
                    <span className={cn(
                      isPending && alert.criticality === 'critica' && 'text-[var(--urgency-critical)] font-semibold',
                      isPending && alert.criticality === 'alta' && 'text-[var(--criticality-alta)] font-semibold'
                    )}>
                      hace {timeDisplay}
                    </span>
                  </span>
                </div>
              </div>

              {/* Plate if available */}
              {alert.plate && (
                <Badge variant="secondary" className="font-mono tabular-nums antialiased font-semibold">
                  Patente: {alert.plate}
                </Badge>
              )}

              {/* D12: SLA de resolución vencido (alerta abierta >48h) */}
              {slaOverdue && (
                <UrgencyBadge level="critical" className="text-xs">
                  SLA vencido — más de 48h sin resolver
                </UrgencyBadge>
              )}

              {/* Status for non-pending alerts */}
              {!isPending && !isInReview && isEscalated && (
                <UrgencyBadge level="escalated" className="text-xs">
                  En atención — escalada al supervisor
                </UrgencyBadge>
              )}

              {!isPending && !isInReview && (alert.status === 'resuelta' || alert.status === 'descartada') && (
                <UrgencyBadge level="resolved" className="text-xs">
                  {alert.status === 'resuelta' && `Resuelta: ${getResolutionLabel(alert)}`}
                  {alert.status === 'descartada' && 'Descartada'}
                </UrgencyBadge>
              )}

              {isInReview && (
                <UrgencyBadge level="review" className="text-xs">
                  En revisión por: {alert.assigned_to || 'Usuario'}
                </UrgencyBadge>
              )}

              {isPending && (
                <UrgencyBadge level={isCriticalClass ? 'critical' : 'pending'} className="text-xs" pulse={isCriticalClass}>
                  {isCriticalClass ? 'Crítica — atención inmediata' : 'Baja prioridad — pendiente'}
                </UrgencyBadge>
              )}
              </div>
            </div>
          </div>

          {/* Acciones — fuera del marco de contenido */}
          {!readonly && (
            <div
              className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end"
              onClick={e => e.stopPropagation()}
            >
              {isClosed && onReactivate && (
                <Button
                  size="sm"
                  onClick={handleReactivate}
                  disabled={isLoading}
                  className="col-span-2 sm:col-span-1 h-10 sm:h-9 touch-target rounded-xl shadow-soft-sm"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Activar
                </Button>
              )}

              {!isClosed && isPending && !showReviewActions && (
                <>
                  <Button
                    size="sm"
                    onClick={handleAcknowledge}
                    disabled={isLoading}
                    className="col-span-2 sm:col-span-1 h-10 sm:h-9 touch-target rounded-xl shadow-soft-sm"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Atender
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" disabled={isLoading} className="col-span-2 sm:col-span-1 h-10 sm:h-9 touch-target rounded-xl border-ds-hairline bg-ds-surface shadow-none">
                        <X className="h-4 w-4 mr-1" />
                        Descartar
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 border-ds-hairline bg-ds-surface">
                      {discardReasons.map(reason => (
                        <DropdownMenuItem
                          key={reason}
                          onClick={() => handleDiscard(reason)}
                        >
                          {DISCARD_REASON_LABELS[reason]}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}

              {!isClosed && showReviewActions && !isEscalated && (
                <>
                  {showAtenderButton && (
                    <Button
                      size="sm"
                      onClick={handleAcknowledge}
                      disabled={isLoading}
                      className="h-10 sm:h-9 touch-target rounded-xl shadow-soft-sm"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Atender
                    </Button>
                  )}

                  <Button
                    size="sm"
                    onClick={() => setResolveDialogOpen(true)}
                    disabled={isLoading}
                    className="h-10 sm:h-9 bg-primary hover:bg-primary/90 text-primary-foreground touch-target rounded-xl shadow-soft-sm"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Marcar como Revisada
                  </Button>

                  <CallContactsPopover
                    alert={escalationAlert}
                    onLlamar={onLlamar}
                    disabled={isLoading}
                    className="h-10 rounded-xl sm:h-9"
                  />

                  <EscalateButton
                    alert={escalationAlert}
                    onEscalate={onEscalate}
                    disabled={isLoading}
                    className="h-10 rounded-xl sm:h-9"
                  />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" disabled={isLoading} className="h-10 sm:h-9 touch-target rounded-xl border-ds-hairline bg-ds-surface shadow-none">
                        <X className="h-4 w-4 mr-1" />
                        Descartar
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 border-ds-hairline bg-ds-surface">
                      {discardReasons.map(reason => (
                        <DropdownMenuItem
                          key={reason}
                          onClick={() => handleDiscard(reason)}
                        >
                          {DISCARD_REASON_LABELS[reason]}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}

              {!isClosed && showCloseActions && isEscalated && (
                <>
                  <Button
                    size="sm"
                    onClick={() => setResolveDialogOpen(true)}
                    disabled={isLoading}
                    className="col-span-2 sm:col-span-1 h-10 sm:h-9 bg-primary hover:bg-primary/90 text-primary-foreground touch-target rounded-xl shadow-soft-sm"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Marcar como Revisada
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" disabled={isLoading} className="col-span-2 sm:col-span-1 h-10 sm:h-9 touch-target rounded-xl border-ds-hairline bg-ds-surface shadow-none">
                        <X className="h-4 w-4 mr-1" />
                        Descartar
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 border-ds-hairline bg-ds-surface">
                      {discardReasons.map(reason => (
                        <DropdownMenuItem
                          key={reason}
                          onClick={() => handleDiscard(reason)}
                        >
                          {DISCARD_REASON_LABELS[reason]}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              Resolver alerta
              <AlertId externalEventId={alert.external_event_id} fallbackId={alert.id} variant="compact" />
            </DialogTitle>
            <DialogDescription>
              Agregue notas sobre como se resolvio esta alerta
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notas de resolucion</Label>
              <Textarea
                id="notes"
                placeholder="Describa como se resolvio la situacion..."
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleResolve} disabled={isLoading} className="bg-ds-accent hover:bg-ds-accent-darker">
              <Check className="h-4 w-4 mr-2" />
              Resolver Alerta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
