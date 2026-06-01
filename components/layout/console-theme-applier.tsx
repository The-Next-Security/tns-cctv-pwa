'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  CONSOLE_THEME_ROUTE_BACKUP_KEY,
  CONSOLE_THEME_MANUAL_KEY,
  CONSOLE_THEMES,
  DEFAULT_CONSOLE_THEME,
  isAdminPath,
  isConsoleThemeId,
  type ConsoleThemeId,
} from '@/lib/console-themes'

function applyDarkClass(theme: ConsoleThemeId) {
  const root = document.documentElement
  if (CONSOLE_THEMES[theme].usesDarkClass) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export function ConsoleThemeApplier() {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()

  const activeTheme: ConsoleThemeId = isConsoleThemeId(resolvedTheme ?? '')
    ? resolvedTheme
    : DEFAULT_CONSOLE_THEME

  useEffect(() => {
    applyDarkClass(activeTheme)
  }, [activeTheme])

  useEffect(() => {
    const manual = sessionStorage.getItem(CONSOLE_THEME_MANUAL_KEY) === '1'
    if (manual) return

    if (isAdminPath(pathname)) {
      if (activeTheme !== 'admin-claro') {
        sessionStorage.setItem(CONSOLE_THEME_ROUTE_BACKUP_KEY, activeTheme)
        setTheme('admin-claro')
      }
      return
    }

    const backup = sessionStorage.getItem(CONSOLE_THEME_ROUTE_BACKUP_KEY)
    if (backup && isConsoleThemeId(backup) && activeTheme === 'admin-claro') {
      setTheme(backup)
      sessionStorage.removeItem(CONSOLE_THEME_ROUTE_BACKUP_KEY)
    }
  }, [pathname, activeTheme, setTheme])

  return null
}

export function setConsoleThemeManual(theme: ConsoleThemeId, setTheme: (theme: string) => void) {
  sessionStorage.setItem(CONSOLE_THEME_MANUAL_KEY, '1')
  sessionStorage.removeItem(CONSOLE_THEME_ROUTE_BACKUP_KEY)
  setTheme(theme)
}
