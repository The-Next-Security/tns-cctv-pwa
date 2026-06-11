import React from 'react'
import { SectionShell } from '../SectionShell'
import {
  ShieldAlert, Bell, Camera, Lock, LogOut, Search, Settings,
  FolderOpen, Users, Map, BarChart2, AlertTriangle, CheckCircle,
  Eye, Pencil, Trash2, Plus, X, ChevronDown, ChevronRight,
  Menu, Moon, Sun, ArrowLeft, ArrowRight, Loader2,
} from 'lucide-react'

const ICONS = [
  { Icon: ShieldAlert, name: 'ShieldAlert', usage: 'Critical alert' },
  { Icon: Bell, name: 'Bell', usage: 'Notifications' },
  { Icon: Camera, name: 'Camera', usage: 'CCTV cameras' },
  { Icon: Lock, name: 'Lock', usage: 'Security / access' },
  { Icon: LogOut, name: 'LogOut', usage: 'Sign out' },
  { Icon: Search, name: 'Search', usage: 'Search' },
  { Icon: Settings, name: 'Settings', usage: 'Configuration' },
  { Icon: FolderOpen, name: 'FolderOpen', usage: 'Expedientes' },
  { Icon: Users, name: 'Users', usage: 'User management' },
  { Icon: Map, name: 'Map', usage: 'Zone map' },
  { Icon: BarChart2, name: 'BarChart2', usage: 'Reports' },
  { Icon: AlertTriangle, name: 'AlertTriangle', usage: 'Warning' },
  { Icon: CheckCircle, name: 'CheckCircle', usage: 'Resolved' },
  { Icon: Eye, name: 'Eye', usage: 'View detail' },
  { Icon: Pencil, name: 'Pencil', usage: 'Edit' },
  { Icon: Trash2, name: 'Trash2', usage: 'Delete' },
  { Icon: Plus, name: 'Plus', usage: 'Add' },
  { Icon: X, name: 'X', usage: 'Close / dismiss' },
  { Icon: ChevronDown, name: 'ChevronDown', usage: 'Expand' },
  { Icon: ChevronRight, name: 'ChevronRight', usage: 'Navigate forward' },
  { Icon: Menu, name: 'Menu', usage: 'Mobile nav toggle' },
  { Icon: Moon, name: 'Moon', usage: 'Dark mode' },
  { Icon: Sun, name: 'Sun', usage: 'Light mode' },
  { Icon: ArrowLeft, name: 'ArrowLeft', usage: 'Back' },
  { Icon: ArrowRight, name: 'ArrowRight', usage: 'Forward' },
  { Icon: Loader2, name: 'Loader2', usage: 'Loading spinner' },
]

export function IconographySection() {
  return (
    <SectionShell
      id="iconography"
      title="Iconography"
      description="All icons come from lucide-react. Use size={16} for inline UI icons, size={18} for nav items, size={20} for standalone icon buttons. Always include aria-label on icon-only buttons."
      useCases={{
        use: ['lucide-react for all icons — consistent style and tree-shakeable', 'aria-label on icon-only buttons', 'className for color — use text-ds-* tokens'],
        avoid: ['Mixing icon libraries (Heroicons, FontAwesome, etc.)', 'Icons without labels in navigation — add visible text on desktop', 'Icon sizes above 24 in table rows'],
      }}
      sampleCode={`import { ShieldAlert } from 'lucide-react'

{/* Inline icon — same size as text */}
<ShieldAlert size={16} className="text-ds-signal" />

{/* Icon-only button */}
<button aria-label="Cerrar alerta" className="text-ds-ink-muted hover:text-ds-ink-body">
  <X size={16} />
</button>`}
    >
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
        {ICONS.map(({ Icon, name, usage }) => (
          <div
            key={name}
            className="flex flex-col items-center gap-1.5 p-2 rounded-md hover:bg-ds-surface transition-colors cursor-default"
            title={usage}
          >
            <Icon size={20} className="text-ds-ink-body" />
            <span className="text-[10px] text-ds-ink-muted text-center leading-tight">{name}</span>
          </div>
        ))}
      </div>
    </SectionShell>
  )
}
