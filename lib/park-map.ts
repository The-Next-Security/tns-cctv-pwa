// lib/park-map.ts
// Configuración estática del plano interactivo del Parque Agrolivo.
//
// Fuente: DISTRIBUCION_CAMARAS_AGROLIVO (PDF oficial) exportado a
// `public/plano/distribucion-camaras-agrolivo.webp`. Las coordenadas están
// normalizadas 0–100 sobre el ancho/alto de la imagen, de modo que siguen
// siendo válidas si la base se re-exporta o redibuja manteniendo el encuadre.
//
// Trazado 2026-06-12 comparando contra el PDF:
// - El plano rotula sitios (1–65), el acceso vial NE, el recinto ADMIN y las
//   cámaras D1–D49 sobre postes; NO rotula las zonas operativas del sistema.
//   Los polígonos se trazaron por correspondencia geográfica documentada en
//   cada zona (ver comentarios).
// - GAP documentado: `zone-4` (Zona Logística) no tiene correspondencia
//   identificable en el plano → queda sin polígono (no se inventan límites).
// - SUPUESTO a validar con el PO: `zone-5` (Estacionamiento) se asocia a la
//   explanada/área achurada contigua al recinto ADMIN.

import { PARK_ZONES } from '@/lib/constants'
import type { Alert } from '@/lib/types'

/** Código estable de zona (`zone-1`…`zone-8`), keyed contra PARK_ZONES. */
export type ZoneCode = (typeof PARK_ZONES)[number]['code']

/** Punto normalizado: porcentaje 0–100 del ancho (x) y alto (y) del plano. */
export interface MapPoint {
  x: number
  y: number
}

export interface MapZone {
  code: ZoneCode
  /** Polígono normalizado 0–100 (sentido horario, sin auto-intersección). */
  points: MapPoint[]
}

/** Asset base del plano + dimensiones intrínsecas (para aspect-ratio). */
export const PARK_MAP_IMAGE = {
  src: '/plano/distribucion-camaras-agrolivo.webp',
  width: 2000,
  height: 1413,
  alt: 'Plano de distribución de cámaras del Parque Agrolivo',
} as const

/**
 * Polígonos por zona, keyed por `code` de PARK_ZONES (los ids numéricos de UI
 * son surrogate del backend y no son estables entre stores).
 */
export const MAP_ZONES: Partial<Record<ZoneCode, MapZone>> = {
  // Acceso vial NE: garita, rotonda y bulevar de entrada (postes 1–4, sala de bomba).
  'zone-1': {
    code: 'zone-1',
    points: [
      { x: 87, y: 4 }, { x: 94, y: 4 }, { x: 94, y: 9 }, { x: 85, y: 14 },
      { x: 83, y: 21 }, { x: 84, y: 27 }, { x: 80, y: 29 }, { x: 77, y: 26 },
      { x: 78, y: 18 }, { x: 75, y: 14 }, { x: 80, y: 7 },
    ],
  },
  // Bloque norte/oriente de sitios (2–4, 7, 20–26, 29, 31, 32).
  'zone-2': {
    code: 'zone-2',
    points: [
      { x: 54, y: 19 }, { x: 64, y: 19 }, { x: 71, y: 24 }, { x: 76, y: 21 },
      { x: 81, y: 29 }, { x: 72, y: 46 }, { x: 66, y: 52 }, { x: 60, y: 47 },
      { x: 58, y: 40 }, { x: 54, y: 33 }, { x: 57, y: 26 },
    ],
  },
  // Bloque central-sur de sitios (41–62, 64, 65).
  'zone-3': {
    code: 'zone-3',
    points: [
      { x: 28, y: 71 }, { x: 33, y: 59 }, { x: 40, y: 52 }, { x: 50, y: 48 },
      { x: 60, y: 48 }, { x: 62, y: 53 }, { x: 54, y: 62 }, { x: 44, y: 70 },
      { x: 34, y: 77 }, { x: 29, y: 77 },
    ],
  },
  // zone-4 (Zona Logística): GAP — sin correspondencia en el plano oficial.
  // Explanada/área achurada contigua al recinto ADMIN (supuesto a validar).
  'zone-5': {
    code: 'zone-5',
    points: [
      { x: 50.3, y: 41.8 }, { x: 53.5, y: 41.2 }, { x: 54.3, y: 44 },
      { x: 53.5, y: 46.5 }, { x: 51, y: 46 }, { x: 49.8, y: 43.8 },
    ],
  },
  // Franja del límite norte del predio (sitios 1–3) y camino espina superior.
  'zone-6': {
    code: 'zone-6',
    points: [
      { x: 54, y: 14 }, { x: 64, y: 11 }, { x: 75, y: 12 }, { x: 76, y: 20 },
      { x: 71, y: 24 }, { x: 64, y: 19 }, { x: 56, y: 19 },
    ],
  },
  // Franja del cierre surponiente (postes 47–53 y línea D17-P1…D49-P2).
  'zone-7': {
    code: 'zone-7',
    points: [
      { x: 38, y: 58 }, { x: 21, y: 61 }, { x: 14, y: 83 }, { x: 20, y: 87 },
      { x: 37, y: 81 }, { x: 35, y: 78 }, { x: 22, y: 79 }, { x: 19, y: 71 },
      { x: 24, y: 64 }, { x: 38, y: 61 },
    ],
  },
  // Recinto ADMIN (edificio administrativo y su cierre, cámara D34-P2).
  'zone-8': {
    code: 'zone-8',
    points: [
      { x: 53.5, y: 40 }, { x: 57, y: 38.5 }, { x: 59, y: 40 },
      { x: 58.5, y: 44.5 }, { x: 55, y: 46 }, { x: 53, y: 44 },
    ],
  },
}

