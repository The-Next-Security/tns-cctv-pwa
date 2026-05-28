'use client'

import { useState } from 'react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Camera, Clock, MapPin, Check, X, ArrowUpRight, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { cn } from '@/lib/utils'
import type { Alert, Criticality, DiscardReason } from '@/lib/types'
import { DISCARD_REASON_LABELS, CRITICALITY_LABELS } from '@/lib/types'

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
      onAction('acknowledge')
    } catch (error) {
      toast.error('Error al procesar la alerta')
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
      onAction('acknowledge')
    } catch (error) {
      toast.error('Error al descartar la alerta')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={!!alert} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={cn(
                'text-sm',
                criticalityStyles[alert.criticality],
                alert.criticality === 'critica' && 'animate-criticality-pulse'
              )}
            >
              {CRITICALITY_LABELS[alert.criticality].toUpperCase()}
            </Badge>
            <DialogTitle className="text-xl">
              {alert.event_code || 'Alerta de Seguridad'}
            </DialogTitle>
          </div>
          <DialogDescription className="flex flex-wrap items-center gap-x-4 gap-y-1">
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
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              hace {timeAgo}
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Snapshot */}
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          {alert.snapshot_url ? (
            <Image
              src={alert.snapshot_url}
              alt="Snapshot del evento"
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Camera className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          <Button onClick={handleRevisar} disabled={isLoading}>
            <Check className="h-4 w-4 mr-2" />
            Revisar
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isLoading}>
                <X className="h-4 w-4 mr-2" />
                Descartar
                <ChevronDown className="h-3 w-3 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {discardReasons.map(reason => (
                <DropdownMenuItem
                  key={reason}
                  onClick={() => handleDescartar(reason)}
                >
                  {DISCARD_REASON_LABELS[reason]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" onClick={onEscalate} disabled={isLoading}>
            <ArrowUpRight className="h-4 w-4 mr-2" />
            Escalar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
