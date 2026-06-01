'use client'

import { ChevronRight, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { URGENCY_STYLES, type UrgencyLevel } from '@/lib/constants'

interface StatCardProps {
  label: string
  value: number
  hint: string
  icon: LucideIcon
  tone: UrgencyLevel
  active?: boolean
  onClick?: () => void
}

const HOVER_BY_TONE: Record<UrgencyLevel, string> = {
  critical:
    'hover:bg-[var(--urgency-critical-bg)]/75 hover:border-[var(--urgency-critical)]/45 hover:shadow-[0_16px_40px_rgb(194_64_51/0.16)]',
  pending:
    'hover:bg-[var(--urgency-pending-bg)]/75 hover:border-[var(--urgency-pending)]/45 hover:shadow-[0_16px_40px_rgb(212_146_10/0.14)]',
  review:
    'hover:bg-[var(--urgency-review-bg)]/75 hover:border-[var(--urgency-review)]/45 hover:shadow-[0_16px_40px_rgb(154_115_68/0.14)]',
  resolved:
    'hover:bg-[var(--urgency-resolved-bg)]/80 hover:border-[var(--urgency-resolved)]/50 hover:shadow-[0_16px_40px_rgb(104_75_61/0.12)]',
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  active,
  onClick,
}: StatCardProps) {
  const styles = URGENCY_STYLES[tone]
  const showCriticalPulse = tone === 'critical' && value > 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group soft-card soft-card-compact relative w-full cursor-pointer overflow-hidden text-left',
        'p-3 sm:p-5',
        'transition-all duration-200 ease-out',
        'sm:hover:-translate-y-1 sm:hover:ring-2 sm:hover:ring-[var(--ring)]/30',
        'active:scale-[0.98] active:shadow-card',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/35',
        HOVER_BY_TONE[tone],
        active && `ring-2 ${styles.ring}`,
        showCriticalPulse && !active && 'ring-2 ring-[var(--urgency-critical)]/20'
      )}
    >
      <div className="flex items-center justify-between gap-2 sm:items-start sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className={cn('text-[11px] sm:text-caption font-semibold transition-colors truncate', styles.text)}>
            {label}
          </p>
          <p
            className={cn(
              'mt-0.5 sm:mt-1 text-2xl sm:text-display text-numeral tabular-nums antialiased transition-transform duration-200 sm:group-hover:scale-[1.02] origin-left',
              styles.text
            )}
          >
            {value}
          </p>
          <p className="mt-0.5 hidden sm:block text-body-secondary transition-colors group-hover:text-foreground/80">
            {hint}
          </p>
        </div>
        <div
          className={cn(
            'flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl transition-all duration-200',
            'sm:group-hover:scale-110 sm:group-hover:shadow-sm',
            styles.iconBox,
            showCriticalPulse && 'badge-urgency-critical-pulse'
          )}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.75} />
        </div>
      </div>

      <ChevronRight
        aria-hidden
        className={cn(
          'pointer-events-none absolute bottom-3 right-3 h-4 w-4 opacity-0 hidden sm:block',
          'translate-x-1 transition-all duration-200',
          'group-hover:opacity-70 group-hover:translate-x-0',
          styles.text
        )}
      />
    </button>
  )
}
