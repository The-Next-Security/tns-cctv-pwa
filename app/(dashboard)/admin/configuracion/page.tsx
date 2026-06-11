'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Save } from 'lucide-react'

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-ds-ink-muted">Parámetros generales del sistema</p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nombre del Sistema</label>
            <Input defaultValue="TNS Track MVP - Agrolivo" className="mt-2" />
          </div>
          <div>
            <label className="text-sm font-medium">URL Base</label>
            <Input defaultValue="https://track.agrolivo.local" className="mt-2" />
          </div>
          <div>
            <label className="text-sm font-medium">Zona Horaria</label>
            <Input defaultValue="America/Argentina/Buenos_Aires" className="mt-2" />
          </div>
          <Button className="gap-2">
            <Save className="h-4 w-4" />
            Guardar Cambios
          </Button>
        </CardContent>
      </Card>

      {/* Alert Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Alertas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Duración del Popup (segundos)</label>
            <Input type="number" defaultValue="30" className="mt-2" />
          </div>
          <div>
            <label className="text-sm font-medium">Sonido de Alerta</label>
            <div className="mt-2 flex gap-2">
              <Button variant="outline" size="sm">
                Reproducir
              </Button>
              <Button variant="outline" size="sm">
                Silenciar
              </Button>
            </div>
          </div>
          <Button className="gap-2">
            <Save className="h-4 w-4" />
            Guardar Cambios
          </Button>
        </CardContent>
      </Card>

      {/* Maintenance */}
      <Card>
        <CardHeader>
          <CardTitle>Mantenimiento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full">
            Limpiar Cache
          </Button>
          <Button variant="outline" className="w-full">
            Exportar Base de Datos
          </Button>
          <Button variant="outline" className="w-full text-ds-signal">
            Reiniciar Sistema
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
