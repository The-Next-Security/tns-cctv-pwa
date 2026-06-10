'use client'

import { useCallback, useEffect, useState } from 'react'
import { users as usersApi } from '@/lib/api'
import { MOCK_USERS } from '@/lib/mock-data'
import type { User } from '@/lib/types'

/** Usuarios con teléfono para contactos de escalación (API MySQL → fallback mock). */
export function useEscalationUsers() {
  const [users, setUsers] = useState<User[]>(MOCK_USERS)

  const reload = useCallback(async () => {
    try {
      const items = await usersApi.list()
      if (Array.isArray(items) && items.length > 0) {
        setUsers(items)
      }
    } catch {
      // API no disponible: se mantienen mocks
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { users, reload }
}
