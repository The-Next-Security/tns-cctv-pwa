// bm-design-system: theme-toggle primitive
'use client'

import * as React from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type Theme } from '@/lib/theme'
import { cn } from '@/lib/utils'

interface ThemeOption {
  value: Theme
  label: string
  Icon: React.ComponentType<{ className?: string }>
}

const OPTIONS: ThemeOption[] = [
  { value: 'light',  label: 'Claro',   Icon: Sun },
  { value: 'dark',   label: 'Oscuro',  Icon: Moon },
  { value: 'system', label: 'Sistema', Icon: Monitor },
]

export interface ThemeToggleProps {
  block?: boolean
  className?: string
}

export function ThemeToggle({ block = false, className }: ThemeToggleProps) {
  const [theme, setTheme] = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Tema de la interfaz"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md border border-ds-hairline bg-ds-surface p-0.5',
        block && 'w-full',
        className,
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const isActive = theme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              'inline-flex cursor-pointer items-center justify-center rounded transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent',
              block ? 'flex-1 h-8' : 'h-7 w-7',
              isActive
                ? 'bg-ds-page text-ds-ink-display shadow-sm'
                : 'text-ds-ink-muted hover:text-ds-ink-display',
            )}
          >
            <Icon className="size-4" />
            {block && <span className="ml-1.5 text-xs font-medium">{label}</span>}
          </button>
        )
      })}
    </div>
  )
}
