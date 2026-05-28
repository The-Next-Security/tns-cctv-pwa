'use client'

import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import type { Alert, NvrHealthStatus } from '@/lib/types'

interface UseRealtimeHandlers {
  onAlertNew?: (alert: Alert) => void
  onAlertUpdated?: (alert: Alert) => void
  onCaseNew?: (caseFile: unknown) => void
  onNvrStatusChanged?: (data: { nvr_id: number; status: NvrHealthStatus }) => void
  onSystemDegraded?: (data: { reason: string }) => void
}

export function useRealtime(handlers: UseRealtimeHandlers) {
  const socketRef = useRef<Socket | null>(null)
  const handlersRef = useRef(handlers)
  
  // Actualizar referencia de handlers sin reconectar
  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  useEffect(() => {
    const token = localStorage.getItem('tns_token')
    if (!token) return

    const socket = io('/realtime', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelayMax: 10_000,
    })

    socketRef.current = socket

    socket.on('alert:new', (alert: Alert) => {
      handlersRef.current.onAlertNew?.(alert)
    })

    socket.on('alert:updated', (alert: Alert) => {
      handlersRef.current.onAlertUpdated?.(alert)
    })

    socket.on('case:new', (caseFile: unknown) => {
      handlersRef.current.onCaseNew?.(caseFile)
    })

    socket.on('nvr:status_changed', (data: { nvr_id: number; status: NvrHealthStatus }) => {
      handlersRef.current.onNvrStatusChanged?.(data)
    })

    socket.on('system:degraded', (data: { reason: string }) => {
      handlersRef.current.onSystemDegraded?.(data)
    })

    // Heartbeat para mantener la sesión activa
    const heartbeatInterval = setInterval(() => {
      socket.emit('presence:heartbeat')
    }, 30_000)

    return () => {
      clearInterval(heartbeatInterval)
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  const subscribeToAlert = useCallback((alertId: number) => {
    socketRef.current?.emit('alert:subscribe', { alert_id: alertId })
  }, [])

  const isConnected = useCallback(() => {
    return socketRef.current?.connected ?? false
  }, [])

  return {
    subscribeToAlert,
    isConnected,
  }
}
