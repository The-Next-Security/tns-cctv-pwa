'use client'

import { useEffect, useState } from 'react'
import { Radio } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DEMO_LIVE_FEED_URL } from '@/lib/demo-media'

interface LiveCameraPanelProps {
  cameraName?: string
  className?: string
  videoUrl?: string
}

export function LiveCameraPanel({
  cameraName = 'Cámara',
  className,
  videoUrl = DEMO_LIVE_FEED_URL,
}: LiveCameraPanelProps) {
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
    <div className={cn('relative aspect-video overflow-hidden rounded-lg border border-border bg-zinc-950', className)}>
      <video
        key={videoUrl}
        src={videoUrl}
        className="h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30" />

      <div className="video-chrome absolute left-3 top-3 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--alert-critical)] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--alert-critical)]" />
        </span>
        EN VIVO
      </div>

      <div className="video-chrome-mono absolute right-3 top-3">
        {clock}
      </div>

      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
        <div className="video-chrome">
          <p className="font-semibold">{cameraName}</p>
          <p className="video-chrome-sub">Dahua · Stream demo</p>
        </div>
        <div className="video-chrome flex items-center gap-1 text-[10px] text-[var(--alert-success)]">
          <Radio className="h-3 w-3" />
          <span className="text-live-data">24</span> fps
        </div>
      </div>
    </div>
  )
}
