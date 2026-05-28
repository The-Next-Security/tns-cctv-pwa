// lib/constants.ts
// Estilos de criticidad para alertas y reglas operativas

export const CRITICALITY_STYLES = {
  baja: {
    bg: "bg-slate-500",
    bgSubtle: "bg-slate-500/10",
    text: "text-slate-500",
    border: "border-slate-500",
    borderSubtle: "border-slate-500/30",
    ring: "ring-slate-500/20",
  },
  media: {
    bg: "bg-amber-500",
    bgSubtle: "bg-amber-500/10",
    text: "text-amber-500",
    border: "border-amber-500",
    borderSubtle: "border-amber-500/30",
    ring: "ring-amber-500/20",
  },
  alta: {
    bg: "bg-orange-600",
    bgSubtle: "bg-orange-600/10",
    text: "text-orange-600",
    border: "border-orange-600",
    borderSubtle: "border-orange-600/30",
    ring: "ring-orange-600/20",
  },
  critica: {
    bg: "bg-red-600 animate-pulse",
    bgSubtle: "bg-red-600/10",
    text: "text-red-600",
    border: "border-red-600",
    borderSubtle: "border-red-600/30",
    ring: "ring-red-600/20",
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

// Estilos de estado de alertas
export const STATUS_STYLES = {
  pendiente: {
    bg: "bg-yellow-500",
    bgSubtle: "bg-yellow-500/10",
    text: "text-yellow-500",
    border: "border-yellow-500",
  },
  en_revision: {
    bg: "bg-blue-500",
    bgSubtle: "bg-blue-500/10",
    text: "text-blue-500",
    border: "border-blue-500",
  },
  resuelta: {
    bg: "bg-green-500",
    bgSubtle: "bg-green-500/10",
    text: "text-green-500",
    border: "border-green-500",
  },
  descartada: {
    bg: "bg-slate-400",
    bgSubtle: "bg-slate-400/10",
    text: "text-slate-400",
    border: "border-slate-400",
  },
  escalada: {
    bg: "bg-purple-500",
    bgSubtle: "bg-purple-500/10",
    text: "text-purple-500",
    border: "border-purple-500",
  },
  revisada: {
    bg: "bg-cyan-500",
    bgSubtle: "bg-cyan-500/10",
    text: "text-cyan-500",
    border: "border-cyan-500",
  },
} as const

export type AlertStatusType = keyof typeof STATUS_STYLES

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
