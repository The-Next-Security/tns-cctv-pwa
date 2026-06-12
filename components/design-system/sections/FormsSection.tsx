import React from 'react'
import { SectionShell } from '../SectionShell'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'

export function FormsSection() {
  return (
    <SectionShell
      id="forms"
      title="Forms"
      description="Form primitives from components/ui/ — Input, Label, Checkbox, Textarea. Always pair inputs with visible labels. Use text-ds-ink-muted for helper text and text-destructive for validation errors."
      useCases={{
        use: ['Configuration panels, search fields, registration forms', 'Inline editing in detail views'],
        avoid: [
          'Unlabelled inputs — always include a <Label>',
          'Placeholder text as a substitute for labels',
        ],
      }}
      sampleCode={`<div className="space-y-4">
  <div className="space-y-1.5">
    <Label htmlFor="nombre">Nombre del operador</Label>
    <Input id="nombre" placeholder="Ej. Juan Pérez" />
    <p className="text-xs text-ds-ink-muted">Nombre completo tal como aparece en el sistema.</p>
  </div>
  <div className="flex items-center gap-2">
    <Checkbox id="activo" />
    <Label htmlFor="activo">Operador activo</Label>
  </div>
</div>`}
      options={
        <div className="space-y-4">
          <div>
            <p className="text-xs text-ds-ink-muted mb-2">Input states</p>
            <div className="flex flex-wrap gap-3">
              <Input placeholder="Default" className="max-w-48" />
              <Input placeholder="Disabled" disabled className="max-w-48" />
              <Input placeholder="Error" aria-invalid="true" className="max-w-48" />
            </div>
          </div>
          <div>
            <p className="text-xs text-ds-ink-muted mb-2">Textarea</p>
            <Textarea placeholder="Observaciones adicionales..." className="max-w-sm resize-none" rows={3} />
          </div>
        </div>
      }
    >
      <div className="space-y-4 max-w-sm">
        <div className="space-y-1.5">
          <Label htmlFor="ds-nombre">Nombre del operador</Label>
          <Input id="ds-nombre" placeholder="Ej. Juan Pérez" />
          <p className="text-xs text-ds-ink-muted">Nombre completo tal como aparece en el sistema.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ds-zona">Zona asignada</Label>
          <Input id="ds-zona" placeholder="Zona Norte" />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="ds-activo" defaultChecked />
          <Label htmlFor="ds-activo">Operador activo</Label>
        </div>
      </div>
    </SectionShell>
  )
}
