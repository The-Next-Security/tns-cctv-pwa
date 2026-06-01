'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import useSWR from 'swr'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  ArrowLeft, 
  Camera, 
  Clock, 
  MapPin, 
  Check, 
  X, 
  ArrowUpRight, 
  ChevronDown,
  Info,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
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
import { DISCARD_REASON_LABELS, CRITICALITY_LABELS, ALERT_STATUS_LABELS, getEventLabel } from '@/lib/types'
import { EscalateSheet } from '@/components/operacion/escalate-sheet'

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

export default function AlertaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [observation, setObservation] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [metadataOpen, setMetadataOpen] = useState(false)
  const [escalateOpen, setEscalateOpen] = useState(false)

  const { data: alert, error, mutate } = useSWR<Alert>(
    `alert-${id}`,
    () => alertsApi.get(parseInt(id))
  )

  const isPending = alert?.status === 'pendiente'

  async function handleRevisar() {
    if (!alert) return
    setIsLoading(true)
    try {
      await alertsApi.attend(alert.id, { 
        action: 'revisada',
        observation: observation || undefined,
      })
      toast.success('Alerta marcada como revisada')
      mutate()
      router.push('/operacion')
    } catch (error) {
      toast.error('Error al procesar la alerta')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDescartar(reason: DiscardReason) {
    if (!alert) return
    setIsLoading(true)
    try {
      await alertsApi.attend(alert.id, {
        action: 'descartada',
        discard_reason: reason,
        observation: observation || undefined,
      })
      toast.success('Alerta descartada')
      mutate()
      router.push('/operacion')
    } catch (error) {
      toast.error('Error al descartar la alerta')
    } finally {
      setIsLoading(false)
    }
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/operacion">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium">Error al cargar la alerta</p>
            <p className="text-muted-foreground">No se encontro la alerta solicitada</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!alert) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-24" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-32" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    )
  }

  const timeAgo = formatDistanceToNow(new Date(alert.created_at || new Date()), {
    addSuffix: false,
    locale: es,
  })

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Link href="/operacion">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Consola
        </Button>
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge
          variant="outline"
          className={cn(
            'text-sm',
            criticalityStyles[alert.criticality],
            alert.criticality === 'critica' && isPending && 'animate-criticality-pulse'
          )}
        >
          {CRITICALITY_LABELS[alert.criticality].toUpperCase()}
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight">
          {getEventLabel(alert.event_code)}
        </h1>
        {!isPending && (
          <Badge variant="secondary">
            {ALERT_STATUS_LABELS[alert.status]}
          </Badge>
        )}
      </div>

      {/* Info bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        {alert.camera && (
          <span className="flex items-center gap-1.5">
            <Camera className="h-4 w-4" />
            {alert.camera.name}
          </span>
        )}
        {alert.zone && (
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {alert.zone.name}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          hace {timeAgo}
        </span>
        <span className="text-xs">
          {format(new Date(alert.pts_timestamp || new Date()), 'dd/MM/yyyy HH:mm:ss', { locale: es })}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left column - Evidence */}
        <div className="lg:col-span-2 space-y-4">
          {/* Snapshot */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Evidencia</CardTitle>
            </CardHeader>
            <CardContent>
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
                    <span className="sr-only">Sin imagen disponible</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Observations */}
          {isPending && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Observaciones</CardTitle>
                <CardDescription>
                  Agregue comentarios antes de procesar la alerta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Observaciones adicionales..."
                  value={observation}
                  onChange={e => setObservation(e.target.value)}
                  rows={3}
                />
              </CardContent>
            </Card>
          )}

          {/* Existing observation */}
          {alert.observation && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Observaciones registradas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{alert.observation}</p>
              </CardContent>
            </Card>
          )}

          {/* Technical metadata */}
          <Collapsible open={metadataOpen} onOpenChange={setMetadataOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Metadata tecnica
                    </CardTitle>
                    <ChevronDown className={cn(
                      'h-4 w-4 transition-transform',
                      metadataOpen && 'rotate-180'
                    )} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <dl className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">ID Alerta</dt>
                      <dd className="font-mono">{alert.id}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">ID Evento</dt>
                      <dd className="font-mono">{alert.event_raw_id}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Codigo Evento</dt>
                      <dd className="font-mono">{alert.event_code || '-'}</dd>
                    </div>
                    {alert.rule && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Regla aplicada</dt>
                        <dd>{alert.rule.name}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">PTS Timestamp</dt>
                      <dd className="font-mono text-xs">
                        {format(new Date(alert.pts_timestamp || new Date()), 'yyyy-MM-dd HH:mm:ss.SSS')}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        {/* Right column - Actions & Context */}
        <div className="space-y-4">
          {/* Actions */}
          {isPending && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Acciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full"
                  onClick={handleRevisar}
                  disabled={isLoading}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Marcar como revisada
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full" disabled={isLoading}>
                      <X className="h-4 w-4 mr-2" />
                      Descartar
                      <ChevronDown className="h-3 w-3 ml-auto" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
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

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setEscalateOpen(true)}
                  disabled={isLoading}
                >
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Escalar
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Resolution info */}
          {!isPending && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Resolucion</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Estado</dt>
                    <dd className="font-medium">{ALERT_STATUS_LABELS[alert.status]}</dd>
                  </div>
                  {alert.discard_reason && (
                    <div>
                      <dt className="text-muted-foreground">Motivo de descarte</dt>
                      <dd>{DISCARD_REASON_LABELS[alert.discard_reason]}</dd>
                    </div>
                  )}
                  {alert.attended_by_user && (
                    <div>
                      <dt className="text-muted-foreground">Atendida por</dt>
                      <dd>{alert.attended_by_user.full_name}</dd>
                    </div>
                  )}
                  {alert.attended_at && (
                    <div>
                      <dt className="text-muted-foreground">Fecha atencion</dt>
                      <dd>{format(new Date(alert.attended_at), 'dd/MM/yyyy HH:mm', { locale: es })}</dd>
                    </div>
                  )}
                  {alert.response_time_seconds && (
                    <div>
                      <dt className="text-muted-foreground">Tiempo de respuesta</dt>
                      <dd>{Math.floor(alert.response_time_seconds / 60)}m {alert.response_time_seconds % 60}s</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}

          {/* Camera context */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Contexto de camara</CardTitle>
              <CardDescription>Alertas previas en las ultimas 4 horas</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay alertas previas recientes
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Escalate Sheet */}
      <EscalateSheet
        alert={escalateOpen ? alert : null}
        onClose={() => setEscalateOpen(false)}
        onSuccess={() => {
          mutate()
          router.push('/operacion')
        }}
      />
    </div>
  )
}
