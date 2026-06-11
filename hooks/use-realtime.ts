'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import type { Alert, NvrHealthStatus } from '@/lib/types'

// Payload real que emite el backend (src/wsHub.js) en /ws/operations.
export interface EventPopupData {
  event_id: string
  tenant_id: string
  site_id: string
  severity: string
  is_critical: boolean
  occurred_at: string
}

interface UseRealtimeHandlers {
  onAlertNew?: (alert: Alert) => void
  onAlertUpdated?: (alert: Alert) => void
  onEventPopup?: (data: EventPopupData) => void
  onCaseNew?: (caseFile: unknown) => void
  onNvrStatusChanged?: (data: { nvr_id: number; status: NvrHealthStatus }) => void
  onSystemDegraded?: (data: { reason: string }) => void
}

const HEARTBEAT_INTERVAL_MS = 30_000
const RECONNECT_BASE_DELAY_MS = 1_000
const RECONNECT_MAX_DELAY_MS = 10_000

function resolveWsUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_WS_URL
  if (explicit) return explicit
  // El proxy rewrites() de Next no cubre upgrade de WebSocket: conectar directo al backend.
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${window.location.hostname}:4000/ws/operations`
}

export function useRealtime(handlers: UseRealtimeHandlers) {
  const socketRef = useRef<WebSocket | null>(null)
  const handlersRef = useRef(handlers)
  const [connected, setConnected] = useState(false)

  // Actualizar referencia de handlers sin reconectar
  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  useEffect(() => {
    const token = localStorage.getItem('tns_token')
    if (!token) return

    let disposed = false
    let attempts = 0
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const clearTimers = () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer)
      if (reconnectTimer) clearTimeout(reconnectTimer)
      heartbeatTimer = null
      reconnectTimer = null
    }

    const connect = () => {
      if (disposed) return
      const ws = new WebSocket(resolveWsUrl())
      socketRef.current = ws

      ws.onopen = () => {
        attempts = 0
        setConnected(true)
        ws.send(JSON.stringify({ type: 'subscribe.filters', data: {} }))
        heartbeatTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'presence.heartbeat' }))
          }
        }, HEARTBEAT_INTERVAL_MS)
      }

      ws.onmessage = (event) => {
        let msg: { type?: string; data?: unknown }
        try {
          msg = JSON.parse(event.data as string)
        } catch {
          return
        }
        switch (msg.type) {
          case 'event.popup':
            handlersRef.current.onEventPopup?.(msg.data as EventPopupData)
            break
          case 'alert:new':
            handlersRef.current.onAlertNew?.(msg.data as Alert)
            break
          case 'alert:updated':
            handlersRef.current.onAlertUpdated?.(msg.data as Alert)
            break
          case 'case:new':
            handlersRef.current.onCaseNew?.(msg.data)
            break
          case 'nvr:status_changed':
            handlersRef.current.onNvrStatusChanged?.(msg.data as { nvr_id: number; status: NvrHealthStatus })
            break
          case 'system:degraded':
            handlersRef.current.onSystemDegraded?.(msg.data as { reason: string })
            break
          default:
            break
        }
      }

      ws.onclose = () => {
        setConnected(false)
        if (heartbeatTimer) clearInterval(heartbeatTimer)
        heartbeatTimer = null
        socketRef.current = null
        if (disposed) return
        const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** attempts, RECONNECT_MAX_DELAY_MS)
        attempts += 1
        reconnectTimer = setTimeout(connect, delay)
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect()

    return () => {
      disposed = true
      clearTimers()
      socketRef.current?.close()
      socketRef.current = null
      setConnected(false)
    }
  }, [])

  const subscribeToAlert = useCallback((_alertId: number) => {
    // El backend actual no soporta suscripción por alerta; se mantiene por compatibilidad.
  }, [])

  const isConnected = useCallback(() => {
    return socketRef.current?.readyState === WebSocket.OPEN
  }, [])

  return {
    subscribeToAlert,
    isConnected,
    connected,
  }
}
