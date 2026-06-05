'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Users, MapPin, Video, Settings, Building2 } from 'lucide-react'
import Link from 'next/link'

interface AdminSection {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  href: string
  count: number
  color: string
}

const adminSections: AdminSection[] = [
  {
    id: 'usuarios',
    title: 'Usuarios',
    description: 'Gestiona usuarios, roles y permisos del sistema',
    icon: <Users className="h-6 w-6" />,
    href: '/admin/usuarios',
    count: 24,
    color: 'bg-ds-accent-faded text-ds-accent',
  },
  {
    id: 'zonas',
    title: 'Zonas',
    description: 'Define áreas y zonas de vigilancia',
    icon: <MapPin className="h-6 w-6" />,
    href: '/admin/zonas',
    count: 8,
    color: 'bg-[var(--success-bg)] text-[var(--success)]',
  },
  {
    id: 'camaras',
    title: 'Cámaras',
    description: 'Configura y administra cámaras Dahua',
    icon: <Video className="h-6 w-6" />,
    href: '/admin/camaras',
    count: 40,
    color: 'bg-ds-muted text-ds-ink-display',
  },
  {
    id: 'nvrs',
    title: 'NVRs',
    description: 'Gestiona servidores de grabación (NVRs)',
    icon: <Settings className="h-6 w-6" />,
    href: '/admin/nvrs',
    count: 3,
    color: 'bg-ds-accent-faded text-ds-accent',
  },
  {
    id: 'tenants',
    title: 'Tenants',
    description: 'Administra organizaciones y clientes',
    icon: <Building2 className="h-6 w-6" />,
    href: '/admin/tenants',
    count: 1,
    color: 'bg-ds-signal-faded text-ds-signal',
  },
  {
    id: 'configuracion',
    title: 'Configuración',
    description: 'Parámetros generales del sistema',
    icon: <Settings className="h-6 w-6" />,
    href: '/admin/configuracion',
    count: 1,
    color: 'bg-ds-surface text-ds-ink-muted',
  },
]

export default function AdminPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Administración</h1>
          <p className="text-ds-ink-muted">Panel de control para la gestión del sistema</p>
        </div>
      </div>

      {/* Admin Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {adminSections.map((section) => (
          <Link key={section.id} href={section.href}>
            <Card className="h-full cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg ${section.color}`}>
                    {section.icon}
                  </div>
                  <Badge className="ml-auto">{section.count}</Badge>
                </div>
                <CardTitle className="text-xl mt-3">{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-ds-ink-muted">{section.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* System Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Estadísticas del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border rounded-lg p-4">
              <p className="text-sm text-ds-ink-muted">Usuarios Activos</p>
              <p className="text-2xl font-bold">18</p>
              <p className="text-xs text-ds-accent mt-1">de 24 totales</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-ds-ink-muted">Cámaras Conectadas</p>
              <p className="text-2xl font-bold">40</p>
              <p className="text-xs text-ds-accent mt-1">100% en línea</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-ds-ink-muted">Zonas Configuradas</p>
              <p className="text-2xl font-bold">8</p>
              <p className="text-xs text-ds-ink-muted mt-1">todas activas</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-ds-ink-muted">Disponibilidad Sistema</p>
              <p className="text-2xl font-bold">99.8%</p>
              <p className="text-xs text-ds-accent mt-1">últimos 30 días</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button className="w-full justify-start gap-2">
            <Plus className="h-4 w-4" />
            Crear Nuevo Usuario
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2">
            <Plus className="h-4 w-4" />
            Agregar Nueva Zona
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2">
            <Plus className="h-4 w-4" />
            Registrar Cámara
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2">
            <Plus className="h-4 w-4" />
            Conectar NVR
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
