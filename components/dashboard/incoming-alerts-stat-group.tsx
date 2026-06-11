'use client'

import { Clock, XCircle } from 'lucide-react'
import { StatCard } from '@/components/dashboard/stat-card'
import { cn } from '@/lib/utils'

interface IncomingAlertsStatGroupProps {
  criticalCount: number
  lowPriorityCount: number
  criticalActive: boolean
  lowPriorityActive: boolean
  onCriticalClick: () => void
  onLowPriorityClick: () => void
}

export function IncomingAlertsStatGroup({
  criticalCount,
  lowPriorityCount,
  criticalActive,
  lowPriorityActive,
  onCriticalClick,
  onLowPriorityClick,
}: IncomingAlertsStatGroupProps) {
  const totalIncoming = criticalCount + lowPriorityCount
  const groupActive = criticalActive || lowPriorityActive

  return (
    <section
      className={cn(
        'incoming-alerts-stat-group col-span-2',
        groupActive && 'incoming-alerts-stat-group--active'
      )}
      aria-labelledby="incoming-alerts-heading"
    >
      <header className="incoming-alerts-stat-group__header">
        <div className="min-w-0">
          <h2 id="incoming-alerts-heading" className="incoming-alerts-stat-group__title">
            Alertas pendientes
          </h2>
          <p className="incoming-alerts-stat-group__subtitle">
            Críticas (alta/crítica) requieren acción inmediata — baja prioridad puede atenderse después
          </p>
        </div>
        {totalIncoming > 0 && (
          <span className="incoming-alerts-stat-group__total" aria-live="polite">
            {totalIncoming} por atender
          </span>
        )}
      </header>

      <div className="incoming-alerts-stat-group__cards">
        <StatCard
          label="Críticas"
          value={criticalCount}
          hint="Alta y crítica sin atender"
          icon={XCircle}
          tone="critical"
          active={criticalActive}
          onClick={onCriticalClick}
        />
        <StatCard
          label="Baja Prior."
          value={lowPriorityCount}
          hint="Media y baja sin atender"
          icon={Clock}
          tone="pending"
          active={lowPriorityActive}
          onClick={onLowPriorityClick}
        />
      </div>
    </section>
  )
}
