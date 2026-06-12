export const CONSOLE_THEME_IDS = [
  'consola',
  'sala-control',
  'alto-contraste',
  'admin-claro',
] as const

export type ConsoleThemeId = (typeof CONSOLE_THEME_IDS)[number]

export const DEFAULT_CONSOLE_THEME: ConsoleThemeId = 'consola'

export const CONSOLE_THEME_STORAGE_KEY = 'tns-console-theme'
export const CONSOLE_THEME_MANUAL_KEY = 'tns-console-theme-manual'
export const CONSOLE_THEME_ROUTE_BACKUP_KEY = 'tns-console-theme-route-backup'

export const CONSOLE_THEMES: Record<
  ConsoleThemeId,
  { label: string; description: string; usesDarkClass: boolean }
> = {
  consola: {
    label: 'Consola',
    description: 'Vigilancia estándar — fondo oscuro, texto claro',
    usesDarkClass: false,
  },
  'sala-control': {
    label: 'Sala de control',
    description: 'Más oscuro para salas con múltiples monitores',
    usesDarkClass: true,
  },
  'alto-contraste': {
    label: 'Alto contraste',
    description: 'Mayor legibilidad en pantallas con reflejos',
    usesDarkClass: true,
  },
  'admin-claro': {
    label: 'Administración clara',
    description: 'Tema claro para configuración y reportes',
    usesDarkClass: false,
  },
}

export function isConsoleThemeId(value: string): value is ConsoleThemeId {
  return CONSOLE_THEME_IDS.includes(value as ConsoleThemeId)
}

export function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/')
}

export function isOperacionPath(pathname: string): boolean {
  return pathname === '/operacion' || pathname.startsWith('/operacion/')
}
