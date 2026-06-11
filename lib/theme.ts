'use client'

import { useTheme as useNextTheme } from 'next-themes'

export type Theme = 'light' | 'dark' | 'system'

// Wrapper compatible con la API esperada por el ThemeToggle de bm-skills:
// const [theme, setTheme] = useTheme()
export function useTheme(): [Theme, (theme: Theme) => void] {
  const { theme, setTheme } = useNextTheme()
  const current = (theme ?? 'dark') as Theme
  return [current, setTheme as (t: Theme) => void]
}
