'use client'

import { useEffect, useState } from 'react'
import { Radio } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DEMO_LIVE_FEED_URL } from '@/lib/demo-media'

interface LiveCameraPanelProps {
  cameraName?: string
  className?: string
}

export function LiveCameraPanel({ cameraName = 'Cámara', className }: LiveCameraPanelProps) {
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

  return (
    <div className={cn('relative aspect-video overflow-hidden rounded-lg border border-border bg-black', className)}>
      <img
        src={DEMO_LIVE_FEED_URL}
        alt={`Transmisión en vivo — ${cameraName}`}
        className="h-full w-full object-cover opacity-90"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30" />

      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md bg-black/60 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        EN VIVO
      </div>

      <div className="absolute right-3 top-3 rounded-md bg-black/60 px-2 py-1 font-mono text-[11px] text-white backdrop-blur-sm">
        {clock}
      </div>

      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
        <div className="rounded-md bg-black/60 px-2 py-1 text-[11px] text-white backdrop-blur-sm">
          <p className="font-semibold">{cameraName}</p>
          <p className="text-white/70">Dahua · Stream demo</p>
        </div>
        <div className="flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[10px] text-emerald-300 backdrop-blur-sm">
          <Radio className="h-3 w-3" />
          24 fps
        </div>
      </div>
    </div>
  )
}
