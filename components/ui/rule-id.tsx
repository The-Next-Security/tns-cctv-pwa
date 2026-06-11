import { cn } from '@/lib/utils'
import { formatRuleCode } from '@/lib/types'

interface RuleIdProps {
  rule?: {
    rule_code?: string | null
    rule_id?: string | null
    id?: number
  } | null
  className?: string
  variant?: 'compact' | 'labeled'
}

/** Identificador visible de regla operativa: Regla-XXXX. */
export function RuleId({ rule, className, variant = 'labeled' }: RuleIdProps) {
  const value = formatRuleCode(rule)
  if (!value) return null

  const label = variant === 'compact' ? value : `#${value}`

  return (
    <span
      className={cn(
        'inline-flex items-center font-mono tabular-nums text-ds-ink-muted shrink-0',
        variant === 'compact' ? 'text-xs' : 'text-sm',
        className
      )}
      title={`Regla ${value}`}
    >
      {label}
    </span>
  )
}
