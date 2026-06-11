'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit2, Trash2, Video } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
import { MOCK_CAMERAS, MOCK_ZONES } from '@/lib/mock-data'
import type { Camera, Zone } from '@/lib/types'

type CameraHealth = 'online' | 'offline' | 'degraded'

interface CamaraAdmin extends Camera {
  model: string
  resolution: string
  fps: number
  health_status: CameraHealth
}

interface CameraFormData {
  name: string
  zone_id: string
  ip: string
  resolution: string
  fps: string
  model: string
}

const RESOLUTION_OPTIONS = ['1080p', '2MP', '4MP', '5MP', '8MP'] as const
const FPS_OPTIONS = [15, 20, 25, 30] as const

const DEFAULT_MODEL = 'Dahua IPC-HFW2431T-ZS'

function buildInitialCameras(): CamaraAdmin[] {
  return MOCK_CAMERAS.map((cam, index) => ({
    ...cam,
    zone_id: cam.zone_id ?? null,
    ip: cam.ip ?? '',
    model: cam.model ?? DEFAULT_MODEL,
    resolution: cam.resolution ?? '4MP',
    fps: cam.fps ?? (index % 4 === 3 ? 15 : 25),
    health_status: (cam.health_status ?? (index % 5 === 3 ? 'degraded' : 'online')) as CameraHealth,
    active: cam.active ?? true,
  }))
}

function getZoneName(zoneId: number | null | undefined, zones: Zone[]): string {
  if (zoneId == null) return 'Sin zona'
  return zones.find(z => z.id === zoneId)?.name ?? 'Zona desconocida'
}

function isValidIpv4(ip: string): boolean {
  const parts = ip.trim().split('.')
  if (parts.length !== 4) return false
  return parts.every(part => {
    const n = Number(part)
    return /^\d{1,3}$/.test(part) && n >= 0 && n <= 255
  })
}

const getStatusColor = (estado: CameraHealth) => {
  const colors: Record<CameraHealth, string> = {
    online: 'bg-[var(--status-connected-bg)] text-[var(--status-connected)] border-[var(--status-connected)]/30',
    offline: 'bg-[var(--status-disconnected-bg)] text-[var(--status-disconnected)] border-[var(--status-disconnected)]/30',
    degraded: 'bg-[var(--alert-warning-bg)] text-[var(--alert-warning)] border-[var(--alert-warning)]/30',
  }
  return colors[estado]
}

const getStatusName = (estado: CameraHealth) => {
  const names: Record<CameraHealth, string> = {
    online: 'En línea',
    offline: 'Desconectada',
    degraded: 'Degradada',
  }
  return names[estado]
}

const defaultFormData: CameraFormData = {
  name: '',
  zone_id: '',
  ip: '',
  resolution: '4MP',
  fps: '25',
  model: DEFAULT_MODEL,
}

