'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface RelativeTimeProps {
  date: string | Date | null | undefined
  addSuffix?: boolean
  refreshMs?: number
  className?: string
  /** Prefijo opcional, p. ej. "Detectado " */
  prefix?: string
}

/**
 * Tiempo relativo ("hace 5 minutos") calculado SOLO en cliente.
 * Evita el hydration mismatch de calcular distancias de tiempo durante SSR
 * y se refresca periódicamente para mantenerse vigente.
 */
export function RelativeTime({
  date,
  addSuffix = true,
  refreshMs = 60_000,
  className,
  prefix,
}: RelativeTimeProps) {
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    if (!date) {
      setLabel(null)
      return
    }
    const compute = () =>
      setLabel(formatDistanceToNow(new Date(date), { addSuffix, locale: es }))
    compute()
    const timer = setInterval(compute, refreshMs)
    return () => clearInterval(timer)
  }, [date, addSuffix, refreshMs])

  if (!label) return <span className={className} aria-hidden="true">—</span>

  const dateTime = typeof date === 'string' ? date : date?.toISOString()
  return (
    <time className={className} dateTime={dateTime}>
      {prefix}
      {label}
    </time>
  )
}
