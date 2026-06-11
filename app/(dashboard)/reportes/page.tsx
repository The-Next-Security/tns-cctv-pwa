'use client'

import { useState } from 'react'
import { Download, Database } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartLegendContent, ChartTooltipContent } from '@/components/ui/chart'
import { Button } from '@/components/ui/button'
import { RoleGate } from '@/components/role-gate'

const REPORTES_DEMO_NOTICE =
  'Datos de demostración: aún no existe contrato backend para los reportes agregados, así que la vista usa seed/demo visible.'

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

const criticidadDistribucion = [
  { name: 'Baja', value: 35 },
  { name: 'Media', value: 28 },
  { name: 'Alta', value: 22 },
  { name: 'Crítica', value: 15 },
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

const alertasPorZonaChartConfig = {
  alertas: {
    label: 'Alertas por Zona',
    color: 'var(--color-ds-accent)',
  },
}

const tiempoRespuestaChartConfig = {
  promedio: {
    label: 'Tiempo de respuesta',
    color: 'var(--color-ds-accent-darker)',
  },
}

const criticidadChartConfig = {
  baja: {
    label: 'Baja',
    color: 'var(--color-ds-accent)',
  },
  media: {
    label: 'Media',
    color: 'var(--color-ds-accent-faded)',
  },
  alta: {
    label: 'Alta',
    color: 'var(--color-ds-signal-darker)',
  },
  critica: {
    label: 'Crítica',
    color: 'var(--color-ds-signal)',
  },
}

const incidentesChartConfig = {
  total: {
    label: 'Incidentes por día',
    color: 'var(--color-ds-accent-darker)',
  },
}

const resolucionChartConfig = {
  resueltas: {
    label: 'Resueltas',
    color: 'var(--color-ds-accent)',
  },
  pendientes: {
    label: 'Pendientes',
    color: 'var(--color-ds-signal)',
  },
}

function DemoDataBanner() {
  return (
    <Card className="border-ds-accent/25 bg-ds-accent-faded/60">
      <CardContent className="flex items-start gap-3 p-4">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ds-accent-faded text-ds-accent">
          <Database className="h-4 w-4" />
        </div>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-ds-accent/30 text-ds-accent">
              Datos de demostración
            </Badge>
            <span className="text-sm font-medium text-ds-ink-display">Contrato backend pendiente</span>
          </div>
          <p className="text-sm text-ds-ink-body">{REPORTES_DEMO_NOTICE}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ReportesPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('semana')

  const handleExport = () => {
    console.log('Exportando reporte...')
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold">Reportes</h1>
              <Badge variant="outline" className="border-ds-hairline/60 text-ds-ink-muted">
                Seed + demo visible
              </Badge>
            </div>
            <p className="max-w-2xl text-ds-ink-muted">
              Análisis de incidentes y rendimiento del sistema. La superficie queda conectada a contrato backend cuando exista y, mientras tanto, muestra datos de demostración visibles.
            </p>
          </div>
          <RoleGate roles={['admin_parque', 'supervisor']}>
            <Button onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar Reporte
            </Button>
          </RoleGate>
        </div>

        <DemoDataBanner />
      </div>

      <div className="flex flex-wrap gap-2">
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-ds-ink-muted">Total Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">514</div>
            <p className="text-xs text-ds-accent mt-2">+12% desde período anterior</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-ds-ink-muted">Resueltas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">412</div>
            <p className="text-xs text-ds-ink-muted mt-2">80% de resolución</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-ds-ink-muted">Tiempo Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">58s</div>
            <p className="text-xs text-ds-accent mt-2">-5s vs período anterior</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-ds-ink-muted">Criticidad Crítica</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">77</div>
            <p className="text-xs text-ds-signal mt-2">15% del total</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Alertas por Zona</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              data-testid="reportes-alertas-zona-chart"
              config={alertasPorZonaChartConfig}
              className="h-[300px] w-full"
            >
              <BarChart data={alertasPorZona}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="zona" angle={-45} textAnchor="end" height={80} fontSize={12} />
                <YAxis />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar dataKey="alertas" fill="var(--color-alertas)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tiempo de Respuesta Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer data-testid="reportes-tiempo-respuesta-chart" config={tiempoRespuestaChartConfig} className="h-[300px] w-full">
              <LineChart data={tiempoRespuesta}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hora" />
                <YAxis />
                <Tooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="promedio" stroke="var(--color-promedio)" strokeWidth={2} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución por Criticidad</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={criticidadChartConfig} className="h-[300px] w-full">
              <PieChart>
                <Pie
                  data={criticidadDistribucion}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {criticidadDistribucion.map((entry) => {
                    const key =
                      entry.name === 'Crítica'
                        ? 'critica'
                        : entry.name === 'Alta'
                          ? 'alta'
                          : entry.name === 'Media'
                            ? 'media'
                            : 'baja'

                    return <Cell key={entry.name} fill={`var(--color-${key})`} />
                  })}
                </Pie>
                <Tooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incidentes por Día de Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={incidentesChartConfig} className="h-[300px] w-full">
              <BarChart data={incidentesPorDia}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" />
                <YAxis />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="var(--color-total)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resolución por Tipo de Incidente</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={resolucionChartConfig} className="h-[300px] w-full">
            <BarChart data={resolucionPorTipo} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="tipo" type="category" width={150} />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend content={<ChartLegendContent />} />
              <Bar dataKey="resueltas" fill="var(--color-resueltas)" />
              <Bar dataKey="pendientes" fill="var(--color-pendientes)" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
