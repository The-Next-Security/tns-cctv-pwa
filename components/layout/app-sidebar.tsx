'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  AlertTriangle, 
  Car, 
  FileText, 
  Settings, 
  BarChart3, 
  Activity,
  Users,
  MapPin,
  Camera,
  Server,
  Building2,
  Cog,
  ChevronLeft,
  ChevronRight,
  Menu,
  PanelLeftClose,
  PanelLeft,
  LifeBuoy,
  X,
} from 'lucide-react'
import { BrandLogo } from '@/components/brand/brand-logo'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useUser, hasPermission } from '@/lib/auth'
import type { Role } from '@/lib/types'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  permission?: string
  children?: NavItem[]
}

const navItems: NavItem[] = [
  {
    label: 'Operacion',
    href: '/operacion',
    icon: AlertTriangle,
    permission: 'alerts.view',
  },
  {
    label: 'Recepcion',
    href: '/recepcion',
    icon: Car,
    permission: 'vehicle_entries.create',
  },
  {
    label: 'Infracciones Vel.',
    href: '/expedientes',
    icon: FileText,
    permission: 'case_files.view',
  },
  {
    label: 'Reglas',
    href: '/reglas',
    icon: Settings,
    permission: 'rules.manage',
  },
  {
    label: 'Reportes',
    href: '/reportes',
    icon: BarChart3,
    permission: 'reports.view',
  },
  {
    label: 'Salud',
    href: '/salud',
    icon: Activity,
    permission: 'health.view',
  },
  {
    label: 'Admin',
    href: '/admin',
    icon: Cog,
    permission: 'users.manage',
    children: [
      { label: 'Usuarios', href: '/admin/usuarios', icon: Users, permission: 'users.manage' },
      { label: 'Zonas', href: '/admin/zonas', icon: MapPin, permission: 'nvrs.manage' },
      { label: 'Camaras', href: '/admin/camaras', icon: Camera, permission: 'nvrs.manage' },
      { label: 'NVRs', href: '/admin/nvrs', icon: Server, permission: 'nvrs.manage' },
      { label: 'Tenants', href: '/admin/tenants', icon: Building2, permission: 'nvrs.manage' },
      { label: 'Configuracion', href: '/admin/configuracion', icon: Cog, permission: 'config.manage' },
    ],
  },
]

function filterNavItems(items: NavItem[], role: Role | undefined): NavItem[] {
  return items
    .filter(item => !item.permission || hasPermission(role, item.permission))
    .map(item => ({
      ...item,
      children: item.children ? filterNavItems(item.children, role) : undefined,
    }))
    .filter(item => !item.children || item.children.length > 0)
}

interface AppSidebarProps {
  collapsed: boolean
  onToggle: () => void
  /** En el overlay móvil onToggle cierra el menú (no colapsa la barra). */
  mobile?: boolean
}

