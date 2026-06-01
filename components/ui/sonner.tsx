'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'
import { DEFAULT_CONSOLE_THEME, isConsoleThemeId } from '@/lib/console-themes'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()
  const resolved = isConsoleThemeId(theme ?? '') ? theme : DEFAULT_CONSOLE_THEME
  const sonnerTheme: ToasterProps['theme'] =
    resolved === 'admin-claro' ? 'light' : 'dark'

  return (
    <Sonner
      theme={sonnerTheme}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
