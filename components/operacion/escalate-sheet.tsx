'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { ArrowUpRight } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { alerts as alertsApi, users as usersApi } from '@/lib/api'
import type { Alert, User } from '@/lib/types'
import { ROLE_LABELS } from '@/lib/types'

interface EscalateSheetProps {
  alert: Alert | null
  onClose: () => void
  onSuccess: () => void
}

export function EscalateSheet({ alert, onClose, onSuccess }: EscalateSheetProps) {
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [observation, setObservation] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Fetch users that can receive escalations
  const { data: users } = useSWR<User[]>(
    alert ? 'users-escalation' : null,
    () => usersApi.list()
  )

  // Filter users that can receive escalations (responsable_seguridad, admin_parque)
  const escalationUsers = users?.filter(u => 
    u.active && ['responsable_seguridad', 'admin_parque'].includes(u.role)
  ) || []

  async function handleEscalate() {
    if (!alert || !selectedUser) return

    setIsLoading(true)
    try {
      await alertsApi.attend(alert.id, {
        action: 'escalada',
        escalated_to: parseInt(selectedUser),
        observation: observation || undefined,
      })
      toast.success('Alerta escalada correctamente')
      setSelectedUser('')
      setObservation('')
      onSuccess()
      onClose()
    } catch (error) {
      toast.error('Error al escalar la alerta')
    } finally {
      setIsLoading(false)
    }
  }

  function handleClose() {
    setSelectedUser('')
    setObservation('')
    onClose()
  }

  return (
    <Sheet open={!!alert} onOpenChange={handleClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Escalar Alerta</SheetTitle>
          <SheetDescription>
            Seleccione a quien escalar esta alerta y agregue observaciones si es necesario.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 pt-6">
          {/* Alert info */}
          {alert && (
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="font-medium">{alert.event_code || 'Evento de seguridad'}</p>
              <p className="text-muted-foreground">
                {alert.camera?.name} - {alert.zone?.name}
              </p>
            </div>
          )}

          {/* User selector */}
          <div className="space-y-2">
            <Label htmlFor="escalate-to">Escalar a</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger id="escalate-to">
                <SelectValue placeholder="Seleccionar responsable" />
              </SelectTrigger>
              <SelectContent>
                {escalationUsers.map(user => (
                  <SelectItem key={user.id} value={String(user.id)}>
                    <div className="flex flex-col">
                      <span>{user.full_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {ROLE_LABELS[user.role]}
                      </span>
                    </div>
                  </SelectItem>
                ))}
                {escalationUsers.length === 0 && (
                  <SelectItem value="" disabled>
                    No hay usuarios disponibles
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Observation */}
          <div className="space-y-2">
            <Label htmlFor="observation">Observaciones (opcional)</Label>
            <Textarea
              id="observation"
              placeholder="Agregue contexto adicional para el responsable..."
              value={observation}
              onChange={e => setObservation(e.target.value)}
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleEscalate}
              disabled={!selectedUser || isLoading}
            >
              <ArrowUpRight className="h-4 w-4 mr-2" />
              {isLoading ? 'Escalando...' : 'Escalar'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
