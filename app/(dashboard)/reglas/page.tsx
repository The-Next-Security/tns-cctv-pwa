'use client'

import { useState } from 'react'
import { 
  Cog, 
  Plus, 
  Pencil,
  Trash2,
  Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { MOCK_RULES, MOCK_ZONES } from '@/lib/mock-data'
import type { Rule, Criticality } from '@/lib/types'
import { CRITICALITY_LABELS } from '@/lib/types'

const criticalityStyles: Record<Criticality, string> = {
  baja: 'bg-criticality-baja/20 text-criticality-baja border-criticality-baja/30',
  media: 'bg-criticality-media/20 text-criticality-media border-criticality-media/30',
  alta: 'bg-criticality-alta/20 text-criticality-alta border-criticality-alta/30',
  critica: 'bg-criticality-critica/20 text-criticality-critica border-criticality-critica/30',
}

const criticalities: Criticality[] = ['baja', 'media', 'alta', 'critica']

interface RuleFormData {
  name: string
  description: string
  event_code_pattern: string
  criticality: Criticality
  zone_id: number | null
  time_from: string
  time_to: string
  enabled: boolean
}

const defaultFormData: RuleFormData = {
  name: '',
  description: '',
  event_code_pattern: '*',
  criticality: 'media',
  zone_id: null,
  time_from: '00:00',
  time_to: '23:59',
  enabled: true,
}

export default function ReglasPage() {
  const [rules, setRules] = useState<Rule[]>(MOCK_RULES)
  const [editSheet, setEditSheet] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [formData, setFormData] = useState<RuleFormData>(defaultFormData)
  const [deleteDialog, setDeleteDialog] = useState<Rule | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleNewRule() {
    setEditingRule(null)
    setFormData(defaultFormData)
    setEditSheet(true)
  }

  function handleEditRule(rule: Rule) {
    setEditingRule(rule)
    setFormData({
      name: rule.name,
      description: rule.description || '',
      event_code_pattern: rule.event_code_pattern,
      criticality: rule.criticality,
      zone_id: rule.zone_id || null,
      time_from: rule.time_from || '00:00',
      time_to: rule.time_to || '23:59',
      enabled: rule.enabled,
    })
    setEditSheet(true)
  }

  function handleCloneRule(rule: Rule) {
    setEditingRule(null)
    setFormData({
      name: `${rule.name} (copia)`,
      description: rule.description || '',
      event_code_pattern: rule.event_code_pattern,
      criticality: rule.criticality,
      zone_id: rule.zone_id || null,
      time_from: rule.time_from || '00:00',
      time_to: rule.time_to || '23:59',
      enabled: false,
    })
    setEditSheet(true)
  }

  function handleToggleRule(rule: Rule) {
    setRules(prev => prev.map(r => 
      r.id === rule.id ? { ...r, enabled: !r.enabled } : r
    ))
    toast.success(rule.enabled ? 'Regla desactivada' : 'Regla activada')
  }

  function handleSubmit() {
    if (!formData.name.trim()) {
      toast.error('El nombre es requerido')
      return
    }

    setIsSubmitting(true)
    setTimeout(() => {
      if (editingRule) {
        setRules(prev => prev.map(r => 
          r.id === editingRule.id 
            ? { ...r, ...formData, zone: MOCK_ZONES.find(z => z.id === formData.zone_id) }
            : r
        ))
        toast.success('Regla actualizada')
      } else {
        const newRule: Rule = {
          id: rules.length + 1,
          ...formData,
          zone: MOCK_ZONES.find(z => z.id === formData.zone_id),
          tenant_id: 1,
        }
        setRules(prev => [...prev, newRule])
        toast.success('Regla creada')
      }
      setIsSubmitting(false)
      setEditSheet(false)
    }, 500)
  }

  function handleDelete() {
    if (!deleteDialog) return
    setRules(prev => prev.filter(r => r.id !== deleteDialog.id))
    toast.success('Regla eliminada')
    setDeleteDialog(null)
  }

  const enabledRules = rules.filter(r => r.enabled)
  const disabledRules = rules.filter(r => !r.enabled)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reglas Operativas</h1>
          <p className="text-muted-foreground">
            Configure las reglas que determinan criticidad y comportamiento de alertas
          </p>
        </div>
        <Button onClick={handleNewRule} className="touch-target">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Regla
        </Button>
      </div>

      {/* Rules Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Cog className="h-5 w-5" />
            Reglas Configuradas
          </CardTitle>
          <CardDescription>
            {enabledRules.length} regla{enabledRules.length !== 1 ? 's' : ''} activa{enabledRules.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-12">
              <Cog className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium">Sin reglas configuradas</p>
              <p className="text-muted-foreground mb-4">
                Cree una regla para comenzar a clasificar alertas
              </p>
              <Button onClick={handleNewRule}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Regla
              </Button>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Estado</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Patron</TableHead>
                    <TableHead>Criticidad</TableHead>
                    <TableHead>Zona</TableHead>
                    <TableHead>Horario</TableHead>
                    <TableHead className="w-[120px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...enabledRules, ...disabledRules].map(rule => (
                    <TableRow key={rule.id} className={cn(!rule.enabled && 'opacity-60')}>
                      <TableCell>
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={() => handleToggleRule(rule)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{rule.name}</p>
                          {rule.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {rule.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {rule.event_code_pattern}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(criticalityStyles[rule.criticality])}>
                          {CRITICALITY_LABELS[rule.criticality]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {rule.zone?.name || 'Todas'}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {rule.time_from || '00:00'} - {rule.time_to || '23:59'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditRule(rule)}
                            className="touch-target"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCloneRule(rule)}
                            className="touch-target"
                          >
                            <Copy className="h-4 w-4" />
                            <span className="sr-only">Clonar</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteDialog(rule)}
                            className="touch-target"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Eliminar</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Sheet - IMPROVED SPACING */}
      <Sheet open={editSheet} onOpenChange={setEditSheet}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader className="pb-6">
            <SheetTitle className="text-xl">
              {editingRule ? 'Editar Regla' : 'Nueva Regla'}
            </SheetTitle>
            <SheetDescription>
              {editingRule
                ? 'Modifique los parametros de la regla'
                : 'Configure una nueva regla de clasificacion'
              }
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 px-1">
            {/* Name */}
            <div className="space-y-3">
              <Label htmlFor="name" className="text-sm font-medium">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Intrusion nocturna zona perimetral"
                className="h-11"
              />
            </div>

            {/* Description */}
            <div className="space-y-3">
              <Label htmlFor="description" className="text-sm font-medium">Descripcion</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detecta movimientos en la zona perimetral durante horario nocturno"
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Event pattern */}
            <div className="space-y-3">
              <Label htmlFor="pattern" className="text-sm font-medium">
                Patron de evento <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pattern"
                value={formData.event_code_pattern}
                onChange={e => setFormData({ ...formData, event_code_pattern: e.target.value })}
                placeholder="INTRUSION_*"
                className="font-mono h-11"
              />
              <p className="text-xs text-muted-foreground">
                Use * como comodin. Ej: INTRUSION_*, VELOCIDAD_*, *
              </p>
            </div>

            {/* Criticality */}
            <div className="space-y-3">
              <Label htmlFor="criticality" className="text-sm font-medium">Criticidad</Label>
              <Select
                value={formData.criticality}
                onValueChange={val => setFormData({ ...formData, criticality: val as Criticality })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {criticalities.map(crit => (
                    <SelectItem key={crit} value={crit} className="py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn(criticalityStyles[crit])}>
                          {CRITICALITY_LABELS[crit]}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Zone */}
            <div className="space-y-3">
              <Label htmlFor="zone" className="text-sm font-medium">Zona (opcional)</Label>
              <Select
                value={formData.zone_id ? String(formData.zone_id) : 'all'}
                onValueChange={val => setFormData({
                  ...formData,
                  zone_id: val === 'all' ? null : parseInt(val)
                })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Todas las zonas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="py-3">Todas las zonas</SelectItem>
                  {MOCK_ZONES.map(zone => (
                    <SelectItem key={zone.id} value={String(zone.id)} className="py-3">
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time range */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Rango horario</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="time_from" className="text-xs text-muted-foreground">Desde</Label>
                  <Input
                    id="time_from"
                    type="time"
                    value={formData.time_from}
                    onChange={e => setFormData({ ...formData, time_from: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time_to" className="text-xs text-muted-foreground">Hasta</Label>
                  <Input
                    id="time_to"
                    type="time"
                    value={formData.time_to}
                    onChange={e => setFormData({ ...formData, time_to: e.target.value })}
                    className="h-11"
                  />
                </div>
              </div>
            </div>

            {/* Enabled */}
            <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Regla activa</Label>
                <p className="text-xs text-muted-foreground">
                  Las reglas inactivas no se aplican a nuevas alertas
                </p>
              </div>
              <Switch
                checked={formData.enabled}
                onCheckedChange={val => setFormData({ ...formData, enabled: val })}
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
                {isSubmitting ? 'Guardando...' : editingRule ? 'Actualizar' : 'Crear Regla'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Regla</DialogTitle>
            <DialogDescription>
              Esta seguro de eliminar la regla &quot;{deleteDialog?.name}&quot;? Esta accion no se puede deshacer.
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
