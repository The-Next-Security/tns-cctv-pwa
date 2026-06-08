import type { Alert, Role, Rule } from './types'

export interface EscalationContact {
  name: string
  phone?: string
  email?: string
}

export const ESCALATION_ROLE_OPTIONS: Role[] = [
  'responsable_seguridad',
  'admin_parque',
  'supervisor',
  'soporte_tns',
]

export const ROLE_CONTACTS: Record<Role, EscalationContact> = {
  responsable_seguridad: {
    name: 'Carlos Rodríguez',
    phone: '+56 9 8821 4430',
    email: 'c.rodriguez@agrolivo.cl',
  },
  admin_parque: {
    name: 'Ana Méndez',
    phone: '+56 9 7743 2219',
    email: 'admin@agrolivo.cl',
  },
  supervisor: {
    name: 'Pedro Soto',
    phone: '+56 9 9103 5567',
    email: 'p.soto@agrolivo.cl',
  },
  soporte_tns: {
    name: 'TNS Soporte',
    phone: '+56 2 2891 0045',
    email: 'soporte@thenextsecurity.cl',
  },
  vigilante: { name: 'Vigilante' },
  recepcion: { name: 'Recepción' },
  recepcionista: { name: 'Recepcionista' },
  tecnico: { name: 'Técnico' },
  visualizador: { name: 'Visualizador' },
}

// TODO: configurable por regla en v2.
export const ESCALATION_CHECKLIST_ACTIONS = [
  'Llamé a Carabineros (133)',
  'Notifiqué al guardia de turno',
  'Intenté contactar al responsable de seguridad',
  'Revisé cámaras adicionales del sector',
  'Activé el protocolo de emergencia local',
] as const

export function getEscalationRoles(rule?: Rule | null): Role[] {
  if (!rule?.can_escalate) return []

  return (rule.escalation_roles ?? []).filter(role =>
    ESCALATION_ROLE_OPTIONS.includes(role)
  )
}

export function showEscalationActions(alert: Alert): boolean {
  return alert.status === 'en_revision' && alert.rule?.can_escalate === true
}

export function buildEscalationObservation(
  checkedActions: string[],
  operatorObservation: string
): string | undefined {
  const sections: string[] = []

  if (checkedActions.length > 0) {
    sections.push(
      `Acciones previas realizadas:\n${checkedActions.map(action => `- ${action}`).join('\n')}`
    )
  }

  const trimmedObservation = operatorObservation.trim()
  if (trimmedObservation) {
    sections.push(`Observación del operador:\n${trimmedObservation}`)
  }

  return sections.length > 0 ? sections.join('\n\n') : undefined
}

export function toTelHref(phone: string): string {
  return `tel://${phone.replace(/[^\d+]/g, '')}`
}
