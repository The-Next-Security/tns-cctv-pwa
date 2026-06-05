import React from 'react'
import { SectionShell } from '../SectionShell'

export function TypographySection() {
  return (
    <SectionShell
      id="typography"
      title="Typography"
      description="Two fonts: Inter (display, headings) via font-ds-display; DM Sans (body, UI) via font-ds-body. Both loaded from Google Fonts. Apply through Tailwind utilities or CSS variables — never hardcode the font-family string in component styles."
      useCases={{
        use: [
          'font-ds-display for headings, labels, and prominent UI text',
          'font-ds-body for paragraph copy and most UI elements',
          'text-ds-ink-display on headings for maximum contrast',
          'text-ds-ink-body / text-ds-ink-muted for body and secondary text',
        ],
        avoid: [
          'Mixing in Geist Sans/Mono for UI text — reserve those for code',
          'Setting font-family directly in component style props',
        ],
      }}
      sampleCode={`{/* Heading — Inter */}
<h1 className="font-ds-display text-4xl font-bold text-ds-ink-display tracking-tight">
  Alert Dashboard
</h1>

{/* Body — DM Sans */}
<p className="font-ds-body text-ds-ink-body leading-relaxed">
  Monitoreo en tiempo real de cámaras y sensores.
</p>`}
    >
      <div className="space-y-6">
        <div>
          <p className="text-xs text-ds-ink-muted uppercase tracking-widest mb-3">Inter — Display</p>
          <div className="space-y-3" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
            <div className="text-4xl font-bold text-ds-ink-display tracking-tight">Bold 36 — Alert Dashboard</div>
            <div className="text-2xl font-semibold text-ds-ink-display tracking-tight">Semibold 24 — Zone Overview</div>
            <div className="text-lg font-semibold text-ds-ink-display">Semibold 18 — Camera Grid</div>
            <div className="text-base font-medium text-ds-ink-display">Medium 16 — Section heading</div>
          </div>
        </div>
        <div className="border-t border-ds-hairline pt-6">
          <p className="text-xs text-ds-ink-muted uppercase tracking-widest mb-3">DM Sans — Body</p>
          <div className="space-y-2" style={{ fontFamily: 'DM Sans, ui-sans-serif, system-ui, sans-serif' }}>
            <div className="text-base text-ds-ink-body leading-relaxed">
              Regular 16 — Monitoreo en tiempo real de cámaras, sensores y accesos vehiculares. Sistema de alertas de alta visibilidad.
            </div>
            <div className="text-sm text-ds-ink-body">Small 14 — Alert summary and metadata labels</div>
            <div className="text-xs text-ds-ink-muted">Extra small 12 — Timestamps, captions, secondary info</div>
          </div>
        </div>
        <div className="border-t border-ds-hairline pt-6">
          <p className="text-xs text-ds-ink-muted uppercase tracking-widest mb-3">Font Tokens</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-md border border-ds-hairline bg-ds-page">
              <code className="text-xs text-ds-accent">font-ds-display</code>
              <p className="text-xs text-ds-ink-muted mt-1">Inter — headings, UI labels</p>
            </div>
            <div className="p-3 rounded-md border border-ds-hairline bg-ds-page">
              <code className="text-xs text-ds-accent">font-ds-body</code>
              <p className="text-xs text-ds-ink-muted mt-1">DM Sans — body copy, most UI</p>
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  )
}
