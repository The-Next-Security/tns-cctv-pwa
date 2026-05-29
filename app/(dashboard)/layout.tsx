'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { TopBar } from '@/components/layout/top-bar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { Toaster } from '@/components/ui/sonner'
import { useAuth, canAccessRoute } from '@/lib/auth'
import { cn } from '@/lib/utils'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Redirigir a login si no hay usuario
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  // Verificar permisos
  useEffect(() => {
    if (user && !canAccessRoute(user.role, pathname)) {
      router.push('/operacion')
    }
  }, [user, pathname, router])

  // Cerrar menu al cambiar ruta
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Mostrar loading mientras se verifica autenticación
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  // No renderizar nada si no hay usuario (se está redirigiendo)
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen dashboard-canvas">
      {/* Sidebar desktop */}
      <div className="hidden lg:block">
        <AppSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile sidebar overlay - glassmorphism */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed left-0 top-0 z-50 h-full w-[min(100vw,280px)] lg:hidden animate-fade-in">
            <AppSidebar
              collapsed={false}
              onToggle={() => setMobileMenuOpen(false)}
            />
          </div>
        </>
      )}

      {/* Top bar */}
      <TopBar
        onMobileMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        sidebarCollapsed={sidebarCollapsed}
      />

      {/* Main content — mobile-first padding + bottom nav clearance */}
      <main
        className={cn(
          'min-h-screen transition-all duration-300 ease-out',
          'pt-[var(--topbar-height-mobile)] pb-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom,0px))]',
          'lg:pt-[var(--topbar-height)] lg:pb-6',
          sidebarCollapsed ? 'lg:pl-[68px]' : 'lg:pl-[var(--sidebar-width)]'
        )}
      >
        <div className="page-content animate-fade-in">
          {children}
        </div>
      </main>

      {/* Mobile bottom navigation - thumb-friendly */}
      <MobileNav />

      <Toaster position="top-center" className="sm:!top-right" />
    </div>
  )
}
