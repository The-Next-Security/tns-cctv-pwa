'use client'

import { Wifi, WifiOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ConnectionStatusProps {
  /** Estado del WebSocket `/realtime` (Socket.IO) */
  isConnected: boolean
}

export function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5',
        isConnected
          ? 'border-status-connected/30 bg-status-connected-bg text-status-connected'
          : 'border-status-disconnected/30 bg-status-disconnected-bg text-status-disconnected'
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
