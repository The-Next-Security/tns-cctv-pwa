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
    <div className="min-h-screen bg-background">
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
          <div className="fixed left-0 top-0 z-50 lg:hidden animate-slide-in-up">
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

      {/* Main content - with bottom padding for mobile nav */}
      <main
        className={cn(
          'pt-16 pb-20 lg:pb-0 transition-all duration-300 ease-out',
          sidebarCollapsed ? 'lg:pl-[68px]' : 'lg:pl-60'
        )}
      >
        <div className="p-4 lg:p-6 animate-fade-in">
          {children}
        </div>
      </main>

      {/* Mobile bottom navigation - thumb-friendly */}
      <MobileNav />

      <Toaster position="top-right" />
    </div>
  )
}
