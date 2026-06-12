'use client'

import { useState } from 'react'
import { RefreshCw, SlidersHorizontal, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useIsMobile } from '@/components/ui/use-mobile'
import { PARK_ZONES } from '@/lib/constants'
import { ALERT_CLASS_LABELS } from '@/lib/types'
import { cn } from '@/lib/utils'

export type StatusView =
  | 'activas'
  | 'pendiente'
  | 'en_revision'
  | 'escaladas'
  | 'resueltas'
  | 'criticas'
  | 'baja_prioridad'
  | 'all'

export const STATUS_VIEW_LABELS: Record<StatusView, string> = {
  activas: 'Alertas activas',
  pendiente: 'Pendientes de atención',
  en_revision: 'En revisión',
  escaladas: 'Alertas escaladas',
  resueltas: 'Resueltas hoy',
  criticas: 'Críticas sin atender',
  baja_prioridad: 'Baja prioridad sin atender',
  all: 'Todas las alertas',
}

export type CriticalityFilter = 'all' | 'critica' | 'baja_prioridad'

/** Vistas representadas en el segmented control siempre visible; el resto vive en el panel de filtros o en las StatCards */
const SEGMENT_VIEWS: ReadonlyArray<StatusView> = ['activas', 'resueltas', 'all']

const PANEL_STATUS_OPTIONS: ReadonlyArray<{ value: StatusView; label: string }> = [
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'en_revision', label: 'En revisión' },
  { value: 'escaladas', label: 'Escaladas' },
]

const TAB_TRIGGER_CLASS =
  'rounded-lg px-2.5 sm:px-3 text-xs sm:text-sm data-[state=active]:bg-ds-surface data-[state=active]:shadow-card-md'

