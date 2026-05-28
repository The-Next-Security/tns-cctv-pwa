'use client'

import { useState } from 'react'
import { Eye, EyeOff, Fingerprint } from 'lucide-react'
import { BrandLogo } from '@/components/brand/brand-logo'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getDemoRoleLabel } from '@/lib/demo-users'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()

    setError(null)
    setIsLoading(true)

    try {
      await login(email, password)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al iniciar sesión'
      setError(errorMsg)
      setIsLoading(false)
    }
  }

  function fillTestUser(testEmail: string, testPassword: string) {
    setEmail(testEmail)
    setPassword(testPassword)
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Panel izquierdo — marca + valor */}
      <div className="relative hidden lg:flex flex-1 flex-col justify-between dashboard-canvas px-12 py-10 xl:px-16 xl:py-12 overflow-hidden">
        <div className="pointer-events-none absolute top-16 right-16 h-64 w-64 rounded-full bg-accent/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-32 left-8 h-48 w-48 rounded-full bg-[var(--crextio-gold)]/20 blur-3xl" />

        <div className="relative z-10 pt-2">
          <BrandLogo variant="hero" subtitle="Track · Parque Agrolivo" href={null} priority />

          <h1 className="mt-10 max-w-lg text-display text-[2rem] xl:text-[2.25rem] leading-tight">
            Consola de operaciones de seguridad inteligente
          </h1>
          <p className="mt-4 max-w-md text-body-secondary text-base">
            Monitoreo en tiempo real, gestión de alertas, registro vehicular y trazabilidad completa de operaciones.
          </p>

          <div className="mt-10 grid max-w-md grid-cols-2 gap-3">
            {[
              { value: '60+', label: 'Cámaras monitoreadas' },
              { value: '<5s', label: 'Latencia de alertas' },
              { value: '24/7', label: 'Operación continua' },
              { value: '99.5%', label: 'Disponibilidad' },
            ].map(stat => (
              <div key={stat.label} className="soft-card p-4 transition-transform hover:scale-[1.02]">
                <p className="text-numeral text-2xl text-[var(--crextio-charcoal)]">{stat.value}</p>
                <p className="mt-0.5 text-caption">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-caption">
          The Next Security · Sistema propietario · Todos los derechos reservados
        </p>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex flex-1 flex-col items-center justify-center dashboard-canvas lg:bg-card px-6 py-10 lg:px-12 lg:py-12 safe-bottom">
        <div className="w-full max-w-md">
          {/* Logo móvil / tablet estrecha */}
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <BrandLogo variant="hero" subtitle="Track · Parque Agrolivo" href={null} priority />
          </div>

          <div className="soft-panel p-6 sm:p-8">
            <div className="mb-6 text-center lg:text-left">
              <h2 className="text-section text-xl">Bienvenido</h2>
              <p className="mt-1 text-body-secondary">
                Ingrese sus credenciales para continuar
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="animate-slide-in-down rounded-xl">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@agrolivo.cl"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="h-12 rounded-xl border-border/60 bg-secondary/50 focus:bg-card"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Ingrese su contraseña"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="h-12 rounded-xl border-border/60 bg-secondary/50 pr-12 focus:bg-card"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="h-12 w-full rounded-xl text-base font-semibold touch-target"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Iniciando sesión…
                  </>
                ) : (
                  <>
                    <Fingerprint className="mr-2 h-5 w-5" />
                    Iniciar sesión
                  </>
                )}
              </Button>

              <div className="mt-6 border-t border-border/60 pt-6">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Acceso rápido
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Admin', email: 'admin@agrolivo.cl' },
                    { label: 'Operador', email: 'operador@agrolivo.cl' },
                    { label: 'Recepción', email: 'recepcionista@agrolivo.cl' },
                  ].map(user => (
                    <button
                      key={user.email}
                      type="button"
                      onClick={() => fillTestUser(user.email, 'password123')}
                      className="rounded-xl border border-border/50 bg-secondary/40 px-2 py-3 text-xs font-semibold transition-all hover:bg-secondary/70 active:scale-[0.98] touch-target"
                    >
                      <span className="block">{user.label}</span>
                      <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">
                        {getDemoRoleLabel(user.email)}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                  Modo demo — cualquier contraseña funciona
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
