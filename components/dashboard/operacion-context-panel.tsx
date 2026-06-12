'use client'

import { useState } from 'react'
import { RelativeTime } from '@/components/ui/relative-time'
import { Activity, Expand, Map, MapPin, Users, TrendingUp } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ParkMap } from '@/components/operacion/park-map'
import { ParkMapDialog } from '@/components/operacion/park-map-dialog'
import { CRITICALITY_LABELS, PARK_ZONES, getCriticalityBadgeClass } from '@/lib/constants'
import { countAlertsToday, groupAlertsByHourSlot } from '@/lib/alert-stats'
import type { ZoneCode } from '@/lib/park-map'
import type { Alert } from '@/lib/types'
import { getAlertRuleTitle } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AlertId } from '@/components/ui/alert-id'

interface OperacionContextPanelProps {
  alerts: Alert[]
  /** Filtro por zona (id de PARK_ZONES como string) al hacer clic en el mapa. */
  onZoneSelect?: (zoneId: string) => void
}

const ON_DUTY = [
  { name: 'Carlos Rodriguez', role: 'Supervisor', status: 'online' as const },
  { name: 'Maria Soto', role: 'Operador', status: 'online' as const },
  { name: 'Pedro Nunez', role: 'Recepcion', status: 'away' as const },
]

