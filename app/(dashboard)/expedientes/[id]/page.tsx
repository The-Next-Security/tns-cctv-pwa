'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import useSWR from 'swr'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  ArrowLeft,
  Camera,
  Car,
  Building2,
  User,
  Clock,
  Gauge,
  AlertTriangle,
  Mail,
  X,
  Archive,
  Check,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { caseFiles } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { CaseFile, MatchStatus, CaseResolution, VehicleEntry } from '@/lib/types'
import { MATCH_STATUS_LABELS } from '@/lib/types'

const matchStatusStyles: Record<MatchStatus, string> = {
  match_confiable: 'bg-status-ok/20 text-status-ok border-status-ok/30',
  revision_manual: 'bg-status-degraded/20 text-status-degraded border-status-degraded/30',
  fuera_ventana: 'bg-muted text-muted-foreground',
  sin_coincidencia: 'bg-status-down/20 text-status-down border-status-down/30',
}

const resolutionLabels: Record<CaseResolution, string> = {
  pendiente: 'Pendiente',
  notificado: 'Notificado',
  desestimado: 'Desestimado',
  archivado: 'Archivado',
}

export default function ExpedienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [resolutionNote, setResolutionNote] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [actionDialog, setActionDialog] = useState<'notify' | 'dismiss' | 'archive' | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<number | null>(null)

  const { data: caseFile, error, mutate } = useSWR<CaseFile>(
    `case-file-${id}`,
    () => caseFiles.get(parseInt(id))
  )

  const isPending = caseFile?.resolution === 'pendiente'
  const needsManualReview = caseFile?.match_status === 'revision_manual'

  async function handleResolve(resolution: 'notificado' | 'desestimado' | 'archivado') {
    if (!caseFile) return
    
    // For manual review, require entry selection
    if (needsManualReview && resolution === 'notificado' && !selectedEntry) {
      toast.error('Seleccione un registro de ingreso')
      return
    }

    setIsLoading(true)
    try {
      await caseFiles.resolve(caseFile.id, {
        resolution,
        resolution_note: resolutionNote || undefined,
        selected_entry_id: selectedEntry || undefined,
      })
      toast.success(`Expediente ${resolution}`)
      mutate()
      setActionDialog(null)
      setResolutionNote('')
    } catch (error) {
      toast.error('Error al procesar el expediente')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleNotifyTenant() {
    if (!caseFile || !caseFile.tenant) return
    
    setIsLoading(true)
    try {
      await caseFiles.notifyTenant(caseFile.id, {
        subject: `Infraccion vehicular - Caso ${caseFile.case_number}`,
        body_html: `<p>Se ha registrado una infraccion de velocidad asociada a su empresa.</p>
          <p>Patente: ${caseFile.infraction?.plate_read}</p>
          <p>Velocidad: ${caseFile.infraction?.speed_kmh} km/h</p>`,
      })
      toast.success('Correo enviado al arrendatario (demo)')
      await handleResolve('notificado')
    } catch (error) {
      toast.error('Error al enviar notificacion')
      setIsLoading(false)
    }
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/expedientes">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium">Error al cargar el expediente</p>
            <p className="text-muted-foreground">No se encontro el expediente solicitado</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!caseFile) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/expedientes">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Expedientes
        </Button>
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight font-mono">
          {caseFile.case_number}
        </h1>
        <Badge
          variant="outline"
          className={cn(matchStatusStyles[caseFile.match_status])}
        >
          {MATCH_STATUS_LABELS[caseFile.match_status]}
        </Badge>
        <Badge variant={caseFile.resolution === 'pendiente' ? 'default' : 'secondary'}>
          {resolutionLabels[caseFile.resolution]}
        </Badge>
      </div>

      {/* 3-Column Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Column 1: Infraction */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Infraccion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Evidence Image */}
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              {caseFile.infraction?.evidence_url ? (
                <Image
                  src={caseFile.infraction.evidence_url}
                  alt="Evidencia de la infraccion"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="h-12 w-12 text-muted-foreground/30" />
                </div>
              )}
            </div>

            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Patente leida</dt>
                <dd className="font-mono font-medium">{caseFile.infraction?.plate_read || '-'}</dd>
              </div>
              {caseFile.infraction?.speed_kmh && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Velocidad</dt>
                    <dd className="font-medium text-destructive">
                      {caseFile.infraction.speed_kmh} km/h
                    </dd>
                  </div>
                  {caseFile.infraction.speed_limit_kmh && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Limite</dt>
                      <dd>{caseFile.infraction.speed_limit_kmh} km/h</dd>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Detectado</dt>
                <dd>
                  {caseFile.infraction?.detected_at
                    ? format(new Date(caseFile.infraction.detected_at), 'dd/MM/yyyy HH:mm:ss', { locale: es })
                    : '-'}
                </dd>
              </div>
              {caseFile.infraction?.camera && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Camara</dt>
                  <dd>{caseFile.infraction.camera.name}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Column 2: Match */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Match
            </CardTitle>
            <CardDescription>
              {caseFile.match_status === 'match_confiable' && 'Coincidencia automatica confirmada'}
              {caseFile.match_status === 'revision_manual' && 'Requiere revision manual'}
              {caseFile.match_status === 'fuera_ventana' && 'Fuera de ventana de tiempo'}
              {caseFile.match_status === 'sin_coincidencia' && 'Sin registro de ingreso coincidente'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Matched Entry */}
            {caseFile.matched_entry && (
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-status-ok" />
                  <span className="font-medium">Registro vinculado</span>
                </div>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Patente</dt>
                    <dd className="font-mono">{caseFile.matched_entry.plate}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Conductor</dt>
                    <dd>{caseFile.matched_entry.declared_driver_name || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">RUT</dt>
                    <dd>{caseFile.matched_entry.declared_driver_id || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Ingreso</dt>
                    <dd>{format(new Date(caseFile.matched_entry.entry_at), 'dd/MM HH:mm', { locale: es })}</dd>
                  </div>
                </dl>
              </div>
            )}

            {/* Candidate Entries for Manual Review */}
            {needsManualReview && caseFile.candidate_entries && caseFile.candidate_entries.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Candidatos para revision:</p>
                {caseFile.candidate_entries.map(entry => (
                  <div
                    key={entry.id}
                    className={cn(
                      'rounded-lg border p-3 cursor-pointer transition-colors',
                      selectedEntry === entry.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-accent'
                    )}
                    onClick={() => setSelectedEntry(entry.id)}
                  >
                    <dl className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Patente</dt>
                        <dd className="font-mono">{entry.plate}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Conductor</dt>
                        <dd>{entry.declared_driver_name || '-'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Ingreso</dt>
                        <dd>{format(new Date(entry.entry_at), 'dd/MM HH:mm', { locale: es })}</dd>
                      </div>
                    </dl>
                    {selectedEntry === entry.id && (
                      <Badge className="mt-2" variant="secondary">
                        Seleccionado
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Tenant Info */}
            {caseFile.tenant && (
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">Empresa</span>
                </div>
                <p>{caseFile.tenant.legal_name}</p>
                {caseFile.tenant.contact_email && (
                  <p className="text-sm text-muted-foreground">{caseFile.tenant.contact_email}</p>
                )}
              </div>
            )}

            {caseFile.match_status === 'sin_coincidencia' && (
              <div className="text-center py-4">
                <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No se encontro registro de ingreso coincidente
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Column 3: Resolution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Resolucion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isPending ? (
              <>
                {/* Resolution note */}
                <div className="space-y-2">
                  <Label>Nota de resolucion</Label>
                  <Textarea
                    placeholder="Agregar observaciones..."
                    value={resolutionNote}
                    onChange={e => setResolutionNote(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  {caseFile.tenant && (
                    <Button
                      className="w-full"
                      onClick={() => setActionDialog('notify')}
                      disabled={needsManualReview && !selectedEntry}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Notificar a Tenant
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setActionDialog('dismiss')}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Desestimar
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setActionDialog('archive')}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archivar
                  </Button>
                </div>

                {needsManualReview && !selectedEntry && (
                  <p className="text-xs text-muted-foreground text-center">
                    Seleccione un registro de ingreso para poder notificar
                  </p>
                )}
              </>
            ) : (
              /* Resolution History */
              <div className="space-y-4">
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Estado</dt>
                    <dd>
                      <Badge>{resolutionLabels[caseFile.resolution]}</Badge>
                    </dd>
                  </div>
                  {caseFile.resolved_by_user && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Resuelto por</dt>
                      <dd>{caseFile.resolved_by_user.full_name}</dd>
                    </div>
                  )}
                  {caseFile.resolved_at && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Fecha</dt>
                      <dd>{format(new Date(caseFile.resolved_at), 'dd/MM/yyyy HH:mm', { locale: es })}</dd>
                    </div>
                  )}
                  {caseFile.notification_sent_at && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Notificado</dt>
                      <dd>{format(new Date(caseFile.notification_sent_at), 'dd/MM/yyyy HH:mm', { locale: es })}</dd>
                    </div>
                  )}
                </dl>
                {caseFile.resolution_note && (
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-sm font-medium mb-1">Nota:</p>
                    <p className="text-sm">{caseFile.resolution_note}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialogs */}
      <Dialog open={actionDialog === 'notify'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notificar a Tenant</DialogTitle>
            <DialogDescription>
              Se enviara una notificacion por correo a {caseFile.tenant?.legal_name}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleNotifyTenant} disabled={isLoading}>
              {isLoading ? 'Enviando...' : 'Enviar Notificacion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionDialog === 'dismiss'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desestimar Expediente</DialogTitle>
            <DialogDescription>
              El expediente sera marcado como desestimado
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={() => handleResolve('desestimado')} disabled={isLoading}>
              {isLoading ? 'Procesando...' : 'Desestimar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionDialog === 'archive'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archivar Expediente</DialogTitle>
            <DialogDescription>
              El expediente sera archivado sin notificacion
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={() => handleResolve('archivado')} disabled={isLoading}>
              {isLoading ? 'Procesando...' : 'Archivar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
