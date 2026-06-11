import type { Alert, Role, Rule, User } from './types'
import { ESCALATION_ROLE_OPTIONS, ROLE_LABELS } from './types'

export interface EscalationContact {
  name: string
  phone?: string
  email?: string
}

export interface EscalationContactEntry extends EscalationContact {
  role: Role
  userId?: string | number
}

export { ESCALATION_ROLE_OPTIONS }

export const ESCALATION_CHECKLIST_ACTIONS = [
  'Llamé a Carabineros (133)',
  'Notifiqué al guardia de turno',
  'Intenté contactar al responsable de seguridad',
  'Revisé cámaras adicionales del sector',
  'Activé el protocolo de emergencia local',
] as const

function isActiveUser(user: User): boolean {
  return user.activo !== false && user.active !== false
}

function mapUserToEscalationContact(user: User): EscalationContactEntry {
  return {
    userId: user.id,
    role: user.role,
    name: user.nombre || user.full_name || ROLE_LABELS[user.role],
    phone: user.telefono || undefined,
    email: user.email,
  }
}

/** Todos los usuarios activos cuyo rol está configurado para recibir escalación. */
export function getEscalationContacts(rule?: Rule | null, users?: User[]): EscalationContactEntry[] {
  const roles = getEscalationRoles(rule)
  if (!roles.length || !users?.length) return []

  const roleSet = new Set(roles)
  return users
    .filter(user => isActiveUser(user) && roleSet.has(user.role))
    .map(mapUserToEscalationContact)
    .sort((a, b) => {
      const roleOrder = roles.indexOf(a.role) - roles.indexOf(b.role)
      if (roleOrder !== 0) return roleOrder
      return a.name.localeCompare(b.name, 'es')
    })
}

/** Primer usuario activo para un rol (compatibilidad). */
export function getEscalationContact(role: Role, users?: User[]): EscalationContact {
  const user = users?.find(u => u.role === role && isActiveUser(u))
  if (user) {
    return mapUserToEscalationContact(user)
  }
  return { name: ROLE_LABELS[role] }
}

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
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}
