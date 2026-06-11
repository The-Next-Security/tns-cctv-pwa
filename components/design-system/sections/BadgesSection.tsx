import React from 'react'
import { SectionShell } from '../SectionShell'
import { Badge } from '@/components/ui/badge'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Grid2x2, List, Map } from 'lucide-react'

export function BadgesSection() {
  return (
    <SectionShell
      id="badges"
      title="Badges"
      description="Compact status labels from components/ui/badge. Use for alert urgency, record status, and categorical tags. Keep text short — one or two words maximum."
      useCases={{
        use: ['Alert urgency levels (Crítico, Pendiente, Resuelto)', 'Record status (Activo, Inactivo)', 'Categorical tags on listings'],
        avoid: ['Interactive actions — use Button instead', 'Long text — truncate or use a tooltip'],
      }}
      sampleCode={`import { Badge } from '@/components/ui/badge'

<Badge>Default</Badge>
<Badge variant="secondary">Pendiente</Badge>
<Badge variant="destructive">Crítico</Badge>
<Badge variant="outline">Resuelto</Badge>`}
      options={
        <div className="space-y-3">
          <p className="text-xs text-ds-ink-muted">All variants</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
          <p className="text-xs text-ds-ink-muted mt-3">Custom urgency (via urgency-badge component)</p>
          <div className="flex flex-wrap gap-2">
            {['Crítico', 'Pendiente', 'En revisión', 'Escalado', 'Resuelto'].map(u => (
              <span
                key={u}
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border"
                style={{
                  color: u === 'Crítico' ? '#ff4d4f' : u === 'Pendiente' ? '#faad14' : u === 'Escalado' ? '#d97706' : u === 'En revisión' ? '#5b7a9d' : '#71717a',
                  backgroundColor: u === 'Crítico' ? 'rgb(255 77 79 / 0.12)' : u === 'Pendiente' ? 'rgb(250 173 20 / 0.12)' : u === 'Escalado' ? 'rgb(217 119 6 / 0.12)' : u === 'En revisión' ? 'rgb(91 122 157 / 0.12)' : 'rgb(107 114 128 / 0.12)',
                  borderColor: u === 'Crítico' ? 'rgb(255 77 79 / 0.35)' : u === 'Pendiente' ? 'rgb(250 173 20 / 0.35)' : u === 'Escalado' ? 'rgb(217 119 6 / 0.35)' : u === 'En revisión' ? 'rgb(91 122 157 / 0.35)' : 'rgb(107 114 128 / 0.3)',
                }}
              >
                {u}
              </span>
            ))}
          </div>
        </div>
      }
    >
      <div className="flex flex-wrap gap-2 items-center">
        <Badge>Default</Badge>
        <Badge variant="secondary">Pendiente</Badge>
        <Badge variant="destructive">Crítico</Badge>
        <Badge variant="outline">Resuelto</Badge>
      </div>
    </SectionShell>
  )
}

export function ToggleButtonsSection() {
  return (
    <SectionShell
      id="toggle-buttons"
      title="Toggle Buttons"
      description="Toggle groups for mutually exclusive view or filter selection. Built with Radix ToggleGroup. Exactly one item must always be selected — use type='single' with a default value."
      useCases={{
        use: ['View mode switchers (Grid / List / Map)', 'Date range filters (Today / Week / Month)', 'Display density options'],
        avoid: ['Multi-select options — use Checkboxes instead', 'Navigation — use tab nav or sidebar nav'],
      }}
      sampleCode={`import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

<ToggleGroup type="single" defaultValue="grid">
  <ToggleGroupItem value="grid" aria-label="Grid view">
    <Grid2x2 size={16} />
  </ToggleGroupItem>
  <ToggleGroupItem value="list" aria-label="List view">
    <List size={16} />
  </ToggleGroupItem>
  <ToggleGroupItem value="map" aria-label="Map view">
    <Map size={16} />
  </ToggleGroupItem>
</ToggleGroup>`}
    >
      <div className="flex gap-4 items-center flex-wrap">
        <div>
          <p className="text-xs text-ds-ink-muted mb-2">Icon toggle</p>
          <ToggleGroup type="single" defaultValue="grid">
            <ToggleGroupItem value="grid" aria-label="Grid view">
              <Grid2x2 size={16} />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view">
              <List size={16} />
            </ToggleGroupItem>
            <ToggleGroupItem value="map" aria-label="Map view">
              <Map size={16} />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div>
          <p className="text-xs text-ds-ink-muted mb-2">Text toggle</p>
          <ToggleGroup type="single" defaultValue="today">
            <ToggleGroupItem value="today">Hoy</ToggleGroupItem>
            <ToggleGroupItem value="week">Semana</ToggleGroupItem>
            <ToggleGroupItem value="month">Mes</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    </SectionShell>
  )
}
