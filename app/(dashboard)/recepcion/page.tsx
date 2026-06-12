'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Car,
  Plus,
  LogOut,
  Building2,
  CheckCircle2,
  ScanLine,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { vehicleEntries as vehicleEntriesApi } from '@/lib/api'
import { MOCK_TENANTS, MOCK_VEHICLE_ENTRIES } from '@/lib/mock-data'
import {
  INITIAL_ANPR_PENDING_QUEUE,
  type AnprPendingDetection,
} from '@/lib/mock-anpr-detections'
import { AnprGatePanel } from '@/components/recepcion/anpr-gate-panel'
import { AnprPendingQueue } from '@/components/recepcion/anpr-pending-queue'
import type { VehicleEntry, Tenant, VehicleType, PlateSource } from '@/lib/types'
import { VEHICLE_TYPE_LABELS, PLATE_SOURCE_LABELS } from '@/lib/types'

const vehicleEntrySchema = z.object({
  plate: z.string()
    .min(5, 'La patente debe tener al menos 5 caracteres')
    .max(8, 'La patente no puede tener mas de 8 caracteres')
    .transform(val => val.toUpperCase().replace(/[\s\-]/g, '')),
  declared_driver_name: z.string()
    .min(3, 'El nombre debe tener al menos 3 caracteres'),
  declared_driver_id: z.string().optional(),
  tenant_id: z.string().min(1, 'Seleccione una empresa'),
  destination_text: z.string().optional(),
  vehicle_type: z.string().min(1, 'Seleccione el tipo de vehiculo'),
  entry_at: z.string().min(1, 'La hora de ingreso es requerida'),
  observations: z.string().optional(),
  plate_source: z.enum(['anpr', 'manual', 'hybrid']),
})

type VehicleEntryForm = z.infer<typeof vehicleEntrySchema>

const vehicleTypes: VehicleType[] = ['particular', 'camion', 'moto', 'utilitario', 'otro']

