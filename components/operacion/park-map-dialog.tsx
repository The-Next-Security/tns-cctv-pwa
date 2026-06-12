'use client'

// components/operacion/park-map-dialog.tsx
// Plano expandido del parque en un Dialog: mapa grande clickeable, leyenda de
// criticidad y contador de alertas activas por zona. Clic en zona → filtra la
// consola (onZoneClick) y cierra. Full-screen en móvil.

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CRITICALITY_LABELS, PARK_ZONES } from '@/lib/constants'
import { MAP_ZONES, type ZoneCode } from '@/lib/park-map'
import type { Alert, Criticality } from '@/lib/types'
import { cn } from '@/lib/utils'
import { computeZoneStates, MAP_CRITICALITY_COLOR, ParkMap } from './park-map'

const LEGEND_LEVELS: ReadonlyArray<Criticality> = ['critica', 'alta', 'media', 'baja']

export interface ParkMapDialogProps {
  alerts: Alert[]
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Filtra la lista por zona (cierra el dialog tras seleccionar). */
  onZoneClick?: (zoneCode: ZoneCode) => void
}

export function ParkMapDialog({ alerts, open, onOpenChange, onZoneClick }: ParkMapDialogProps) {
  const zoneStates = computeZoneStates(alerts)

  function handleZoneClick(zoneCode: ZoneCode) {
    onZoneClick?.(zoneCode)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-y-auto max-sm:h-dvh max-sm:max-h-dvh max-sm:w-screen max-sm:max-w-none max-sm:rounded-none sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Mapa del parque</DialogTitle>
          <DialogDescription>
            Distribución de cámaras Agrolivo — toque una zona para filtrar sus alertas
          </DialogDescription>
        </DialogHeader>

        <ParkMap
          alerts={alerts}
          variant="full"
          onZoneClick={onZoneClick ? handleZoneClick : undefined}
        />

        {/* Leyenda de criticidad */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {LEGEND_LEVELS.map(level => (
            <span key={level} className="flex items-center gap-1.5 text-caption">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: MAP_CRITICALITY_COLOR[level] }}
                aria-hidden
              />
              {CRITICALITY_LABELS[level]}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-caption">
            <span className="h-2.5 w-2.5 rounded-full bg-ds-accent opacity-80" aria-hidden />
            Cámara
          </span>
        </div>

        {/* Contador de alertas activas por zona */}
        <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {PARK_ZONES.map(zone => {
            const state = zoneStates.get(zone.code)
            const hasPolygon = MAP_ZONES[zone.code] !== undefined
            const color = state?.maxCriticality
              ? MAP_CRITICALITY_COLOR[state.maxCriticality]
              : null
            return (
              <li key={zone.code}>
                <button
                  type="button"
                  onClick={onZoneClick ? () => handleZoneClick(zone.code) : undefined}
                  disabled={!onZoneClick}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-body transition-colors',
                    onZoneClick && 'hover:bg-ds-muted'
                  )}
                  aria-label={`Filtrar alertas de ${zone.name}`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full border border-ds-hairline"
                      style={color ? { backgroundColor: color, borderColor: color } : undefined}
                      aria-hidden
                    />
                    <span className="truncate">
                      {zone.name}
                      {!hasPolygon && (
                        <span className="ml-1.5 text-caption text-ds-ink-muted">(sin trazado)</span>
                      )}
                    </span>
                  </span>
                  <span className="text-caption text-live-data font-semibold">
                    {state?.count ?? 0}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
