'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser, getDefaultRoute } from '@/lib/auth'

export default function DashboardPage() {
  const { user, isLoading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(getDefaultRoute(user.role))
    }
  }, [user, isLoading, router])

  return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ds-accent border-t-transparent" />
        <p className="text-sm text-ds-ink-muted">Redirigiendo...</p>
      </div>
    </div>
  )
}
