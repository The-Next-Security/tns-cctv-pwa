'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  FileText, 
  Search, 
  Filter,
  ChevronRight,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { caseFiles, tenants as tenantsApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { CaseFile, MatchStatus, CaseResolution, Tenant } from '@/lib/types'
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

export default function ExpedientesPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [matchStatusFilter, setMatchStatusFilter] = useState<string>('all')
  const [plateFilter, setPlateFilter] = useState('')
  const [tenantFilter, setTenantFilter] = useState<string>('all')

  // Fetch tenants for filter
  const { data: tenants } = useSWR<Tenant[]>('tenants', () => tenantsApi.list())

  // Fetch case files
  const { data: casesData, error, isLoading } = useSWR(
    ['case-files', statusFilter, matchStatusFilter, tenantFilter, plateFilter],
    () => caseFiles.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      match_status: matchStatusFilter === 'all' ? undefined : matchStatusFilter,
      tenant_id: tenantFilter === 'all' ? undefined : parseInt(tenantFilter),
      plate: plateFilter || undefined,
      pageSize: 50,
    }),
    { refreshInterval: 60000 }
  )

  const cases = casesData?.data || []

  return (
    <div className="page-stack">
      {/* Header */}
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="page-title">Expedientes</h1>
          <p className="page-subtitle">
            Infracciones y cruce con ingresos
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="soft-card-compact">
        <CardContent className="p-3 sm:p-4">
          <div className="mobile-scroll-x">
          <div className="filter-scroll-row">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="notificado">Notificado</SelectItem>
                <SelectItem value="desestimado">Desestimado</SelectItem>
                <SelectItem value="archivado">Archivado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={matchStatusFilter} onValueChange={setMatchStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo match" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="match_confiable">Match Confiable</SelectItem>
                <SelectItem value="revision_manual">Revision Manual</SelectItem>
                <SelectItem value="fuera_ventana">Fuera de Ventana</SelectItem>
                <SelectItem value="sin_coincidencia">Sin Coincidencia</SelectItem>
              </SelectContent>
            </Select>

            <Select value={tenantFilter} onValueChange={setTenantFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las empresas</SelectItem>
                {tenants?.filter(t => t.active).map(tenant => (
                  <SelectItem key={tenant.id} value={String(tenant.id)}>
                    {tenant.legal_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar patente..."
                value={plateFilter}
                onChange={e => setPlateFilter(e.target.value.toUpperCase())}
                className="pl-8 w-[150px] uppercase"
              />
            </div>
          </div>
          </div>
        </CardContent>
      </Card>

      {/* Case Files Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Listado de Expedientes
          </CardTitle>
          <CardDescription>
            {cases.length} expediente{cases.length !== 1 ? 's' : ''} encontrado{cases.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <p className="text-lg font-medium">Error al cargar expedientes</p>
              <p className="text-muted-foreground">No se pudo conectar con el servidor</p>
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium">Sin expedientes</p>
              <p className="text-muted-foreground">
                No hay expedientes que coincidan con los filtros seleccionados
              </p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Caso</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Tipo Match</TableHead>
                    <TableHead>Patente</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Velocidad</TableHead>
                    <TableHead>Detectado</TableHead>
                    <TableHead>Resolucion</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.map(caseFile => (
                    <TableRow key={caseFile.id}>
                      <TableCell>
                        <span className="font-mono text-sm">{caseFile.case_number}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={caseFile.resolution === 'pendiente' ? 'default' : 'secondary'}>
                          {resolutionLabels[caseFile.resolution]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(matchStatusStyles[caseFile.match_status])}
                        >
                          {MATCH_STATUS_LABELS[caseFile.match_status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">
                          {caseFile.infraction?.plate_read || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {caseFile.tenant?.legal_name || '-'}
                      </TableCell>
                      <TableCell>
                        {caseFile.infraction?.speed_kmh ? (
                          <span className={cn(
                            'font-medium',
                            caseFile.infraction.speed_kmh > (caseFile.infraction.speed_limit_kmh || 0)
                              ? 'text-destructive'
                              : ''
                          )}>
                            {caseFile.infraction.speed_kmh} km/h
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {caseFile.infraction?.detected_at
                          ? format(new Date(caseFile.infraction.detected_at), 'dd/MM HH:mm', { locale: es })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {resolutionLabels[caseFile.resolution]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/expedientes/${caseFile.id}`}>
                          <Button variant="ghost" size="icon">
                            <ChevronRight className="h-4 w-4" />
                            <span className="sr-only">Ver detalle</span>
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
