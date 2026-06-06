'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  AlertTriangle, 
  Car, 
  FileText, 
  BarChart3, 
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser, hasPermission } from '@/lib/auth'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  permission?: string
}

const mobileNavItems: NavItem[] = [
  {
    label: 'Alertas',
    href: '/operacion',
    icon: AlertTriangle,
    permission: 'alerts.view',
  },
  {
    label: 'Ingresos',
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
    label: 'Reportes',
    href: '/reportes',
    icon: BarChart3,
    permission: 'reports.view',
  },
  {
    label: 'Mas',
    href: '/admin',
    icon: Settings,
    permission: 'users.manage',
  },
]

export function MobileNav() {
  const pathname = usePathname()
  const { user } = useUser()

  const filteredItems = mobileNavItems.filter(
    item => !item.permission || hasPermission(user?.role, item.permission)
  )

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-ds-hairline/60 bg-ds-surface/95 backdrop-blur-md safe-bottom">
      <div className="flex h-[var(--mobile-nav-height)] items-stretch justify-around px-1">
        {filteredItems.map(item => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1 transition-all duration-200',
                'min-h-[44px] active:scale-95',
                active
                  ? 'text-ds-accent bg-ds-accent-faded'
                  : 'text-ds-ink-muted hover:text-ds-ink-display'
              )}
            >
              <item.icon
                size={18}
                className={cn(
                  'shrink-0 transition-transform duration-200',
                  active && 'scale-105'
                )}
              />
              <span className="max-w-full truncate px-0.5 text-[10px] font-semibold leading-tight antialiased">
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
