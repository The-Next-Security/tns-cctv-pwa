// TNS Track - Auth context y utilidades

import { createContext, useContext } from 'react'
import type { User, Role } from './types'

export interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

// Create context with a default value to prevent undefined context
const defaultAuthValue: AuthContextValue = {
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
}

export const AuthContext = createContext<AuthContextValue>(defaultAuthValue)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}

export function useUser() {
  const { user, isLoading } = useAuth()
  return { user, isLoading, isAuthenticated: !!user }
}

// Permisos por rol
const PERMISSIONS: Record<string, Role[]> = {
  'alerts.view': ['vigilante', 'recepcion', 'responsable_seguridad', 'admin_parque', 'soporte_tns'],
  'alerts.attend': ['vigilante', 'recepcion', 'responsable_seguridad', 'admin_parque'],
  'vehicle_entries.create': ['recepcion', 'admin_parque'],
  'vehicle_entries.view': ['recepcion', 'responsable_seguridad', 'admin_parque', 'soporte_tns'],
  'case_files.view': ['responsable_seguridad', 'admin_parque', 'soporte_tns'],
  'case_files.resolve': ['responsable_seguridad', 'admin_parque'],
  'rules.manage': ['responsable_seguridad', 'admin_parque', 'soporte_tns'],
  'reports.view': ['responsable_seguridad', 'admin_parque', 'soporte_tns'],
  'users.manage': ['admin_parque', 'soporte_tns'],
  'nvrs.manage': ['admin_parque', 'soporte_tns'],
  'config.manage': ['admin_parque', 'soporte_tns'],
  'health.view': ['admin_parque', 'soporte_tns'],
}

export function hasPermission(role: Role | undefined, permission: string): boolean {
  if (!role) return false
  const allowedRoles = PERMISSIONS[permission]
  if (!allowedRoles) return false
  return allowedRoles.includes(role)
}

export function canAccessRoute(role: Role | undefined, path: string): boolean {
  if (!role) return false
  
  // Rutas públicas
  if (path === '/login') return true
  
  // Mapeo de rutas a permisos
  const routePermissions: Record<string, string> = {
    '/operacion': 'alerts.view',
    '/recepcion': 'vehicle_entries.create',
    '/expedientes': 'case_files.view',
    '/reglas': 'rules.manage',
    '/reportes': 'reports.view',
    '/salud': 'health.view',
    '/admin': 'users.manage',
    '/admin/usuarios': 'users.manage',
    '/admin/zonas': 'nvrs.manage',
    '/admin/camaras': 'nvrs.manage',
    '/admin/nvrs': 'nvrs.manage',
    '/admin/tenants': 'nvrs.manage',
    '/admin/configuracion': 'config.manage',
  }
  
  // Buscar el permiso más específico
  const sortedPaths = Object.keys(routePermissions).sort((a, b) => b.length - a.length)
  for (const routePath of sortedPaths) {
    if (path.startsWith(routePath)) {
      return hasPermission(role, routePermissions[routePath])
    }
  }
  
  return true
}

// Ruta por defecto según rol
export function getDefaultRoute(role: Role): string {
  switch (role) {
    case 'vigilante':
      return '/operacion'
    case 'recepcion':
      return '/recepcion'
    case 'responsable_seguridad':
      return '/expedientes'
    case 'admin_parque':
      return '/operacion'
    case 'soporte_tns':
      return '/salud'
    default:
      return '/operacion'
  }
}
