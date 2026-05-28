'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit2, Trash2, Video } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface Camara {
  id: string
  nombre: string
  modelo: string
  zona: string
  ip: string
  estado: 'online' | 'offline' | 'degradado'
  resolucion: string
  fps: number
}

const camaras: Camara[] = [
  {
    id: '1',
    nombre: 'Entrada Principal 1',
    modelo: 'Dahua IPC-HFW2431T-ZS',
    zona: 'Entrada Principal',
    ip: '192.168.1.101',
    estado: 'online',
    resolucion: '4MP',
    fps: 25,
  },
  {
    id: '2',
    nombre: 'Entrada Principal 2',
    modelo: 'Dahua IPC-HFW2431T-ZS',
    zona: 'Entrada Principal',
    ip: '192.168.1.102',
    estado: 'online',
    resolucion: '4MP',
    fps: 25,
  },
  {
    id: '3',
    nombre: 'Zona Industrial A 1',
    modelo: 'Dahua IPC-HDW5431R-ZE',
    zona: 'Zona Industrial A',
    ip: '192.168.1.111',
    estado: 'online',
    resolucion: '4MP',
    fps: 30,
  },
  {
    id: '4',
    nombre: 'Zona Industrial A 2',
    modelo: 'Dahua IPC-HDW5431R-ZE',
    zona: 'Zona Industrial A',
    ip: '192.168.1.112',
    estado: 'degradado',
    resolucion: '4MP',
    fps: 15,
  },
  {
    id: '5',
    nombre: 'Estacionamiento 1',
    modelo: 'Dahua IPC-HDBW2431E-S',
    zona: 'Estacionamiento',
    ip: '192.168.1.141',
    estado: 'online',
    resolucion: '4MP',
    fps: 25,
  },
]

const getStatusColor = (estado: string) => {
  const colors: Record<string, string> = {
    online: 'bg-green-100 text-green-800',
    offline: 'bg-red-100 text-red-800',
    degradado: 'bg-yellow-100 text-yellow-800',
  }
  return colors[estado] || 'bg-gray-100 text-gray-800'
}

const getStatusName = (estado: string) => {
  const names: Record<string, string> = {
    online: 'En línea',
    offline: 'Desconectada',
    degradado: 'Degradada',
  }
  return names[estado] || estado
}

export default function CamarasPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredCamaras = camaras.filter(
    (c) =>
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.zona.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.ip.includes(searchTerm)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cámaras</h1>
          <p className="text-muted-foreground">Gestiona cámaras Dahua y sus parámetros</p>
        </div>
        <Button gap-2>
          <Plus className="h-4 w-4" />
          Nueva Cámara
        </Button>
      </div>

      {/* Search */}
      <Input placeholder="Buscar por nombre, zona o IP..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />

      {/* Cameras Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCamaras.map((camara) => (
          <Card key={camara.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Video className="h-5 w-5 text-muted-foreground mt-1" />
                  <div>
                    <CardTitle className="text-lg">{camara.nombre}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{camara.modelo}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(camara.estado)}>
                  {getStatusName(camara.estado)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Zona</p>
                  <p className="font-medium">{camara.zona}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">IP</p>
                  <p className="font-mono text-xs">{camara.ip}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Resolución</p>
                  <p className="font-medium">{camara.resolucion}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">FPS</p>
                  <p className="font-medium">{camara.fps}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1">
                  <Edit2 className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button size="sm" variant="outline" className="flex-1 text-destructive">
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
