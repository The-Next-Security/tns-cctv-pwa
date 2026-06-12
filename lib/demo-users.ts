import { MOCK_USERS } from './mock-data'
import type { Role, User } from './types'

const DEMO_EMAIL_ROLE: Record<string, Role> = {
  'admin@agrolivo.cl': 'admin_parque',
  'supervisor@agrolivo.cl': 'supervisor',
  'operador@agrolivo.cl': 'vigilante',
  'recepcionista@agrolivo.cl': 'recepcion',
  'tecnico@agrolivo.cl': 'tecnico',
}

const DEMO_ROLE_LABEL: Record<string, string> = {
  'admin@agrolivo.cl': 'Administrador',
  'supervisor@agrolivo.cl': 'Supervisor',
  'operador@agrolivo.cl': 'Operador / Vigilante',
  'recepcionista@agrolivo.cl': 'Recepción',
  'tecnico@agrolivo.cl': 'Técnico',
}

export function resolveDemoUser(email: string): User {
  const normalized = email.trim().toLowerCase()
  const fromMock = MOCK_USERS.find(u => u.email.toLowerCase() === normalized)
  const role = DEMO_EMAIL_ROLE[normalized] ?? fromMock?.role ?? 'admin_parque'

  if (fromMock) {
    return { ...fromMock, role, email: normalized }
  }

  return {
    id: 'demo',
    email: normalized,
    nombre: normalized.split('@')[0].replace(/\./g, ' '),
    role,
    ultimaConexion: new Date().toISOString(),
    activo: true,
  }
}

export function getDemoRoleLabel(email: string): string {
  return DEMO_ROLE_LABEL[email.trim().toLowerCase()] ?? 'Usuario demo'
}

export function persistDemoUser(user: User): void {
  localStorage.setItem('tns_user_email', user.email)
  localStorage.setItem('tns_user_role', user.role)
  localStorage.setItem('tns_user_id', String(user.id))
  localStorage.setItem('tns_user_name', user.nombre ?? user.full_name ?? user.email.split('@')[0])
}

export function restoreDemoUserFromStorage(email: string): User {
  const role = (localStorage.getItem('tns_user_role') as Role | null) ?? resolveDemoUser(email).role
  const storedName = localStorage.getItem('tns_user_name')
  const storedId = localStorage.getItem('tns_user_id')
  const base = resolveDemoUser(email)

  return {
    ...base,
    id: storedId ?? base.id,
    nombre: storedName ?? base.nombre,
    role,
  }
}
