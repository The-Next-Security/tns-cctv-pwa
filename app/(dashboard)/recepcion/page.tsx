'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Car, 
  Plus, 
  LogOut, 
  Clock,
  Building2,
  CheckCircle2
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
import { cn } from '@/lib/utils'
import { MOCK_TENANTS, MOCK_VEHICLE_ENTRIES } from '@/lib/mock-data'
import type { VehicleEntry, Tenant, VehicleType } from '@/lib/types'
import { VEHICLE_TYPE_LABELS } from '@/lib/types'

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
})

type VehicleEntryForm = z.infer<typeof vehicleEntrySchema>

const vehicleTypes: VehicleType[] = ['particular', 'camion', 'moto', 'utilitario', 'otro']

export default function RecepcionPage() {
  const [tenantOpen, setTenantOpen] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [exitDialogOpen, setExitDialogOpen] = useState(false)
  const [exitingEntry, setExitingEntry] = useState<VehicleEntry | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [entries, setEntries] = useState<VehicleEntry[]>(MOCK_VEHICLE_ENTRIES)

  const activeEntries = entries.filter(e => !e.exit_at)

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
    },
  })

  async function onSubmit(data: VehicleEntryForm) {
    setIsSubmitting(true)
    
    // Simulate API call
    setTimeout(() => {
      const newEntry: VehicleEntry = {
        id: entries.length + 1,
        plate: data.plate,
        declared_driver_name: data.declared_driver_name,
        declared_driver_id: data.declared_driver_id ?? null,
        tenant_id: parseInt(data.tenant_id),
        tenant: MOCK_TENANTS.find(t => t.id === parseInt(data.tenant_id)),
        destination_text: data.destination_text ?? null,
        vehicle_type: (data.vehicle_type as VehicleType) ?? 'particular',
        entry_at: new Date(data.entry_at).toISOString(),
        observations: (data.observations ?? null),
        plate_normalized: data.plate.replace(/[^A-Z0-9]/g, ''),
        exit_at: null,
        registered_by: '1',
        created_at: new Date().toISOString(),
      }
      
      setEntries(prev => [newEntry, ...prev])
      toast.success('Ingreso registrado correctamente')
      reset({
        entry_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        vehicle_type: '',
        tenant_id: '',
      })
      setSelectedTenant(null)
      setIsSubmitting(false)
    }, 500)
  }

  function handleExitClick(entry: VehicleEntry) {
    setExitingEntry(entry)
    setExitDialogOpen(true)
  }

  function handleConfirmExit() {
    if (!exitingEntry) return
    
    setEntries(prev => prev.map(e => 
      e.id === exitingEntry.id 
        ? { ...e, exit_at: new Date().toISOString() }
        : e
    ))
    toast.success('Salida registrada correctamente')
    setExitDialogOpen(false)
    setExitingEntry(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Registro de Ingresos</h1>
        <p className="text-muted-foreground">
          Registre el ingreso y salida de vehiculos al parque
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Car className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeEntries.length}</p>
                <p className="text-sm text-muted-foreground">En el parque</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{entries.filter(e => e.exit_at).length}</p>
                <p className="text-sm text-muted-foreground">Salidas hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{MOCK_TENANTS.length}</p>
                <p className="text-sm text-muted-foreground">Empresas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{entries.length}</p>
                <p className="text-sm text-muted-foreground">Total hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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
              {/* Patente */}
              <div className="space-y-2">
                <Label htmlFor="plate">
                  Patente <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="plate"
                  placeholder="BCDF12"
                  className="uppercase"
                  {...register('plate')}
                />
                {errors.plate && (
                  <p className="text-sm text-destructive">{errors.plate.message}</p>
                )}
              </div>

              {/* Conductor */}
              <div className="space-y-2">
                <Label htmlFor="declared_driver_name">
                  Conductor declarado <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="declared_driver_name"
                  placeholder="Nombre del conductor"
                  {...register('declared_driver_name')}
                />
                {errors.declared_driver_name && (
                  <p className="text-sm text-destructive">{errors.declared_driver_name.message}</p>
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
                  Empresa de destino <span className="text-destructive">*</span>
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
                                <span className="text-xs text-muted-foreground">{tenant.rut}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.tenant_id && (
                  <p className="text-sm text-destructive">{errors.tenant_id.message}</p>
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
                  Tipo de vehiculo <span className="text-destructive">*</span>
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
                  <p className="text-sm text-destructive">{errors.vehicle_type.message}</p>
                )}
              </div>

              {/* Hora ingreso */}
              <div className="space-y-2">
                <Label htmlFor="entry_at">
                  Hora de ingreso <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="entry_at"
                  type="datetime-local"
                  {...register('entry_at')}
                />
                {errors.entry_at && (
                  <p className="text-sm text-destructive">{errors.entry_at.message}</p>
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
                <Car className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No hay ingresos registrados hoy</p>
              </div>
            ) : (
              <div className="overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patente</TableHead>
                      <TableHead>Conductor</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Ingreso</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map(entry => (
                      <TableRow key={entry.id} className="animate-fade-in">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">{entry.plate}</span>
                            {!entry.exit_at && (
                              <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-500">
                                Activo
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {entry.declared_driver_name || '-'}
                        </TableCell>
                        <TableCell className="text-sm truncate max-w-[150px]">
                          {entry.tenant?.commercial_name || entry.tenant?.legal_name || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(entry.entry_at), 'HH:mm', { locale: es })}
                        </TableCell>
                        <TableCell>
                          {!entry.exit_at ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExitClick(entry)}
                              className="touch-target"
                            >
                              <LogOut className="h-3.5 w-3.5 mr-1" />
                              Salida
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
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
            <div className="rounded-xl bg-muted p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Patente</span>
                <span className="font-mono font-medium">{exitingEntry.plate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Conductor</span>
                <span>{exitingEntry.declared_driver_name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Empresa</span>
                <span>{exitingEntry.tenant?.commercial_name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ingreso</span>
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
