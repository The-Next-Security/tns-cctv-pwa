'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit2, Trash2, Server } from 'lucide-react'

interface NVR {
  id: string
  nombre: string
  modelo: string
  ip: string
  puerto: number
  usuario: string
  estado: 'online' | 'offline' | 'degradado'
  camarasConectadas: number
  camarasTotal: number
  almacenamiento: number
}

const nvrs: NVR[] = [
  {
    id: '1',
    nombre: 'NVR Principal',
    modelo: 'Dahua DHI-NVR5432-4KS2',
    ip: '192.168.1.10',
    puerto: 37777,
    usuario: 'admin',
    estado: 'online',
    camarasConectadas: 24,
    camarasTotal: 24,
    almacenamiento: 78,
  },
  {
    id: '2',
    nombre: 'NVR Secundario',
    modelo: 'Dahua DHI-NVR5216-4KS2',
    ip: '192.168.1.11',
    puerto: 37777,
    usuario: 'admin',
    estado: 'online',
    camarasConectadas: 16,
    camarasTotal: 16,
    almacenamiento: 65,
  },
  {
    id: '3',
    nombre: 'NVR Backup',
    modelo: 'Dahua DHI-NVR5208-4KS2',
    ip: '192.168.1.12',
    puerto: 37777,
    usuario: 'admin',
    estado: 'degradado',
    camarasConectadas: 12,
    camarasTotal: 16,
    almacenamiento: 92,
  },
]

const getStatusColor = (estado: string) => {
  const colors: Record<string, string> = {
    online: 'bg-ds-accent-faded text-ds-accent',
    offline: 'bg-ds-signal-faded text-ds-signal',
    degradado: 'bg-ds-surface text-ds-ink-body',
  }
  return colors[estado] || 'bg-ds-surface text-ds-ink-muted'
}

const getStatusName = (estado: string) => {
  const names: Record<string, string> = {
    online: 'En línea',
    offline: 'Desconectado',
    degradado: 'Degradado',
  }
  return names[estado] || estado
}

export default function NVRsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">NVRs</h1>
          <p className="text-ds-ink-muted">Gestiona servidores de grabación (Network Video Recorders)</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo NVR
        </Button>
      </div>

      {/* NVRs Grid */}
      <div className="grid grid-cols-1 gap-4">
        {nvrs.map((nvr) => (
          <Card key={nvr.id}>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Server className="h-5 w-5 text-ds-ink-muted mt-1" />
                  <div>
                    <CardTitle>{nvr.nombre}</CardTitle>
                    <p className="text-sm text-ds-ink-muted mt-1">{nvr.modelo}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(nvr.estado)}>
                  {getStatusName(nvr.estado)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Connection Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-b pb-4">
                <div>
                  <p className="text-ds-ink-muted">IP</p>
                  <p className="font-mono">{nvr.ip}</p>
                </div>
                <div>
                  <p className="text-ds-ink-muted">Puerto</p>
                  <p className="font-mono">{nvr.puerto}</p>
                </div>
                <div>
                  <p className="text-ds-ink-muted">Usuario</p>
                  <p className="font-mono">{nvr.usuario}</p>
                </div>
                <div>
                  <p className="text-ds-ink-muted">Almacenamiento</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-ds-hairline/40 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${nvr.almacenamiento > 80 ? 'bg-ds-signal' : nvr.almacenamiento > 60 ? 'bg-ds-accent' : 'bg-ds-accent'}`}
                        style={{ width: `${nvr.almacenamiento}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium">{nvr.almacenamiento}%</span>
                  </div>
                </div>
              </div>

              {/* Cameras Status */}
              <div>
                <p className="text-sm font-medium mb-2">Cámaras Conectadas</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="h-3 bg-ds-hairline/40 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-ds-accent"
                        style={{
                          width: `${(nvr.camarasConectadas / nvr.camarasTotal) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium">
                    {nvr.camarasConectadas}/{nvr.camarasTotal}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1">
                  <Edit2 className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  Test Conexión
                </Button>
                <Button size="sm" variant="outline" className="flex-1 text-ds-signal">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
