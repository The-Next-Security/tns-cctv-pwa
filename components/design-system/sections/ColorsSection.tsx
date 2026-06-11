import React from 'react'
import { SectionShell } from '../SectionShell'
import { ColorSwatch } from '../ColorSwatch'
import { swatches } from '../palette'

export function ColorsSection() {
  return (
    <SectionShell
      id="colors"
      title="Colors"
      description="Paleta real de la app (tokens --cctv-* en app/globals.css). Los valores mostrados se leen en vivo del CSS y cambian con el tema claro/oscuro. Usa nombres de token (bg-ds-accent, text-ds-signal) en lugar de hex crudo para que un cambio de paleta se propague solo."
      useCases={{
        use: [
          'bg-ds-page for page backgrounds',
          'bg-ds-surface for cards and panels',
          'text-ds-ink-display for headings and primary text',
          'text-ds-ink-muted for captions and labels',
          'bg-ds-accent / text-ds-accent for interactive elements',
          'bg-ds-signal for critical alerts',
        ],
        avoid: [
          'Raw hex codes in components — use token names',
          'Tailwind gray/zinc utilities — they bypass tokens',
          'bg-white or bg-black — not part of this palette',
        ],
      }}
      sampleCode={`<div className="bg-ds-surface border border-ds-hairline rounded-lg p-4">
  <h3 className="text-ds-ink-display font-semibold">Panel title</h3>
  <p className="text-ds-ink-body text-sm">Body copy goes here.</p>
  <p className="text-ds-ink-muted text-xs mt-1">Muted caption text.</p>
</div>`}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {swatches.map(s => (
          <ColorSwatch key={s.name} name={s.name} cssValue={s.cssValue} hex={s.hex} label={s.label} usage={s.usage} />
        ))}
      </div>
    </SectionShell>
  )
}