export function OperacionContextPanel({ alerts, onZoneSelect }: OperacionContextPanelProps) {
  const [mapExpanded, setMapExpanded] = useState(false)

  // El mapa habla en códigos estables (zone-1…); el filtro de la consola, en ids.
  const handleZoneClick =
    onZoneSelect !== undefined
      ? (zoneCode: ZoneCode) => {
          const zone = PARK_ZONES.find(z => z.code === zoneCode)
          if (zone) onZoneSelect(String(zone.id))
        }
      : undefined

  const recentActivity = [...alerts]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5)

  const zoneCounts = alerts.reduce<Record<string, number>>((acc, alert) => {
    const name = alert.zone?.name ?? 'Sin zona'
    acc[name] = (acc[name] ?? 0) + 1
    return acc
  }, {})

  const zoneEntries = Object.entries(zoneCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  const chartBars = groupAlertsByHourSlot(alerts)
  const alertsToday = countAlertsToday(alerts)
  const maxBar = Math.max(...chartBars.map(b => b.value), 1)
  const peakBar = chartBars.reduce((best, bar) => (bar.value > best.value ? bar : best), chartBars[0])

  return (
    <aside className="flex flex-col gap-3 sm:gap-6 w-full xl:w-[340px] shrink-0">
      {/* Mapa del parque — zonas encendidas según alertas activas */}
      <section className="soft-card soft-card-compact panel-compact">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="icon-box icon-box-accent">
              <Map className="h-4 w-4" />
            </div>
            <h3 className="text-section truncate">Mapa del parque</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Expandir mapa del parque"
            className="h-8 w-8 shrink-0 rounded-lg"
            onClick={() => setMapExpanded(true)}
          >
            <Expand size={16} />
          </Button>
        </div>
        <ParkMap alerts={alerts} variant="mini" onZoneClick={handleZoneClick} />
        <p className="text-caption mt-2">Toque una zona para filtrar sus alertas</p>
      </section>

      <ParkMapDialog
        alerts={alerts}
        open={mapExpanded}
        onOpenChange={setMapExpanded}
        onZoneClick={handleZoneClick}
      />

      {/* Actividad reciente — oculta en móvil para priorizar alertas */}
      <section className="soft-card soft-card-compact panel-compact hidden md:block">
        <div className="flex items-center gap-2 mb-4">
          <div className="icon-box icon-box-neutral">
            <Activity className="h-4 w-4" />
          </div>
          <h3 className="text-section">Actividad reciente</h3>
        </div>
        <ul className="space-y-0 divide-y divide-border">
          {recentActivity.map(alert => (
            <li key={alert.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-body font-medium line-clamp-1 min-w-0">
                  {getAlertRuleTitle(alert)}
                </p>
                <AlertId externalEventId={alert.external_event_id} fallbackId={alert.id} variant="compact" />
              </div>
              <div className="flex items-center justify-between mt-1 gap-2">
                <RelativeTime date={alert.timestamp} className="text-caption text-live-data" />
                <span
                  className={getCriticalityBadgeClass(
                    alert.criticality,
                    alert.criticality === 'critica'
                  )}
                >
                  {CRITICALITY_LABELS[alert.criticality]}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Alertas por zona */}
      <section className="soft-card soft-card-compact panel-compact">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <div className="icon-box icon-box-warning">
            <MapPin className="h-4 w-4" />
          </div>
          <h3 className="text-section">Alertas por zona</h3>
        </div>
        <ul className="space-y-2 sm:space-y-3">
          {zoneEntries.map(([zone, count]) => (
            <li key={zone} className="flex items-center justify-between gap-3">
              <span className="text-body truncate">{zone}</span>
              <div className="flex items-center gap-2 shrink-0">
                <div className="h-1.5 w-16 rounded-full bg-ds-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--crextio-gold-strong)] transition-all"
                    style={{ width: `${Math.min(100, (count / alerts.length) * 100)}%` }}
                  />
                </div>
                <span className="text-caption text-live-data font-semibold w-4 text-right">{count}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Operadores en turno — tablet+ */}
      <section className="soft-card soft-card-compact panel-compact hidden sm:block">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <div className="icon-box icon-box-success">
            <Users className="h-4 w-4" />
          </div>
          <h3 className="text-section">En turno ahora</h3>
        </div>
        <ul className="space-y-2 sm:space-y-3">
          {ON_DUTY.map(person => (
            <li key={person.name} className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-accent/60 text-ds-ink-display text-xs font-semibold">
                    {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-ds-surface',
                    person.status === 'online' ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'
                  )}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-body font-medium truncate">{person.name}</p>
                <p className="text-caption">{person.role}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Mini grafico — alertas hoy */}
      <section className="soft-card soft-card-compact panel-compact">
        <div className="flex items-start justify-between gap-2 sm:gap-3 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="icon-box icon-box-accent shrink-0 h-8 w-8 sm:h-9 sm:w-9">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <h3 className="text-section text-sm sm:text-base truncate">Alertas hoy</h3>
          </div>
          <span className="text-live-data text-caption font-semibold text-[var(--cctv-accent-blue)] shrink-0">
            {alertsToday}
          </span>
        </div>
        <p className="text-[10px] sm:text-caption mb-3 sm:mb-4 pl-0 sm:pl-11">Por franja · 2 h</p>
        <div className="flex items-end justify-between gap-1 sm:gap-1.5 h-20 sm:h-28">
          {chartBars.map(bar => {
            const isPeak = bar.value > 0 && bar.value === peakBar.value
            return (
              <div
                key={bar.label}
                className="group/bar flex flex-col items-center gap-1 flex-1 min-w-0"
                title={`${bar.label}–${String(bar.hour + 2).padStart(2, '0')}h: ${bar.value} alerta${bar.value === 1 ? '' : 's'}`}
              >
                <span
                  className={cn(
                    'text-live-data text-[10px] font-semibold leading-none transition-opacity',
                    bar.value > 0 ? 'text-[var(--cctv-accent-blue)] opacity-100' : 'text-transparent'
                  )}
                >
                  {bar.value}
                </span>
                <div className="relative w-full flex-1 flex items-end min-h-[4px]">
                  <div
                    className={cn(
                      'w-full rounded-t-md transition-all duration-300',
                      isPeak
                        ? 'bg-gradient-to-t from-[var(--crextio-gold-strong)]/75 to-[var(--crextio-gold-strong)]'
                        : 'bg-gradient-to-t from-[var(--crextio-gold)]/55 to-[var(--crextio-gold-strong)] group-hover/bar:from-[var(--crextio-gold)]/70 group-hover/bar:to-[var(--crextio-gold-strong)]'
                    )}
                    style={{
                      height: `${Math.max((bar.value / maxBar) * 100, bar.value > 0 ? 12 : 0)}%`,
                      minHeight: bar.value > 0 ? '10px' : '2px',
                    }}
                  />
                </div>
                <span className="text-[9px] text-ds-ink-muted text-live-data font-medium">{bar.label}</span>
              </div>
            )
          })}
        </div>
        {peakBar.value > 0 && (
          <p className="text-caption mt-3 text-center">
            Mayor actividad: {peakBar.label}–{String(peakBar.hour + 2).padStart(2, '0')}h ({peakBar.value})
          </p>
        )}
      </section>
    </aside>
  )
}