interface AlertsFilterBarProps {
  statusView: StatusView
  onStatusViewChange: (view: StatusView) => void
  criticalityFilter: CriticalityFilter
  onCriticalityFilterChange: (value: CriticalityFilter) => void
  zoneFilter: string
  onZoneFilterChange: (value: string) => void
  activeAlertsCount: number
  isLoading: boolean
  onRefresh: () => void
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Badge variant="secondary" className="gap-1 rounded-lg border-0 bg-ds-muted pr-1 text-xs text-ds-ink-body">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar filtro ${label}`}
        className="rounded-md p-0.5 text-ds-ink-muted transition-colors hover:bg-ds-surface hover:text-ds-ink-display"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  )
}

export function AlertsFilterBar({
  statusView,
  onStatusViewChange,
  criticalityFilter,
  onCriticalityFilterChange,
  zoneFilter,
  onZoneFilterChange,
  activeAlertsCount,
  isLoading,
  onRefresh,
}: AlertsFilterBarProps) {
  const isMobile = useIsMobile()
  const [panelOpen, setPanelOpen] = useState(false)

  const segmentValue = SEGMENT_VIEWS.includes(statusView) ? statusView : ''
  const isDetailedView = !SEGMENT_VIEWS.includes(statusView)
  const panelStatusValue = PANEL_STATUS_OPTIONS.some(option => option.value === statusView) ? statusView : ''
  const selectedZone = PARK_ZONES.find(zone => String(zone.id) === zoneFilter)

  const activeFilterCount =
    (isDetailedView ? 1 : 0) + (criticalityFilter !== 'all' ? 1 : 0) + (zoneFilter !== 'all' ? 1 : 0)

  function clearAllFilters() {
    onStatusViewChange('activas')
    onCriticalityFilterChange('all')
    onZoneFilterChange('all')
  }

  const filterButton = (
    <Button
      variant="outline"
      aria-label="Abrir panel de filtros"
      aria-expanded={panelOpen}
      className="h-9 gap-1.5 rounded-xl border-0 bg-ds-muted px-3 text-xs shadow-none hover:bg-ds-muted/70 sm:h-10 sm:text-sm"
    >
      <SlidersHorizontal className="h-4 w-4" />
      Filtros
      {activeFilterCount > 0 && (
        <Badge
          variant="secondary"
          className="h-5 border-0 bg-ds-accent-faded px-1.5 text-[10px] font-semibold tabular-nums text-ds-accent"
        >
          {activeFilterCount}
        </Badge>
      )}
    </Button>
  )

  const panelFields = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs text-ds-ink-muted">Estado detallado</Label>
        <ToggleGroup
          type="single"
          variant="outline"
          value={panelStatusValue}
          onValueChange={value => onStatusViewChange((value || 'activas') as StatusView)}
          className="w-full"
          aria-label="Filtrar por estado detallado"
        >
          {PANEL_STATUS_OPTIONS.map(option => (
            <ToggleGroupItem key={option.value} value={option.value} className="text-xs sm:text-sm">
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-ds-ink-muted">Criticidad</Label>
        <ToggleGroup
          type="single"
          variant="outline"
          value={criticalityFilter}
          onValueChange={value => onCriticalityFilterChange((value || 'all') as CriticalityFilter)}
          className="w-full"
          aria-label="Filtrar por criticidad"
        >
          <ToggleGroupItem value="all" className="text-xs sm:text-sm">
            Todas
          </ToggleGroupItem>
          <ToggleGroupItem
            value="critica"
            className="text-xs text-[var(--urgency-critical)] data-[state=on]:text-[var(--urgency-critical)] sm:text-sm"
          >
            Críticas
          </ToggleGroupItem>
          <ToggleGroupItem
            value="baja_prioridad"
            className="text-xs data-[state=on]:text-[var(--urgency-pending)] sm:text-sm"
          >
            Baja Prior.
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-ds-ink-muted">Zona</Label>
        <Select value={zoneFilter} onValueChange={onZoneFilterChange}>
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

      {activeFilterCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={clearAllFilters}
          className="w-full rounded-xl border-0 bg-ds-muted text-xs shadow-none sm:text-sm"
        >
          Limpiar filtros
        </Button>
      )}
    </div>
  )

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Tabs
          value={segmentValue}
          onValueChange={value => onStatusViewChange(value as StatusView)}
          className="w-auto shrink-0"
        >
          <TabsList className="h-9 rounded-xl bg-ds-muted p-0.5 sm:h-10 sm:p-1">
            <TabsTrigger value="activas" className={TAB_TRIGGER_CLASS}>
              Activas
              {activeAlertsCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1.5 h-5 border-0 bg-ds-accent-faded px-1.5 text-[10px] font-semibold tabular-nums text-ds-accent"
                >
                  {activeAlertsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="resueltas"
              className={cn(TAB_TRIGGER_CLASS, 'data-[state=active]:text-[var(--urgency-resolved)]')}
            >
              Resueltas
            </TabsTrigger>
            <TabsTrigger value="all" className={TAB_TRIGGER_CLASS}>
              Todas
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {isMobile ? (
          <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
            <SheetTrigger asChild>{filterButton}</SheetTrigger>
            <SheetContent
              side="bottom"
              className="rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]"
            >
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
                <SheetDescription>Acote la lista de alertas por estado, criticidad o zona</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-2">{panelFields}</div>
            </SheetContent>
          </Sheet>
        ) : (
          <Popover open={panelOpen} onOpenChange={setPanelOpen}>
            <PopoverTrigger asChild>{filterButton}</PopoverTrigger>
            <PopoverContent align="start" className="w-80 rounded-xl">
              {panelFields}
            </PopoverContent>
          </Popover>
        )}

        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          aria-label="Actualizar alertas"
          className="h-9 w-9 rounded-xl border-0 bg-ds-muted shadow-none hover:bg-ds-muted/70 sm:h-10 sm:w-10"
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {isDetailedView && (
            <FilterChip
              label={`Vista: ${STATUS_VIEW_LABELS[statusView]}`}
              onRemove={() => onStatusViewChange('activas')}
            />
          )}
          {criticalityFilter !== 'all' && (
            <FilterChip
              label={`Criticidad: ${ALERT_CLASS_LABELS[criticalityFilter]}`}
              onRemove={() => onCriticalityFilterChange('all')}
            />
          )}
          {zoneFilter !== 'all' && (
            <FilterChip
              label={`Zona: ${selectedZone?.name ?? zoneFilter}`}
              onRemove={() => onZoneFilterChange('all')}
            />
          )}
        </div>
      )}
    </div>
  )
}
