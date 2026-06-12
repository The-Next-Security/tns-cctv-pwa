'use client'

// D12: Historial forense de alertas — búsqueda paginada server-side sobre las
// alertas cerradas fuera de la ventana operativa de 48h. Solo lectura, RBAC
// supervisor+ (el guard real vive en el backend; la pestaña se oculta por rol).

import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCard } from '@/components/operacion/alert-card'
import { alerts as alertsApi, users as usersApi } from '@/lib/api'
import { PARK_ZONES, CRITICALITY_LABELS } from '@/lib/constants'
import type { Alert, Criticality, User } from '@/lib/types'
import { toast } from 'sonner'

const PAGE_SIZE = 25
const CRITICALITY_OPTIONS: Criticality[] = ['critica', 'alta', 'media', 'baja']

export interface AlertsHistoryFilters {
  from: string
  to: string
  zone: string
  criticality: string
  plate: string
  operator: string
  page: number
}

interface AlertsHistoryProps {
  filters: AlertsHistoryFilters
  onFiltersChange: (updates: Partial<AlertsHistoryFilters>) => void
  onShowDetails?: (alert: Alert) => void
}

const noop = () => {}

export function AlertsHistory({ filters, onFiltersChange, onShowDetails }: AlertsHistoryProps) {
  const [items, setItems] = useState<Alert[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [operators, setOperators] = useState<User[]>([])

  // Texto de patente con commit diferido: la búsqueda corre al salir del campo
  // o presionar Enter, no en cada tecla.
  const [plateDraft, setPlateDraft] = useState(filters.plate)
  useEffect(() => setPlateDraft(filters.plate), [filters.plate])

  useEffect(() => {
    usersApi.list().then(setOperators).catch(() => setOperators([]))
  }, [])

  const search = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await alertsApi.list({
        scope: 'historial',
        from: filters.from ? `${filters.from}T00:00:00.000Z` : undefined,
        to: filters.to ? `${filters.to}T23:59:59.999Z` : undefined,
        zone_id: filters.zone !== 'all' ? parseInt(filters.zone) : undefined,
        criticality: filters.criticality !== 'all' ? (filters.criticality as Criticality) : undefined,
        plate: filters.plate || undefined,
        resolved_by: filters.operator !== 'all' ? filters.operator : undefined,
        page: filters.page,
        pageSize: PAGE_SIZE,
      })
      const data = (res as unknown as { data?: Alert[]; items?: Alert[] }).data
        ?? (res as unknown as { items?: Alert[] }).items
        ?? []
      const pagination = (res as unknown as { pagination?: { total?: number } }).pagination
      setItems(data)
      setTotal(pagination?.total ?? data.length)
    } catch {
      toast.error('No se pudo consultar el historial de alertas.')
      setItems([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    search()
  }, [search])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const rangeStart = total === 0 ? 0 : (filters.page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(filters.page * PAGE_SIZE, total)
  const hasFilters =
    filters.from !== '' || filters.to !== '' || filters.zone !== 'all' ||
    filters.criticality !== 'all' || filters.plate !== '' || filters.operator !== 'all'

  function commitPlate() {
    if (plateDraft !== filters.plate) onFiltersChange({ plate: plateDraft, page: 1 })
  }

  return (
    <div className="space-y-4">
      {/* Formulario de búsqueda forense */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="historial-desde" className="text-xs text-ds-ink-muted">Desde</Label>
          <Input
            id="historial-desde"
            type="date"
            value={filters.from}
            onChange={e => onFiltersChange({ from: e.target.value, page: 1 })}
            className="h-10 rounded-xl border-0 bg-ds-muted text-sm shadow-none"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="historial-hasta" className="text-xs text-ds-ink-muted">Hasta</Label>
          <Input
            id="historial-hasta"
            type="date"
            value={filters.to}
            onChange={e => onFiltersChange({ to: e.target.value, page: 1 })}
            className="h-10 rounded-xl border-0 bg-ds-muted text-sm shadow-none"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="historial-patente" className="text-xs text-ds-ink-muted">Patente</Label>
          <Input
            id="historial-patente"
            type="text"
            placeholder="Ej: ABCD12"
            value={plateDraft}
            onChange={e => setPlateDraft(e.target.value)}
            onBlur={commitPlate}
            onKeyDown={e => { if (e.key === 'Enter') commitPlate() }}
            className="h-10 rounded-xl border-0 bg-ds-muted font-mono text-sm uppercase shadow-none"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-ds-ink-muted">Zona</Label>
          <Select value={filters.zone} onValueChange={value => onFiltersChange({ zone: value, page: 1 })}>
            <SelectTrigger className="h-10 w-full rounded-xl border-0 bg-ds-muted text-sm shadow-none">
              <SelectValue placeholder="Zona" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las zonas</SelectItem>
              {PARK_ZONES.map(zone => (
                <SelectItem key={zone.id} value={String(zone.id)}>
                  {zone.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-ds-ink-muted">Criticidad</Label>
          <Select value={filters.criticality} onValueChange={value => onFiltersChange({ criticality: value, page: 1 })}>
            <SelectTrigger className="h-10 w-full rounded-xl border-0 bg-ds-muted text-sm shadow-none">
              <SelectValue placeholder="Criticidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {CRITICALITY_OPTIONS.map(level => (
                <SelectItem key={level} value={level}>
                  {CRITICALITY_LABELS[level]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-ds-ink-muted">Operador que resolvió</Label>
          <Select value={filters.operator} onValueChange={value => onFiltersChange({ operator: value, page: 1 })}>
            <SelectTrigger className="h-10 w-full rounded-xl border-0 bg-ds-muted text-sm shadow-none">
              <SelectValue placeholder="Operador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {operators.map(user => (
                <SelectItem key={String(user.id)} value={String(user.id)}>
                  {user.nombre || user.full_name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Resultados */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="soft-card animate-pulse p-5">
              <div className="flex items-start gap-4">
                <div className="h-6 w-20 rounded-lg bg-ds-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-48 rounded-lg bg-ds-muted" />
                  <div className="h-4 w-32 rounded-lg bg-ds-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="soft-card flex flex-col items-center justify-center px-4 py-10 text-center sm:px-6 sm:py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-ds-muted">
            <SearchX className="h-8 w-8 text-ds-ink-muted" />
          </div>
          <p className="text-lg font-medium">Sin resultados en el historial</p>
          <p className="mt-1 max-w-md text-ds-ink-muted">
            {hasFilters
              ? 'Ninguna alerta archivada coincide con los criterios de búsqueda.'
              : 'Aún no hay alertas archivadas: las cerradas pasan al historial 48h después de su resolución.'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-ds-ink-muted sm:text-sm">
            Mostrando {rangeStart}–{rangeEnd} de {total} alerta{total === 1 ? '' : 's'} archivada{total === 1 ? '' : 's'}
          </p>
          <div className="space-y-3">
            {items.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                readonly
                onAction={noop}
                onEscalate={noop}
                onLlamar={noop}
                onShowDetails={onShowDetails}
              />
            ))}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page <= 1}
                onClick={() => onFiltersChange({ page: filters.page - 1 })}
                className="h-9 rounded-xl border-0 bg-ds-muted text-xs shadow-none sm:text-sm"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Anterior
              </Button>
              <span className="text-xs tabular-nums text-ds-ink-muted sm:text-sm">
                Página {filters.page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page >= totalPages}
                onClick={() => onFiltersChange({ page: filters.page + 1 })}
                className="h-9 rounded-xl border-0 bg-ds-muted text-xs shadow-none sm:text-sm"
              >
                Siguiente
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
