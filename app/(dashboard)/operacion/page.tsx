'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, ArrowUpDown, ArrowUpRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatCard } from '@/components/dashboard/stat-card'
import { IncomingAlertsStatGroup } from '@/components/dashboard/incoming-alerts-stat-group'
import { OperacionContextPanel } from '@/components/dashboard/operacion-context-panel'
import { AlertCard } from '@/components/operacion/alert-card'
import { AlertDialog } from '@/components/operacion/alert-dialog'
import { AlertPopup } from '@/components/operacion/alert-popup'
import { EscalateSheet } from '@/components/operacion/escalate-sheet'
import { ConnectionStatus } from '@/components/operacion/connection-status'
import {
  AlertsFilterBar,
  STATUS_VIEW_LABELS,
  type CriticalityFilter,
  type StatusView,
} from '@/components/operacion/alerts-filter-bar'
import { AlertsHistory, type AlertsHistoryFilters } from '@/components/operacion/alerts-history'
import { useRealtime } from '@/hooks/use-realtime'
import { alerts as alertsApi } from '@/lib/api'
import { useUser } from '@/lib/auth'
import { PARK_ZONES } from '@/lib/constants'
import { toast } from 'sonner'
import { DEMO_ALERT_POPUP_KEY } from '@/lib/reset-demo'
import { URGENCY_STYLES, type UrgencyLevel } from '@/lib/constants'
import { UrgencyText } from '@/components/ui/urgency-badge'
import type { Alert } from '@/lib/types'
import { getAlertClass } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ALERT_SORT_LABELS, ALERT_SORT_OPTIONS, isSlaOverdue, sortAlerts, type AlertSortBy, type ZoneNameMap } from '@/lib/alert-list'

const VALID_STATUS_VIEWS: ReadonlyArray<StatusView> = [
  'activas', 'pendiente', 'en_revision', 'escaladas', 'resueltas', 'criticas', 'baja_prioridad', 'vencidas', 'all', 'historial',
]

// D12: el historial forense es función de mando — espejo del guard del backend.
const HISTORY_ROLES: ReadonlyArray<string> = ['supervisor', 'responsable_seguridad', 'admin_parque']
const VALID_CRITICALITY_FILTERS: ReadonlyArray<CriticalityFilter> = ['all', 'critica', 'baja_prioridad']

const ZONE_NAMES: ZoneNameMap = Object.fromEntries(PARK_ZONES.map(zone => [zone.id, zone.name]))

function parseEnumParam<T extends string>(raw: string | null, valid: ReadonlyArray<T>, fallback: T): T {
  return raw !== null && valid.includes(raw as T) ? (raw as T) : fallback
}

const STATUS_VIEW_URGENCY: Partial<Record<StatusView, UrgencyLevel>> = {
  criticas: 'critical',
  vencidas: 'critical',
  baja_prioridad: 'pending',
  pendiente: 'pending',
  en_revision: 'review',
  escaladas: 'escalated',
  resueltas: 'resolved',
}

function resolveListHeadingUrgency(
  view: StatusView,
  counts: { criticalPending: number; lowPriorityPending: number; inReview: number; escalated: number }
): UrgencyLevel | null {
  const mapped = STATUS_VIEW_URGENCY[view]
  if (mapped) return mapped

  if (view === 'activas') {
    if (counts.criticalPending > 0) return 'critical'
    if (counts.inReview > 0) return 'review'
    if (counts.escalated > 0) return 'escalated'
    if (counts.lowPriorityPending > 0) return 'pending'
  }

  return null
}

function matchesStatusView(alert: Alert, view: StatusView): boolean {
  const alertClass = getAlertClass(alert.criticality)
  switch (view) {
    case 'activas':
      return alert.status !== 'resuelta' && alert.status !== 'descartada'
    case 'pendiente':
      return alert.status === 'pendiente'
    case 'en_revision':
      return alert.status === 'en_revision'
    case 'escaladas':
      return alert.status === 'escalada'
    case 'resueltas':
      return alert.status === 'resuelta' || alert.status === 'descartada'
    case 'criticas':
      return alertClass === 'critica' && alert.status === 'pendiente'
    case 'baja_prioridad':
      return alertClass === 'baja_prioridad' && (
        alert.status === 'pendiente' ||
        alert.status === 'en_revision' ||
        alert.status === 'escalada'
      )
    case 'vencidas':
      return isSlaOverdue(alert)
    case 'historial':
      // El historial no filtra el set operativo: se consulta al servidor aparte (D12).
      return false
    case 'all':
      return true
    default:
      return true
  }
}

function OperacionPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useUser()

  // D12: la pestaña Historial es solo para supervisor+; un deep-link sin permiso cae en 'activas'.
  const canSeeHistory = user != null && HISTORY_ROLES.includes(user.role)
  const rawStatusView = parseEnumParam(searchParams.get('view'), VALID_STATUS_VIEWS, 'activas')
  const statusView = rawStatusView === 'historial' && !canSeeHistory ? 'activas' : rawStatusView
  const isHistoryView = statusView === 'historial'
  const criticalityFilter = parseEnumParam(searchParams.get('crit'), VALID_CRITICALITY_FILTERS, 'all')
  const sortBy = parseEnumParam(searchParams.get('sort'), ALERT_SORT_OPTIONS, 'recientes')
  const zoneParam = searchParams.get('zone')
  const zoneFilter = zoneParam !== null && PARK_ZONES.some(zone => String(zone.id) === zoneParam) ? zoneParam : 'all'

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) params.delete(key)
      else params.set(key, value)
    }
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [searchParams, router, pathname])

  const setStatusView = useCallback(
    (view: StatusView) => updateParams({ view: view === 'activas' ? null : view }),
    [updateParams]
  )
  const setCriticalityFilter = useCallback(
    (value: CriticalityFilter) => updateParams({ crit: value === 'all' ? null : value }),
    [updateParams]
  )
  const setZoneFilter = useCallback(
    (value: string) => updateParams({ zone: value === 'all' ? null : value }),
    [updateParams]
  )
  const setSortBy = useCallback(
    (value: AlertSortBy) => updateParams({ sort: value === 'recientes' ? null : value }),
    [updateParams]
  )

  // D12: filtros del historial forense, también en la URL (deep-links de investigación)
  const historyPageParam = parseInt(searchParams.get('hpage') ?? '1', 10)
  const historyFilters: AlertsHistoryFilters = {
    from: searchParams.get('hfrom') ?? '',
    to: searchParams.get('hto') ?? '',
    zone: searchParams.get('hzone') ?? 'all',
    criticality: searchParams.get('hcrit') ?? 'all',
    plate: searchParams.get('hplate') ?? '',
    operator: searchParams.get('hop') ?? 'all',
    page: Number.isFinite(historyPageParam) && historyPageParam >= 1 ? historyPageParam : 1,
  }
  const setHistoryFilters = useCallback(
    (updates: Partial<AlertsHistoryFilters>) => {
      const mapped: Record<string, string | null> = {}
      if (updates.from !== undefined) mapped.hfrom = updates.from || null
      if (updates.to !== undefined) mapped.hto = updates.to || null
      if (updates.zone !== undefined) mapped.hzone = updates.zone === 'all' ? null : updates.zone
      if (updates.criticality !== undefined) mapped.hcrit = updates.criticality === 'all' ? null : updates.criticality
      if (updates.plate !== undefined) mapped.hplate = updates.plate || null
      if (updates.operator !== undefined) mapped.hop = updates.operator === 'all' ? null : updates.operator
      if (updates.page !== undefined) mapped.hpage = updates.page <= 1 ? null : String(updates.page)
      updateParams(mapped)
    },
    [updateParams]
  )

  const [priorityAlert, setPriorityAlert] = useState<Alert | null>(null)
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [showPopup, setShowPopup] = useState(false)
  const [escalateAlert, setEscalateAlert] = useState<Alert | null>(null)
  const [localAlerts, setLocalAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadAlerts = useCallback(async () => {
    try {
      // D12: la consola carga solo el conjunto operativo (abiertas + cerradas <48h)
      const res = await alertsApi.list({ scope: 'operativa' })
      const items = (res as unknown as { data?: Alert[]; items?: Alert[] }).data
        ?? (res as unknown as { items?: Alert[] }).items
        ?? []
      setLocalAlerts(items)
    } catch {
      toast.error('No se pudieron cargar las alertas. Verifique que el API esté activo (pnpm dev:api).')
      setLocalAlerts([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAlerts()
  }, [loadAlerts])

  const resolveEventId = useCallback(
    (alertId: number) => localAlerts.find(a => a.id === alertId)?.event_id ?? String(alertId),
    [localAlerts]
  )

  // Demo: popup automático solo para clase 'critica' (alta + critica)
  useEffect(() => {
    if (isLoading) return
    if (sessionStorage.getItem(DEMO_ALERT_POPUP_KEY) === '1') return

    const timer = setTimeout(() => {
      const incoming = localAlerts.find(
        a => getAlertClass(a.criticality) === 'critica' && a.status === 'pendiente'
      )
      if (incoming) {
        setPriorityAlert(incoming)
        sessionStorage.setItem(DEMO_ALERT_POPUP_KEY, '1')
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [isLoading, localAlerts])

  const handleNewAlert = useCallback((alert: Alert) => {
    setLocalAlerts(prev => {
      if (prev.some(a => a.id === alert.id)) return prev
      return [alert, ...prev]
    })
    if (getAlertClass(alert.criticality) === 'critica') {
      setPriorityAlert(alert)
    }
  }, [])

  const handleAlertUpdated = useCallback((alert: Alert) => {
    setLocalAlerts(prev => prev.map(a => a.id === alert.id ? alert : a))
  }, [])

  // El backend emite event.popup con datos mínimos: recargar la lista para
  // obtener la alerta completa y disparar el popup si corresponde.
  const handleEventPopup = useCallback(() => {
    loadAlerts()
  }, [loadAlerts])

  const { connected: isRealtimeConnected } = useRealtime({
    onAlertNew: handleNewAlert,
    onAlertUpdated: handleAlertUpdated,
    onEventPopup: handleEventPopup,
  })

  const filteredAlerts = localAlerts.filter(alert => {
    if (!matchesStatusView(alert, statusView)) return false
    if (zoneFilter !== 'all' && alert.zone_id !== parseInt(zoneFilter)) return false
    if (criticalityFilter === 'critica') {
      return getAlertClass(alert.criticality) === 'critica'
    }
    if (criticalityFilter === 'baja_prioridad') {
      return getAlertClass(alert.criticality) === 'baja_prioridad'
    }
    return true
  })

  const sortedFilteredAlerts = sortAlerts(filteredAlerts, sortBy, ZONE_NAMES)

  // Stats
  const stats = {
    criticalPending:    localAlerts.filter(a => getAlertClass(a.criticality) === 'critica'       && a.status === 'pendiente').length,
    lowPriorityPending: localAlerts.filter(a => getAlertClass(a.criticality) === 'baja_prioridad' && a.status === 'pendiente').length,
    inReview:           localAlerts.filter(a => a.status === 'en_revision').length,
    escalated:          localAlerts.filter(a => a.status === 'escalada').length,
    resolved:           localAlerts.filter(a => a.status === 'resuelta' || a.status === 'descartada').length,
    slaOverdue:         localAlerts.filter(a => isSlaOverdue(a)).length,
  }

  const listHeadingUrgency = resolveListHeadingUrgency(statusView, stats)
  const listHeadingPulse   = listHeadingUrgency === 'critical' && stats.criticalPending > 0

  function handleRefresh() {
    setIsLoading(true)
    loadAlerts()
  }

  function handleAlertAction(alertId: number, action: 'acknowledge' | 'resolve' | 'escalate' | 'discard', notes?: string) {
    const eventId = resolveEventId(alertId)
    setLocalAlerts(prev => prev.map(a => {
      if (a.id !== alertId) return a
      if (action === 'acknowledge') {
        return { ...a, status: 'en_revision' as const, assigned_to: 'Usuario Actual' }
      }
      if (action === 'resolve') {
        return { ...a, status: 'resuelta' as const, resolved_at: new Date().toISOString(), resolution_notes: notes }
      }
      if (action === 'discard') {
        return {
          ...a,
          status: 'descartada' as const,
          discard_reason: notes as Alert['discard_reason'],
          discard_note: notes,
          resolved_at: new Date().toISOString(),
        }
      }
      if (action === 'escalate') {
        return { ...a, status: 'escalada' as const }
      }
      return a
    }))
    // UX optimista con reconciliación (D3): la BD es la fuente de verdad.
    alertsApi.attendEvent(eventId, action, notes).catch(() => {
      toast.error('No se pudo registrar la acción en el servidor. Sincronizando estado real...')
      loadAlerts()
    })
    setPriorityAlert(null)

    if (action === 'acknowledge') {
      setStatusView('en_revision')
    } else if (action === 'escalate') {
      setStatusView('escaladas')
    } else if (action === 'resolve' || action === 'discard') {
      setStatusView('resueltas')
    }
  }

  function handleReactivate(alertId: number) {
    const alert = localAlerts.find(a => a.id === alertId)
    const eventId = resolveEventId(alertId)
    setLocalAlerts(prev => prev.map(a =>
      a.id === alertId
        ? {
            ...a,
            status: 'pendiente' as const,
            resolved_at: null,
            resolution_notes: null,
            discard_reason: null,
            discard_note: null,
            assigned_to: null,
            attended_at: null,
            llamada_at: null,
          }
        : a
    ))
    alertsApi.attendEvent(eventId, 'reactivate').catch(() => {
      toast.error('No se pudo reactivar la alerta en el servidor. Sincronizando estado real...')
      loadAlerts()
    })
    toast.success('Alerta reactivada — vuelve al inicio del flujo')

    if (!alert) {
      setStatusView('activas')
      return
    }
    if (getAlertClass(alert.criticality) === 'critica') {
      setStatusView('criticas')
    } else if (getAlertClass(alert.criticality) === 'baja_prioridad') {
      setStatusView('baja_prioridad')
    } else {
      setStatusView('activas')
    }
  }

  function handleLlamar(alertId: number) {
    const llamadaAt = new Date().toISOString()
    const markCalled = (alert: Alert) =>
      alert.id === alertId ? { ...alert, llamada_at: llamadaAt } : alert

    setLocalAlerts(prev => prev.map(markCalled))
    setPriorityAlert(prev => prev ? markCalled(prev) : prev)
    setSelectedAlert(prev => prev ? markCalled(prev) : prev)
    setEscalateAlert(prev => prev ? markCalled(prev) : prev)

    // D4: la llamada se persiste como acción CALL_REGISTERED en el timeline.
    alertsApi.attendEvent(resolveEventId(alertId), 'register_call').catch(() => {
      toast.error('No se pudo registrar la llamada en el servidor. Sincronizando estado real...')
      loadAlerts()
    })
  }

  function handleShowDetails(alert: Alert) {
    setSelectedAlert(alert)
    setShowPopup(true)
  }

  function handlePopupAction(alertId: number, action: string, reason?: string) {
    if (action === 'acknowledge') {
      handleAlertAction(alertId, 'acknowledge')
    } else if (action === 'resolve') {
      handleAlertAction(alertId, 'resolve')
    } else if (action === 'escalate') {
      handleAlertAction(alertId, 'escalate')
    } else if (action === 'discard') {
      handleAlertAction(alertId, 'discard', reason)
    } else if (action === 'reactivate') {
      handleReactivate(alertId)
    }
    setShowPopup(false)
  }

  return (
    <div className="flex flex-col xl:flex-row gap-3 sm:gap-6 xl:gap-8">
      {/* Columna central */}
      <div className="flex-1 min-w-0 page-stack">
        {/* Header */}
        <div className="page-header">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-caption text-ds-accent font-semibold mb-0.5">Consola operativa</p>
            <h1 className="page-title">Monitoreo de alertas</h1>
            <p className="page-subtitle hidden sm:block">
              Gestione incidentes en tiempo real del parque Agrolivo
            </p>
          </div>
          <ConnectionStatus isConnected={isRealtimeConnected} />
        </div>

        {/* Stats Cards */}
        <div className="stat-grid">
          <IncomingAlertsStatGroup
            criticalCount={stats.criticalPending}
            lowPriorityCount={stats.lowPriorityPending}
            criticalActive={statusView === 'criticas'}
            lowPriorityActive={statusView === 'baja_prioridad'}
            onCriticalClick={() => setStatusView('criticas')}
            onLowPriorityClick={() => setStatusView('baja_prioridad')}
          />
          <StatCard
            label="En Revisión"
            value={stats.inReview}
            hint="Atendiendo ahora"
            icon={AlertTriangle}
            tone="review"
            active={statusView === 'en_revision'}
            onClick={() => setStatusView('en_revision')}
          />
          <StatCard
            label="Escaladas"
            value={stats.escalated}
            hint="En manos del supervisor"
            icon={ArrowUpRight}
            tone="escalated"
            active={statusView === 'escaladas'}
            onClick={() => setStatusView('escaladas')}
          />
          <StatCard
            label="Resueltas Hoy"
            value={stats.resolved}
            hint="Cerradas"
            icon={CheckCircle2}
            tone="resolved"
            active={statusView === 'resueltas'}
            onClick={() => setStatusView('resueltas')}
          />
        </div>

        {/* D12: alertas abiertas con SLA vencido — nunca se archivan, se destacan */}
        {!isHistoryView && statusView !== 'vencidas' && stats.slaOverdue > 0 && (
          <button
            type="button"
            onClick={() => setStatusView('vencidas')}
            className="flex w-full items-center gap-2 rounded-xl border px-4 py-3 text-left text-xs sm:text-sm transition-colors hover:brightness-110"
            style={{ backgroundColor: 'rgb(255 77 79 / 0.12)', borderColor: 'rgb(255 77 79 / 0.35)' }}
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-ds-signal" aria-hidden />
            <span className="text-ds-ink-body">
              <span className="font-semibold text-ds-signal">
                {stats.slaOverdue} alerta{stats.slaOverdue === 1 ? '' : 's'} con SLA vencido
              </span>
              {' '}— más de 48h sin resolver. Toque para revisarlas.
            </span>
          </button>
        )}

        {/* Main panel */}
        <div className="soft-panel soft-card-compact overflow-hidden">
          {/* Filters bar — chips esenciales + panel de filtros (sin scroll horizontal en móvil) */}
          <div className="border-b border-ds-hairline/60 panel-compact pb-3 sm:pb-4">
            <AlertsFilterBar
              statusView={statusView}
              onStatusViewChange={setStatusView}
              criticalityFilter={criticalityFilter}
              onCriticalityFilterChange={setCriticalityFilter}
              zoneFilter={zoneFilter}
              onZoneFilterChange={setZoneFilter}
              activeAlertsCount={stats.criticalPending + stats.lowPriorityPending + stats.inReview}
              isLoading={isLoading}
              onRefresh={handleRefresh}
              showHistoryTab={canSeeHistory}
            />
          </div>

          {/* D12: la pestaña Historial reemplaza la lista operativa por la búsqueda forense */}
          {isHistoryView ? (
            <div className="panel-compact space-y-3 sm:space-y-5">
              <div className="min-w-0">
                <h2 className="text-section text-sm sm:text-base font-semibold antialiased text-ds-ink-display">
                  Historial forense
                </h2>
                <p className="text-xs sm:text-sm text-ds-ink-muted">
                  Alertas cerradas hace más de 48h — búsqueda por fecha, zona, criticidad, patente y operador
                </p>
              </div>
              <AlertsHistory filters={historyFilters} onFiltersChange={setHistoryFilters} />
            </div>
          ) : (
          <div className="panel-compact space-y-3 sm:space-y-5">
            <div className="flex items-start justify-between gap-2 sm:gap-3">
              <div className="min-w-0">
                <h2
                  className={cn(
                    'text-section text-sm sm:text-base font-semibold antialiased transition-colors duration-200',
                    !listHeadingUrgency && 'text-ds-ink-display',
                    listHeadingUrgency && URGENCY_STYLES[listHeadingUrgency].text,
                    listHeadingPulse && 'badge-urgency-critical-pulse'
                  )}
                >
                  {STATUS_VIEW_LABELS[statusView]}
                </h2>
                <p className="text-xs sm:text-sm text-ds-ink-muted">
                  {filteredAlerts.length} alerta{filteredAlerts.length === 1 ? '' : 's'} en esta vista
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label="Ordenar alertas"
                      className="h-8 sm:h-9 gap-1.5 rounded-xl border-0 bg-ds-muted shadow-none text-xs sm:text-sm"
                    >
                      <ArrowUpDown className="h-4 w-4" />
                      <span className="hidden sm:inline">{ALERT_SORT_LABELS[sortBy]}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuRadioGroup value={sortBy} onValueChange={value => setSortBy(value as AlertSortBy)}>
                      {ALERT_SORT_OPTIONS.map(option => (
                        <DropdownMenuRadioItem key={option} value={option}>
                          {ALERT_SORT_LABELS[option]}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                {statusView !== 'activas' && (
                  <Button variant="outline" size="sm" onClick={() => setStatusView('activas')} className="h-8 sm:h-9 shrink-0 rounded-xl border-0 bg-ds-muted shadow-none text-xs sm:text-sm">
                    Volver
                  </Button>
                )}
              </div>
            </div>

            <p className="hidden sm:block text-caption rounded-xl bg-ds-accent-faded px-4 py-3 border border-ds-accent/20">
              <span className="font-medium text-ds-ink-display">Flujo: </span>
              <UrgencyText level="critical">Crítica</UrgencyText>
              {' / '}
              <UrgencyText level="pending">Baja Prioridad</UrgencyText>
              {' → Atender → '}
              <UrgencyText level="review">En Revisión</UrgencyText>
              {' → Resuelta → '}
              <UrgencyText level="resolved">Resueltas Hoy</UrgencyText>
              {' · Escalar → '}
              <UrgencyText level="escalated">Escaladas</UrgencyText>
            </p>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="soft-card animate-pulse p-5">
                    <div className="flex items-start gap-4">
                      <div className="h-6 w-20 bg-ds-muted rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-5 w-48 bg-ds-muted rounded-lg" />
                        <div className="h-4 w-32 bg-ds-muted rounded-lg" />
                      </div>
                      <div className="h-9 w-24 bg-ds-muted rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="soft-card flex flex-col items-center justify-center py-10 sm:py-16 text-center px-4 sm:px-6">
                <div className="h-16 w-16 rounded-2xl bg-ds-muted flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-ds-ink-muted" />
                </div>
                <p className="text-lg font-medium">Sin alertas en esta vista</p>
                <p className="text-ds-ink-muted max-w-md mt-1">
                  {statusView === 'pendiente'       && 'No hay alertas esperando atención.'}
                  {statusView === 'en_revision'      && 'Ninguna alerta está siendo revisada.'}
                  {statusView === 'escaladas'        && 'No hay alertas escaladas en este momento.'}
                  {statusView === 'resueltas'        && 'Aún no hay alertas cerradas en esta sesión.'}
                  {statusView === 'criticas'         && 'No hay alertas críticas sin atender en este momento.'}
                  {statusView === 'baja_prioridad'   && 'No hay alertas de baja prioridad pendientes.'}
                  {statusView === 'vencidas'         && 'Ninguna alerta abierta supera las 48h. El SLA está al día.'}
                  {statusView === 'activas'          && 'No hay alertas activas. El sistema está funcionando correctamente.'}
                  {statusView === 'all'              && 'No hay alertas que coincidan con los filtros seleccionados.'}
                </p>
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {statusView !== 'activas' && (
                    <Button variant="outline" size="sm" onClick={() => setStatusView('activas')} className="rounded-xl border-0 bg-ds-muted">
                      Ver activas
                    </Button>
                  )}
                  {stats.inReview > 0 && statusView !== 'en_revision' && (
                    <Button variant="outline" size="sm" onClick={() => setStatusView('en_revision')} className="rounded-xl border-0 bg-ds-muted">
                      Ver en revisión ({stats.inReview})
                    </Button>
                  )}
                  {stats.criticalPending > 0 && statusView !== 'criticas' && (
                    <Button variant="outline" size="sm" onClick={() => setStatusView('criticas')} className="rounded-xl border-0 bg-ds-muted">
                      Ver críticas ({stats.criticalPending})
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedFilteredAlerts.map((alert, index) => (
                  <div
                    key={alert.id}
                    className={cn('animate-fade-in', index === 0 && 'animate-slide-in-up')}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <AlertCard
                      alert={alert}
                      onAction={(action, notes) => handleAlertAction(alert.id, action, notes)}
                      onEscalate={() => setEscalateAlert(alert)}
                      onLlamar={handleLlamar}
                      onReactivate={handleReactivate}
                      onShowDetails={handleShowDetails}
                      useReviewActions
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {/* Columna derecha — contexto */}
      <OperacionContextPanel alerts={localAlerts} />

      {/* Modales */}
      <AlertDialog
        alert={priorityAlert}
        onClose={() => setPriorityAlert(null)}
        onAction={(action: 'acknowledge' | 'resolve' | 'escalate' | 'discard', notes?: string) => {
          if (priorityAlert) handleAlertAction(priorityAlert.id, action, notes)
        }}
        onEscalate={() => {
          setEscalateAlert(priorityAlert)
          setPriorityAlert(null)
        }}
        onLlamar={handleLlamar}
      />

      <AlertPopup
        alert={selectedAlert}
        open={showPopup}
        onOpenChange={setShowPopup}
        onAction={handlePopupAction}
        onEscalate={() => {
          if (selectedAlert) setEscalateAlert(selectedAlert)
        }}
        onLlamar={handleLlamar}
        recentAlerts={selectedAlert ? localAlerts.filter(a => a.camera?.id === selectedAlert.camera?.id) : []}
      />

      <EscalateSheet
        alert={escalateAlert}
        onClose={() => setEscalateAlert(null)}
        onSuccess={() => {
          if (escalateAlert) handleAlertAction(escalateAlert.id, 'escalate')
          setEscalateAlert(null)
        }}
      />
    </div>
  )
}

// useSearchParams exige un límite de Suspense en App Router
export default function OperacionPage() {
  return (
    <Suspense fallback={null}>
      <OperacionPageContent />
    </Suspense>
  )
}