export default function RecepcionPage() {
  const [tenantOpen, setTenantOpen] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [exitDialogOpen, setExitDialogOpen] = useState(false)
  const [exitingEntry, setExitingEntry] = useState<VehicleEntry | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [entries, setEntries] = useState<VehicleEntry[]>([])

  // Carga real desde la BD (adm_ingreso); fallback a mock si el backend no responde.
  useEffect(() => {
    let cancelled = false
    vehicleEntriesApi
      .list()
      .then(res => {
        if (cancelled) return
        const items = (res as unknown as { data?: VehicleEntry[]; items?: VehicleEntry[] }).data
          ?? (res as unknown as { items?: VehicleEntry[] }).items
          ?? []
        setEntries(items)
      })
      .catch(() => {
        if (cancelled) return
        // Mock visible, nunca silencioso (D6): se informa que son datos demo.
        setEntries(MOCK_VEHICLE_ENTRIES)
        toast.warning('Sin conexión con el servidor — mostrando datos de demostración')
      })
    return () => {
      cancelled = true
    }
  }, [])
  const [pendingDetections, setPendingDetections] = useState<AnprPendingDetection[]>(
    () => INITIAL_ANPR_PENDING_QUEUE.map(d => ({ ...d }))
  )
  const [activeDetectionId, setActiveDetectionId] = useState<string | null>(null)
  const [anprReading, setAnprReading] = useState<string | null>(null)
  const [anprConfidence, setAnprConfidence] = useState<number | null>(null)
  const [needsManualReview, setNeedsManualReview] = useState(false)

  const activeEntries = entries.filter(e => !e.exit_at)
  const activeDetection = pendingDetections.find(d => d.id === activeDetectionId) ?? null

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<VehicleEntryForm>({
    resolver: zodResolver(vehicleEntrySchema),
    defaultValues: {
      entry_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      vehicle_type: '',
      tenant_id: '',
      plate_source: 'hybrid',
    },
  })

  const plateSource = watch('plate_source')

  const applyDetection = useCallback(
    (detection: AnprPendingDetection, options?: { silent?: boolean }) => {
      setActiveDetectionId(detection.id)
      setAnprReading(detection.plateDisplay)
      setAnprConfidence(detection.confidence)
      setNeedsManualReview(detection.status === 'manual_review')
      setValue('plate', detection.plateNormalized, { shouldValidate: true })
      setValue(
        'plate_source',
        detection.status === 'manual_review' ? 'hybrid' : 'anpr',
        { shouldValidate: true }
      )

      if (!options?.silent) {
        if (detection.status === 'manual_review') {
          toast.warning('Lectura ANPR con baja confianza — requiere revisión manual')
        } else {
          toast.success(`Vehículo detectado: ${detection.plateDisplay}`)
        }
      }
    },
    [setValue]
  )

  // Auto-captura simulada al abrir recepción (~2,5 s)
  useEffect(() => {
    if (pendingDetections.length === 0) return

    const timer = setTimeout(() => {
      const preferred =
        pendingDetections.find(d => d.status === 'ready') ?? pendingDetections[0]
      applyDetection(preferred, { silent: true })
      toast.info('Vehículo detectado en portón recepción', {
        description: `Patente ${preferred.plateDisplay} — confianza ${preferred.confidence}%`,
      })
    }, 2500)

    return () => clearTimeout(timer)
    // Solo al montar la página
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function simulateAnprRescan() {
    const target = activeDetection ?? pendingDetections.find(d => d.status === 'ready')
    if (!target) {
      toast.message('No hay detecciones pendientes en cola ANPR')
      return
    }
    applyDetection(target)
  }

  async function onSubmit(data: VehicleEntryForm) {
    setIsSubmitting(true)

    const tenant = MOCK_TENANTS.find(t => t.id === parseInt(data.tenant_id))
    const confidence =
      data.plate_source === 'manual'
        ? null
        : (anprConfidence ?? (data.plate_source === 'anpr' ? 94 : 91))

    const localEntry: VehicleEntry = {
      id: Date.now(),
      plate: data.plate,
      declared_driver_name: data.declared_driver_name,
      declared_driver_id: data.declared_driver_id ?? null,
      tenant_id: parseInt(data.tenant_id),
      tenant,
      destination_text: data.destination_text ?? null,
      vehicle_type: (data.vehicle_type as VehicleType) ?? 'particular',
      entry_at: new Date(data.entry_at).toISOString(),
      observations: (data.observations ?? null),
      plate_normalized: data.plate.replace(/[^A-Z0-9]/g, ''),
      exit_at: null,
      registered_by: '1',
      created_at: new Date().toISOString(),
      plate_source: data.plate_source as PlateSource,
      anpr_confidence: confidence,
    }

    // Persistencia real en la BD; si el backend no responde, registro local (demo).
    let newEntry = localEntry
    try {
      const created = await vehicleEntriesApi.create({
        plate: data.plate,
        declared_driver_name: data.declared_driver_name,
        declared_driver_id: data.declared_driver_id || undefined,
        destination_text: data.destination_text || tenant?.commercial_name || tenant?.legal_name,
        vehicle_type: data.vehicle_type,
        entry_at: new Date(data.entry_at).toISOString(),
        observations: data.observations || undefined,
        plate_source: data.plate_source,
        anpr_confidence: confidence ?? undefined,
      } as Parameters<typeof vehicleEntriesApi.create>[0])
      newEntry = { ...created, tenant: tenant ?? created.tenant }
    } catch {
      toast.warning('Backend no disponible: el ingreso quedó solo en esta sesión')
    }

    if (activeDetectionId) {
      setPendingDetections(prev => prev.filter(d => d.id !== activeDetectionId))
    }

    setEntries(prev => [newEntry, ...prev])
    toast.success('Ingreso registrado correctamente')
    reset({
      entry_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      vehicle_type: '',
      tenant_id: '',
      plate_source: 'hybrid',
    })
    setAnprReading(null)
    setAnprConfidence(null)
    setNeedsManualReview(false)
    setActiveDetectionId(null)
    setSelectedTenant(null)
    setIsSubmitting(false)
  }

  function handleExitClick(entry: VehicleEntry) {
    setExitingEntry(entry)
    setExitDialogOpen(true)
  }

  function handleConfirmExit() {
    if (!exitingEntry) return

    const exitAt = new Date().toISOString()
    setEntries(prev => prev.map(e =>
      e.id === exitingEntry.id
        ? { ...e, exit_at: exitAt }
        : e
    ))
    // UX optimista con reconciliación (D3): si el servidor rechaza, se revierte.
    const entryId = exitingEntry.id
    vehicleEntriesApi.update(entryId, { exit_at: exitAt }).catch(() => {
      setEntries(prev => prev.map(e => (e.id === entryId ? { ...e, exit_at: null } : e)))
      toast.error('No se pudo registrar la salida en el servidor. Intente nuevamente.')
    })
    toast.success('Salida registrada correctamente')
    setExitDialogOpen(false)
    setExitingEntry(null)
  }

  return (
    <div className="page-stack">
      {/* Header */}
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="page-title">Registro de Ingresos</h1>
          <p className="page-subtitle">
            Ingreso y salida de vehículos
          </p>
        </div>
        <Badge
          variant="outline"
          className="w-fit shrink-0 gap-1 px-2 py-0.5 text-[10px] sm:text-xs border-ds-accent/30 bg-ds-accent-faded text-ds-accent"
        >
          <ScanLine className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          <span className="sm:hidden">ANPR OK</span>
          <span className="hidden sm:inline">ANPR en línea</span>
        </Badge>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <Card className="soft-card-compact">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-ds-accent-faded flex items-center justify-center shrink-0">
                <Car className="h-4 w-4 sm:h-5 sm:w-5 text-ds-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-numeral tabular-nums antialiased">{activeEntries.length}</p>
                <p className="text-[11px] sm:text-sm text-ds-ink-muted truncate">En el parque</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="soft-card-compact">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-ds-accent-faded flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-ds-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-numeral tabular-nums antialiased">{entries.filter(e => e.exit_at).length}</p>
                <p className="text-[11px] sm:text-sm text-ds-ink-muted truncate">Salidas hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="soft-card-compact">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-ds-muted flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-ds-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-numeral tabular-nums antialiased">{MOCK_TENANTS.length}</p>
                <p className="text-[11px] sm:text-sm text-ds-ink-muted truncate">Empresas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="soft-card-compact">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="icon-box icon-box-warning h-9 w-9 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl shrink-0">
                <ScanLine size={16} className="sm:hidden" />
                <ScanLine size={18} className="hidden sm:block" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-numeral tabular-nums antialiased">{pendingDetections.length}</p>
                <p className="text-[11px] sm:text-sm text-ds-ink-muted truncate">Pend. ANPR</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ANPR portón + cola de detecciones */}
      <Card className="overflow-hidden soft-card-compact">
        <CardHeader className="panel-compact pb-2 sm:pb-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <ScanLine className="h-4 w-4 sm:h-5 sm:w-5 text-ds-accent shrink-0" />
                <span className="truncate">ANPR — Portón recepción</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1">
                Detección automática · validar y registrar
              </CardDescription>
            </div>
            {(plateSource === 'anpr' || plateSource === 'hybrid') && (
              <Button type="button" variant="outline" size="sm" onClick={simulateAnprRescan}>
                Re-escanear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="panel-compact pt-0 grid gap-4 sm:gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-3">
            <AnprGatePanel
              plateDisplay={anprReading}
              confidence={anprConfidence}
              manualReview={needsManualReview}
            />
            {anprReading && (
              <p className="text-sm text-ds-ink-muted">
                Lectura activa:{' '}
                <span className="text-live-data font-semibold text-ds-ink-display">{anprReading}</span>
                {anprConfidence != null && (
                  <span className="ml-2 text-xs">({anprConfidence}% confianza)</span>
                )}
              </p>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-section text-base">En espera de registro</h3>
              <Badge variant="secondary" className="text-live-data font-semibold">
                {pendingDetections.length}
              </Badge>
            </div>
            <AnprPendingQueue
              detections={pendingDetections}
              activeId={activeDetectionId}
              onSelect={detection => applyDetection(detection)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Entry Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Nuevo Ingreso
            </CardTitle>
            <CardDescription>
              Complete los campos requeridos para registrar un nuevo ingreso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Fuente del dato — ANPR / manual */}
              <div className="space-y-2">
                <Label>Fuente del registro</Label>
                <Select
                  value={plateSource}
                  onValueChange={val => {
                    setValue('plate_source', val as PlateSource)
                    if (val === 'manual') {
                      setAnprReading(null)
                      setAnprConfidence(null)
                      setNeedsManualReview(false)
                      setActiveDetectionId(null)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar fuente" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PLATE_SOURCE_LABELS) as PlateSource[]).map(source => (
                      <SelectItem key={source} value={source}>
                        {PLATE_SOURCE_LABELS[source]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {needsManualReview && (plateSource === 'anpr' || plateSource === 'hybrid') && (
                <div className="flex gap-3 rounded-xl border border-[var(--warning)]/35 bg-[var(--warning-bg)] p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold text-[var(--warning)]">Revisión manual requerida</p>
                    <p className="text-ds-ink-muted">
                      La lectura ANPR tiene baja confianza o caracteres inciertos. Confirme la patente
                      con el conductor antes de registrar.
                    </p>
                  </div>
                </div>
              )}

              {/* Patente */}
              <div className="space-y-2">
                <Label htmlFor="plate">
                  Patente <span className="text-ds-signal">*</span>
                </Label>
                <Input
                  id="plate"
                  placeholder="BCDF12"
                  className="uppercase"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  {...register('plate')}
                />
                {errors.plate && (
                  <p className="text-sm text-ds-signal">{errors.plate.message}</p>
                )}
              </div>

              {/* Conductor */}
              <div className="space-y-2">
                <Label htmlFor="declared_driver_name">
                  Conductor declarado <span className="text-ds-signal">*</span>
                </Label>
                <Input
                  id="declared_driver_name"
                  placeholder="Nombre del conductor"
                  {...register('declared_driver_name')}
                />
                {errors.declared_driver_name && (
                  <p className="text-sm text-ds-signal">{errors.declared_driver_name.message}</p>
                )}
              </div>

              {/* RUT */}
              <div className="space-y-2">
                <Label htmlFor="declared_driver_id">
                  RUT / ID del conductor
                </Label>
                <Input
                  id="declared_driver_id"
                  placeholder="12.345.678-9"
                  {...register('declared_driver_id')}
                />
              </div>

              {/* Empresa destino */}
              <div className="space-y-2">
                <Label>
                  Empresa de destino <span className="text-ds-signal">*</span>
                </Label>
                <Popover open={tenantOpen} onOpenChange={setTenantOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={tenantOpen}
                      className="w-full justify-between"
                    >
                      {selectedTenant ? selectedTenant.legal_name : 'Seleccionar empresa...'}
                      <Building2 className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar empresa..." />
                      <CommandList>
                        <CommandEmpty>No se encontraron empresas</CommandEmpty>
                        <CommandGroup>
                          {MOCK_TENANTS.filter(t => t.active).map(tenant => (
                            <CommandItem
                              key={tenant.id}
                              value={tenant.legal_name}
                              onSelect={() => {
                                setSelectedTenant(tenant)
                                setValue('tenant_id', String(tenant.id))
                                setTenantOpen(false)
                              }}
                            >
                              <div className="flex flex-col">
                                <span>{tenant.legal_name}</span>
                                <span className="text-xs text-ds-ink-muted">{tenant.rut}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.tenant_id && (
                  <p className="text-sm text-ds-signal">{errors.tenant_id.message}</p>
                )}
              </div>

              {/* Destino texto */}
              <div className="space-y-2">
                <Label htmlFor="destination_text">Destino especifico</Label>
                <Input
                  id="destination_text"
                  placeholder="Bodega 4 - Recepcion mercaderia"
                  {...register('destination_text')}
                />
              </div>

              {/* Tipo vehiculo */}
              <div className="space-y-2">
                <Label htmlFor="vehicle_type">
                  Tipo de vehiculo <span className="text-ds-signal">*</span>
                </Label>
                <Select
                  value={watch('vehicle_type')}
                  onValueChange={val => setValue('vehicle_type', val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {VEHICLE_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.vehicle_type && (
                  <p className="text-sm text-ds-signal">{errors.vehicle_type.message}</p>
                )}
              </div>

              {/* Hora ingreso */}
              <div className="space-y-2">
                <Label htmlFor="entry_at">
                  Hora de ingreso <span className="text-ds-signal">*</span>
                </Label>
                <Input
                  id="entry_at"
                  type="datetime-local"
                  {...register('entry_at')}
                />
                {errors.entry_at && (
                  <p className="text-sm text-ds-signal">{errors.entry_at.message}</p>
                )}
              </div>

              {/* Observaciones */}
              <div className="space-y-2">
                <Label htmlFor="observations">Observaciones</Label>
                <Textarea
                  id="observations"
                  placeholder="Observaciones adicionales..."
                  {...register('observations')}
                  rows={2}
                />
              </div>

              <Button type="submit" className="w-full touch-target" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Ingreso
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Today's Entries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Ingresos del Turno
            </CardTitle>
            <CardDescription>
              {activeEntries.length} vehiculo{activeEntries.length !== 1 ? 's' : ''} actualmente en el parque
            </CardDescription>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <div className="text-center py-8">
                <Car className="h-12 w-12 mx-auto text-ds-ink-muted/30 mb-4" />
                <p className="text-ds-ink-muted">No hay ingresos registrados hoy</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-1 px-1 max-h-[min(60vh,500px)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Patente</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Fuente</TableHead>
                      <TableHead className="text-xs hidden md:table-cell">Conductor</TableHead>
                      <TableHead className="text-xs hidden lg:table-cell">Empresa</TableHead>
                      <TableHead className="text-xs">Ingreso</TableHead>
                      <TableHead className="w-[72px] sm:w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map(entry => (
                      <TableRow key={entry.id} className="animate-fade-in">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">{entry.plate}</span>
                            {!entry.exit_at && (
                              <Badge variant="secondary" className="text-xs bg-ds-accent-faded text-ds-accent">
                                Activo
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {entry.plate_source ? (
                            <Badge variant="outline" className="text-[10px]">
                              {PLATE_SOURCE_LABELS[entry.plate_source]}
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-sm hidden md:table-cell">
                          {entry.declared_driver_name || '-'}
                        </TableCell>
                        <TableCell className="text-sm truncate max-w-[150px] hidden lg:table-cell">
                          {entry.tenant?.commercial_name || entry.tenant?.legal_name || '-'}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm tabular-nums">
                          {format(new Date(entry.entry_at), 'HH:mm', { locale: es })}
                        </TableCell>
                        <TableCell>
                          {!entry.exit_at ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExitClick(entry)}
                              className="h-8 px-2 sm:h-9 sm:px-3 touch-target"
                            >
                              <LogOut className="h-3.5 w-3.5 sm:mr-1" />
                              <span className="hidden sm:inline">Salida</span>
                            </Button>
                          ) : (
                            <span className="text-xs text-ds-ink-muted">
                              {format(new Date(entry.exit_at), 'HH:mm')}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Exit Confirmation Dialog */}
      <Dialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Salida</DialogTitle>
            <DialogDescription>
              Esta por registrar la salida del vehiculo
            </DialogDescription>
          </DialogHeader>
          {exitingEntry && (
            <div className="rounded-xl bg-ds-muted p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-ds-ink-muted">Patente</span>
                <span className="font-mono font-medium">{exitingEntry.plate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ds-ink-muted">Conductor</span>
                <span>{exitingEntry.declared_driver_name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ds-ink-muted">Empresa</span>
                <span>{exitingEntry.tenant?.commercial_name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ds-ink-muted">Ingreso</span>
                <span>{format(new Date(exitingEntry.entry_at), 'HH:mm', { locale: es })}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setExitDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmExit}>
              <LogOut className="h-4 w-4 mr-2" />
              Confirmar Salida
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
