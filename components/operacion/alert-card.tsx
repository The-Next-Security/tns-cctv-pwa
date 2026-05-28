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
import { DISCARD_REASON_LABELS } from '@/lib/types'
import { CRITICALITY_STYLES, CRITICALITY_LABELS } from '@/lib/constants'

interface AlertCardProps {
  alert: Alert
  onAction: (action: 'acknowledge' | 'resolve' | 'escalate', notes?: string) => void
  onEscalate: () => void
  onShowDetails?: (alert: Alert) => void
  readonly?: boolean
}

// Funcion helper para obtener clases de criticidad
function getCriticalityClasses(criticality: Criticality) {
  const styles = CRITICALITY_STYLES[criticality]
  return cn(styles.bgSubtle, styles.text, styles.borderSubtle)
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

  return (
    <>
      <Card 
        className={cn(
          'transition-all duration-200 hover:shadow-md border-l-4 cursor-pointer group',
          CRITICALITY_STYLES[alert.criticality].border,
          alert.criticality === 'critica' && isPending && cn(
            'ring-2 shadow-lg',
            CRITICALITY_STYLES.critica.ring,
            'shadow-red-600/10'
          )
        )}
        onClick={() => onShowDetails?.(alert)}
      >
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {/* Criticality Badge */}
            <Badge
              variant="outline"
              className={cn(
                'w-fit shrink-0 font-semibold uppercase tracking-wide',
                getCriticalityClasses(alert.criticality),
                alert.criticality === 'critica' && 'animate-pulse'
              )}
            >
              {CRITICALITY_LABELS[alert.criticality]}
            </Badge>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <h3 className="font-medium">
                  {alert.description || alert.event_code || 'Evento de seguridad'}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
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
                  <span className="flex items-center gap-1 font-mono text-xs">
                    <Clock className="h-3.5 w-3.5" />
                    <span className={cn(
                      isPending && alert.criticality === 'critica' && CRITICALITY_STYLES.critica.text + ' font-semibold',
                      isPending && alert.criticality === 'alta' && CRITICALITY_STYLES.alta.text + ' font-semibold'
                    )}>
                      hace {timeDisplay}
                    </span>
                  </span>
                </div>
              </div>

              {/* Plate if available */}
              {alert.plate && (
                <Badge variant="secondary" className="font-mono">
                  Patente: {alert.plate}
                </Badge>
              )}

              {/* Status for non-pending alerts */}
              {!isPending && !isInReview && (
                <Badge variant="secondary" className="text-xs">
                  {alert.status === 'resuelta' && `Resuelta: ${alert.resolution_notes || 'Sin notas'}`}
                  {alert.status === 'escalada' && 'Escalada a supervisor'}
                </Badge>
              )}

              {/* In review status */}
              {isInReview && (
                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/30">
                  En revision por: {alert.assigned_to || 'Usuario'}
                </Badge>
              )}
            </div>

            {/* Actions */}
            {!readonly && (
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                {isPending && (
                  <>
                    <Button
                      size="sm"
                      onClick={handleAcknowledge}
                      disabled={isLoading}
                      className="touch-target"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Atender
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" disabled={isLoading} className="touch-target">
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
                      className="bg-green-600 hover:bg-green-700 touch-target"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Resolver
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onEscalate}
                      disabled={isLoading}
                      className="touch-target"
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
            <Button onClick={handleResolve} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
              <Check className="h-4 w-4 mr-2" />
              Resolver Alerta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
