'use client'

import { useState, useEffect, ReactNode, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AuthContext, getDefaultRoute } from '@/lib/auth'
import { persistDemoUser, restoreDemoUserFromStorage } from '@/lib/demo-users'
import { DEMO_ALERT_POPUP_KEY } from '@/lib/reset-demo'
import { auth as authApi, ApiError } from '@/lib/api'
import type { Role, User } from '@/lib/types'

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

    let authedUser: User
    try {
      const res = await authApi.login(email, password)
      localStorage.setItem('tns_token', res.token)
      localStorage.setItem('tns_refresh_token', res.refresh_token)
      authedUser = {
        id: res.user.id,
        email: res.user.email,
        nombre: res.user.nombre ?? res.user.full_name ?? email.split('@')[0],
        role: res.user.role as Role,
        activo: res.user.activo ?? true,
      }
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 400)) {
        throw new Error('Correo o contraseña incorrectos')
      }
      throw new Error('No se pudo conectar con el servidor de autenticación')
    }

    persistDemoUser(authedUser)
    setUser(authedUser)

    setTimeout(() => {
      router.push(getDefaultRoute(authedUser.role))
    }, 100)
  }, [router])

  // D10: renovación silenciosa cada 50 min (access dura 60) durante el turno de 8 h.
  // El backend rota el refresh token y corta la sesión a las 10 h absolutas.
  useEffect(() => {
    if (!user) return
    const interval = setInterval(async () => {
      const refreshToken = localStorage.getItem('tns_refresh_token')
      if (!refreshToken) return
      try {
        const res = await authApi.refresh(refreshToken)
        localStorage.setItem('tns_token', res.token)
        localStorage.setItem('tns_refresh_token', res.refresh_token)
      } catch {
        // Sesión expirada (10 h) o token rotado en otra pestaña: cerrar sesión.
        await logout()
      }
    }, 50 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const logout = useCallback(async () => {
    localStorage.removeItem('tns_token')
    localStorage.removeItem('tns_refresh_token')
    localStorage.removeItem('tns_user_email')
    localStorage.removeItem('tns_user_role')
    localStorage.removeItem('tns_user_id')
    localStorage.removeItem('tns_user_name')
    sessionStorage.removeItem(DEMO_ALERT_POPUP_KEY)
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
