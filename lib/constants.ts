// lib/constants.ts
// Estilos de criticidad para alertas y reglas operativas

/** Escala operativa: Crítico → Pendiente → En revisión → Resuelta (mayor → menor urgencia) */
export type UrgencyLevel = 'critical' | 'pending' | 'review' | 'resolved'

export const URGENCY_STYLES = {
  critical: {
    text: 'text-[var(--urgency-critical)]',
    bgSubtle: 'bg-[var(--urgency-critical-bg)]',
    border: 'border-[var(--urgency-critical)]/30',
    borderSubtle: 'border-[var(--urgency-critical-border)]',
    ring: 'ring-[var(--urgency-critical)]/25',
    iconBox: 'icon-box-urgency-critical',
    label: 'Crítico',
  },
  pending: {
    text: 'text-[var(--urgency-pending)]',
    bgSubtle: 'bg-[var(--urgency-pending-bg)]',
    border: 'border-[var(--urgency-pending)]/30',
    borderSubtle: 'border-[var(--urgency-pending-border)]',
    ring: 'ring-[var(--urgency-pending)]/25',
    iconBox: 'icon-box-urgency-pending',
    label: 'Pendiente',
  },
  review: {
    text: 'text-[var(--urgency-review)]',
    bgSubtle: 'bg-[var(--urgency-review-bg)]',
    border: 'border-[var(--urgency-review)]/30',
    borderSubtle: 'border-[var(--urgency-review-border)]',
    ring: 'ring-[var(--urgency-review)]/25',
    iconBox: 'icon-box-urgency-review',
    label: 'En revisión',
  },
  resolved: {
    text: 'text-[var(--urgency-resolved)]',
    bgSubtle: 'bg-[var(--urgency-resolved-bg)]',
    border: 'border-[var(--urgency-resolved)]/30',
    borderSubtle: 'border-[var(--urgency-resolved-border)]',
    ring: 'ring-[var(--urgency-resolved)]/20',
    iconBox: 'icon-box-urgency-resolved',
    label: 'Resuelta',
  },
} as const

export const URGENCY_BADGE_CLASS: Record<UrgencyLevel, string> = {
  critical: 'badge-urgency badge-urgency-critical',
  pending: 'badge-urgency badge-urgency-pending',
  review: 'badge-urgency badge-urgency-review',
  resolved: 'badge-urgency badge-urgency-resolved',
}

export const CRITICALITY_STYLES = {
  baja: {
    bg: "bg-[var(--criticality-baja)]",
    bgSubtle: "bg-muted",
    text: "text-[var(--criticality-baja)]",
    border: "border-[var(--criticality-baja)]",
    borderSubtle: "border-[var(--criticality-baja)]/30",
    ring: "ring-[var(--criticality-baja)]/20",
  },
  media: {
    bg: "bg-[var(--warning)]",
    bgSubtle: "bg-[var(--warning-bg)]",
    text: "text-[var(--warning)]",
    border: "border-[var(--warning)]",
    borderSubtle: "border-[var(--warning)]/30",
    ring: "ring-[var(--warning)]/20",
  },
  alta: {
    bg: "bg-[var(--criticality-alta)]",
    bgSubtle: "bg-[var(--urgency-critical-bg)]",
    text: "text-[var(--criticality-alta)]",
    border: "border-[var(--criticality-alta)]",
    borderSubtle: "border-[var(--criticality-alta)]/30",
    ring: "ring-[var(--criticality-alta)]/20",
  },
  critica: {
    bg: "bg-[var(--urgency-critical)]",
    bgSubtle: "bg-[var(--urgency-critical-bg)]",
    text: "text-[var(--urgency-critical)]",
    border: "border-[var(--urgency-critical)]",
    borderSubtle: "border-[var(--urgency-critical-border)]",
    ring: "ring-[var(--urgency-critical)]/25",
  }
} as const

export type CriticalityLevel = keyof typeof CRITICALITY_STYLES

