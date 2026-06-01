'use client'

import { ReactNode } from 'react'
import { useUser } from '@/lib/auth'
import type { Role } from '@/lib/types'

interface RoleGateProps {
  roles: Role[]
  children: ReactNode
  fallback?: ReactNode
}

export function RoleGate({ roles, children, fallback = null }: RoleGateProps) {
  const { user, isLoading } = useUser()

  if (isLoading) {
    return null
  }

  if (!user || !roles.includes(user.role)) {
    return fallback
  }

  return <>{children}</>
}
