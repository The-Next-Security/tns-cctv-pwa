'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit2 } from 'lucide-react'

export default function TenantsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tenants</h1>
          <p className="text-muted-foreground">Administra organizaciones y clientes</p>
        </div>
        <Button gap-2>
          <Plus className="h-4 w-4" />
          Nuevo Tenant
        </Button>
      </div>

      {/* Tenants Card */}
      <Card>
        <CardHeader>
          <CardTitle>Agrolivo Parque Industrial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="font-medium">Enterprise</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Usuarios</p>
              <p className="font-medium">24</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cámaras</p>
              <p className="font-medium">40</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <Badge>Activo</Badge>
            </div>
          </div>
          <div className="pt-2">
            <Button variant="outline">
              <Edit2 className="h-4 w-4 mr-2" />
              Editar Configuración
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
