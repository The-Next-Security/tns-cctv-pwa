'use client'

// components/operacion/park-map.tsx
// Plano interactivo del parque: imagen oficial de distribución de cámaras +
// capa SVG de zonas (tinte por criticidad de alertas activas) y marcadores de
// cámara. Tres variantes: 'mini' (panel de contexto), 'full' (dialog grande)
// y 'locator' (zoom a la zona de una alerta puntual).

import { useMemo } from 'react'
import Image from 'next/image'
import { PARK_ZONES } from '@/lib/constants'
import {
  MAP_CAMERAS,
  MAP_ZONES,
  PARK_MAP_IMAGE,
  pointsToSvg,
  resolveAlertZoneCode,
  zoneBoundingBox,
  type ZoneCode,
} from '@/lib/park-map'
import type { Alert, Criticality } from '@/lib/types'
import { cn } from '@/lib/utils'

export type ParkMapVariant = 'mini' | 'full' | 'locator'

export interface ParkMapProps {
  alerts: Alert[]
  variant: ParkMapVariant
  /** Zona a enfocar (solo variant 'locator'). */
  focusZoneCode?: ZoneCode | null
  /** Nombre estable de la cámara origen a destacar (variant 'locator'). */
  focusCameraName?: string | null
  /** Si llega, las zonas son clickeables (variants 'mini'/'full'). */
  onZoneClick?: (zoneCode: ZoneCode) => void
  className?: string
}

/** Estados que cuentan como alerta activa sobre el plano. */
const ACTIVE_STATUSES: ReadonlyArray<Alert['status']> = ['pendiente', 'en_revision', 'escalada']

const CRITICALITY_RANK: Record<Criticality, number> = { baja: 0, media: 1, alta: 2, critica: 3 }

/** Color por criticidad — tokens CSS del design system (nunca hex raw). */
export const MAP_CRITICALITY_COLOR: Record<Criticality, string> = {
  baja: 'var(--criticality-baja)',
  media: 'var(--criticality-media)',
  alta: 'var(--criticality-alta)',
  critica: 'var(--criticality-critica)',
}

interface ZoneState {
  count: number
  maxCriticality: Criticality | null
}

/** Agrega alertas activas por código de zona (criticidad máxima + conteo). */
export function computeZoneStates(alerts: Alert[]): Map<ZoneCode, ZoneState> {
  const states = new Map<ZoneCode, ZoneState>()
  for (const alert of alerts) {
    if (!ACTIVE_STATUSES.includes(alert.status)) continue
    const code = resolveAlertZoneCode(alert)
    if (!code) continue
    const prev = states.get(code) ?? { count: 0, maxCriticality: null }
    const max =
      prev.maxCriticality === null ||
      CRITICALITY_RANK[alert.criticality] > CRITICALITY_RANK[prev.maxCriticality]
        ? alert.criticality
        : prev.maxCriticality
    states.set(code, { count: prev.count + 1, maxCriticality: max })
  }
  return states
}

/** Cámaras (por nombre) con alguna alerta activa y su criticidad máxima. */
function computeCameraStates(alerts: Alert[]): Map<string, Criticality> {
  const states = new Map<string, Criticality>()
  for (const alert of alerts) {
    if (!ACTIVE_STATUSES.includes(alert.status)) continue
    const name = alert.camera?.name
    if (!name || !(name in MAP_CAMERAS)) continue
    const prev = states.get(name)
    if (prev === undefined || CRITICALITY_RANK[alert.criticality] > CRITICALITY_RANK[prev]) {
      states.set(name, alert.criticality)
    }
  }
  return states
}

const ZONE_NAME_BY_CODE: ReadonlyMap<ZoneCode, string> = new Map(
  PARK_ZONES.map(zone => [zone.code, zone.name])
)

/** Zoom máximo del locator: legible sin pixelar la base de 2000px. */
const LOCATOR_MAX_SCALE = 3.2

