'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Camera, Clock, MapPin, ChevronDown, Check, X, ArrowUpRight, Eye } from 'lucide-react'
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
import { DISCARD_REASON_LABELS, getEventLabel, getAlertClass } from '@/lib/types'
import { CRITICALITY_STYLES, CRITICALITY_LABELS } from '@/lib/constants'
import { UrgencyBadge } from '@/components/ui/urgency-badge'

interface AlertCardProps {
  alert: Alert
  onAction: (action: 'acknowledge' | 'resolve' | 'escalate', notes?: string) => void
  onEscalate: () => void
  onShowDetails?: (alert: Alert) => void
  readonly?: boolean
}


const discardReasons: DiscardReason[] = [
  'falso_positivo_iluminacion',
  'falso_positivo_vegetacion',
  'falso_positivo_polvo',
  'irrelevante_vehiculo_interno',
  'irrelevante_persona_autorizada',
  'otro',
]

export function AlertCard({ alert, onAction, onEscalate, onShowDetails, readonly = false }: AlertCardProps) {
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

    // Solo actualizar cada segundo si la alerta esta pendiente o en revision
    const isPendingOrReview = alert.status === 'pendiente' || alert.status === 'en_revision'
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

  const timeDisplay = (alert.status === 'pendiente' || alert.status === 'en_revision') 
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
      onAction('resolve', `Descartado: ${DISCARD_REASON_LABELS[reason]}`)
      toast.success('Alerta descartada')
      setIsLoading(false)
    }, 300)
  }

  const isPending = alert.status === 'pendiente'
  const isInReview = alert.status === 'en_revision'
  const alertClass = getAlertClass(alert.criticality)
  const isCriticalClass = alertClass === 'critica'

  return (
    <>
      <Card 
        className={cn(
          'soft-card border-0 transition-all duration-200 hover:shadow-soft-md cursor-pointer group overflow-hidden',
          alert.criticality === 'critica' && isPending && 'ring-2 ring-[var(--urgency-critical)]/35'
        )}
        onClick={() => onShowDetails?.(alert)}
      >
        <CardContent className="p-3 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
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

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
              <div>
                <h3 className="font-medium text-sm sm:text-base leading-snug line-clamp-2">
                  {alert.description || getEventLabel(alert.event_code)}
                </h3>
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

              {/* Status for non-pending alerts */}
              {!isPending && !isInReview && alert.status === 'escalada' && (
                <UrgencyBadge level="escalated" className="text-xs">
                  ↑ Escalada — en manos del supervisor
                </UrgencyBadge>
              )}

              {!isPending && !isInReview && (alert.status === 'resuelta' || alert.status === 'descartada') && (
                <UrgencyBadge level="resolved" className="text-xs">
                  {alert.status === 'resuelta' && `Resuelta: ${alert.resolution_notes || 'Sin notas'}`}
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

            {/* Actions */}
            {!readonly && (
              <div
                className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto sm:flex-wrap sm:justify-end sm:shrink-0"
                onClick={e => e.stopPropagation()}
              >
                {isPending && (
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
                        <Button variant="outline" size="sm" disabled={isLoading} className="col-span-2 sm:col-span-1 h-10 sm:h-9 touch-target rounded-xl border-0 bg-secondary/80 shadow-none">
                          <X className="h-4 w-4 mr-1" />
                          Descartar
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
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

                {isInReview && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => setResolveDialogOpen(true)}
                      disabled={isLoading}
                      className="h-10 sm:h-9 bg-primary hover:bg-primary/90 text-primary-foreground touch-target rounded-xl shadow-soft-sm"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Resuelta
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onEscalate}
                      disabled={isLoading}
                      className="h-10 sm:h-9 touch-target rounded-xl"
                    >
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                      Escalar
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver Alerta</DialogTitle>
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
