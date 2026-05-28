'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Filter, RefreshCw, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/dashboard/stat-card'
import { OperacionContextPanel } from '@/components/dashboard/operacion-context-panel'
import { AlertCard } from '@/components/operacion/alert-card'
import { AlertDialog } from '@/components/operacion/alert-dialog'
import { AlertPopup } from '@/components/operacion/alert-popup'
import { EscalateSheet } from '@/components/operacion/escalate-sheet'
import { ConnectionStatus } from '@/components/operacion/connection-status'
import { useRealtime } from '@/hooks/use-realtime'
import { MOCK_ALERTS, MOCK_ZONES } from '@/lib/mock-data'
import { CRITICALITY_STYLES, CRITICALITY_LABELS, getCriticalityBadgeClass } from '@/lib/constants'
import { UrgencyBadge, UrgencyText } from '@/components/ui/urgency-badge'
import type { Alert, Criticality } from '@/lib/types'
import { cn } from '@/lib/utils'

type StatusView = 'activas' | 'pendiente' | 'en_revision' | 'resueltas' | 'criticas' | 'all'

const STATUS_VIEW_LABELS: Record<StatusView, string> = {
  activas: 'Alertas activas',
  pendiente: 'Pendientes de atencion',
  en_revision: 'En revision',
  resueltas: 'Resueltas hoy',
  criticas: 'Críticas sin atender',
  all: 'Todas las alertas',
}

function matchesStatusView(alert: Alert, view: StatusView): boolean {
  switch (view) {
    case 'activas':
      return alert.status === 'pendiente' || alert.status === 'en_revision'
    case 'pendiente':
      return alert.status === 'pendiente'
    case 'en_revision':
      return alert.status === 'en_revision'
    case 'resueltas':
      return alert.status === 'resuelta' || alert.status === 'escalada' || alert.status === 'descartada'
    case 'criticas':
      return alert.criticality === 'critica' && alert.status === 'pendiente'
    case 'all':
      return true
    default:
      return true
  }
}

