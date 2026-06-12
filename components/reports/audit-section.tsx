'use client'

// Sección de accountability (CIOC): actividad por operador y pista de
// auditoría unificada (timeline operativo + auditoría administrativa).
// Solo visible para admin_parque|supervisor (RoleGate en la página) y
// protegida igual en el servidor (requireRole en /api/v1/reports/*).

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { reports } from '@/lib/api'
import { getEventLabel } from '@/lib/types'
import type { ReportAuditTrail, ReportOperator } from '@/lib/types'

const PAGE_SIZE = 15

export function formatSeconds(s: number | null | undefined): string {
  if (s == null) return '—'
  if (s < 60) return `${s}s`
  const min = Math.floor(s / 60)
  return `${min}m ${s % 60}s`
}

function auditActionLabel(entry: ReportAuditTrail['items'][number]): string {
  if (entry.categoria === 'ADMIN') return `${entry.accion} ${entry.recurso ?? ''}`.trim()
  if (entry.accion === 'CALL_REGISTERED') return 'Registró llamada'
  if (entry.to_state === 'IN_REVIEW') return 'Tomó la alerta'
  if (entry.to_state === 'ESCALATING') return 'Escaló'
  if (entry.to_state === 'CLOSED' && entry.decision === 'FALSE_POSITIVE') return 'Descartó'
  if (entry.to_state === 'CLOSED') return 'Resolvió'
  if (entry.to_state === 'NEW' && entry.decision === 'REACTIVATED') return 'Reactivó'
  if (entry.to_state === 'NEW') return 'Alerta creada'
  return entry.accion
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

interface AuditSectionProps {
  from: string
  to: string
}

export function AuditSection({ from, to }: AuditSectionProps) {
  const [operators, setOperators] = useState<ReportOperator[] | null>(null)
  const [audit, setAudit] = useState<ReportAuditTrail | null>(null)
  const [page, setPage] = useState(1)
  const [error, setError] = useState(false)

  useEffect(() => {
    setPage(1)
  }, [from, to])

  const load = useCallback(async () => {
    setError(false)
    try {
      const [ops, trail] = await Promise.all([
        reports.operators({ from, to }),
        reports.auditTrail({ from, to, page, page_size: PAGE_SIZE }),
      ])
      setOperators(ops.items)
      setAudit(trail)
    } catch {
      setError(true)
    }
  }, [from, to, page])

  useEffect(() => {
    load()
  }, [load])

  if (error) {
    return (
      <div
        className="rounded-xl border px-4 py-3 text-sm text-ds-ink-body"
        style={{ backgroundColor: 'rgb(250 173 20 / 0.12)', borderColor: 'rgb(250 173 20 / 0.35)' }}
        role="status"
      >
        No se pudo cargar la sección de auditoría. Verifica que el API esté disponible.
      </div>
    )
  }

  const totalPages = audit ? Math.max(1, Math.ceil(audit.total / audit.page_size)) : 1

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Actividad por Operador</CardTitle>
          <p className="text-sm text-ds-ink-muted">
            Acciones registradas en el período — fuente: trazabilidad de alertas (no editable).
          </p>
        </CardHeader>
        <CardContent>
          {!operators ? (
            <Skeleton className="h-32 w-full" />
          ) : operators.length === 0 ? (
            <p className="text-sm text-ds-ink-muted">Sin actividad de operadores en el período.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operador</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                    <TableHead className="text-right">Tomadas</TableHead>
                    <TableHead className="text-right">Resueltas</TableHead>
                    <TableHead className="text-right">Descartadas</TableHead>
                    <TableHead className="text-right">Escaladas</TableHead>
                    <TableHead className="text-right">Tiempo de toma</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operators.map((op) => (
                    <TableRow key={op.user_id}>
                      <TableCell className="font-medium">{op.nombre}</TableCell>
                      <TableCell className="text-ds-ink-muted">{op.rol ?? '—'}</TableCell>
                      <TableCell className="text-right">{op.acciones}</TableCell>
                      <TableCell className="text-right">{op.tomadas}</TableCell>
                      <TableCell className="text-right">{op.resueltas}</TableCell>
                      <TableCell className="text-right">{op.descartadas}</TableCell>
                      <TableCell className="text-right">{op.escaladas}</TableCell>
                      <TableCell className="text-right">{formatSeconds(op.tiempo_toma_promedio_s)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pista de Auditoría</CardTitle>
          <p className="text-sm text-ds-ink-muted">
            Transiciones de alertas y cambios administrativos, con actor y hora exacta (UTC en BD).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!audit ? (
            <Skeleton className="h-48 w-full" />
          ) : audit.items.length === 0 ? (
            <p className="text-sm text-ds-ink-muted">Sin registros de auditoría en el período.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Acción</TableHead>
                      <TableHead>Recurso</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Detalle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audit.items.map((entry, idx) => (
                      <TableRow key={`${entry.occurred_at}-${idx}`}>
                        <TableCell className="whitespace-nowrap text-ds-ink-muted">
                          {formatTimestamp(entry.occurred_at)}
                        </TableCell>
                        <TableCell className="font-medium">{entry.actor}</TableCell>
                        <TableCell>{auditActionLabel(entry)}</TableCell>
                        <TableCell className="text-ds-ink-muted">
                          {entry.categoria === 'OPERACION' ? getEventLabel(entry.recurso) : entry.recurso ?? '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={entry.categoria === 'ADMIN' ? 'secondary' : 'outline'}>
                            {entry.categoria === 'ADMIN' ? 'Admin' : 'Operación'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[260px] truncate text-ds-ink-muted">
                          {entry.detalle ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-ds-ink-muted">
                  {audit.total} registros — página {audit.page} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    aria-label="Página siguiente"
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
