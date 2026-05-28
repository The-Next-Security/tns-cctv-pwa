'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Shield, 
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
  PanelLeft
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
    label: 'Expedientes',
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
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
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
          'fixed left-0 top-0 z-40 h-screen flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-out',
          collapsed ? 'w-[68px]' : 'w-60'
        )}
      >
        {/* Logo - Spatial elevation */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          {!collapsed ? (
            <Link href="/" className="flex items-center gap-3 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
                <Shield className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sidebar-foreground text-sm">TNS Track</span>
                <span className="text-[10px] text-muted-foreground">Parque Agrolivo</span>
              </div>
            </Link>
          ) : (
            <Link href="/" className="mx-auto">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform hover:scale-105">
                <Shield className="h-5 w-5" />
              </div>
            </Link>
          )}
        </div>

        {/* Navigation - Thumb friendly touch targets */}
        <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
          <ul className="space-y-1 px-3">
            {filteredItems.map(item => (
              <li key={item.href}>
                {item.children ? (
                  // Item con hijos
                  <>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => toggleExpanded(item.href)}
                            className={cn(
                              'flex w-full items-center justify-center rounded-xl p-3 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 touch-target',
                              isActive(item.href) && 'bg-sidebar-accent text-sidebar-accent-foreground'
                            )}
                          >
                            <item.icon className="h-5 w-5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="glass">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <>
                        <button
                          onClick={() => toggleExpanded(item.href)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200',
                            isActive(item.href) && 'bg-sidebar-accent text-sidebar-accent-foreground'
                          )}
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                          <span className="flex-1 text-left">{item.label}</span>
                          <ChevronRight
                            className={cn(
                              'h-4 w-4 transition-transform duration-200',
                              expandedItems.includes(item.href) && 'rotate-90'
                            )}
                          />
                        </button>
                        <div
                          className={cn(
                            'overflow-hidden transition-all duration-200',
                            expandedItems.includes(item.href) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                          )}
                        >
                          <ul className="mt-1 space-y-0.5 pl-4 border-l border-sidebar-border ml-5">
                            {item.children.map(child => (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
                                  className={cn(
                                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200',
                                    isActive(child.href) && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                                  )}
                                >
                                  <child.icon className="h-4 w-4 shrink-0" />
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
                            'flex items-center justify-center rounded-xl p-3 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 touch-target',
                            isActive(item.href) && 'bg-primary/10 text-primary'
                          )}
                        >
                          <item.icon className="h-5 w-5" />
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
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200',
                        isActive(item.href) && 'bg-primary/10 text-primary'
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  )
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Toggle button - Bottom position for thumb reach */}
        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="w-full justify-center rounded-xl h-10 hover:bg-sidebar-accent"
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 mr-2" />
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
      <Menu className="h-5 w-5" />
      <span className="sr-only">Abrir menu</span>
    </Button>
  )
}
