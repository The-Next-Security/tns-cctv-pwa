'use client'

import { useEffect, useState } from 'react'
import { Radio, ScanLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DEMO_ANPR_PORTON_URL } from '@/lib/mock-anpr-detections'

interface AnprGatePanelProps {
  cameraName?: string
  plateDisplay?: string | null
  confidence?: number | null
  manualReview?: boolean
  className?: string
}

export function AnprGatePanel({
  cameraName = 'CAM-ANPR-RC01',
  plateDisplay,
  confidence,
  manualReview = false,
  className,
}: AnprGatePanelProps) {
  const [clock, setClock] = useState('')

  useEffect(() => {
    const tick = () => {
      setClock(
        new Date().toLocaleTimeString('es-CL', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])

  const showPlate = Boolean(plateDisplay)

  return (
    <div
      className={cn(
        'relative aspect-[16/9] overflow-hidden rounded-xl border border-border bg-black',
        className
      )}
    >
      <img
        src={DEMO_ANPR_PORTON_URL}
        alt="Vista ANPR portón recepción"
        className="h-full w-full object-cover"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/40" />

      <div className="absolute left-3 top-3 flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-md bg-black/65 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          EN VIVO
        </div>
        <div className="flex items-center gap-1.5 rounded-md bg-emerald-950/80 px-2 py-1 text-[10px] font-medium text-emerald-300 backdrop-blur-sm">
          <ScanLine className="h-3 w-3" />
          ANPR en línea
        </div>
      </div>

      <div className="absolute right-3 top-3 rounded-md bg-black/65 px-2 py-1 font-mono text-[11px] text-white backdrop-blur-sm">
        {clock}
      </div>

      {showPlate && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2">
          <div
            className={cn(
              'rounded-md border-2 px-4 py-2 shadow-lg backdrop-blur-sm',
              manualReview
                ? 'border-[var(--warning)] bg-[var(--warning-bg)]/90'
                : 'border-[var(--crextio-gold-strong)] bg-black/75'
            )}
          >
            <p className="text-center font-mono text-xl font-bold tracking-wider text-white">
              {plateDisplay}
            </p>
            {confidence != null && (
              <p
                className={cn(
                  'mt-0.5 text-center text-[10px] font-semibold',
                  manualReview ? 'text-[var(--warning)]' : 'text-emerald-300'
                )}
              >
                {confidence}% confianza
                {manualReview ? ' · revisión manual' : ''}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
        <div className="rounded-md bg-black/65 px-2 py-1 text-[11px] text-white backdrop-blur-sm">
          <p className="font-semibold">{cameraName}</p>
          <p className="text-white/70">Portón recepción · Dahua ITC demo</p>
        </div>
        <div className="flex items-center gap-1 rounded-md bg-black/65 px-2 py-1 text-[10px] text-emerald-300 backdrop-blur-sm">
          <Radio className="h-3 w-3" />
          LPR activo
        </div>
      </div>
    </div>
  )
}
