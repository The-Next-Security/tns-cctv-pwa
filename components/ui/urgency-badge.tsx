import { cn } from '@/lib/utils'
import type { UrgencyLevel } from '@/lib/constants'

const BADGE_CLASS: Record<UrgencyLevel, string> = {
  critical:  'badge-urgency badge-urgency-critical',
  pending:   'badge-urgency badge-urgency-pending',
  review:    'badge-urgency badge-urgency-review',
  escalated: 'badge-urgency badge-urgency-escalated',
  resolved:  'badge-urgency badge-urgency-resolved',
}

const TEXT_CLASS: Record<UrgencyLevel, string> = {
  critical:  'text-urgency-critical',
  pending:   'text-urgency-pending',
  review:    'text-urgency-review',
  escalated: 'text-urgency-escalated',
  resolved:  'text-urgency-resolved',
}

interface UrgencyBadgeProps {
  level: UrgencyLevel
  children: React.ReactNode
  pulse?: boolean
  className?: string
}

export function UrgencyBadge({ level, children, pulse, className }: UrgencyBadgeProps) {
  return (
    <span
      className={cn(
        BADGE_CLASS[level],
        pulse && level === 'critical' && 'badge-urgency-critical-pulse',
        className
      )}
    >
      {children}
    </span>
  )
}

interface UrgencyTextProps {
  level: UrgencyLevel
  children: React.ReactNode
  pulse?: boolean
  className?: string
  as?: 'span' | 'strong'
}

export function UrgencyText({ level, children, pulse, className, as: Tag = 'span' }: UrgencyTextProps) {
  return (
    <Tag
      className={cn(
        TEXT_CLASS[level],
        pulse && level === 'critical' && 'badge-urgency-critical-pulse',
        className
      )}
    >
      {children}
    </Tag>
  )
}

export function urgencyTabClass(level: UrgencyLevel, active: boolean) {
  if (!active) return 'text-ds-ink-muted'
  return TEXT_CLASS[level]
}
