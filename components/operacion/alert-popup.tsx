'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Image, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Alert } from '@/lib/types'
import { CRITICALITY_STYLES, DISCARD_REASONS } from '@/lib/constants'

interface AlertPopupProps {
  alert: Alert | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAction: (id: number, action: string, reason?: string) => void
  recentAlerts?: Alert[]
}

export function AlertPopup({
  alert,
  open,
  onOpenChange,
  onAction,
  recentAlerts = [],
}: AlertPopupProps) {
  const [imageError, setImageError] = useState(false)

  if (!alert) return null

  const styles = CRITICALITY_STYLES[alert.criticality]
  const recentSameCamera = recentAlerts.filter(
    a => a.id !== alert.id && a.camera?.id === alert.camera?.id
  ).slice(0, 5)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={cn(
                'font-semibold uppercase tracking-wide',
                styles.bgSubtle,
                styles.text,
                alert.criticality === 'critica' && 'animate-pulse'
              )}
            >
              {alert.criticality}
            </Badge>
            <span className="flex-1">{alert.description || 'Alerta de seguridad'}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-6">
          {/* Evidencia visual - Snapshot desde Dahua */}
          <div className="col-span-2 space-y-3">
            <div className="aspect-video bg-muted rounded-lg overflow-hidden border border-border">
              {alert.snapshot_url && !imageError ? (
                <img
                  src={`/api/v1${alert.snapshot_url}`}
                  className="w-full h-full object-cover"
                  alt="Snapshot de la alerta"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                  <Image className="h-12 w-12 opacity-50" />
                  <p className="text-sm">
                    {imageError ? 'Error al cargar imagen' : 'Sin snapshot disponible'}
                  </p>
                </div>
              )}
            </div>

            {/* Información de la alerta */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Zona</p>
                <p className="font-medium">{alert.zone?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cámara</p>
                <p className="font-medium">{alert.camera?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Hora</p>
                <p className="font-medium font-mono">
                  {format(new Date(alert.timestamp), 'HH:mm:ss', { locale: es })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Regla</p>
                <p className="font-medium text-xs truncate">{alert.observation || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Contexto y acciones */}
          <div className="space-y-4">
            {/* Historial de alertas en esta cámara */}
            <div className="border border-border rounded-lg p-3 space-y-2">
              <h4 className="font-medium text-sm">Alertas recientes (cámara)</h4>
              {recentSameCamera.length > 0 ? (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {recentSameCamera.map(a => (
                    <div
                      key={a.id}
                      className={cn(
                        'p-2 rounded text-xs border-l-2',
                        CRITICALITY_STYLES[a.criticality].border,
                        'bg-secondary/50'
                      )}
                    >
                      <p className="font-medium truncate">{a.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(a.timestamp), 'HH:mm', { locale: es })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No hay alertas previas en las últimas 4h
                </p>
              )}
            </div>

            {/* Estadísticas */}
            <div className="border border-border rounded-lg p-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estado:</span>
                <Badge variant="outline" className="capitalize">
                  {alert.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tiempo:</span>
                <span className="font-mono">
                  {Math.round(
                    (new Date().getTime() - new Date(alert.timestamp).getTime()) / 1000
                  )}s
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full"
            onClick={() => {
              onAction(alert.id, 'acknowledge')
              onOpenChange(false)
            }}
          >
            ✓ Marcar como Revisada
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full">
                ✕ Descartar ▼
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[320px]">
              {DISCARD_REASONS.map(reason => (
                <DropdownMenuItem
                  key={reason.value}
                  onClick={() => {
                    onAction(alert.id, 'discard', reason.value)
                    onOpenChange(false)
                  }}
                  className="cursor-pointer"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  <span>{reason.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              onAction(alert.id, 'escalate')
              onOpenChange(false)
            }}
          >
            ⚠ Escalar a Responsable
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
