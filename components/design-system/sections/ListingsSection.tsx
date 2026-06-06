import React from 'react'
import { SectionShell } from '../SectionShell'
import { Badge } from '@/components/ui/badge'

const MOCK_ALERTS = [
  { id: '001', title: 'Movimiento en Zona Norte', zone: 'Zona Norte', urgency: 'Crítico', time: '09:42' },
  { id: '002', title: 'Acceso no autorizado', zone: 'Puerta Principal', urgency: 'Pendiente', time: '09:38' },
  { id: '003', title: 'Cámara fuera de línea', zone: 'Almacén B', urgency: 'En revisión', time: '09:15' },
]

function urgencyColor(u: string) {
  if (u === 'Crítico') return { color: '#ff4d4f', bg: 'rgb(255 77 79 / 0.12)', border: 'rgb(255 77 79 / 0.35)' }
  if (u === 'Pendiente') return { color: '#faad14', bg: 'rgb(250 173 20 / 0.12)', border: 'rgb(250 173 20 / 0.35)' }
  return { color: '#5b7a9d', bg: 'rgb(91 122 157 / 0.12)', border: 'rgb(91 122 157 / 0.35)' }
}

export function ListingsSection() {
  return (
    <SectionShell
      id="listings"
      title="Listings"
      description="Row-based listings for alerts, expedientes, and records. Each row uses bg-ds-surface with a border-b border-ds-hairline divider. Highlight rows with a left border in the urgency color on hover or active state."
      useCases={{
        use: ['Alert lists on the operations panel', 'Expedientes table', 'Any record list with status and actions'],
        avoid: ['Deeply nested data — use a table with expand/collapse instead', 'More than 5–6 columns visible at once on mobile'],
      }}
      sampleCode={`<ul className="divide-y divide-ds-hairline rounded-lg border border-ds-hairline overflow-hidden">
  {alerts.map(alert => (
    <li key={alert.id} className="flex items-center justify-between gap-3 px-4 py-3 bg-ds-surface hover:bg-ds-page transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ds-ink-display truncate">{alert.title}</p>
        <p className="text-xs text-ds-ink-muted">{alert.zone} · {alert.time}</p>
      </div>
      <UrgencyBadge urgency={alert.urgency} />
    </li>
  ))}
</ul>`}
    >
      <ul className="divide-y divide-ds-hairline rounded-lg border border-ds-hairline overflow-hidden">
        {MOCK_ALERTS.map(alert => {
          const c = urgencyColor(alert.urgency)
          return (
            <li key={alert.id} className="flex items-center justify-between gap-3 px-4 py-3 bg-ds-surface">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ds-ink-display truncate">{alert.title}</p>
                <p className="text-xs text-ds-ink-muted">{alert.zone} · {alert.time}</p>
              </div>
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border shrink-0"
                style={{ color: c.color, backgroundColor: c.bg, borderColor: c.border }}
              >
                {alert.urgency}
              </span>
            </li>
          )
        })}
      </ul>
    </SectionShell>
  )
}
