'use client'

import { useState, useEffect, ReactNode, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AuthContext, getDefaultRoute } from '@/lib/auth'
import type { User } from '@/lib/types'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Verificar autenticación al montar
  useEffect(() => {
    setMounted(true)
    checkAuthStatus()
  }, [])

  const checkAuthStatus = useCallback(() => {
    const token = localStorage.getItem('tns_token')
    const userEmail = localStorage.getItem('tns_user_email')
    
    if (token && userEmail) {
      // Restaurar usuario del localStorage
      const mockUser: User = {
        id: '1',
        email: userEmail,
        nombre: userEmail.split('@')[0],
        role: 'admin_parque',
        ultimaConexion: new Date().toISOString(),
      }
      setUser(mockUser)
    } else {
      setUser(null)
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    if (!email || !password) {
      throw new Error('Correo o contraseña incorrectos')
    }

    // Mock auth - validar credenciales localmente para demo
    const mockUser: User = {
      id: '1',
      email: email,
      nombre: email.split('@')[0],
      role: 'admin_parque',
      ultimaConexion: new Date().toISOString(),
    }

    // Guardar en localStorage
    localStorage.setItem('tns_token', 'mock_token_' + Date.now())
    localStorage.setItem('tns_user_email', email)
    
    setUser(mockUser)
    
    // Esperar a que se actualice el estado antes de redirigir
    setTimeout(() => {
      const route = getDefaultRoute(mockUser.role)
      router.push(route)
    }, 100)
  }, [router])

  const logout = useCallback(async () => {
    console.log('[v0] Logout called')
    localStorage.removeItem('tns_token')
    localStorage.removeItem('tns_user_email')
    setUser(null)
    router.push('/login')
  }, [router])

  // Solo renderizar cuando esté montado
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
