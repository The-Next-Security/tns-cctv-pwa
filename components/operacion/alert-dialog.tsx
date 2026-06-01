'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Camera, Clock, MapPin, Check, X, ArrowUpRight, ChevronDown, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { alerts as alertsApi } from '@/lib/api'
import { resolveSnapshotUrl, resolveLiveFeedUrl } from '@/lib/demo-media'
import { LiveCameraPanel } from '@/components/operacion/live-camera-panel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { Alert, Criticality, DiscardReason } from '@/lib/types'
import { DISCARD_REASON_LABELS, CRITICALITY_LABELS, getEventLabel } from '@/lib/types'

interface AlertDialogProps {
  alert: Alert | null
  onClose: () => void
  onAction: (action: 'acknowledge' | 'resolve' | 'escalate', notes?: string) => void
  onEscalate: () => void
}

const criticalityStyles: Record<Criticality, string> = {
  baja: 'bg-criticality-baja/20 text-criticality-baja border-criticality-baja/30',
  media: 'bg-criticality-media/20 text-criticality-media border-criticality-media/30',
  alta: 'bg-criticality-alta/20 text-criticality-alta border-criticality-alta/30',
  critica: 'bg-criticality-critica/20 text-criticality-critica border-criticality-critica/30',
}

const discardReasons: DiscardReason[] = [
  'falso_positivo_iluminacion',
  'falso_positivo_vegetacion',
  'falso_positivo_polvo',
  'irrelevante_vehiculo_interno',
  'irrelevante_persona_autorizada',
  'otro',
]

export function AlertDialog({ alert, onClose, onAction, onEscalate }: AlertDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  if (!alert) return null

  const timeAgo = formatDistanceToNow(new Date(alert.created_at || new Date()), {
    addSuffix: false,
    locale: es,
  })

  async function handleRevisar() {
    setIsLoading(true)
    try {
      await alertsApi.attend(alert!.id, { action: 'revisada' })
      toast.success('Alerta marcada como revisada')
      onAction('resolve')
    } catch (error) {
      onAction('resolve')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDescartar(reason: DiscardReason) {
    setIsLoading(true)
    try {
      await alertsApi.attend(alert!.id, {
        action: 'descartada',
        discard_reason: reason,
      })
      toast.success('Alerta descartada')
      onAction('resolve', `Descartado: ${reason}`)
    } catch (error) {
      onAction('resolve', `Descartado: ${reason}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={!!alert} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-2xl p-4 sm:p-6">
        <DialogHeader className="pr-8 sm:pr-0">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Badge
              variant="outline"
              className={cn(
                'shrink-0 text-xs sm:text-sm',
                criticalityStyles[alert.criticality],
                alert.criticality === 'critica' && 'animate-criticality-pulse'
              )}
            >
              {CRITICALITY_LABELS[alert.criticality].toUpperCase()}
            </Badge>
            <DialogTitle className="text-left text-base leading-snug break-words sm:text-xl">
              {getEventLabel(alert.event_code)}
            </DialogTitle>
          </div>
          <DialogDescription className="flex flex-wrap items-center justify-start gap-x-4 gap-y-1 text-left">
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
            <span className="flex items-center gap-1 text-live-data font-semibold">
              <Clock className="h-3.5 w-3.5" />
              hace {timeAgo}
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Snapshot / en vivo */}
        <Tabs defaultValue="snapshot">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="snapshot">Snapshot</TabsTrigger>
            <TabsTrigger value="live">En vivo</TabsTrigger>
          </TabsList>
          <TabsContent value="snapshot" className="mt-3">
            <div className="relative aspect-video max-h-[40dvh] overflow-hidden rounded-lg bg-muted sm:max-h-none">
              {alert.snapshot_url || alert.event_type ? (
                <img
                  src={resolveSnapshotUrl(alert.snapshot_url, alert.event_type)}
                  alt="Snapshot del evento"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="h-16 w-16 text-muted-foreground/30" />
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="live" className="mt-3">
            <LiveCameraPanel
              cameraName={alert.camera?.name ?? 'Cámara'}
              videoUrl={resolveLiveFeedUrl({
                cameraName: alert.camera?.name,
                eventCode: alert.event_code,
                eventType: alert.event_type,
              })}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter className="grid grid-cols-2 gap-2 pt-2 sm:flex sm:flex-row sm:flex-wrap sm:justify-end">
          <Button
            onClick={handleRevisar}
            disabled={isLoading}
            className="col-span-2 h-11 w-full touch-target sm:col-span-1 sm:h-9 sm:w-auto"
          >
            <Check className="h-4 w-4 mr-2" />
            Marcar como revisada
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={isLoading}
                className="h-11 w-full touch-target sm:h-9 sm:w-auto"
              >
                <X className="h-4 w-4 mr-2" />
                Descartar
                <ChevronDown className="h-3 w-3 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[min(calc(100vw-2rem),16rem)]">
              {discardReasons.map(reason => (
                <DropdownMenuItem
                  key={reason}
                  onClick={() => handleDescartar(reason)}
                  className="py-3 sm:py-2"
                >
                  {DISCARD_REASON_LABELS[reason]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            onClick={() => onAction('acknowledge')}
            disabled={isLoading}
            className="h-11 w-full touch-target border-2 border-border bg-background shadow-xs hover:bg-accent sm:h-9 sm:w-auto"
          >
            <Eye className="h-4 w-4 mr-2" />
            A Revisión
          </Button>

          <Button
            variant="outline"
            onClick={onEscalate}
            disabled={isLoading}
            className="col-span-2 h-11 w-full touch-target border-primary/40 text-primary hover:bg-primary/10 sm:col-span-1 sm:h-9 sm:w-auto"
          >
            <ArrowUpRight className="h-4 w-4 mr-2" />
            Escalar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
