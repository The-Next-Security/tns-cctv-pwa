'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'
import {
  CONSOLE_THEME_IDS,
  CONSOLE_THEME_STORAGE_KEY,
  DEFAULT_CONSOLE_THEME,
} from '@/lib/console-themes'
import { ConsoleThemeApplier } from '@/components/layout/console-theme-applier'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="data-console-theme"
      defaultTheme={DEFAULT_CONSOLE_THEME}
      themes={[...CONSOLE_THEME_IDS]}
      enableSystem={false}
      storageKey={CONSOLE_THEME_STORAGE_KEY}
      disableTransitionOnChange
      {...props}
    >
      <ConsoleThemeApplier />
      {children}
    </NextThemesProvider>
  )
}