export default function CamarasPage() {
  const [zonas] = useState<Zone[]>(MOCK_ZONES.filter(z => z.active))
  const [camaras, setCamaras] = useState<CamaraAdmin[]>(buildInitialCameras)
  const [searchTerm, setSearchTerm] = useState('')
  const [editSheet, setEditSheet] = useState(false)
  const [editingCamera, setEditingCamera] = useState<CamaraAdmin | null>(null)
  const [formData, setFormData] = useState<CameraFormData>(defaultFormData)
  const [deleteDialog, setDeleteDialog] = useState<CamaraAdmin | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filteredCamaras = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return camaras.filter(c => {
      const zoneName = getZoneName(c.zone_id, zonas).toLowerCase()
      return (
        c.name.toLowerCase().includes(term) ||
        zoneName.includes(term) ||
        (c.ip ?? '').includes(searchTerm)
      )
    })
  }, [camaras, searchTerm, zonas])

  function handleEditCamera(camara: CamaraAdmin) {
    setEditingCamera(camara)
    setFormData({
      name: camara.name,
      zone_id: camara.zone_id != null ? String(camara.zone_id) : '',
      ip: camara.ip ?? '',
      resolution: camara.resolution,
      fps: String(camara.fps),
      model: camara.model,
    })
    setEditSheet(true)
  }

  function handleSubmit() {
    if (!editingCamera) return

    if (!formData.zone_id) {
      toast.error('Seleccione una zona para la cámara')
      return
    }

    if (!formData.ip.trim()) {
      toast.error('Ingrese la dirección IP de la cámara')
      return
    }

    if (!isValidIpv4(formData.ip.trim())) {
      toast.error('La dirección IP no es válida')
      return
    }

    const fps = Number(formData.fps)
    if (!Number.isFinite(fps) || fps < 1 || fps > 60) {
      toast.error('Los FPS deben estar entre 1 y 60')
      return
    }

    if (!formData.resolution.trim()) {
      toast.error('Seleccione la resolución')
      return
    }

    setIsSubmitting(true)

    const zoneId = Number(formData.zone_id)

    setCamaras(prev =>
      prev.map(c =>
        c.id === editingCamera.id
          ? {
              ...c,
              zone_id: zoneId,
              ip: formData.ip.trim(),
              resolution: formData.resolution,
              fps,
              model: formData.model.trim() || DEFAULT_MODEL,
            }
          : c
      )
    )

    toast.success(`Cámara ${editingCamera.name} actualizada`)
    setIsSubmitting(false)
    setEditSheet(false)
    setEditingCamera(null)
  }

  function handleDelete() {
    if (!deleteDialog) return
    setCamaras(prev => prev.filter(c => c.id !== deleteDialog.id))
    toast.success(`Cámara ${deleteDialog.name} eliminada`)
    setDeleteDialog(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cámaras</h1>
          <p className="text-ds-ink-muted">Gestiona cámaras Dahua y sus parámetros</p>
        </div>
        <Button className="gap-2 touch-target" disabled title="Próximamente">
          <Plus className="h-4 w-4" />
          Nueva Cámara
        </Button>
      </div>

      <Input
        placeholder="Buscar por nombre, zona o IP..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="h-11"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCamaras.map(camara => (
          <Card key={camara.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <Video className="h-5 w-5 text-ds-ink-muted mt-1 shrink-0" />
                  <div className="min-w-0">
                    <CardTitle className="text-lg truncate">{camara.name}</CardTitle>
                    <p className="text-xs text-ds-ink-muted mt-1 truncate">{camara.model}</p>
                  </div>
                </div>
                <Badge variant="outline" className={cn('shrink-0', getStatusColor(camara.health_status))}>
                  {getStatusName(camara.health_status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-ds-ink-muted">Zona</p>
                  <p className="font-medium">{getZoneName(camara.zone_id, zonas)}</p>
                </div>
                <div>
                  <p className="text-ds-ink-muted">IP</p>
                  <p className="font-mono text-xs tabular-nums antialiased">{camara.ip}</p>
                </div>
                <div>
                  <p className="text-ds-ink-muted">Resolución</p>
                  <p className="font-medium">{camara.resolution}</p>
                </div>
                <div>
                  <p className="text-ds-ink-muted">FPS</p>
                  <p className="font-medium tabular-nums">{camara.fps}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 touch-target"
                  onClick={() => handleEditCamera(camara)}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-ds-signal touch-target"
                  onClick={() => setDeleteDialog(camara)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCamaras.length === 0 && (
        <div className="text-center py-12 text-ds-ink-muted">
          No se encontraron cámaras con ese criterio de búsqueda.
        </div>
      )}

      <Sheet open={editSheet} onOpenChange={setEditSheet}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader className="pb-6">
            <SheetTitle className="text-xl">Editar Cámara</SheetTitle>
            <SheetDescription>
              Asigne la zona, IP, resolución y FPS de {editingCamera?.name}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 px-1">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Nombre</Label>
              <Input value={formData.name} disabled className="h-11 bg-ds-muted/50" />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Modelo</Label>
              <Input
                value={formData.model}
                onChange={e => setFormData({ ...formData, model: e.target.value })}
                placeholder={DEFAULT_MODEL}
                className="h-11"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="zone_id" className="text-sm font-medium">
                Zona <span className="text-ds-signal">*</span>
              </Label>
              <Select
                value={formData.zone_id}
                onValueChange={val => setFormData({ ...formData, zone_id: val })}
              >
                <SelectTrigger id="zone_id" className="h-11">
                  <SelectValue placeholder="Seleccione una zona" />
                </SelectTrigger>
                <SelectContent>
                  {zonas.map(zona => (
                    <SelectItem key={zona.id} value={String(zona.id)} className="py-3">
                      {zona.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-ds-ink-muted">
                Zonas configuradas en Administración → Zonas
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="ip" className="text-sm font-medium">
                Dirección IP <span className="text-ds-signal">*</span>
              </Label>
              <Input
                id="ip"
                value={formData.ip}
                onChange={e => setFormData({ ...formData, ip: e.target.value })}
                placeholder="192.168.1.101"
                className="h-11 font-mono tabular-nums"
                inputMode="decimal"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label htmlFor="resolution" className="text-sm font-medium">
                  Resolución <span className="text-ds-signal">*</span>
                </Label>
                <Select
                  value={formData.resolution}
                  onValueChange={val => setFormData({ ...formData, resolution: val })}
                >
                  <SelectTrigger id="resolution" className="h-11">
                    <SelectValue placeholder="Seleccione resolución" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOLUTION_OPTIONS.map(res => (
                      <SelectItem key={res} value={res}>
                        {res}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="fps" className="text-sm font-medium">
                  FPS <span className="text-ds-signal">*</span>
                </Label>
                <Select
                  value={formData.fps}
                  onValueChange={val => setFormData({ ...formData, fps: val })}
                >
                  <SelectTrigger id="fps" className="h-11">
                    <SelectValue placeholder="Seleccione FPS" />
                  </SelectTrigger>
                  <SelectContent>
                    {FPS_OPTIONS.map(fps => (
                      <SelectItem key={fps} value={String(fps)}>
                        {fps} fps
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 h-11"
                onClick={() => setEditSheet(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button className="flex-1 h-11" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!deleteDialog} onOpenChange={open => !open && setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar cámara</DialogTitle>
            <DialogDescription>
              ¿Confirma que desea eliminar {deleteDialog?.name}? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