export default function OperacionPage() {
  const [statusView, setStatusView] = useState<StatusView>('activas')
  const [zoneFilter, setZoneFilter] = useState<string>('all')
  const [criticalityFilter, setCriticalityFilter] = useState<string>('all')
  const [priorityAlert, setPriorityAlert] = useState<Alert | null>(null)
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [showPopup, setShowPopup] = useState(false)
  const [escalateAlert, setEscalateAlert] = useState<Alert | null>(null)
  const [localAlerts, setLocalAlerts] = useState<Alert[]>(MOCK_ALERTS)
  const [isLoading, setIsLoading] = useState(true)

  // Simular carga inicial
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 800)
    return () => clearTimeout(timer)
  }, [])

  // Demo: popup automático de alerta crítica al entrar a operación
  useEffect(() => {
    if (isLoading) return
    if (sessionStorage.getItem('tns_demo_alert_popup') === '1') return

    const timer = setTimeout(() => {
      const incoming = localAlerts.find(
        a => a.criticality === 'critica' && a.status === 'pendiente'
      )
      if (incoming) {
        setPriorityAlert(incoming)
        sessionStorage.setItem('tns_demo_alert_popup', '1')
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [isLoading, localAlerts])

  // Handle new alert from WebSocket (mock)
  const handleNewAlert = useCallback((alert: Alert) => {
    setLocalAlerts(prev => {
      if (prev.some(a => a.id === alert.id)) return prev
      return [alert, ...prev]
    })
    if (alert.criticality === 'alta' || alert.criticality === 'critica') {
      setPriorityAlert(alert)
    }
  }, [])

  // Handle updated alert
  const handleAlertUpdated = useCallback((alert: Alert) => {
    setLocalAlerts(prev => prev.map(a => a.id === alert.id ? alert : a))
  }, [])

  const { connected: isRealtimeConnected } = useRealtime({
    onAlertNew: handleNewAlert,
    onAlertUpdated: handleAlertUpdated,
  })

  // Filter alerts
  const filteredAlerts = localAlerts.filter(alert => {
    if (!matchesStatusView(alert, statusView)) return false
    // Zone filter
    if (zoneFilter !== 'all' && alert.zone_id !== parseInt(zoneFilter)) return false
    // Criticality filter (independent quick filter)
    if (criticalityFilter === 'alta_critica') {
      return alert.criticality === 'alta' || alert.criticality === 'critica'
    }
    if (criticalityFilter !== 'all' && alert.criticality !== criticalityFilter) return false
    return true
  })

  const pendingOnlyAlerts = filteredAlerts.filter(a => a.status === 'pendiente')
  const inReviewAlerts = filteredAlerts.filter(a => a.status === 'en_revision')
  const showGroupedActivas = statusView === 'activas'

  // Stats
  const stats = {
    pending: localAlerts.filter(a => a.status === 'pendiente').length,
    inReview: localAlerts.filter(a => a.status === 'en_revision').length,
    resolved: localAlerts.filter(a => a.status === 'resuelta').length,
    critical: localAlerts.filter(a => a.criticality === 'critica' && a.status === 'pendiente').length,
  }

  function handleRefresh() {
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 500)
  }

  function handleAlertAction(alertId: number, action: 'acknowledge' | 'resolve' | 'escalate', notes?: string) {
    setLocalAlerts(prev => prev.map(a => {
      if (a.id !== alertId) return a
      if (action === 'acknowledge') {
        return { ...a, status: 'en_revision' as const, assigned_to: 'Usuario Actual' }
      }
      if (action === 'resolve') {
        return { ...a, status: 'resuelta' as const, resolved_at: new Date().toISOString(), resolution_notes: notes }
      }
      if (action === 'escalate') {
        return { ...a, status: 'escalada' as const }
      }
      return a
    }))
    setPriorityAlert(null)

    if (action === 'acknowledge') {
      setStatusView('en_revision')
    } else if (action === 'resolve' || action === 'escalate') {
      setStatusView('resueltas')
    }
  }

  // Handler para abrir popup con detalles de alerta y snapshot
  function handleShowDetails(alert: Alert) {
    setSelectedAlert(alert)
    setShowPopup(true)
  }

  // Handler para acciones desde el popup
  function handlePopupAction(alertId: number, action: string, reason?: string) {
    if (action === 'acknowledge') {
      handleAlertAction(alertId, 'acknowledge')
    } else if (action === 'escalate') {
      handleAlertAction(alertId, 'escalate')
    } else if (action === 'discard') {
      setLocalAlerts(prev => prev.map(a => 
        a.id === alertId 
          ? { ...a, status: 'descartada' as const, discard_reason: reason as any, discard_note: '' }
          : a
      ))
      setStatusView('resueltas')
    }
    setShowPopup(false)
  }

  return (
    <div className="flex flex-col xl:flex-row gap-6 xl:gap-8">
      {/* Columna central — contenido principal (~65%) */}
      <div className="flex-1 min-w-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-caption text-primary font-semibold mb-1">Consola operativa</p>
          <h1 className="text-display">
            Monitoreo de alertas
          </h1>
          <p className="text-body text-muted-foreground mt-1">
            Gestione incidentes en tiempo real del parque Agrolivo
          </p>
        </div>
        <ConnectionStatus isConnected={isRealtimeConnected} />
      </div>

      {/* Stats Cards — orden: Criticas, Pendientes, En Revision, Resueltas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Críticas"
          value={stats.critical}
          hint="Urgentes sin atender"
          icon={XCircle}
          tone="critical"
          active={statusView === 'criticas'}
          onClick={() => setStatusView('criticas')}
        />
        <StatCard
          label="Pendientes"
          value={stats.pending}
          hint="Sin atender"
          icon={Clock}
          tone="pending"
          active={statusView === 'pendiente'}
          onClick={() => setStatusView('pendiente')}
        />
        <StatCard
          label="En Revision"
          value={stats.inReview}
          hint="Atendiendo ahora"
          icon={AlertTriangle}
          tone="review"
          active={statusView === 'en_revision'}
          onClick={() => setStatusView('en_revision')}
        />
        <StatCard
          label="Resueltas Hoy"
          value={stats.resolved}
          hint="Cerradas o escaladas"
          icon={CheckCircle2}
          tone="resolved"
          active={statusView === 'resueltas'}
          onClick={() => setStatusView('resueltas')}
        />
      </div>

      {/* Main panel */}
      <div className="soft-panel overflow-hidden">
        {/* Filters bar */}
        <div className="border-b border-border/60 px-5 py-4 lg:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />

            <Tabs value={statusView} onValueChange={(v) => setStatusView(v as StatusView)} className="w-auto">
              <TabsList className="h-10 rounded-xl bg-secondary/80 p-1">
                <TabsTrigger value="activas" className="rounded-lg px-3 data-[state=active]:bg-card data-[state=active]:shadow-card-md">
                  Activas
                  {(stats.pending + stats.inReview) > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5 bg-accent/50 text-foreground border-0">
                      {stats.pending + stats.inReview}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="pendiente"
                  className="rounded-lg px-3 data-[state=active]:bg-card data-[state=active]:shadow-card-md data-[state=active]:text-[var(--urgency-pending)]"
                >
                  Pendientes
                </TabsTrigger>
                <TabsTrigger
                  value="en_revision"
                  className="rounded-lg px-3 data-[state=active]:bg-card data-[state=active]:shadow-card-md data-[state=active]:text-[var(--urgency-review)]"
                >
                  En Revisión
                </TabsTrigger>
                <TabsTrigger
                  value="resueltas"
                  className="rounded-lg px-3 data-[state=active]:bg-card data-[state=active]:shadow-card-md data-[state=active]:text-[var(--urgency-resolved)]"
                >
                  Resueltas
                </TabsTrigger>
                <TabsTrigger value="all" className="rounded-lg px-3 data-[state=active]:bg-card data-[state=active]:shadow-card-md">Todas</TabsTrigger>
              </TabsList>
            </Tabs>

            <Tabs value={criticalityFilter} onValueChange={setCriticalityFilter} className="w-auto">
              <TabsList className="h-10 rounded-xl bg-secondary/80 p-1">
                <TabsTrigger value="all" className="rounded-lg px-3 data-[state=active]:bg-card data-[state=active]:shadow-card-md">Todas</TabsTrigger>
                <TabsTrigger
                  value="alta_critica"
                  className="rounded-lg px-3 data-[state=active]:bg-[var(--urgency-critical-bg)] data-[state=active]:shadow-card-md data-[state=active]:text-[var(--urgency-critical)] text-[var(--urgency-critical)]"
                >
                  Alta / <strong>Crítica</strong>
                  {stats.critical > 0 && (
                    <UrgencyBadge level="critical" pulse className="ml-2 h-5 px-1.5 py-0">
                      {stats.critical}
                    </UrgencyBadge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={zoneFilter} onValueChange={setZoneFilter}>
              <SelectTrigger className="w-[180px] rounded-xl border-0 bg-secondary/80 shadow-none">
                <SelectValue placeholder="Zona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las zonas</SelectItem>
                {MOCK_ZONES.map(zone => (
                  <SelectItem key={zone.id} value={String(zone.id)}>
                    {zone.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={handleRefresh} className="ml-auto rounded-xl border-0 bg-secondary/80 shadow-none hover:bg-secondary">
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              <span className="sr-only">Actualizar</span>
            </Button>
          </div>
        </div>

        {/* List header + content */}
        <div className="px-5 py-5 lg:px-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-section">
                {statusView === 'criticas' ? (
                  <>
                    <UrgencyText level="critical" pulse>Críticas</UrgencyText>
                    {' sin atender'}
                  </>
                ) : (
                  STATUS_VIEW_LABELS[statusView]
                )}
              </h2>
              <p className="text-sm text-muted-foreground">
                {filteredAlerts.length} alerta{filteredAlerts.length === 1 ? '' : 's'} en esta vista
              </p>
            </div>
            {statusView !== 'activas' && (
              <Button variant="outline" size="sm" onClick={() => setStatusView('activas')} className="rounded-xl border-0 bg-secondary/80 shadow-none">
                Volver a activas
              </Button>
            )}
          </div>

          <p className="text-caption rounded-xl bg-accent/40 px-4 py-3 border border-[var(--crextio-gold-strong)]/20">
            <span className="font-medium text-foreground">Flujo: </span>
            <UrgencyText level="pending">Pendiente</UrgencyText>
            {' → Atender → '}
            <UrgencyText level="review">En Revisión</UrgencyText>
            {' → Resolver / Escalar → '}
            <UrgencyText level="resolved">Resueltas Hoy</UrgencyText>
          </p>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="soft-card animate-pulse p-5">
              <div className="flex items-start gap-4">
                <div className="h-6 w-20 bg-muted rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-48 bg-muted rounded-lg" />
                  <div className="h-4 w-32 bg-muted rounded-lg" />
                </div>
                <div className="h-9 w-24 bg-muted rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="soft-card flex flex-col items-center justify-center py-16 text-center px-6">
          <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium">Sin alertas en esta vista</p>
          <p className="text-muted-foreground max-w-md mt-1">
            {statusView === 'pendiente' && 'No hay alertas esperando atencion. Revise las que ya estan en revision.'}
            {statusView === 'en_revision' && 'Ninguna alerta esta siendo revisada. Atienda una pendiente para comenzar.'}
            {statusView === 'resueltas' && 'Aun no hay alertas cerradas en esta sesion.'}
            {statusView === 'criticas' && 'No hay alertas críticas sin atender en este momento.'}
            {statusView === 'activas' && 'No hay alertas activas. El sistema esta funcionando correctamente.'}
            {statusView === 'all' && 'No hay alertas que coincidan con los filtros seleccionados.'}
          </p>
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {statusView !== 'activas' && (
              <Button variant="outline" size="sm" onClick={() => setStatusView('activas')} className="rounded-xl border-0 bg-secondary/80">
                Ver activas
              </Button>
            )}
            {stats.inReview > 0 && statusView !== 'en_revision' && (
              <Button variant="outline" size="sm" onClick={() => setStatusView('en_revision')} className="rounded-xl border-0 bg-secondary/80">
                Ver en revision ({stats.inReview})
              </Button>
            )}
            {stats.pending > 0 && statusView !== 'pendiente' && (
              <Button variant="outline" size="sm" onClick={() => setStatusView('pendiente')} className="rounded-xl border-0 bg-secondary/80">
                Ver pendientes ({stats.pending})
              </Button>
            )}
          </div>
        </div>
      ) : showGroupedActivas ? (
        <div className="space-y-6">
          {pendingOnlyAlerts.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <UrgencyBadge level="pending">
                  Pendientes ({pendingOnlyAlerts.length})
                </UrgencyBadge>
                <p className="text-sm text-muted-foreground">Requieren accion: Atender o Descartar</p>
              </div>
              {pendingOnlyAlerts.map((alert, index) => (
                <div
                  key={alert.id}
                  className={cn('animate-fade-in', index === 0 && 'animate-slide-in-up')}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <AlertCard
                    alert={alert}
                    onAction={(action, notes) => handleAlertAction(alert.id, action, notes)}
                    onEscalate={() => setEscalateAlert(alert)}
                    onShowDetails={handleShowDetails}
                  />
                </div>
              ))}
            </section>
          )}

          {inReviewAlerts.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <UrgencyBadge level="review">
                  En Revisión ({inReviewAlerts.length})
                </UrgencyBadge>
                <p className="text-sm text-muted-foreground">Requieren accion: Resolver o Escalar</p>
              </div>
              {inReviewAlerts.map((alert, index) => (
                <div
                  key={alert.id}
                  className={cn('animate-fade-in', index === 0 && 'animate-slide-in-up')}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <AlertCard
                    alert={alert}
                    onAction={(action, notes) => handleAlertAction(alert.id, action, notes)}
                    onEscalate={() => setEscalateAlert(alert)}
                    onShowDetails={handleShowDetails}
                  />
                </div>
              ))}
            </section>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert, index) => (
            <div
              key={alert.id}
              className={cn(
                'animate-fade-in',
                index === 0 && 'animate-slide-in-up'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <AlertCard
                alert={alert}
                onAction={(action, notes) => handleAlertAction(alert.id, action, notes)}
                onEscalate={() => setEscalateAlert(alert)}
                onShowDetails={handleShowDetails}
                readonly={alert.status === 'resuelta' || alert.status === 'escalada' || alert.status === 'descartada'}
              />
            </div>
          ))}
        </div>
      )}
        </div>
      </div>
      </div>

      {/* Columna derecha — contexto (~340px) */}
      <OperacionContextPanel alerts={localAlerts} />

      {/* Modales */}
      <AlertDialog
        alert={priorityAlert}
        onClose={() => setPriorityAlert(null)}
        onAction={(action: 'acknowledge' | 'resolve' | 'escalate', notes?: string) => {
          if (priorityAlert) {
            handleAlertAction(priorityAlert.id, action, notes)
          }
        }}
        onEscalate={() => {
          setEscalateAlert(priorityAlert)
          setPriorityAlert(null)
        }}
      />

      {/* Alert Popup with Dahua Snapshot */}
      <AlertPopup
        alert={selectedAlert}
        open={showPopup}
        onOpenChange={setShowPopup}
        onAction={handlePopupAction}
        recentAlerts={selectedAlert ? localAlerts.filter(a => a.camera?.id === selectedAlert.camera?.id) : []}
      />

      {/* Escalate Sheet */}
      <EscalateSheet
        alert={escalateAlert}
        onClose={() => setEscalateAlert(null)}
        onSuccess={() => {
          if (escalateAlert) {
            handleAlertAction(escalateAlert.id, 'escalate')
          }
          setEscalateAlert(null)
        }}
      />
    </div>
  )
}
