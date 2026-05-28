'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Eye, EyeOff, Fingerprint } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    
    setError(null)
    setIsLoading(true)

    try {
      if (!email || !password) {
        throw new Error('Por favor ingrese correo y contrasena')
      }

      // Guardar en localStorage
      localStorage.setItem('tns_token', 'mock_token_' + Date.now())
      localStorage.setItem('tns_user_email', email)

      // Redirigir inmediatamente
      router.push('/operacion')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al iniciar sesion'
      setError(errorMsg)
      setIsLoading(false)
    }
  }

  function fillTestUser(testEmail: string, testPassword: string) {
    setEmail(testEmail)
    setPassword(testPassword)
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Panel izquierdo - Info con Spatial UI */}
      <div className="hidden lg:flex flex-1 flex-col justify-between bg-gradient-to-br from-secondary/50 via-background to-secondary/30 p-12 text-foreground relative overflow-hidden">
        {/* Decorative elements - subtle depth */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-40 left-10 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="mb-12 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary elevation-2">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">TNS Track</h1>
              <p className="text-xs text-muted-foreground">Parque Agrolivo</p>
            </div>
          </div>
          <h2 className="mb-6 text-4xl font-bold leading-tight text-balance">
            Consola de operaciones de seguridad inteligente
          </h2>
          <p className="mb-12 text-lg text-muted-foreground max-w-md">
            Monitoreo en tiempo real, gestion de alertas, registro vehicular y trazabilidad completa de operaciones.
          </p>

          {/* Stats with elevation */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 p-5 elevation-1 transition-transform hover:scale-[1.02]">
              <p className="text-3xl font-bold text-primary">60+</p>
              <p className="text-sm text-muted-foreground">Camaras monitoreadas</p>
            </div>
            <div className="rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 p-5 elevation-1 transition-transform hover:scale-[1.02]">
              <p className="text-3xl font-bold text-primary">&lt;5s</p>
              <p className="text-sm text-muted-foreground">Latencia de alertas</p>
            </div>
            <div className="rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 p-5 elevation-1 transition-transform hover:scale-[1.02]">
              <p className="text-3xl font-bold text-primary">24/7</p>
              <p className="text-sm text-muted-foreground">Operacion continua</p>
            </div>
            <div className="rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 p-5 elevation-1 transition-transform hover:scale-[1.02]">
              <p className="text-3xl font-bold text-primary">99.5%</p>
              <p className="text-sm text-muted-foreground">Disponibilidad</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground relative z-10">
          The Next Security - Sistema propietario - Todos los derechos reservados
        </p>
      </div>

      {/* Panel derecho - Formulario con Glassmorphism */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 safe-bottom">
        <Card className="w-full max-w-md glass-strong elevation-3 border-border/50">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-6 flex items-center gap-3 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Shield className="h-6 w-6" />
              </div>
              <div className="text-left">
                <span className="text-xl font-bold block">TNS Track</span>
                <span className="text-xs text-muted-foreground">Parque Agrolivo</span>
              </div>
            </div>
            <CardTitle className="text-2xl">Bienvenido</CardTitle>
            <CardDescription>
              Ingrese sus credenciales para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="animate-slide-in-down">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Correo electronico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@agrolivo.cl"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="h-12 rounded-xl bg-secondary/50 border-border/50 focus:bg-secondary/80 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Contrasena</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Ingrese su contrasena"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="h-12 rounded-xl bg-secondary/50 border-border/50 focus:bg-secondary/80 transition-colors pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors touch-target flex items-center justify-center"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl text-base font-medium touch-target transition-transform active:scale-[0.98]" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Iniciando sesion...
                  </>
                ) : (
                  <>
                    <Fingerprint className="mr-2 h-5 w-5" />
                    Iniciar sesion
                  </>
                )}
              </Button>

              {/* Usuarios de prueba - bottom position for thumb reach */}
              <div className="mt-8 pt-6 border-t border-border/50">
                <p className="mb-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acceso rapido</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => fillTestUser('admin@agrolivo.cl', 'password123')}
                    className="rounded-xl border border-border/50 bg-secondary/30 px-3 py-3 text-xs hover:bg-secondary/60 transition-all active:scale-[0.98] touch-target"
                  >
                    <span className="font-semibold block">Admin</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillTestUser('operador@agrolivo.cl', 'password123')}
                    className="rounded-xl border border-border/50 bg-secondary/30 px-3 py-3 text-xs hover:bg-secondary/60 transition-all active:scale-[0.98] touch-target"
                  >
                    <span className="font-semibold block">Operador</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillTestUser('recepcionista@agrolivo.cl', 'password123')}
                    className="rounded-xl border border-border/50 bg-secondary/30 px-3 py-3 text-xs hover:bg-secondary/60 transition-all active:scale-[0.98] touch-target"
                  >
                    <span className="font-semibold block">Recepcion</span>
                  </button>
                </div>
                <p className="mt-4 text-[11px] text-muted-foreground text-center">
                  Modo demo - cualquier contrasena funciona
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
