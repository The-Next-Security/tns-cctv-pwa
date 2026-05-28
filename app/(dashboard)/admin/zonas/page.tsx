'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Plus, Edit2, Trash2, MapPin, Camera } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { MOCK_ZONES, MOCK_CAMERAS } from '@/lib/mock-data'

type Priority = 'baja' | 'media' | 'alta' | 'critica'

interface Zona {
  id: number
  name: string
  description: string
  priority: Priority
  active: boolean
  cameras_count?: number
}

const priorities: Priority[] = ['baja', 'media', 'alta', 'critica']

const getPriorityColor = (priority: Priority) => {
  const colors: Record<Priority, string> = {
    baja: 'bg-muted text-muted-foreground border-border',
    media: 'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning)]/30',
    alta: 'bg-[var(--danger-bg)] text-[var(--crextio-terracotta)] border-[var(--crextio-terracotta)]/30',
    critica: 'bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger)]/30',
  }
  return colors[priority] || 'bg-muted text-muted-foreground'
}

const getPriorityName = (priority: Priority) => {
  const names: Record<Priority, string> = {
    baja: 'Baja',
    media: 'Media',
    alta: 'Alta',
    critica: 'Critica',
  }
  return names[priority] || priority
}

interface ZoneFormData {
  name: string
  description: string
  priority: Priority
  active: boolean
}

const defaultFormData: ZoneFormData = {
  name: '',
  description: '',
  priority: 'media',
  active: true,
}

export default function ZonasPage() {
  const [zonas, setZonas] = useState<Zona[]>(
    MOCK_ZONES.map(z => ({
      id: z.id,
      code: z.code || 'Z',
      name: z.name,
      description: z.description ?? null,
      priority: z.priority || 'media',
      active: z.active,
    })) as Zona[]
  )
  const [editSheet, setEditSheet] = useState(false)
  const [editingZone, setEditingZone] = useState<Zona | null>(null)
  const [formData, setFormData] = useState<ZoneFormData>(defaultFormData)
  const [deleteDialog, setDeleteDialog] = useState<Zona | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleNewZone() {
    setEditingZone(null)
    setFormData(defaultFormData)
    setEditSheet(true)
  }

  function handleEditZone(zone: Zona) {
    setEditingZone(zone)
    setFormData({
      name: zone.name,
      description: zone.description || '',
      priority: zone.priority,
      active: zone.active,
    })
    setEditSheet(true)
  }

  function handleSubmit() {
    if (!formData.name.trim()) {
      toast.error('El nombre es requerido')
      return
    }

    setIsSubmitting(true)
    setTimeout(() => {
      if (editingZone) {
        setZonas(prev => prev.map(z => 
          z.id === editingZone.id 
            ? { ...z, ...formData }
            : z
        ))
        toast.success('Zona actualizada')
      } else {
        const newZone: Zona = {
          id: zonas.length + 1,
          name: formData.name,
          description: formData.description,
          priority: formData.priority,
          active: formData.active,
          cameras_count: 0,
        }
        setZonas(prev => [...prev, newZone])
        toast.success('Zona creada')
      }
      setIsSubmitting(false)
      setEditSheet(false)
    }, 500)
  }

  function handleDelete() {
    if (!deleteDialog) return
    setZonas(prev => prev.filter(z => z.id !== deleteDialog.id))
    toast.success('Zona eliminada')
    setDeleteDialog(null)
  }

  const stats = {
    total: zonas.length,
    activas: zonas.filter(z => z.active).length,
    criticas: zonas.filter(z => z.priority === 'critica').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Zonas de Vigilancia</h1>
          <p className="text-muted-foreground">Define y gestiona las areas del parque</p>
        </div>
        <Button onClick={handleNewZone} className="touch-target">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Zona
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total zonas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activas}</p>
                <p className="text-sm text-muted-foreground">Activas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.criticas}</p>
                <p className="text-sm text-muted-foreground">Criticas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {zonas.map((zona) => (
          <Card key={zona.id} className={cn(
            'transition-all duration-200 hover:shadow-md',
            !zona.active && 'opacity-60'
          )}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'h-10 w-10 rounded-xl flex items-center justify-center',
                    zona.priority === 'critica' && 'bg-red-500/10',
                    zona.priority === 'alta' && 'bg-orange-500/10',
                    zona.priority === 'media' && 'bg-yellow-500/10',
                    zona.priority === 'baja' && 'bg-muted',
                  )}>
                    <MapPin className={cn(
                      'h-5 w-5',
                      zona.priority === 'critica' && 'text-red-500',
                      zona.priority === 'alta' && 'text-orange-500',
                      zona.priority === 'media' && 'text-yellow-500',
                      zona.priority === 'baja' && 'text-muted-foreground',
                    )} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{zona.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {zona.description}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Camera className="h-4 w-4" />
                  Camaras
                </span>
                <Badge variant="secondary">{zona.cameras_count || 0}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Prioridad</span>
                <Badge variant="outline" className={getPriorityColor(zona.priority)}>
                  {getPriorityName(zona.priority)}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estado</span>
                <Badge variant={zona.active ? 'default' : 'secondary'}>
                  {zona.active ? 'Activa' : 'Inactiva'}
                </Badge>
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1 touch-target"
                  onClick={() => handleEditZone(zona)}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1 text-destructive touch-target"
                  onClick={() => setDeleteDialog(zona)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit/Create Sheet */}
      <Sheet open={editSheet} onOpenChange={setEditSheet}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader className="pb-6">
            <SheetTitle className="text-xl">
              {editingZone ? 'Editar Zona' : 'Nueva Zona'}
            </SheetTitle>
            <SheetDescription>
              {editingZone
                ? 'Modifique los datos de la zona'
                : 'Complete los datos para crear una nueva zona'
              }
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 px-1">
            {/* Nombre */}
            <div className="space-y-3">
              <Label htmlFor="name" className="text-sm font-medium">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Entrada Principal"
                className="h-11"
              />
            </div>

            {/* Descripcion */}
            <div className="space-y-3">
              <Label htmlFor="description" className="text-sm font-medium">Descripcion</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Acceso vehicular y peatonal principal del parque"
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Prioridad */}
            <div className="space-y-3">
              <Label htmlFor="priority" className="text-sm font-medium">Prioridad</Label>
              <Select
                value={formData.priority}
                onValueChange={val => setFormData({ ...formData, priority: val as Priority })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map(priority => (
                    <SelectItem key={priority} value={priority} className="py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getPriorityColor(priority)}>
                          {getPriorityName(priority)}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Las zonas de mayor prioridad generan alertas mas urgentes
              </p>
            </div>

            {/* Activa */}
            <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Zona activa</Label>
                <p className="text-xs text-muted-foreground">
                  Las zonas inactivas no generan alertas
                </p>
              </div>
              <Switch
                checked={formData.active}
                onCheckedChange={val => setFormData({ ...formData, active: val })}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-6 pb-4">
              <Button
                variant="outline"
                className="flex-1 h-11"
                onClick={() => setEditSheet(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 h-11"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando...' : editingZone ? 'Actualizar' : 'Crear Zona'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Zona</DialogTitle>
            <DialogDescription>
              Esta seguro de eliminar la zona &quot;{deleteDialog?.name}&quot;? Esta accion no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
