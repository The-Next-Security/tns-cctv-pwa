'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/auth'
import { ROLE_LABELS } from '@/lib/types'
import { SystemHealthIndicator } from './system-health-indicator'
import { BrandLogo } from '@/components/brand/brand-logo'
import { SidebarTrigger } from './app-sidebar'
import { cn } from '@/lib/utils'
import { resetDemoState } from '@/lib/reset-demo'
import { toast } from 'sonner'

interface TopBarProps {
  onMobileMenuClick: () => void
  sidebarCollapsed: boolean
}

export function TopBar({ onMobileMenuClick, sidebarCollapsed }: TopBarProps) {
  const { user, logout } = useAuth()
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  function getInitials(name: string | undefined): string {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(n => n[0])
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // QA-14 (#55): el provider llena `nombre` (de /auth/me), no `full_name`.
  const displayName = user?.nombre ?? user?.full_name ?? user?.email?.split('@')[0]

  async function handleLogout() {
    await logout()
    router.push('/login')
  }

  function handleResetDemo() {
    toast.success('Demo reiniciada', {
      description: 'Alertas, zonas, cámaras y expedientes vuelven a los datos de ejemplo.',
    })
    window.setTimeout(() => resetDemoState(), 120)
  }

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 flex items-center justify-between bg-ds-surface/95 backdrop-blur-md border-b border-ds-hairline safe-top',
        'h-[var(--topbar-height-mobile)] px-3 lg:h-[var(--topbar-height)] lg:px-6',
        'transition-all duration-300 ease-out',
        'left-0 lg:left-[var(--sidebar-width)]',
        sidebarCollapsed && 'lg:left-[68px]'
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <SidebarTrigger onClick={onMobileMenuClick} />
        <div className="min-w-0 flex-1 lg:hidden">
          <BrandLogo
            variant="full"
            subtitle={null}
            href="/operacion"
            className="max-w-[140px] sm:max-w-[180px]"
            imageClassName="!h-7 !w-auto"
          />
        </div>
        <SystemHealthIndicator />
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {/* User menu */}
        {mounted && user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-1.5 sm:px-2 rounded-xl touch-target h-9 sm:h-10">
                <Avatar className="h-8 w-8 sm:h-9 sm:w-9 ring-2 ring-primary/20">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden flex-col items-start text-left md:flex">
                  <span className="text-sm font-medium text-ds-ink-display antialiased">{displayName}</span>
                  <span className="text-xs text-ds-ink-muted font-medium antialiased">
                    {ROLE_LABELS[user.role]}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 glass-strong">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{displayName}</span>
                  <span className="text-xs font-normal text-ds-ink-muted font-ds-body">
                    {user.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleResetDemo} className="rounded-lg">
                <RotateCcw className="mr-2 h-4 w-4" />
                Reiniciar demo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="rounded-lg text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