// Etiquetas de criticidad en español
export const CRITICALITY_LABELS: Record<CriticalityLevel, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
}

// Estilos de estado de alertas — alineados a escala de urgencia
export const STATUS_STYLES = {
  pendiente: {
    bg: "bg-[var(--urgency-pending)]",
    bgSubtle: "bg-[var(--urgency-pending-bg)]",
    text: "text-[var(--urgency-pending)]",
    border: "border-[var(--urgency-pending)]",
  },
  en_revision: {
    bg: "bg-[var(--urgency-review)]",
    bgSubtle: "bg-[var(--urgency-review-bg)]",
    text: "text-[var(--urgency-review)]",
    border: "border-[var(--urgency-review)]",
  },
  resuelta: {
    bg: "bg-[var(--urgency-resolved)]",
    bgSubtle: "bg-[var(--urgency-resolved-bg)]",
    text: "text-[var(--urgency-resolved)]",
    border: "border-[var(--urgency-resolved)]",
  },
  descartada: {
    bg: "bg-[var(--urgency-resolved)]",
    bgSubtle: "bg-[var(--urgency-resolved-bg)]",
    text: "text-[var(--urgency-resolved)]",
    border: "border-[var(--urgency-resolved)]",
  },
  escalada: {
    bg: "bg-[var(--urgency-review)]",
    bgSubtle: "bg-[var(--urgency-review-bg)]",
    text: "text-[var(--urgency-review)]",
    border: "border-[var(--urgency-review)]",
  },
  revisada: {
    bg: "bg-[var(--urgency-resolved)]",
    bgSubtle: "bg-[var(--urgency-resolved-bg)]",
    text: "text-[var(--urgency-resolved)]",
    border: "border-[var(--urgency-resolved)]",
  },
} as const

export type AlertStatusType = keyof typeof STATUS_STYLES

/** Mapeo estado de alerta → nivel de urgencia visual */
export const ALERT_STATUS_URGENCY: Partial<Record<AlertStatusType, UrgencyLevel>> = {
  pendiente: 'pending',
  en_revision: 'review',
  resuelta: 'resolved',
  descartada: 'resolved',
  escalada: 'review',
  revisada: 'resolved',
}

/** Badge unificado para criticidad — Crítica usa máxima urgencia */
export function getCriticalityBadgeClass(level: CriticalityLevel, pulse = false): string {
  const base =
    level === 'critica'
      ? URGENCY_BADGE_CLASS.critical
      : level === 'alta'
        ? 'badge-urgency border border-[var(--criticality-alta)]/30 bg-[var(--urgency-critical-bg)] text-[var(--criticality-alta)]'
        : level === 'media'
          ? URGENCY_BADGE_CLASS.pending
          : URGENCY_BADGE_CLASS.resolved
  return pulse && level === 'critica' ? `${base} badge-urgency-critical-pulse` : base
}

// Etiquetas de estado en español
export const STATUS_LABELS: Record<AlertStatusType, string> = {
  pendiente: 'Pendiente',
  en_revision: 'En Revisión',
  resuelta: 'Resuelta',
  descartada: 'Descartada',
  escalada: 'Escalada',
  revisada: 'Revisada',
}

// Razones de descarte de alertas
export const DISCARD_REASONS = [
  { value: 'falso_positivo_iluminacion', label: 'Falso positivo - iluminación' },
  { value: 'falso_positivo_vegetacion', label: 'Falso positivo - vegetación' },
  { value: 'falso_positivo_polvo', label: 'Falso positivo - polvo/distancia' },
  { value: 'irrelevante_vehiculo_interno', label: 'Irrelevante - vehículo interno' },
  { value: 'irrelevante_persona_autorizada', label: 'Irrelevante - persona autorizada' },
  { value: 'irrelevante_animal', label: 'Irrelevante - animal' },
  { value: 'mantenimiento_zona', label: 'Mantenimiento en zona' },
  { value: 'otro', label: 'Otro' },
] as const

export type DiscardReasonValue = (typeof DISCARD_REASONS)[number]['value']
