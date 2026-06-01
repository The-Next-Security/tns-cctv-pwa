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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LiveCameraPanel } from '@/components/operacion/live-camera-panel'
import { resolveSnapshotUrl, resolveLiveFeedUrl } from '@/lib/demo-media'
import { cn } from '@/lib/utils'
import type { Alert } from '@/lib/types'
import { getEventLabel } from '@/lib/types'
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
  const snapshotSrc = resolveSnapshotUrl(alert.snapshot_url, alert.event_type)
  const recentSameCamera = recentAlerts.filter(
    a => a.id !== alert.id && a.camera?.id === alert.camera?.id
  ).slice(0, 5)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            <Badge
              variant="outline"
              className={cn(
                'shrink-0 font-semibold uppercase tracking-wide text-xs',
                styles.bgSubtle,
                styles.text,
                alert.criticality === 'critica' && 'animate-pulse'
              )}
            >
              {alert.criticality}
            </Badge>
            <span className="flex-1 leading-snug text-sm sm:text-base">
              {alert.description || getEventLabel(alert.event_code)}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Layout: columna única en móvil, 2 col en sm+ */}
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
          {/* Columna principal: imagen + metadatos */}
          <div className="flex-1 min-w-0 space-y-3">
            <Tabs defaultValue="snapshot">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="snapshot">Snapshot</TabsTrigger>
                <TabsTrigger value="live">En vivo</TabsTrigger>
              </TabsList>
              <TabsContent value="snapshot" className="mt-3">
                <div className="aspect-video max-h-[40dvh] overflow-hidden rounded-lg border border-border bg-muted sm:max-h-none">
                  {!imageError ? (
                    <img
                      src={snapshotSrc}
                      className="h-full w-full object-cover"
                      alt="Snapshot de la alerta"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Image className="h-12 w-12 opacity-50" />
                      <p className="text-sm">Error al cargar imagen</p>
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

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Zona</p>
                <p className="font-medium">{alert.zone?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Cámara</p>
                <p className="font-medium">{alert.camera?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Hora</p>
                <p className="text-live-data font-semibold text-zinc-200">
                  {format(new Date(alert.timestamp), 'HH:mm:ss', { locale: es })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Regla</p>
                <p className="font-medium text-xs truncate">{alert.observation || getEventLabel(alert.event_code)}</p>
              </div>
            </div>
          </div>

          {/* Panel lateral: oculto en móvil, visible desde sm */}
          <div className="hidden sm:flex sm:w-52 sm:shrink-0 sm:flex-col sm:gap-4">
            <div className="space-y-2 rounded-lg border border-border p-3">
              <h4 className="text-sm font-medium">Alertas recientes (cámara)</h4>
              {recentSameCamera.length > 0 ? (
                <div className="max-h-32 space-y-2 overflow-y-auto">
                  {recentSameCamera.map(a => (
                    <div
                      key={a.id}
                      className={cn(
                        'rounded border-l-2 p-2 text-xs',
                        CRITICALITY_STYLES[a.criticality].border,
                        'bg-secondary/50'
                      )}
                    >
                      <p className="truncate font-medium">{a.description}</p>
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

            <div className="space-y-1 rounded-lg border border-border p-3 text-xs">
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
                  )}
                  s
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="grid grid-cols-2 gap-2 pt-1 sm:flex sm:flex-row sm:justify-end">
          <Button
            className="col-span-2 h-11 w-full touch-target sm:col-span-1 sm:h-9 sm:w-auto"
            onClick={() => {
              onAction(alert.id, 'resolve')
              onOpenChange(false)
            }}
          >
            ✓ Marcar como Revisada
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-11 w-full touch-target sm:h-9 sm:w-auto">
                ✕ Descartar ▼
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[min(calc(100vw-2rem),20rem)]">
              {DISCARD_REASONS.map(reason => (
                <DropdownMenuItem
                  key={reason.value}
                  onClick={() => {
                    onAction(alert.id, 'discard', reason.value)
                    onOpenChange(false)
                  }}
                  className="cursor-pointer py-3 sm:py-2"
                >
                  <AlertTriangle className="mr-2 h-4 w-4 shrink-0" />
                  <span>{reason.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            className="h-11 w-full touch-target border-2 border-border bg-background shadow-xs hover:bg-accent sm:h-9 sm:w-auto"
            onClick={() => {
              onAction(alert.id, 'acknowledge')
              onOpenChange(false)
            }}
          >
            A Revisión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