export function AppSidebar({ collapsed, onToggle, mobile = false }: AppSidebarProps) {
  const pathname = usePathname()
  const { user } = useUser()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const filteredItems = filterNavItems(navItems, user?.role)

  // Auto-expandir el item si la ruta actual esta en sus hijos
  useEffect(() => {
    const parentItem = filteredItems.find(item => 
      item.children?.some(child => pathname.startsWith(child.href))
    )
    if (parentItem && !expandedItems.includes(parentItem.href)) {
      setExpandedItems(prev => [...prev, parentItem.href])
    }
  }, [pathname, filteredItems, expandedItems])

  function toggleExpanded(href: string) {
    setExpandedItems(prev =>
      prev.includes(href)
        ? prev.filter(h => h !== href)
        : [...prev, href]
    )
  }

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          // h-full (no h-screen): en fixed, el % resuelve contra el viewport
          // dinámico — 100vh desborda en iOS Safari con la barra de URL visible.
          'fixed left-0 top-0 z-40 h-full flex flex-col bg-ds-surface border-r border-ds-hairline transition-all duration-300 ease-out',
          collapsed ? 'w-[68px]' : 'w-[var(--sidebar-width)]'
        )}
      >
        {/* Logo */}
        <div className="flex h-[4.5rem] items-center justify-between border-b border-ds-hairline/60 px-4 lg:px-5">
          {!collapsed ? (
            <BrandLogo variant="full" subtitle="Track · Parque Agrolivo" href="/operacion" priority />
          ) : (
            <div className="mx-auto w-full flex justify-center">
              <BrandLogo variant="mark" subtitle={null} href="/operacion" priority />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 scrollbar-hide">
          <ul className="space-y-1 px-3">
            {filteredItems.map(item => (
              <li key={item.href}>
                {item.children ? (
                  // Item con hijos
                  <>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              'flex w-full items-center justify-center rounded-xl p-3 text-ds-ink-muted hover:bg-ds-page hover:text-ds-ink-display transition-all duration-200 touch-target',
                              isActive(item.href) && 'bg-primary text-primary-foreground shadow-soft-sm'
                            )}
                          >
                            <item.icon size={18} />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="glass">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <>
                        <div
                          className={cn(
                            'flex w-full items-center rounded-xl text-sm font-medium text-ds-ink-muted hover:bg-ds-page hover:text-ds-ink-display transition-all duration-200',
                            isActive(item.href) && 'bg-primary text-primary-foreground shadow-soft-sm'
                          )}
                        >
                          <Link
                            href={item.href}
                            className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5"
                          >
                            <item.icon size={18} className="shrink-0" />
                            <span className="flex-1 truncate text-left">{item.label}</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => toggleExpanded(item.href)}
                            aria-label={`${expandedItems.includes(item.href) ? 'Colapsar' : 'Expandir'} ${item.label}`}
                            aria-expanded={expandedItems.includes(item.href)}
                            className="flex shrink-0 items-center justify-center rounded-r-xl px-3 py-2.5"
                          >
                            <ChevronRight
                              className={cn(
                                'h-4 w-4 transition-transform duration-200',
                                expandedItems.includes(item.href) && 'rotate-90'
                              )}
                            />
                          </button>
                        </div>
                        <div
                          className={cn(
                            'overflow-hidden transition-all duration-200',
                            expandedItems.includes(item.href) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                          )}
                        >
                          <ul className="mt-1 space-y-0.5 pl-4 border-l border-ds-hairline ml-5">
                            {item.children.map(child => (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
                                  className={cn(
                                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ds-ink-muted hover:bg-ds-page hover:text-ds-ink-display transition-all duration-200',
                                    isActive(child.href) && 'bg-ds-page text-ds-ink-display font-medium'
                                  )}
                                >
                                  <child.icon size={16} className="shrink-0" />
                                  <span>{child.label}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  // Item simple
                  collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center justify-center rounded-xl p-3 text-ds-ink-muted hover:bg-ds-page hover:text-ds-ink-display transition-all duration-200 touch-target',
                            isActive(item.href) && 'bg-primary text-primary-foreground shadow-soft-sm'
                          )}
                        >
                          <item.icon size={18} />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="glass">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ds-ink-muted hover:bg-ds-page hover:text-ds-ink-display transition-all duration-200',
                        isActive(item.href) && 'bg-primary text-primary-foreground shadow-soft-sm'
                      )}
                    >
                      <item.icon size={18} className="shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  )
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Banner soporte */}
        {!collapsed && (
          <div className="mx-3 mb-3 rounded-2xl bg-accent p-4 border border-[var(--crextio-gold-strong)]/25">
            <div className="flex items-start gap-3">
              <div className="icon-box icon-box-accent shrink-0">
                <LifeBuoy size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-ds-ink-display font-ds-display">Soporte TNS</p>
                <p className="text-caption mt-0.5">Asistencia 24/7 para incidentes criticos</p>
              </div>
            </div>
          </div>
        )}

        {/* Theme toggle */}
        {!collapsed && (
          <div className="mx-3 mb-2">
            <ThemeToggle block className="w-full" />
          </div>
        )}

        {/* Perfil / toggle */}
        <div className="border-t border-ds-hairline p-3 space-y-2">
          {!collapsed && user && (
            <div className="flex items-center gap-3 rounded-xl px-2 py-2">
              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ds-accent-faded text-ds-ink-display text-xs font-semibold">
                  {(user.nombre ?? user.email).slice(0, 2).toUpperCase()}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[var(--success)] ring-2 ring-ds-surface" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate text-ds-ink-display">{user.nombre ?? user.email.split('@')[0]}</p>
                <p className="text-caption truncate">{user.email}</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="w-full justify-center rounded-xl h-10 hover:bg-ds-page touch-target"
            aria-label={mobile ? 'Cerrar menú' : collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          >
            {mobile ? (
              <>
                <X size={16} className="mr-2" />
                <span className="text-sm">Cerrar menú</span>
              </>
            ) : collapsed ? (
              <PanelLeft size={16} />
            ) : (
              <>
                <PanelLeftClose size={16} className="mr-2" />
                <span className="text-sm">Colapsar</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}

// Mobile trigger
export function SidebarTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" onClick={onClick} className="lg:hidden rounded-xl touch-target">
      <Menu size={20} />
      <span className="sr-only">Abrir menu</span>
    </Button>
  )
}
