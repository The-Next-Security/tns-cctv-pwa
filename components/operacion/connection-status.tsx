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
        'gap-1 px-2 py-0.5 text-[11px] sm:text-xs sm:gap-1.5',
        isConnected
          ? 'border-status-connected/30 bg-status-connected-bg text-status-connected'
          : 'border-status-disconnected/30 bg-status-disconnected-bg text-status-disconnected'
      )}
    >
      {isConnected ? (
        <>
          <Wifi className="h-3 w-3 shrink-0" />
          <span className="sm:hidden">OK</span>
          <span className="hidden sm:inline">Conectado</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3 shrink-0" />
          <span className="sm:hidden">Off</span>
          <span className="hidden sm:inline">Desconectado</span>
        </>
      )}
    </Badge>
  )
}
