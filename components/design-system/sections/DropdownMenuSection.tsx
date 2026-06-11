import React from 'react'
import { SectionShell } from '../SectionShell'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Eye, Pencil, Trash2 } from 'lucide-react'
import { AlertTriangle, Info, CheckCircle } from 'lucide-react'

export function DropdownMenuSection() {
  return (
    <SectionShell
      id="dropdown-menu"
      title="Dropdown Menu"
      description="Contextual menus from components/ui/dropdown-menu (Radix). Triggered by a button press. Use for record actions (View, Edit, Delete) or overflow menus when actions won't fit inline."
      useCases={{
        use: ['Row actions on listings (⋯ button)', 'User account menu in the header', 'Sort/filter options'],
        avoid: ['Primary navigation — use the sidebar nav', 'More than 8 items — consider a search-filtered command palette instead'],
      }}
      sampleCode={`import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="sm">
      Acciones <ChevronDown size={14} />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>Expediente #002</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem><Eye size={14} /> Ver detalle</DropdownMenuItem>
    <DropdownMenuItem><Pencil size={14} /> Editar</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-destructive"><Trash2 size={14} /> Eliminar</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>`}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Acciones <ChevronDown size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Expediente #002</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem><Eye size={14} /> Ver detalle</DropdownMenuItem>
          <DropdownMenuItem><Pencil size={14} /> Editar</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive"><Trash2 size={14} /> Eliminar</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SectionShell>
  )
}

export function CalloutSection() {
  const callouts = [
    {
      type: 'info',
      icon: <Info size={16} />,
      title: 'Información',
      body: 'Las alertas críticas sin atender escalan automáticamente al supervisor de turno a los 5 minutos.',
      bg: 'rgb(91 122 157 / 0.12)',
      border: 'rgb(91 122 157 / 0.35)',
      iconColor: '#5b7a9d',
    },
    {
      type: 'warning',
      icon: <AlertTriangle size={16} />,
      title: 'Atención',
      body: 'Hay 3 cámaras sin señal en la Zona Sur. Revise la conectividad antes de continuar.',
      bg: 'rgb(250 173 20 / 0.12)',
      border: 'rgb(250 173 20 / 0.35)',
      iconColor: '#faad14',
    },
    {
      type: 'success',
      icon: <CheckCircle size={16} />,
      title: 'Completado',
      body: 'El expediente ha sido cerrado y archivado correctamente.',
      bg: 'rgb(82 196 26 / 0.12)',
      border: 'rgb(82 196 26 / 0.35)',
      iconColor: '#52c41a',
    },
    {
      type: 'critical',
      icon: <AlertTriangle size={16} />,
      title: 'Crítico',
      body: 'Intrusión detectada en Zona Norte. Se requiere atención inmediata.',
      bg: 'rgb(255 77 79 / 0.12)',
      border: 'rgb(255 77 79 / 0.35)',
      iconColor: '#ff4d4f',
    },
  ]

  return (
    <SectionShell
      id="callout"
      title="Callout"
      description="Inline feedback banners for info, warning, success, and critical states. Always pair an icon with a short message. Use bg-opacity versions of semantic colors, never solid fills, to keep the dark theme legible."
      useCases={{
        use: ['Contextual feedback within a form or panel', 'System status notices (e.g., camera offline)', 'Action confirmations inline'],
        avoid: ['Toast notifications for transient feedback — use the Sonner toast instead', 'More than one callout per panel'],
      }}
      sampleCode={`<div
  className="flex gap-3 rounded-md border p-3"
  style={{ backgroundColor: 'rgb(250 173 20 / 0.12)', borderColor: 'rgb(250 173 20 / 0.35)' }}
>
  <AlertTriangle size={16} style={{ color: '#faad14' }} className="mt-0.5 shrink-0" />
  <div>
    <p className="text-sm font-medium text-ds-ink-display">Atención</p>
    <p className="text-sm text-ds-ink-body">Hay 3 cámaras sin señal en la Zona Sur.</p>
  </div>
</div>`}
    >
      <div className="space-y-3">
        {callouts.map(c => (
          <div
            key={c.type}
            className="flex gap-3 rounded-md border p-3"
            style={{ backgroundColor: c.bg, borderColor: c.border }}
          >
            <span style={{ color: c.iconColor }} className="mt-0.5 shrink-0">{c.icon}</span>
            <div>
              <p className="text-sm font-medium text-ds-ink-display">{c.title}</p>
              <p className="text-sm text-ds-ink-body">{c.body}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  )
}
