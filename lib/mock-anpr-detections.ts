export type AnprDetectionStatus = 'ready' | 'manual_review'

export interface AnprPendingDetection {
  id: string
  /** Texto mostrado (puede incluir incertidumbre, ej. WX?Z-98) */
  plateDisplay: string
  /** Patente normalizada sugerida para el formulario */
  plateNormalized: string
  confidence: number
  status: AnprDetectionStatus
  detectedAt: string
  vehicleHint?: string
}

export const DEMO_ANPR_PORTON_URL = '/demo/snapshot-anpr-porton.svg'

export const INITIAL_ANPR_PENDING_QUEUE: AnprPendingDetection[] = [
  {
    id: 'det-1',
    plateDisplay: 'BCDF-12',
    plateNormalized: 'BCDF12',
    confidence: 94,
    status: 'ready',
    detectedAt: new Date(Date.now() - 8_000).toISOString(),
    vehicleHint: 'Camión · ingreso portón sur',
  },
  {
    id: 'det-2',
    plateDisplay: 'WX?Z-98',
    plateNormalized: 'WXYZ98',
    confidence: 62,
    status: 'manual_review',
    detectedAt: new Date(Date.now() - 45_000).toISOString(),
    vehicleHint: 'Particular · lectura parcial',
  },
]

export function formatAnprConfidence(confidence: number): string {
  return `${confidence}% confianza`
}

export function isLowConfidence(confidence: number): boolean {
  return confidence < 75
}
