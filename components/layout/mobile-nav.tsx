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
    label: 'Expedientes',
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden glass safe-bottom">
      <div className="flex items-center justify-around px-2 py-1">
        {filteredItems.map(item => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 touch-target',
                active 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground hover:text-foreground active:scale-95'
              )}
            >
              <item.icon 
                className={cn(
                  'h-5 w-5 transition-transform duration-200',
                  active && 'scale-110'
                )} 
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
