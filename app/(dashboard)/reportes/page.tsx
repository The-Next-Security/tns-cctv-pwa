'use client'

// Reportes (CIOC): KPIs y gráficos calculados desde la BD vía
// /api/v1/reports/* (D11 — reemplaza los datos de demostración).

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Download } from 'lucide-react'
import { RoleGate } from '@/components/role-gate'
import { reports } from '@/lib/api'
import { getEventLabel } from '@/lib/types'
import type { ReportSummary } from '@/lib/types'
import { AuditSection, formatSeconds } from '@/components/reports/audit-section'

type Period = 'dia' | 'semana' | 'mes' | 'anio'

const PERIOD_DAYS: Record<Period, number> = { dia: 1, semana: 7, mes: 30, anio: 365 }

const PERIOD_LABELS: Record<Period, string> = {
  dia: 'Hoy',
  semana: 'Esta Semana',
  mes: 'Este Mes',
  anio: 'Este Año',
}

// Colores vía tokens del design system (QA-15 #56) — nunca hex raw.
const CRITICALITY_COLORS: Record<string, string> = {
  baja: 'var(--criticality-baja)',
  media: 'var(--criticality-media)',
  alta: 'var(--criticality-alta)',
  critica: 'var(--criticality-critica)',
}

const CRITICALITY_LABELS: Record<string, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
}

function rangeForPeriod(period: Period): { from: string; to: string } {
  const now = new Date()
  const from = new Date(now.getTime() - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000)
  return { from: from.toISOString(), to: now.toISOString() }
}

export default function ReportesPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('semana')
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [exporting, setExporting] = useState(false)

  const range = useMemo(() => rangeForPeriod(selectedPeriod), [selectedPeriod])

  const loadSummary = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      setSummary(await reports.summary(range))
    } catch {
      setError(true)
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await reports.exportCsv({ type: 'summary', ...range })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `reporte-${selectedPeriod}-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      setError(true)
    } finally {
      setExporting(false)
    }
  }

  const kpis = summary?.kpis

  const criticidadData = useMemo(
    () =>
      (summary?.distribucion_criticidad ?? []).map((entry) => ({
        name: CRITICALITY_LABELS[entry.criticidad] ?? entry.criticidad,
        value: entry.total,
        color: CRITICALITY_COLORS[entry.criticidad] ?? 'var(--cctv-accent-blue)',
      })),
    [summary]
  )

  const resolucionData = useMemo(
    () =>
      (summary?.resolucion_por_tipo ?? []).map((entry) => ({
        ...entry,
        tipo: getEventLabel(entry.tipo),
      })),
    [summary]
  )

  const incidentesData = useMemo(
    () =>
      (summary?.incidentes_por_dia ?? []).map((entry) => ({
        ...entry,
        dia: entry.dia.slice(5), // MM-DD
      })),
    [summary]
  )

  return (
    <div className="space-y-6">
      {error && (
        <div
          className="rounded-xl border px-4 py-3 text-sm text-ds-ink-body"
          style={{ backgroundColor: 'rgb(255 77 79 / 0.12)', borderColor: 'rgb(255 77 79 / 0.35)' }}
          role="status"
        >
          <span className="font-semibold">No se pudieron cargar los reportes</span> — verifica que el
          API esté disponible e intenta nuevamente.
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reportes</h1>
          <p className="text-ds-ink-muted">Análisis de incidentes y rendimiento del sistema</p>
        </div>
        <RoleGate roles={['admin_parque', 'supervisor']}>
          <Button onClick={handleExport} disabled={exporting || loading} className="gap-2">
            <Download className="h-4 w-4" />
            {exporting ? 'Exportando…' : 'Exportar Reporte'}
          </Button>
        </RoleGate>
      </div>

      {/* Period Selector */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((period) => (
          <Button
            key={period}
            variant={selectedPeriod === period ? 'default' : 'outline'}
            onClick={() => setSelectedPeriod(period)}
          >
            {PERIOD_LABELS[period]}
          </Button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-ds-ink-muted">Total Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold">{kpis?.total ?? '—'}</div>
                <p className="text-xs text-ds-ink-muted mt-2">
                  {kpis ? `${kpis.pendientes} pendientes · ${kpis.escaladas} escaladas` : 'Sin datos'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-ds-ink-muted">Resueltas</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold">{kpis?.resueltas ?? '—'}</div>
                <p className="text-xs text-ds-ink-muted mt-2">
                  {kpis
                    ? `${kpis.tasa_resolucion}% de resolución · ${kpis.tasa_falsos_positivos}% falsos positivos`
                    : 'Sin datos'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-ds-ink-muted">Tiempo de Toma</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold">{formatSeconds(kpis?.tiempo_toma_promedio_s)}</div>
                <p className="text-xs text-ds-accent mt-2">
                  Resolución promedio: {formatSeconds(kpis?.tiempo_resolucion_promedio_s)}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-ds-ink-muted">Criticidad Crítica</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold">{kpis?.criticas ?? '—'}</div>
                <p className="text-xs text-ds-signal mt-2">
                  {kpis && kpis.total > 0
                    ? `${Math.round((kpis.criticas / kpis.total) * 100)}% del total`
                    : 'Sin datos'}
                </p>
              </>
            )}
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
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={summary?.alertas_por_zona ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="zona" angle={-45} textAnchor="end" height={80} fontSize={12} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="alertas" fill="var(--cctv-accent-blue)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tiempo de Respuesta */}
        <Card>
          <CardHeader>
            <CardTitle>Tiempo de Respuesta Promedio (seg)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={summary?.tiempo_respuesta_por_hora ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hora" />
                  <YAxis allowDecimals={false} domain={[0, 'auto']} />
                  <Tooltip />
                  <Line type="linear" dataKey="promedio" connectNulls stroke="var(--cctv-accent-blue)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Distribución de Criticidad */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Criticidad</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={criticidadData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="var(--cctv-accent-blue)"
                    dataKey="value"
                  >
                    {criticidadData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Incidentes por Día */}
        <Card>
          <CardHeader>
            <CardTitle>Incidentes por Día</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={incidentesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dia" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" fill="var(--alert-success)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resolución por Tipo */}
      <Card>
        <CardHeader>
          <CardTitle>Resolución por Tipo de Incidente</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={resolucionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="tipo" type="category" width={150} fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="resueltas" name="Resueltas" fill="var(--alert-success)" />
                <Bar dataKey="pendientes" name="Pendientes" fill="var(--criticality-alta)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Accountability y auditoría — solo gerencia/supervisión */}
      <RoleGate roles={['admin_parque', 'supervisor']}>
        <AuditSection from={range.from} to={range.to} />
      </RoleGate>
    </div>
  )
}
