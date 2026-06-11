'use client'

import { useState } from 'react'
import {
  Cog,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Radar,
  Info,
  Check,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { MOCK_RULES, MOCK_ZONES } from '@/lib/mock-data'
import type { Rule, Criticality, EventCategory } from '@/lib/types'
import {
  CRITICALITY_LABELS,
  EVENT_CODES_BY_CATEGORY,
  EVENT_CATEGORY_LABELS,
  getEventLabel,
  requiresDedicatedHardware,
} from '@/lib/types'

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
  event_codes: string[]
  criticality: Criticality
  zone_id: number | null
  time_from: string
  time_to: string
  priority_popup: boolean
  notify_admin: boolean
  notify_tenant: boolean
  record_evidence: boolean
  enabled: boolean
}

const defaultFormData: RuleFormData = {
  name: '',
  description: '',
  event_codes: [],
  criticality: 'media',
  zone_id: null,
  time_from: '00:00',
  time_to: '23:59',
  priority_popup: true,
  notify_admin: false,
  notify_tenant: false,
  record_evidence: false,
  enabled: true,
}

const eventCategories: EventCategory[] = ['perimetro', 'trafico', 'salud']

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

  function ruleToFormData(rule: Rule): RuleFormData {
    return {
      name: rule.name,
      description: rule.description || '',
      event_codes: rule.event_codes ?? (rule.event_code_pattern ? [rule.event_code_pattern] : []),
      criticality: rule.criticality,
      zone_id: rule.zone_id || null,
      time_from: rule.time_from || '00:00',
      time_to: rule.time_to || '23:59',
      priority_popup: rule.priority_popup ?? false,
      notify_admin: rule.notify_admin ?? false,
      notify_tenant: rule.notify_tenant ?? false,
      record_evidence: rule.record_evidence ?? false,
      enabled: rule.enabled,
    }
  }

  function handleEditRule(rule: Rule) {
    setEditingRule(rule)
    setFormData(ruleToFormData(rule))
    setEditSheet(true)
  }

  function handleCloneRule(rule: Rule) {
    setEditingRule(null)
    setFormData({
      ...ruleToFormData(rule),
      name: `${rule.name} (copia)`,
      enabled: false,
    })
    setEditSheet(true)
  }

  function toggleEventCode(code: string) {
    setFormData(prev => ({
      ...prev,
      event_codes: prev.event_codes.includes(code)
        ? prev.event_codes.filter(c => c !== code)
        : [...prev.event_codes, code],
    }))
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
    if (formData.event_codes.length === 0) {
      toast.error('Seleccione al menos un evento')
      return
    }

    const rulePayload = {
      ...formData,
      // event_code_pattern se mantiene por compatibilidad (primer codigo)
      event_code_pattern: formData.event_codes[0],
      zone: MOCK_ZONES.find(z => z.id === formData.zone_id),
    }

    setIsSubmitting(true)
    setTimeout(() => {
      if (editingRule) {
        setRules(prev => prev.map(r =>
          r.id === editingRule.id ? { ...r, ...rulePayload } : r
        ))
        toast.success('Regla actualizada')
      } else {
        const newRule: Rule = {
          id: rules.length + 1,
          ...rulePayload,
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
                    <TableHead>Eventos</TableHead>
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
                        <div className="flex max-w-[260px] flex-col gap-1.5">
                          <div className="flex flex-wrap gap-1">
                            {(rule.event_codes ?? [rule.event_code_pattern]).map(code => (
                              <Badge key={code} variant="secondary" className="text-[11px] font-normal">
                                {getEventLabel(code)}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            {requiresDedicatedHardware(rule.event_codes) && (
                              <span className="inline-flex items-center gap-1 rounded bg-[var(--warning-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--warning)]">
                                <Radar className="h-3 w-3" /> ITC/LPR
                              </span>
                            )}
                            {rule.priority_popup && <span className="text-[10px] text-muted-foreground">Popup</span>}
                            {rule.notify_admin && <span className="text-[10px] text-muted-foreground">· Admin</span>}
                            {rule.notify_tenant && <span className="text-[10px] text-muted-foreground">· Correo</span>}
                            {rule.record_evidence && <span className="text-[10px] text-muted-foreground">· Evidencia</span>}
                          </div>
                        </div>
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

      {/* Edit/Create Sheet - layout amplio para desktop */}
      <Sheet open={editSheet} onOpenChange={setEditSheet}>
        <SheetContent className="w-full overflow-y-auto sm:!w-[min(94vw,60rem)] sm:!max-w-none">
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

          <div className="space-y-8 px-1">
            {/* Identidad: Nombre + Criticidad en 2 columnas */}
            <div className="grid gap-x-8 gap-y-6 lg:grid-cols-3">
              <div className="space-y-3 lg:col-span-2">
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
              <div className="space-y-3">
                <Label htmlFor="criticality" className="text-sm font-medium">Criticidad</Label>
                <Select
                  value={formData.criticality}
                  onValueChange={val => setFormData({ ...formData, criticality: val as Criticality })}
                >
                  <SelectTrigger className="h-11 w-full">
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
              <div className="space-y-3 lg:col-span-3">
                <Label htmlFor="description" className="text-sm font-medium">Descripcion</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detecta movimientos en la zona perimetral durante horario nocturno"
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>

            {/* Event codes (catalogo Dahua) */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Eventos Dahua <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Seleccione uno o mas eventos del catalogo soportado por la API Dahua.
                Use la <Info className="inline h-3 w-3 align-[-1px]" /> para ver que hace cada uno.
              </p>
              <div className="grid gap-x-8 gap-y-5 md:grid-cols-3">
                {eventCategories.map(category => (
                  <div key={category} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {EVENT_CATEGORY_LABELS[category]}
                    </p>
                    <div className="flex flex-col gap-2">
                      {EVENT_CODES_BY_CATEGORY[category].map(event => {
                        const selected = formData.event_codes.includes(event.value)
                        return (
                          <div
                            key={event.value}
                            className={cn(
                              'flex items-center gap-1 rounded-lg border transition-colors',
                              selected
                                ? 'border-primary bg-primary/10'
                                : 'border-border bg-card hover:bg-muted'
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => toggleEventCode(event.value)}
                              className="flex flex-1 items-center gap-1.5 px-2.5 py-2 text-left text-xs"
                            >
                              <span
                                className={cn(
                                  'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                                  selected
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border'
                                )}
                              >
                                {selected && <Check className="h-3 w-3" />}
                              </span>
                              {event.requiresDedicatedHardware && (
                                <Radar className="h-3 w-3 shrink-0 text-[var(--warning)]" />
                              )}
                              <span className="leading-tight">{event.label}</span>
                            </button>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  aria-label={`Que es ${event.label}`}
                                  className="mr-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                                >
                                  <Info className="h-3.5 w-3.5" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent side="top" align="end" className="w-72 text-xs leading-relaxed">
                                <p className="mb-1 font-semibold">{event.label}</p>
                                <p className="text-muted-foreground">{event.description}</p>
                                {event.requiresDedicatedHardware && (
                                  <p className="mt-2 flex items-start gap-1.5 text-[var(--warning)]">
                                    <Radar className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    Requiere camara dedicada ITC/LPR/ANPR.
                                  </p>
                                )}
                                <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                                  {event.value}
                                </p>
                              </PopoverContent>
                            </Popover>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {requiresDedicatedHardware(formData.event_codes) && (
                <div className="flex items-start gap-2 rounded-lg bg-[var(--warning-bg)] p-3 text-xs text-[var(--warning)]">
                  <Radar className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Esta regla incluye eventos de trafico que requieren una camara dedicada
                    ITC/LPR/ANPR (no se obtienen de camaras estandar). Ej: control de velocidad en
                    Camino El Olivo.
                  </span>
                </div>
              )}
            </div>

            {/* Alcance: Zona + Rango horario */}
            <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
              <div className="space-y-3">
                <Label htmlFor="zone" className="text-sm font-medium">Zona (opcional)</Label>
                <Select
                  value={formData.zone_id ? String(formData.zone_id) : 'all'}
                  onValueChange={val => setFormData({
                    ...formData,
                    zone_id: val === 'all' ? null : parseInt(val)
                  })}
                >
                  <SelectTrigger className="h-11 w-full">
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
            </div>

            {/* Acciones — 2 columnas */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Acciones al activarse</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  { key: 'priority_popup', title: 'Popup al vigilante', desc: 'Muestra la camara automaticamente en el puesto de guardia' },
                  { key: 'notify_admin', title: 'Notificar administracion', desc: 'Envia alerta a responsables de seguridad / administracion' },
                  { key: 'notify_tenant', title: 'Correo al arrendatario', desc: 'Notifica por correo a la empresa de destino (requiere patente)' },
                  { key: 'record_evidence', title: 'Guardar evidencia', desc: 'Asocia snapshot / clip al evento para historial' },
                ] as const).map(action => (
                  <div key={action.key} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">{action.title}</Label>
                      <p className="text-xs text-muted-foreground">{action.desc}</p>
                    </div>
                    <Switch
                      checked={formData[action.key]}
                      onCheckedChange={val => setFormData({ ...formData, [action.key]: val })}
                    />
                  </div>
                ))}
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

            {/* Form actions */}
            <div className="flex justify-end gap-3 pt-2 pb-4">
              <Button
                variant="outline"
                className="h-11 sm:w-40"
                onClick={() => setEditSheet(false)}
              >
                Cancelar
              </Button>
              <Button
                className="h-11 sm:w-48"
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
