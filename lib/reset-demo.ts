import {
  CONSOLE_THEME_MANUAL_KEY,
  CONSOLE_THEME_ROUTE_BACKUP_KEY,
} from '@/lib/console-themes'
import { resetMockCaseFilesStore } from '@/lib/mock-case-files-api'

/** sessionStorage: popup de alerta intrusión en /operacion */
export const DEMO_ALERT_POPUP_KEY = 'tns_demo_alert_popup'

const DEMO_SESSION_KEYS = [
  DEMO_ALERT_POPUP_KEY,
  CONSOLE_THEME_MANUAL_KEY,
  CONSOLE_THEME_ROUTE_BACKUP_KEY,
] as const

const DEMO_LOCAL_STORAGE_PREFIX = 'tns_demo_'

export type ResetDemoOptions = {
  /** Ruta tras recargar (por defecto operación). */
  redirectTo?: string
}

/**
 * Restaura el estado de demostración: limpia flags de sesión, reinicia stores mock
 * en memoria y recarga la app. Conserva login (localStorage de auth) y tema de consola.
 */
export function resetDemoState(options: ResetDemoOptions = {}): void {
  const { redirectTo = '/operacion' } = options

  resetMockCaseFilesStore()

  for (const key of DEMO_SESSION_KEYS) {
    sessionStorage.removeItem(key)
  }

  if (typeof localStorage !== 'undefined') {
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(DEMO_LOCAL_STORAGE_PREFIX)) {
        toRemove.push(key)
      }
    }
    toRemove.forEach(key => localStorage.removeItem(key))
  }

  window.location.replace(redirectTo)
}
