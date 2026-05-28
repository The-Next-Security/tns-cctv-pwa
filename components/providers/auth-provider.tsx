'use client'

import { useState, useEffect, ReactNode, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AuthContext, getDefaultRoute } from '@/lib/auth'
import { persistDemoUser, restoreDemoUserFromStorage } from '@/lib/demo-users'
import type { User } from '@/lib/types'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    checkAuthStatus()
  }, [])

  const checkAuthStatus = useCallback(() => {
    const token = localStorage.getItem('tns_token')
    const userEmail = localStorage.getItem('tns_user_email')

    if (token && userEmail) {
      setUser(restoreDemoUserFromStorage(userEmail))
    } else {
      setUser(null)
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    if (!email || !password) {
      throw new Error('Correo o contraseña incorrectos')
    }

    const demoUser = restoreDemoUserFromStorage(email)

    localStorage.setItem('tns_token', 'mock_token_' + Date.now())
    persistDemoUser(demoUser)

    setUser(demoUser)

    setTimeout(() => {
      router.push(getDefaultRoute(demoUser.role))
    }, 100)
  }, [router])

  const logout = useCallback(async () => {
    localStorage.removeItem('tns_token')
    localStorage.removeItem('tns_user_email')
    localStorage.removeItem('tns_user_role')
    localStorage.removeItem('tns_user_id')
    localStorage.removeItem('tns_user_name')
    sessionStorage.removeItem('tns_demo_alert_popup')
    setUser(null)
    router.push('/login')
  }, [router])

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
