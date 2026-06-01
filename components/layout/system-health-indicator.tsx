'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { health } from '@/lib/api'
import type { SystemHealth, NvrHealth } from '@/lib/types'

type OverallStatus = 'ok' | 'degraded' | 'down' | 'loading' | 'error'

export function SystemHealthIndicator() {
  const [status, setStatus] = useState<OverallStatus>('loading')
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [nvrHealth, setNvrHealth] = useState<NvrHealth[]>([])

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, 30_000) // Actualizar cada 30s
    return () => clearInterval(interval)
  }, [])

  async function fetchHealth() {
    try {
      const [system, nvrs] = await Promise.all([
        health.system(),
        health.nvrs(),
      ])
      setSystemHealth(system)
      setNvrHealth(nvrs)
      
      // Determinar estado general
      const hasDownNvr = nvrs.some(n => n.status === 'down')
      const hasDegradedNvr = nvrs.some(n => n.status === 'degraded')
      const systemDegraded = system.db !== 'ok' || system.redis !== 'ok'
      
      if (system.db === 'down' || system.redis === 'down' || hasDownNvr) {
        setStatus('down')
      } else if (systemDegraded || hasDegradedNvr || system.queue_depth > 100) {
        setStatus('degraded')
      } else {
        setStatus('ok')
      }
    } catch {
      setStatus('error')
    }
  }

  function getStatusColor(s: OverallStatus): string {
    switch (s) {
      case 'ok':
        return 'bg-status-ok'
      case 'degraded':
        return 'bg-status-degraded'
      case 'down':
      case 'error':
        return 'bg-status-down animate-criticality-pulse'
      case 'loading':
        return 'bg-muted-foreground/50'
    }
  }

  function getStatusLabel(s: OverallStatus): string {
    switch (s) {
      case 'ok':
        return 'Sistema operativo'
      case 'degraded':
        return 'Sistema degradado'
      case 'down':
        return 'Sistema con fallas'
      case 'error':
        return 'Error de conexion'
      case 'loading':
        return 'Verificando...'
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent transition-colors">
            <span
              className={cn(
                'h-2.5 w-2.5 rounded-full',
                getStatusColor(status)
              )}
            />
            <span className="text-sm font-medium text-zinc-400 hidden sm:inline antialiased">
              {getStatusLabel(status)}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2 text-xs">
            <p className="font-medium">{getStatusLabel(status)}</p>
            {systemHealth && (
              <div className="space-y-1">
                <p>Base de datos: <span className={cn(systemHealth.db === 'ok' ? 'text-status-ok' : 'text-status-down')}>{systemHealth.db}</span></p>
                <p>Redis: <span className={cn(systemHealth.redis === 'ok' ? 'text-status-ok' : 'text-status-down')}>{systemHealth.redis}</span></p>
                <p>Cola: <span className="text-live-data font-semibold text-zinc-200">{systemHealth.queue_depth}</span> eventos</p>
              </div>
            )}
            {nvrHealth.length > 0 && (
              <div className="border-t border-border pt-2">
                <p className="font-medium mb-1">NVRs:</p>
                {nvrHealth.map(nvr => (
                  <p key={nvr.id} className="flex justify-between">
                    <span>{nvr.code}</span>
                    <span className={cn(
                      'text-live-data font-semibold',
                      nvr.status === 'ok' ? 'text-status-ok' : 
                      nvr.status === 'degraded' ? 'text-status-degraded' : 
                      'text-status-down'
                    )}>
                      {nvr.status} ({nvr.latency_ms}ms)
                    </span>
                  </p>
                ))}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
