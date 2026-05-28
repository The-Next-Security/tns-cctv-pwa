'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, XCircle, Zap, Clock, Database, Wifi } from 'lucide-react'
import { useUser } from '@/lib/auth'
import { RoleGate } from '@/components/role-gate'

interface NVRStatus {
  id: string
  nombre: string
  ip: string
  estado: 'online' | 'offline' | 'degradado'
  conectadas: number
  totalCamaras: number
  ultimaConexion: string
  cpu: number
  memoria: number
  almacenamiento: number
}

const nvrData: NVRStatus[] = [
  {
    id: '1',
    nombre: 'NVR Principal',
    ip: '192.168.1.10',
    estado: 'online',
    conectadas: 24,
    totalCamaras: 24,
    ultimaConexion: 'Hace 2 segundos',
    cpu: 35,
    memoria: 62,
    almacenamiento: 78,
  },
  {
    id: '2',
    nombre: 'NVR Secundario',
    ip: '192.168.1.11',
    estado: 'online',
    conectadas: 16,
    totalCamaras: 16,
    ultimaConexion: 'Hace 1 segundo',
    cpu: 28,
    memoria: 45,
    almacenamiento: 65,
  },
  {
    id: '3',
    nombre: 'NVR Backup',
    ip: '192.168.1.12',
    estado: 'degradado',
    conectadas: 12,
    totalCamaras: 16,
    ultimaConexion: 'Hace 45 segundos',
    cpu: 72,
    memoria: 88,
    almacenamiento: 92,
  },
]

interface ColaStatus {
  nombre: string
  pendientes: number
  procesadas: string
  latencia: string
}

const colasData: ColaStatus[] = [
  { nombre: 'Alertas', pendientes: 3, procesadas: '2.4K', latencia: '45ms' },
  { nombre: 'Eventos', pendientes: 8, procesadas: '5.1K', latencia: '78ms' },
  { nombre: 'Reportes', pendientes: 1, procesadas: '325', latencia: '234ms' },
]

export default function SaludPage() {
  const user = useUser()

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'online':
        return 'bg-green-100 text-green-800'
      case 'offline':
        return 'bg-red-100 text-red-800'
      case 'degradado':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case 'online':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'offline':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'degradado':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-600" />
    }
  }

  const getMetricColor = (value: number) => {
    if (value < 60) return 'text-green-600'
    if (value < 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Salud Técnica</h1>
          <p className="text-muted-foreground">Estado de NVRs, colas y conexiones</p>
        </div>
        <RoleGate roles={['admin_parque', 'tecnico']}>
          <Button>Diagnosticar Sistema</Button>
        </RoleGate>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              Conexiones Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">52</div>
            <p className="text-xs text-green-600 mt-2">Todas normales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Disponibilidad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">99.8%</div>
            <p className="text-xs text-muted-foreground mt-2">Últimos 30 días</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Alertas Técnicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">1</div>
            <p className="text-xs text-yellow-600 mt-2">1 advertencia moderada</p>
          </CardContent>
        </Card>
      </div>

      {/* NVRs Status */}
      <Card>
        <CardHeader>
          <CardTitle>Estado de NVRs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {nvrData.map((nvr) => (
            <div key={nvr.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(nvr.estado)}
                  <div>
                    <h3 className="font-semibold">{nvr.nombre}</h3>
                    <p className="text-sm text-muted-foreground">{nvr.ip}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(nvr.estado)}>
                  {nvr.estado === 'online' ? 'En Línea' : nvr.estado === 'offline' ? 'Desconectado' : 'Degradado'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Cámaras</p>
                  <p className="font-semibold">
                    {nvr.conectadas}/{nvr.totalCamaras}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Última Conexión</p>
                  <p className="font-semibold">{nvr.ultimaConexion}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">CPU</p>
                  <p className={`font-semibold ${getMetricColor(nvr.cpu)}`}>{nvr.cpu}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Memoria</p>
                  <p className={`font-semibold ${getMetricColor(nvr.memoria)}`}>{nvr.memoria}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Almacenamiento</p>
                  <p className={`font-semibold ${getMetricColor(nvr.almacenamiento)}`}>{nvr.almacenamiento}%</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16">CPU</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${nvr.cpu > 80 ? 'bg-red-500' : nvr.cpu > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${nvr.cpu}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16">Memoria</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${nvr.memoria > 80 ? 'bg-red-500' : nvr.memoria > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${nvr.memoria}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16">Almac.</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${nvr.almacenamiento > 80 ? 'bg-red-500' : nvr.almacenamiento > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${nvr.almacenamiento}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Message Queues */}
      <Card>
        <CardHeader>
          <CardTitle>Colas de Procesamiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {colasData.map((cola) => (
              <div key={cola.nombre} className="border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{cola.nombre}</h3>
                  <p className="text-sm text-muted-foreground">
                    Procesadas: {cola.procesadas} | Latencia: {cola.latencia}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={cola.pendientes > 5 ? 'destructive' : 'default'}>
                    {cola.pendientes} pendientes
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* WebSocket Connections */}
      <Card>
        <CardHeader>
          <CardTitle>Conexiones WebSocket</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Clientes Conectados</p>
              <p className="text-2xl font-bold">42</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Ancho Banda</p>
              <p className="text-2xl font-bold">12.3 Mbps</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Eventos/seg</p>
              <p className="text-2xl font-bold">284</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Latencia Promedio</p>
              <p className="text-2xl font-bold">62ms</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
