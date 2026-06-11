import React from 'react'
import { SectionShell } from '../SectionShell'
import { Button } from '@/components/ui/button'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ButtonsSection() {
  return (
    <SectionShell
      id="buttons"
      title="Buttons"
      description="Buttons from components/ui/button — built with CVA variants. Use the default variant for primary actions, outline for secondary, ghost for tertiary. Destructive for irreversible operations."
      useCases={{
        use: [
          'Primary action on a page or form — default variant',
          'Secondary / cancel actions — outline or ghost',
          'Delete or irreversible actions — destructive',
          'Icon-only actions — icon size',
        ],
        avoid: [
          'More than one default button per context',
          'Using link variant for navigation — use <a> or Next <Link>',
        ],
      }}
      sampleCode={`import { Button } from '@/components/ui/button'

<Button>Registrar alerta</Button>
<Button variant="outline">Cancelar</Button>
<Button variant="destructive">Eliminar expediente</Button>
<Button size="sm">Guardar</Button>
<Button size="icon"><Plus size={16} /></Button>`}
      options={
        <div className="space-y-4">
          <div>
            <p className="text-xs text-ds-ink-muted mb-2">Sizes</p>
            <div className="flex flex-wrap gap-3 items-center">
              <Button size="lg">Large</Button>
              <Button size="default">Default</Button>
              <Button size="sm">Small</Button>
              <Button size="icon"><Plus size={16} /></Button>
            </div>
          </div>
          <div>
            <p className="text-xs text-ds-ink-muted mb-2">States</p>
            <div className="flex flex-wrap gap-3 items-center">
              <Button>Enabled</Button>
              <Button disabled>Disabled</Button>
            </div>
          </div>
        </div>
      }
    >
      <div className="flex flex-wrap gap-3 items-center">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
      </div>
    </SectionShell>
  )
}

export function ButtonDropdownSection() {
  return (
    <SectionShell
      id="button-dropdown"
      title="Button Dropdown"
      description="Split button pattern combining a primary action with a dropdown of secondary options. Built with Button + DropdownMenu from Radix."
      useCases={{
        use: ['Primary action with 2–4 alternatives (e.g., Save / Save & Close / Save as Draft)', 'Export with format options'],
        avoid: ['More than 5 items — use a proper dropdown menu instead', 'When all options are equally important — use separate buttons'],
      }}
      sampleCode={`<div className="flex">
  <Button className="rounded-r-none border-r-0">Guardar</Button>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button className="rounded-l-none px-2" size="icon">
        <ChevronDown size={14} />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem>Guardar y cerrar</DropdownMenuItem>
      <DropdownMenuItem>Guardar como borrador</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>`}
    >
      <div className="flex">
        <Button className="rounded-r-none border-r-0">Guardar</Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="rounded-l-none px-2" size="icon">
              <ChevronDown size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Guardar y cerrar</DropdownMenuItem>
            <DropdownMenuItem>Guardar como borrador</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Descartar cambios</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </SectionShell>
  )
}
