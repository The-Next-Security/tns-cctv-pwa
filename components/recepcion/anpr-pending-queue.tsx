'use client'

import { RelativeTime } from '@/components/ui/relative-time'
import { CarFront, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AnprPendingDetection } from '@/lib/mock-anpr-detections'

interface AnprPendingQueueProps {
  detections: AnprPendingDetection[]
  activeId?: string | null
  onSelect: (detection: AnprPendingDetection) => void
}

export function AnprPendingQueue({ detections, activeId, onSelect }: AnprPendingQueueProps) {
  if (detections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ds-hairline bg-ds-muted/30 p-6 text-center">
        <CarFront className="mx-auto mb-2 h-8 w-8 text-ds-ink-muted/40" />
        <p className="text-sm text-ds-ink-muted">Sin vehículos pendientes de registro</p>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {detections.map(detection => {
        const isActive = detection.id === activeId
        const needsReview = detection.status === 'manual_review'

        return (
          <li key={detection.id}>
            <button
              type="button"
              onClick={() => onSelect(detection)}
              className={cn(
                'w-full rounded-xl border p-3 text-left transition-all',
                'hover:border-[var(--crextio-gold-strong)]/40 hover:bg-accent/20',
                isActive
                  ? 'border-[var(--crextio-gold-strong)]/50 bg-[var(--warning-bg)]/40 ring-1 ring-[var(--crextio-gold-strong)]/25'
                  : 'border-ds-hairline bg-ds-surface'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-base font-bold tracking-wide">{detection.plateDisplay}</p>
                  {detection.vehicleHint && (
                    <p className="mt-0.5 truncate text-xs text-ds-ink-muted">{detection.vehicleHint}</p>
                  )}
                  <p className="mt-1 text-[10px] text-ds-ink-muted">
                    <RelativeTime date={detection.detectedAt} prefix="Detectado " />
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {needsReview ? (
                    <Badge
                      variant="outline"
                      className="border-[var(--warning)]/40 bg-[var(--warning-bg)] text-[var(--warning)] text-[10px]"
                    >
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      Revisión manual
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-ds-accent/30 bg-ds-accent-faded text-ds-accent text-[10px]"
                    >
                      Listo
                    </Badge>
                  )}
                  <span
                    className={cn(
                      'text-[10px] font-semibold tabular-nums',
                      needsReview ? 'text-[var(--warning)]' : 'text-ds-accent'
                    )}
                  >
                    {detection.confidence}%
                  </span>
                </div>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
