'use client'

import React from 'react'
import { useTheme } from 'next-themes'

interface ColorSwatchProps {
  name: string
  /** Expresión CSS real (ej. var(--cctv-bg-base)). Si falta, usa hex. */
  cssValue?: string
  hex: string
  label: string
  usage: string
}

function rgbToHex(value: string): string | null {
  const match = value.match(/rgba?\(([^)]+)\)/)
  if (!match) return null
  const parts = match[1].split(/[ ,/]+/).filter(Boolean)
  const [r, g, b, a] = parts
  const toHex = (n: string) => Math.round(Number(n)).toString(16).padStart(2, '0')
  if (r == null || g == null || b == null) return null
  const base = `#${toHex(r)}${toHex(g)}${toHex(b)}`
  if (a != null && Number(a) < 1) {
    return `${base} · ${Math.round(Number(a) * 100)}%`
  }
  return base
}

export function ColorSwatch({ name, cssValue, hex, label, usage }: ColorSwatchProps) {
  const swatchRef = React.useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()
  const [resolved, setResolved] = React.useState<string>(hex)

  React.useEffect(() => {
    if (!swatchRef.current) return
    // Lee el color realmente computado por el navegador (resuelve var() y color-mix).
    const id = requestAnimationFrame(() => {
      if (!swatchRef.current) return
      const computed = getComputedStyle(swatchRef.current).backgroundColor
      setResolved(rgbToHex(computed) ?? computed)
    })
    return () => cancelAnimationFrame(id)
  }, [resolvedTheme, cssValue])

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={swatchRef}
        className="h-16 w-full rounded-md border border-ds-hairline"
        style={{ backgroundColor: cssValue ?? hex }}
      />
      <div>
        <p className="text-sm font-semibold text-ds-ink-display">{label}</p>
        <p className="text-xs font-mono text-ds-accent">{resolved}</p>
        <p className="text-xs text-ds-ink-muted mt-0.5">{usage}</p>
        <p className="text-xs font-mono text-ds-ink-muted mt-0.5">bg-{name}</p>
      </div>
    </div>
  )
}