/** Zonas del sistema sin polígono en el plano (gap documentado, no inventar). */
export const MAP_ZONE_GAPS: ReadonlyArray<{ code: ZoneCode; reason: string }> = [
  {
    code: 'zone-4',
    reason:
      'Zona Logística no aparece delimitada ni rotulada en el plano oficial de distribución de cámaras.',
  },
]

/**
 * Posición de cámaras sobre el plano, keyed por NOMBRE estable de cámara
 * (se resuelve contra `alert.camera.name` en runtime; los ids numéricos son
 * surrogate). Las cámaras de demo (lib/mock-data.ts) se anclan al poste real
 * del plano más representativo de su zona (referencia D{n}-P{etapa}).
 */
export const MAP_CAMERAS: Record<string, MapPoint> = {
  'CAM-ENT-01': { x: 79.2, y: 16.6 }, // Poste 1 (D1-P2), garita de acceso
  'CAM-PER-N01': { x: 73.7, y: 21.2 }, // Poste 6 (D3-P2), camino norte
  'CAM-IND-A01': { x: 69, y: 24.7 }, // Poste 11 (D5/D6-P2)
  'CAM-EST-01': { x: 52.2, y: 43.2 }, // Explanada norte junto a ADMIN (supuesto)
  'CAM-EST-02': { x: 53.6, y: 45.6 }, // Explanada sur junto a ADMIN (supuesto)
  'CAM-IND-B01': { x: 48.6, y: 50.8 }, // Poste 36 (D19-P2)
  'CAM-LOG-01': { x: 49.8, y: 48.2 }, // Gabinete sitio 13 (D16/D17/D18-P2)
  'CAM-PER-S01': { x: 32.1, y: 65.6 }, // Poste 53 (D30/D31-P2), cierre sur
}

const ZONE_CODE_BY_ID: ReadonlyMap<number, ZoneCode> = new Map(
  PARK_ZONES.map(zone => [zone.id, zone.code])
)

/** Traduce un id numérico de zona (surrogate de UI) a su código estable. */
export function zoneCodeFromId(zoneId: number | null | undefined): ZoneCode | null {
  if (zoneId == null) return null
  return ZONE_CODE_BY_ID.get(zoneId) ?? null
}

/**
 * Resuelve el código de zona de una alerta: `alert.zone` primero (el backend
 * puede traer `code` directo), con fallback a `zone_id` y a la zona de la
 * cámara origen. Devuelve null si la alerta no tiene zona mapeable.
 */
export function resolveAlertZoneCode(alert: Alert): ZoneCode | null {
  const directCode = alert.zone?.code
  if (directCode && ZONE_CODE_BY_ID_HAS(directCode)) return directCode as ZoneCode
  return (
    zoneCodeFromId(alert.zone?.id) ??
    zoneCodeFromId(alert.zone_id) ??
    zoneCodeFromId(alert.camera?.zone_id)
  )
}

function ZONE_CODE_BY_ID_HAS(code: string): boolean {
  return PARK_ZONES.some(zone => zone.code === code)
}

export interface ZoneBoundingBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
  centerX: number
  centerY: number
}

/**
 * Bounding box de un polígono con padding (en unidades normalizadas 0–100),
 * acotado al lienzo. Se usa para calcular el zoom del variant `locator`.
 */
export function zoneBoundingBox(points: MapPoint[], padding = 6): ZoneBoundingBox {
  const xs = points.map(p => p.x)
  const ys = points.map(p => p.y)
  const minX = Math.max(0, Math.min(...xs) - padding)
  const minY = Math.max(0, Math.min(...ys) - padding)
  const maxX = Math.min(100, Math.max(...xs) + padding)
  const maxY = Math.min(100, Math.max(...ys) + padding)
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  }
}

/** Serializa puntos normalizados al atributo `points` de un `<polygon>` SVG. */
export function pointsToSvg(points: MapPoint[]): string {
  return points.map(p => `${p.x},${p.y}`).join(' ')
}
