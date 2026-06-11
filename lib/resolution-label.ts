const RESOLUTION_ENUM_LABELS: Record<string, string> = {
  CONFIRMED: 'Confirmada',
  FALSE_POSITIVE: 'Falsa positiva',
  DISMISSED: 'Descartada',
  ESCALATED: 'Escalada',
  REVIEWED: 'Revisada',
  RESOLVED: 'Resuelta',
}

const ENUM_LIKE_RESOLUTION = /^[A-Z0-9_]+$/

export function formatResolutionLabel(resolutionNotes?: string | null): string {
  const normalized = resolutionNotes?.trim()

  if (!normalized) {
    return 'Sin nota de resolución'
  }

  const mapped = RESOLUTION_ENUM_LABELS[normalized.toUpperCase()]
  if (mapped) {
    return mapped
  }

  if (ENUM_LIKE_RESOLUTION.test(normalized)) {
    return 'Resolución registrada'
  }

  return normalized
}
