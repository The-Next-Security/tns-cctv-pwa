'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Filter, RefreshCw, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { AlertCard } from '@/components/operacion/alert-card'
import { AlertDialog } from '@/components/operacion/alert-dialog'
import { AlertPopup } from '@/components/operacion/alert-popup'
import { EscalateSheet } from '@/components/operacion/escalate-sheet'
import { ConnectionStatus } from '@/components/operacion/connection-status'
import { useRealtime } from '@/hooks/use-realtime'
import { MOCK_ALERTS, MOCK_ZONES } from '@/lib/mock-data'
import { CRITICALITY_STYLES, CRITICALITY_LABELS } from '@/lib/constants'
import type { Alert, Criticality } from '@/lib/types'
import { cn } from '@/lib/utils'

export default function OperacionPage() {
  const [statusFilter, setStatusFilter] = useState<string>('pendiente')
  const [zoneFilter, setZoneFilter] = useState<string>('all')
  const [criticalityFilter, setCriticalityFilter] = useState<string>('all')
  const [priorityAlert, setPriorityAlert] = useState<Alert | null>(null)
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [showPopup, setShowPopup] = useState(false)
  const [escalateAlert, setEscalateAlert] = useState<Alert | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [localAlerts, setLocalAlerts] = useState<Alert[]>(MOCK_ALERTS)
  const [isLoading, setIsLoading] = useState(true)

  // Simular carga inicial
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 800)
    return () => clearTimeout(timer)
  }, [])

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

  useRealtime({
    onAlertNew: handleNewAlert,
    onAlertUpdated: handleAlertUpdated,
  })

  // Filter alerts
  const filteredAlerts = localAlerts.filter(alert => {
    // Status filter
    if (statusFilter !== 'all' && alert.status !== statusFilter) return false
    // Zone filter
    if (zoneFilter !== 'all' && alert.zone_id !== parseInt(zoneFilter)) return false
    // Criticality filter
    if (criticalityFilter === 'alta_critica') {
      return alert.criticality === 'alta' || alert.criticality === 'critica'
    }
    if (criticalityFilter !== 'all' && alert.criticality !== criticalityFilter) return false
    return true
  })

  const pendingAlerts = filteredAlerts.filter(a => a.status === 'pendiente' || a.status === 'en_revision')
  const historyAlerts = filteredAlerts.filter(a => a.status === 'resuelta' || a.status === 'escalada')

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
    }
    setShowPopup(false)
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Consola Operativa</h1>
          <p className="text-muted-foreground">
            Monitoreo de alertas en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionStatus />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En Revision</p>
                <p className="text-2xl font-bold text-blue-500">{stats.inReview}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resueltas Hoy</p>
                <p className="text-2xl font-bold text-green-500">{stats.resolved}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Criticas</p>
                <p className="text-2xl font-bold text-red-500">{stats.critical}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-auto">
              <TabsList>
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="pendiente">
                  Pendientes
                  {stats.pending > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                      {stats.pending}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Tabs value={criticalityFilter} onValueChange={setCriticalityFilter} className="w-auto">
              <TabsList>
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="alta_critica" className="text-destructive">
                  Alta/Critica
                  {stats.critical > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                      {stats.critical}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={zoneFilter} onValueChange={setZoneFilter}>
              <SelectTrigger className="w-[180px]">
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

            <Button variant="outline" size="icon" onClick={handleRefresh} className="ml-auto">
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              <span className="sr-only">Actualizar</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="h-6 w-20 bg-muted rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-48 bg-muted rounded" />
                    <div className="h-4 w-32 bg-muted rounded" />
                  </div>
                  <div className="h-9 w-24 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : pendingAlerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-lg font-medium">Sin alertas pendientes</p>
            <p className="text-muted-foreground">
              El sistema esta funcionando correctamente
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pendingAlerts.map((alert, index) => (
            <div
              key={alert.id}
              className={cn(
                "animate-fade-in",
                index === 0 && "animate-slide-in-up"
              )}
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
        </div>
      )}

      {/* History Section */}
      {historyAlerts.length > 0 && (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span>Historico cerrado (ultimas 4h) - {historyAlerts.length} alertas</span>
              <span className={cn(
                'transition-transform duration-200',
                historyOpen && 'rotate-180'
              )}>
                ▼
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            {historyAlerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAction={() => {}}
                onEscalate={() => {}}
                readonly
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Priority Alert Dialog */}
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