export function ParkMap({
  alerts,
  variant,
  focusZoneCode,
  focusCameraName,
  onZoneClick,
  className,
}: ParkMapProps) {
  const zoneStates = useMemo(() => computeZoneStates(alerts), [alerts])
  const cameraStates = useMemo(() => computeCameraStates(alerts), [alerts])

  const interactive = onZoneClick !== undefined && variant !== 'locator'

  // Variant locator: zoom al bounding box de la zona foco vía transform.
  // translate% = s·(50 − centro) lleva el centro del bbox al centro del lienzo.
  const focusTransform = useMemo(() => {
    if (variant !== 'locator' || !focusZoneCode) return undefined
    const zone = MAP_ZONES[focusZoneCode]
    if (!zone) return undefined
    const box = zoneBoundingBox(zone.points)
    const scale = Math.min(LOCATOR_MAX_SCALE, 90 / Math.max(box.width, box.height))
    return {
      transform: `translate(${scale * (50 - box.centerX)}%, ${scale * (50 - box.centerY)}%) scale(${scale})`,
    }
  }, [variant, focusZoneCode])

  const markerSize = variant === 'mini' ? 'h-1.5 w-1.5' : 'h-2.5 w-2.5'

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-xl border border-ds-hairline bg-ds-muted',
        className
      )}
      style={{ aspectRatio: `${PARK_MAP_IMAGE.width} / ${PARK_MAP_IMAGE.height}` }}
    >
      <div
        className="absolute inset-0 transition-transform duration-500 ease-out"
        style={{ transformOrigin: '50% 50%', ...focusTransform }}
      >
        <Image
          src={PARK_MAP_IMAGE.src}
          alt={PARK_MAP_IMAGE.alt}
          fill
          sizes={variant === 'mini' ? '340px' : '100vw'}
          className="object-fill select-none"
          priority={variant !== 'full'}
        />

        {/* Capa de zonas */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden={!interactive}
        >
          {PARK_ZONES.map(zone => {
            const mapZone = MAP_ZONES[zone.code]
            if (!mapZone) return null // Gap documentado (ej. zone-4): no se inventan límites.
            const state = zoneStates.get(zone.code)
            const isFocus = variant === 'locator' && focusZoneCode === zone.code
            const color = state?.maxCriticality
              ? MAP_CRITICALITY_COLOR[state.maxCriticality]
              : null
            const label = state
              ? `Zona ${zone.name}: ${state.count} alerta${state.count === 1 ? '' : 's'} activa${state.count === 1 ? '' : 's'}`
              : `Zona ${zone.name}: sin alertas activas`
            return (
              <polygon
                key={zone.code}
                points={pointsToSvg(mapZone.points)}
                fill={color ?? 'transparent'}
                fillOpacity={color ? (isFocus ? 0.32 : 0.24) : 0}
                stroke={isFocus ? 'var(--color-ds-accent)' : color ?? 'var(--color-ds-hairline)'}
                strokeWidth={isFocus ? 2 : 1.25}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className={cn(
                  // outline-none: el foco del navegador dibuja la caja envolvente
                  // del polígono; el indicador accesible es el trazo accent.
                  'outline-none transition-[fill-opacity] duration-300',
                  interactive &&
                    'cursor-pointer hover:stroke-[var(--color-ds-accent)] focus-visible:stroke-[var(--color-ds-accent)]'
                )}
                role={interactive ? 'button' : undefined}
                tabIndex={interactive ? 0 : undefined}
                aria-label={interactive ? label : undefined}
                pointerEvents={interactive ? 'auto' : 'none'}
                onClick={interactive ? () => onZoneClick?.(zone.code) : undefined}
                onKeyDown={
                  interactive
                    ? event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onZoneClick?.(zone.code)
                        }
                      }
                    : undefined
                }
              >
                <title>{label}</title>
              </polygon>
            )
          })}
        </svg>

        {/* Marcadores de cámara (divs posicionados en %, no se deforman) */}
        {Object.entries(MAP_CAMERAS).map(([name, point]) => {
          const criticality = cameraStates.get(name)
          const isFocus = variant === 'locator' && focusCameraName === name
          return (
            <span
              key={name}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              title={name}
            >
              {(criticality !== undefined || isFocus) && (
                <span
                  className="absolute inset-0 animate-ping rounded-full opacity-60"
                  style={{
                    backgroundColor: criticality
                      ? MAP_CRITICALITY_COLOR[criticality]
                      : 'var(--color-ds-accent)',
                  }}
                  aria-hidden
                />
              )}
              <span
                className={cn(
                  'relative block rounded-full ring-1 ring-ds-surface',
                  markerSize,
                  criticality !== undefined ? 'bg-ds-signal' : 'bg-ds-accent opacity-80',
                  isFocus && 'ring-2 ring-ds-accent opacity-100 scale-125'
                )}
                style={
                  criticality !== undefined
                    ? { backgroundColor: MAP_CRITICALITY_COLOR[criticality] }
                    : undefined
                }
              />
              <span className="sr-only">Cámara {name}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

/** Nombre de zona legible a partir de su código (para leyendas y tooltips). */
export function zoneNameFromCode(code: ZoneCode): string {
  return ZONE_NAME_BY_CODE.get(code) ?? code
}
