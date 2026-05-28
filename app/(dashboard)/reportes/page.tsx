'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Download, Calendar } from 'lucide-react'
import { useUser } from '@/lib/auth'
import { RoleGate } from '@/components/role-gate'

const alertasPorZona = [
  { zona: 'Entrada Principal', alertas: 24 },
  { zona: 'Zona Industrial A', alertas: 18 },
  { zona: 'Zona Logística', alertas: 32 },
  { zona: 'Estacionamiento', alertas: 12 },
  { zona: 'Zona Industrial B', alertas: 28 },
]

const tiempoRespuesta = [
  { hora: '00:00', promedio: 45 },
  { hora: '04:00', promedio: 38 },
  { hora: '08:00', promedio: 52 },
  { hora: '12:00', promedio: 65 },
  { hora: '16:00', promedio: 72 },
  { hora: '20:00', promedio: 58 },
]

const criticidadDistribuccion = [
  { name: 'Baja', value: 35, color: '#3b82f6' },
  { name: 'Media', value: 28, color: '#fbbf24' },
  { name: 'Alta', value: 22, color: '#f97316' },
  { name: 'Crítica', value: 15, color: '#ef4444' },
]

const resolucionPorTipo = [
  { tipo: 'Intrusión', resueltas: 89, pendientes: 11 },
  { tipo: 'Acceso No Autorizado', resueltas: 76, pendientes: 24 },
  { tipo: 'Vandalismos', resueltas: 92, pendientes: 8 },
  { tipo: 'Infracción Vehicular', resueltas: 68, pendientes: 32 },
  { tipo: 'Comportamiento Sospechoso', resueltas: 81, pendientes: 19 },
]

const incidentesPorDia = [
  { dia: 'Lun', total: 42 },
  { dia: 'Mar', total: 38 },
  { dia: 'Mié', total: 55 },
  { dia: 'Jue', total: 48 },
  { dia: 'Vie', total: 62 },
  { dia: 'Sab', total: 35 },
  { dia: 'Dom', total: 28 },
]

export default function ReportesPage() {
  const user = useUser()
  const [selectedPeriod, setSelectedPeriod] = useState('semana')

  const handleExport = () => {
    console.log('Exportando reporte...')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reportes</h1>
          <p className="text-muted-foreground">Análisis de incidentes y rendimiento del sistema</p>
        </div>
        <RoleGate roles={['admin_parque', 'supervisor']}>
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar Reporte
          </Button>
        </RoleGate>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {['dia', 'semana', 'mes', 'anio'].map((period) => (
          <Button
            key={period}
            variant={selectedPeriod === period ? 'default' : 'outline'}
            onClick={() => setSelectedPeriod(period)}
            className="capitalize"
          >
            {period === 'dia' && 'Hoy'}
            {period === 'semana' && 'Esta Semana'}
            {period === 'mes' && 'Este Mes'}
            {period === 'anio' && 'Este Año'}
          </Button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">514</div>
            <p className="text-xs text-green-600 mt-2">+12% desde período anterior</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resueltas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">412</div>
            <p className="text-xs text-muted-foreground mt-2">80% de resolución</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tiempo Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">58s</div>
            <p className="text-xs text-green-600 mt-2">-5s vs período anterior</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Criticidad Crítica</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">77</div>
            <p className="text-xs text-red-600 mt-2">15% del total</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas por Zona */}
        <Card>
          <CardHeader>
            <CardTitle>Alertas por Zona</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={alertasPorZona}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="zona" angle={-45} textAnchor="end" height={80} fontSize={12} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="alertas" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tiempo de Respuesta */}
        <Card>
          <CardHeader>
            <CardTitle>Tiempo de Respuesta Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={tiempoRespuesta}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hora" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="promedio" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribución de Criticidad */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Criticidad</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={criticidadDistribuccion}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {criticidadDistribuccion.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Incidentes por Día */}
        <Card>
          <CardHeader>
            <CardTitle>Incidentes por Día de Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={incidentesPorDia}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Resolución por Tipo */}
      <Card>
        <CardHeader>
          <CardTitle>Resolución por Tipo de Incidente</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={resolucionPorTipo} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="tipo" type="category" width={150} />
              <Tooltip />
              <Legend />
              <Bar dataKey="resueltas" fill="#10b981" />
              <Bar dataKey="pendientes" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
