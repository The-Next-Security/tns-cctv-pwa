'use client'

import { useState } from 'react'
import { ArrowUpRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Alert, Role } from '@/lib/types'
import { ROLE_LABELS, getEventLabel } from '@/lib/types'

interface EscalateSheetProps {
  alert: Alert | null
  onClose: () => void
  onSuccess: () => void
}

// Roles que pueden recibir escalaciones
const ESCALATION_ROLES: Role[] = [
  'responsable_seguridad',
  'admin_parque',
  'supervisor',
  'soporte_tns',
]

export function EscalateSheet({ alert, onClose, onSuccess }: EscalateSheetProps) {
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([])
  const [observation, setObservation] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  function toggleRole(role: Role) {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  function handleEscalate() {
    if (!alert || selectedRoles.length === 0) return

    setIsLoading(true)
    setTimeout(() => {
      toast.success(
        `Alerta escalada a: ${selectedRoles.map(r => ROLE_LABELS[r]).join(', ')}`
      )
      setSelectedRoles([])
      setObservation('')
      onSuccess()
      onClose()
      setIsLoading(false)
    }, 300)
  }

  function handleClose() {
    setSelectedRoles([])
    setObservation('')
    onClose()
  }

  return (
    <Sheet open={!!alert} onOpenChange={handleClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Escalar Alerta</SheetTitle>
          <SheetDescription>
            Seleccione uno o más roles que recibirán esta escalación.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 px-4 pt-4">
          {/* Alert info */}
          {alert && (
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="font-medium">{getEventLabel(alert.event_code)}</p>
              <p className="text-muted-foreground">
                {alert.camera?.name} — {alert.zone?.name}
              </p>
            </div>
          )}

          {/* Role multi-select */}
          <div className="space-y-2">
            <Label>Escalar a (puede elegir más de uno)</Label>
            <div className="space-y-2">
              {ESCALATION_ROLES.map(role => {
                const selected = selectedRoles.includes(role)
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={cn(
                      'w-full flex items-center justify-between rounded-xl border px-4 py-3 text-sm text-left transition-colors',
                      selected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-secondary/40 hover:bg-secondary/70 text-foreground'
                    )}
                  >
                    <span className="font-medium">{ROLE_LABELS[role]}</span>
                    {selected && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Observation */}
          <div className="space-y-2">
            <Label htmlFor="observation">Observaciones (opcional)</Label>
            <Textarea
              id="observation"
              placeholder="Agregue contexto adicional para los responsables..."
              value={observation}
              onChange={e => setObservation(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="sticky bottom-0 -mx-4 mt-2 flex gap-2 border-t border-border/60 bg-background/95 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <Button
              variant="outline"
              className="h-11 flex-1 touch-target"
              onClick={handleClose}
            >
              Cancelar
            </Button>
            <Button
              className="h-11 flex-1 touch-target"
              onClick={handleEscalate}
              disabled={selectedRoles.length === 0 || isLoading}
            >
              <ArrowUpRight className="h-4 w-4 mr-2" />
              {isLoading ? 'Escalando...' : `Escalar${selectedRoles.length > 0 ? ` (${selectedRoles.length})` : ''}`}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
