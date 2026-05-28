'use client'

import { useState, useEffect } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true)
  const [lastPing, setLastPing] = useState<Date>(new Date())

  // This would be replaced with actual WebSocket connection status
  useEffect(() => {
    // Simulate connection check
    const interval = setInterval(() => {
      // In real implementation, check socket.connected
      setLastPing(new Date())
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5',
        isConnected
          ? 'border-status-ok/30 text-status-ok'
          : 'border-status-down/30 text-status-down'
      )}
    >
      {isConnected ? (
        <>
          <Wifi className="h-3 w-3" />
          <span>Conectado</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Desconectado</span>
        </>
      )}
    </Badge>
  )
}
